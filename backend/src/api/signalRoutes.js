const express = require('express');
const router = express.Router();
const dbConnection = require('../config/db'); // Adjust path to db.js

// Define the GET route to fetch all traffic signals
router.get('/signals', (req, res) => {
  const query = 'SELECT * FROM traffic_signals';

  dbConnection.query(query, (error, results) => {
    if (error) {
      console.error('Error fetching signals from DB:', error);
      return res.status(500).json({ error: 'Failed to fetch data' });
    }
    res.json(results);
  });
});

module.exports = router;