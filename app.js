const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const socketIO = require('socket.io');
const http = require('http');
require('dotenv').config();

// Initialize Express App
const app = express();
const server = http.createServer(app);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nxt_energy_trading', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Socket.IO Setup
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Import Routes
const tradingRoutes = require('./api/trading');
const simulationRoutes = require('./machine_learning/simulation');
const contractRoutes = require('./contracts/contractManagement');
const carbonRoutes = require('./carbon/carbonTrading');
const ippRoutes = require('./ipp/ippManagement');
const portfolioRoutes = require('./core/portfolio');

// Register Routes
app.use('/api/trading', tradingRoutes);
app.use('/api/simulation', simulationRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/carbon', carbonRoutes);
app.use('/api/ipp', ippRoutes);
app.use('/api/portfolio', portfolioRoutes);

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
  });
});

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// WebSocket Connection Handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
  
  // Listen for trading events
  socket.on('trade-event', (data) => {
    // Broadcast to all clients
    io.emit('trade-update', data);
  });
});

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`NXT Energy Trading Platform running on port ${PORT}`);
  console.log(`WebSocket server listening on port ${PORT}`);
});

module.exports = { app, server, io };