const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const axios = require('axios');
const cors = require('cors');
const multer = require('multer');
const FormData = require('form-data');
require('dotenv').config();

// --- Initialization ---
const app = express();
app.use(cors());
app.use(express.json());

// --- Multer Setup ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// --- Database Connection & Signal Cache ---
const dbConnection = require('./src/config/db');
let allSignals = [];
dbConnection.query('SELECT * FROM traffic_signals', (err, results) => {
  if (err) {
    console.error("Could not pre-load traffic signals:", err);
    return;
  }
  allSignals = results;
  console.log(`Pre-loaded ${allSignals.length} traffic signals into memory.`);
});

// --- API Routes ---
const signalRoutes = require('./src/api/signalRoutes');
app.use('/api', signalRoutes);

// Keep track of detection counts for each signal
const detectionCounts = {};

app.post('/api/detect-vehicle/:signalId', upload.single('image'), async (req, res) => {
  const signalId = req.params.signalId;

  if (!req.file) {
    return res.status(400).send({ error: 'No image provided.' });
  }

  // Initialize or increment the detection count
  detectionCounts[signalId] = (detectionCounts[signalId] || 0) + 1;

  // Only proceed if the vehicle has been "detected" twice
  if (detectionCounts[signalId] < 2) {
    return res.json({
      message: `Frame ${detectionCounts[signalId]} received for signal ${signalId}. Awaiting second frame for confirmation.`
    });
  }

  // Reset count after confirmation
  detectionCounts[signalId] = 0;

  try {
    const formData = new FormData();
    formData.append('image', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const aiServiceUrl = 'http://localhost:5001/detect';
    const response = await axios.post(aiServiceUrl, formData, {
      headers: {
        ...formData.getHeaders()
      }
    });

    // If AI service confirms detection, emit a WebSocket event
    if (response.data.vehicle_detected) {
      console.log(`AI confirmed vehicle at signal ${signalId}. Clearing signal.`);
      io.emit('signal_cleared', { signalId: parseInt(signalId), newStatus: 'GREEN' });
    }

    res.json(response.data);

  } catch (error) {
    console.error('Error forwarding image to AI service:', error.message);
    res.status(500).send({ error: 'Failed to communicate with AI service.' });
  }
});

// --- Routing Logic using OSRM ---
app.post('/api/calculate-route', async (req, res) => {
  const { start, end } = req.body;
  const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
  try {
    const response = await axios.get(osrmUrl);
    res.json({ route: response.data.routes[0].geometry });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate route.' });
  }
});

// --- WebSocket Logic ---
let activeTrip = null;

const stopTrip = () => {
  if (activeTrip && activeTrip.intervalId) {
    clearInterval(activeTrip.intervalId);
  }
  activeTrip = null;
  console.log('Server state: Trip stopped and cleared.');
};

io.on('connection', (socket) => {
  socket.on('cancel_trip', () => {
    console.log('Received request to cancel trip.');
    stopTrip(); // This function already exists and cleans everything up
    io.emit('trip_ended'); // Notify all dashboards that the trip is over
  });
  console.log(`Client connected: ${socket.id}. Total clients: ${io.engine.clientsCount}`);

  if (activeTrip) {
    socket.emit('trip_started', { route: activeTrip.route, position: activeTrip.position });
  }

  socket.on('start_trip', (data) => {
    stopTrip();
    console.log('Server: Starting new trip simulation.');

    activeTrip = {
      route: data.route,
      step: 0,
      position: [data.route.coordinates[0][1], data.route.coordinates[0][0]],
      intervalId: null
    };

    io.emit('trip_started', { route: activeTrip.route, position: activeTrip.position });

    activeTrip.intervalId = setInterval(() => {
      if (!activeTrip || activeTrip.step >= activeTrip.route.coordinates.length) {
        io.emit('trip_ended');
        stopTrip();
        return;
      }

      const newPosition = [activeTrip.route.coordinates[activeTrip.step][1], activeTrip.route.coordinates[activeTrip.step][0]];
      activeTrip.position = newPosition; // Update server state
      io.emit('update_location', { position: newPosition });
      activeTrip.step++;
    }, 1000);
  });

  socket.on('manual_clear_signal', (data) => {
    io.emit('signal_cleared', { signalId: data.signalId, newStatus: 'GREEN' });
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}. Total clients: ${io.engine.clientsCount}`);
    if (io.engine.clientsCount === 0) {
      stopTrip();
    }
  });
});

// --- Server Startup ---
const PORT = 5000;
server.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));