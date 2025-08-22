const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const cors = require('cors');
require('dotenv').config();

// --- Initialization ---
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// --- Middleware ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- Database Connection ---
const dbConnection = require('./src/config/db');

// --- API Routes ---
const signalRoutes = require('./src/api/signalRoutes');
app.use('/api', signalRoutes);

// --- In-Memory Cache for Signals ---
let allSignals = [];
dbConnection.query('SELECT * FROM traffic_signals', (err, results) => {
  if (err) {
    console.error("Could not pre-load traffic signals:", err);
    return;
  }
  allSignals = results;
  console.log(`Pre-loaded ${allSignals.length} traffic signals into memory.`);
});

// --- Helper function to find the closest signal to a point ---
const findClosestSignal = (point, signals) => {
    let closestSignal = null;
    let minDistance = Infinity;
    signals.forEach(signal => {
        const distance = Math.sqrt(Math.pow(point[1] - signal.latitude, 2) + Math.pow(point[0] - signal.longitude, 2));
        if (distance < minDistance) {
            minDistance = distance;
            closestSignal = signal;
        }
    });
    return closestSignal;
};

// --- REVERTED ROUTING LOGIC USING OSRM (FREE DEMO SERVER) ---
app.post('/api/calculate-route', async (req, res) => {
  const { start, end } = req.body; // Expects { start: [lat, lng], end: [lat, lng] }

  if (!start || !end) {
    return res.status(400).json({ error: 'Start and end points are required.' });
  }

  // OSRM API URL format: {longitude},{latitude};{longitude},{latitude}
  const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;

  try {
    const response = await axios.get(osrmUrl);
    const routeGeoJSON = response.data.routes[0].geometry;
    
    const routeSignals = new Set();
    routeGeoJSON.coordinates.forEach(point => {
        // OSRM gives [lng, lat], our signals are [lat, lng]
        const closestSignal = findClosestSignal(point, allSignals);
        // A threshold to consider a signal "on the route"
        if (closestSignal && Math.sqrt(Math.pow(point[1] - closestSignal.latitude, 2) + Math.pow(point[0] - closestSignal.longitude, 2)) < 0.005) {
            routeSignals.add(closestSignal);
        }
    });

    const signalsOnRoute = Array.from(routeSignals);

    console.log(`Calculated route with ${signalsOnRoute.length} signals using OSRM.`);

    res.json({
      route: routeGeoJSON,
      signals: signalsOnRoute
    });

  } catch (error) {
    console.error("Error fetching route from OSRM:", error.message);
    res.status(500).json({ error: 'Failed to calculate route.' });
  }
});


// --- DETECTION MEMORY & CONFIRMATION LOGIC ---
const detectionMemory = new Map();
const CONFIRMATION_WINDOW_MS = 5000;

app.post('/api/detect-vehicle/:signalId', upload.single('image'), async (req, res) => {
  const { signalId } = req.params;
  
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded.' });
  }

  try {
    const pythonServiceUrl = 'http://127.0.0.1:5001/detect';
    const form = new FormData();
    form.append('image', req.file.buffer, { filename: 'image.jpg' });

    const response = await axios.post(pythonServiceUrl, form, {
      headers: form.getHeaders(),
    });

    console.log(`[Signal ${signalId}] AI Analysis:`, response.data);

    if (response.data.vehicle_detected) {
      const now = Date.now();
      
      if (detectionMemory.has(signalId) && (now - detectionMemory.get(signalId) < CONFIRMATION_WINDOW_MS)) {
        const alertData = {
          signalId: parseInt(signalId),
          eta: '1 minute'
        };
        io.emit('emergency_alert', alertData);
        console.log(`>>> CONFIRMED EMERGENCY. Alert sent for signal ${signalId}`);
        detectionMemory.delete(signalId); 
      } else {
        detectionMemory.set(signalId, now);
        console.log(`>>> Potential emergency at signal ${signalId}. Awaiting confirmation...`);
      }
    }
    
    res.json(response.data);

  } catch (error) {
    console.error('Error communicating with Python service:', error.message);
    res.status(500).json({ error: 'Failed to communicate with AI service' });
  }
});


// --- WebSocket & Server Startup ---
io.on('connection', (socket) => {
  console.log('Client connected to WebSocket!');
  socket.on('start_trip', (data) => {
    io.emit('trip_started', data);
  });
  socket.on('update_location', (data) => {
    io.emit('location_updated', data);
  });
  socket.on('disconnect', () => {
    console.log('Client disconnected.');
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
