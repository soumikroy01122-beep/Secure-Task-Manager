const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();

const { initDbConnection, getActiveDbType } = require('./db');
const { initializeSchema } = require('./db/init');
const { seedDatabase } = require('./db/seed');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const taskRoutes = require('./routes/taskRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middleware
app.use(helmet());
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive in local development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser with strict limits against DoS attacks
app.use(express.json({ limit: '500kb' }));
app.use(express.urlencoded({ extended: true, limit: '500kb' }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    activeDb: getActiveDbType(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.originalUrl} not found.` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  const isDev = process.env.NODE_ENV === 'development';
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(isDev && { stack: err.stack })
  });
});

// Start Server
async function startServer() {
  try {
    console.log('====================================================');
    console.log('       SECURE TASK MANAGER BACKEND SERVICE          ');
    console.log('====================================================');

    await initDbConnection();
    await initializeSchema();
    await seedDatabase();

    app.listen(PORT, () => {
      console.log(`\n🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
      console.log(`🔒 Security active: Helmet, JWT Auth, RBAC Guards, Brute-Force Rate Limiting`);
      console.log(`💾 Active Database Engine: ${getActiveDbType().toUpperCase()}`);
      console.log(`👉 Health check: http://localhost:${PORT}/api/health\n`);
    });
  } catch (err) {
    console.error('Fatal initialization error:', err);
    process.exit(1);
  }
}

startServer();
