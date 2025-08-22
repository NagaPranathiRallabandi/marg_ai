const mysql = require('mysql2');
require('dotenv').config(); // Load environment variables from .env file

// Create the connection to the database
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Establish the connection
connection.connect(error => {
  if (error) {
    console.error('❌ Error connecting to the database:', error.stack);
    return;
  }
  console.log('✅ Successfully connected to the MySQL database.');
});

module.exports = connection;