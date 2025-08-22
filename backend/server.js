const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const cors = require('cors'); // 1. Import the cors package
require('dotenv').config();

// --- Initialization ---
const app = express();
app.use(cors()); // 2. Add the CORS middleware to your Express app

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

// Other routes...
app.post('/api/clear-signal/:signalId', (req, res) => {
  const { signalId } = req.params;
  const alertData = {
    signalId: parseInt(signalId),
    newStatus: 'GREEN'
  };
  io.emit('signal_cleared', alertData);
  console.log(`>>> Signal ${signalId} has been cleared to GREEN`);
  res.json({ message: `Signal ${signalId} status updated to GREEN` });
});

// --- Green Corridor Simulation Endpoint ---
app.post('/api/simulate-green-corridor', (req, res) => {
  console.log('>>> Starting Green Corridor Simulation...');

  // A predefined route for the demo (e.g., from Signal 1 to Signal 3)
  const routeSignalIds = [1, 2, 3]; 

  // Function to clear signals one by one with a delay
  const clearNextSignal = (index) => {
    if (index >= routeSignalIds.length) {
      console.log('>>> Green Corridor Simulation Complete.');
      return;
    }

    const signalId = routeSignalIds[index];
    const alertData = {
      signalId: signalId,
      newStatus: 'GREEN'
    };
    
    io.emit('signal_cleared', alertData);
    console.log(`>>> Clearing signal ${signalId} for Green Corridor.`);

    // Wait 2 seconds before clearing the next signal
    setTimeout(() => {
      clearNextSignal(index + 1);
    }, 2000);
  };

  // Start the simulation
  clearNextSignal(0);

  res.json({ message: 'Green Corridor simulation started.' });
});


// --- WebSocket & Server Startup ---
io.on('connection', (socket) => {
  console.log('Client connected to WebSocket!');
  socket.on('disconnect', () => {
    console.log('Client disconnected.');
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
  