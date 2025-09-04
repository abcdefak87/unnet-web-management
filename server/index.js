const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
// Make prisma globally available for routes
global.prisma = prisma;

const { createServer } = require('http');
const { initializeWebSocket } = require('./services/websocketService');
const logger = require('./utils/logger');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const jobRoutes = require('./routes/jobs');
const technicianRoutes = require('./routes/technicians');
const inventoryRoutes = require('./routes/inventory');
const customerRoutes = require('./routes/customers');
const reportRoutes = require('./routes/reports');
const telegramRoutes = require('./routes/telegram');
const userRoutes = require('./routes/users');
const uploadRoutes = require('./routes/upload');
const registrationRoutes = require('./routes/registrations');
const notificationRoutes = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
// CORS Configuration
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? (process.env.ALLOWED_ORIGINS || 'https://yourdomain.com').split(',')
  : (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000').split(',');

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400 // 24 hours
}));

// Rate limiting - More lenient for development
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // Increased from 100 to 1000
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => {
    // Skip rate limiting for development
    return process.env.NODE_ENV === 'development'
  }
});
app.use('/api/', limiter);

// Additional specific rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 uploads per hour
  message: 'Too many file uploads, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply specific rate limiting
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/upload', uploadLimiter);

// Body parsing middleware - Skip for multipart requests
app.use(compression());
app.use((req, res, next) => {
  // Skip body parsing for multipart/form-data requests
  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    return next();
  }
  express.json({ limit: '10mb' })(req, res, next);
});
app.use((req, res, next) => {
  // Skip URL encoding for multipart/form-data requests
  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    return next();
  }
  express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
});

// Logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Static files for uploads
app.use('/uploads', express.static('uploads'));

// Enhanced health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API health check with database
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection using the global prisma instance
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: 'Connected',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      database: 'Disconnected',
      error: error.message
    });
  }
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/technicians', require('./routes/technicians'));
app.use('/api/users', require('./routes/users'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/team', require('./routes/team'));
app.use('/api/telegram', require('./routes/telegram'));
app.use('/api/registrations', require('./routes/registrations'));
app.use('/api', require('./routes/setup'));

// Error handling middleware
app.use((err, req, res, next) => {
  // Log error details
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // CORS error handling
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS Error',
      message: 'Origin not allowed'
    });
  }

  // Validation error handling
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message
    });
  }

  // JWT error handling
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Authentication Error',
      message: 'Invalid token'
    });
  }

  // Prisma error handling
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'Duplicate Entry',
      message: 'Resource already exists'
    });
  }

  // Generic error response
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({ 
    error: statusCode === 500 ? 'Internal Server Error' : err.message,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Create HTTP server and initialize WebSocket
const server = createServer(app);
const io = initializeWebSocket(server);

server.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/health`);
  logger.info(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`⚡ WebSocket server initialized`);
  
  // Initialize Telegram bot (optional - server works without it)
  if (process.env.TELEGRAM_BOT_TOKEN) {
    try {
      const EnhancedTelegramBot = require('./services/telegram/enhancedTelegramBot');
      const bot = EnhancedTelegramBot.getInstance(process.env.TELEGRAM_BOT_TOKEN);
      logger.info(`🤖 Telegram bot initialized`);
    } catch (error) {
      logger.warn('⚠️ Telegram bot disabled due to initialization error:', error.message);
      // Server continues without Telegram bot
    }
  } else {
    logger.warn('⚠️ TELEGRAM_BOT_TOKEN not found - Telegram bot disabled');
  }
}).on('error', (err) => {
  logger.error('❌ Server failed to start:', err.message);
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use. Please kill the process or use a different port.`);
  }
});
