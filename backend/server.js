const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS settings
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins (for GitHub Pages)
    methods: ["GET", "POST"]
  }
});

// A simple route for Render's health check
app.get('/', (req, res) => {
  res.send('Environment Control Backend is running.');
});

// Store the ESP32 socket
let esp32Socket = null;

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // --- Event from ESP32 ---
  // ESP32 identifies itself
  socket.on('esp32-identify', () => {
    console.log(`ESP32 identified: ${socket.id}`);
    esp32Socket = socket;
  });

  // ESP32 sends sensor data
  socket.on('sensorData', (data) => {
    // Broadcast this data to all web clients
    io.emit('update', data); 
    // console.log('Received sensor data:', data); // Uncomment for debugging
  });

  // --- Event from Web Frontend ---
  // Web client sends a control command
  socket.on('toggleControl', (controlData) => {
    console.log('Received control command:', controlData);
    if (esp32Socket) {
      // Forward the command to the ESP32
      esp32Socket.emit('control', controlData);
    } else {
      console.log('No ESP32 connected, command ignored.');
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (esp32Socket && socket.id === esp32Socket.id) {
      console.log('ESP32 disconnected.');
      esp32Socket = null;
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on *:${PORT}`);
});
