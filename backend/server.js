const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');
const { initGemini } = require('./config/gemini');
const { startBot } = require('./bot/whatsappBot');
const { initScheduler } = require('./utils/scheduler');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Body Parsers & CORS
app.use(cors({
  origin: '*', // Allow connections from frontend dev server
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static folder for uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/project', require('./routes/project'));
app.use('/api/task', require('./routes/task'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/bot', require('./routes/bot'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    appName: 'TeamFlow Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Serve frontend static files if built (for All-in-One deployment)
const frontendDist = path.join(__dirname, '../frontend/dist');
const fs = require('fs');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Server error occurred:', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Start Server and Services
const startServer = async () => {
  try {
    // 1. Connect Database
    await connectDB();

    // 2. Initialize Gemini AI
    initGemini();

    // 3. Initialize Daily Cron Scheduler
    initScheduler();

    // 4. Start HTTP Express Server
    app.listen(PORT, () => {
      console.log(`\n==================================================`);
      console.log(`🚀 TeamFlow Server running on port ${PORT}`);
      console.log(`📡 API Health: http://localhost:${PORT}/api/health`);
      console.log(`==================================================\n`);

      // 5. Start WhatsApp Baileys Bot asynchronously
      startBot();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

startServer();

module.exports = app;
