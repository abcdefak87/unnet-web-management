/**
 * Centralized Error Handler
 * Provides consistent error handling across the application
 */

const logger = require('./logger');

class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle different types of errors
 */
const handleError = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error details
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new AppError(message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new AppError(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new AppError(message, 400);
  }

  // Prisma errors
  if (err.code === 'P2002') {
    const message = 'Resource already exists';
    error = new AppError(message, 409);
  }

  if (err.code === 'P2025') {
    const message = 'Resource not found';
    error = new AppError(message, 404);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new AppError(message, 401);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new AppError(message, 401);
  }

  // CORS errors
  if (err.message === 'Not allowed by CORS') {
    const message = 'Origin not allowed';
    error = new AppError(message, 403);
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File size too large';
    error = new AppError(message, 400);
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    const message = 'Too many files uploaded';
    error = new AppError(message, 400);
  }

  // Rate limiting errors
  if (err.statusCode === 429) {
    const message = 'Too many requests, please try again later';
    error = new AppError(message, 429);
  }

  sendErrorResponse(error, req, res);
};

/**
 * Send error response to client
 */
const sendErrorResponse = (err, req, res) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  // Default error response
  let errorResponse = {
    success: false,
    error: isProduction ? 'Something went wrong' : err.message,
    timestamp: new Date().toISOString()
  };

  // Add additional details in development
  if (isDevelopment) {
    errorResponse = {
      ...errorResponse,
      stack: err.stack,
      details: err.details || null,
      code: err.code || null
    };
  }

  // Add specific error codes for client handling
  if (err.statusCode) {
    errorResponse.statusCode = err.statusCode;
  }

  // Add retry information for rate limiting
  if (err.statusCode === 429) {
    errorResponse.retryAfter = err.retryAfter || 60;
  }

  // Add validation errors
  if (err.statusCode === 400 && err.details) {
    errorResponse.validation = err.details;
  }

  // Set appropriate status code
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json(errorResponse);
};

/**
 * Handle unhandled promise rejections
 */
const handleUnhandledRejection = (err) => {
  logger.error('Unhandled Promise Rejection:', {
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });

  // Close server gracefully
  process.exit(1);
};

/**
 * Handle uncaught exceptions
 */
const handleUncaughtException = (err) => {
  logger.error('Uncaught Exception:', {
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });

  // Close server gracefully
  process.exit(1);
};

/**
 * Async error wrapper
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Validation error formatter
 */
const formatValidationErrors = (errors) => {
  return errors.map(error => ({
    field: error.path,
    message: error.msg,
    value: error.value
  }));
};

/**
 * Create custom error
 */
const createError = (message, statusCode = 500, isOperational = true) => {
  return new AppError(message, statusCode, isOperational);
};

/**
 * Handle specific error types
 */
const handleSpecificErrors = {
  // Database connection errors
  database: (err) => {
    logger.error('Database error:', err);
    return new AppError('Database connection failed', 503);
  },

  // File system errors
  filesystem: (err) => {
    logger.error('File system error:', err);
    return new AppError('File operation failed', 500);
  },

  // Network errors
  network: (err) => {
    logger.error('Network error:', err);
    return new AppError('Network request failed', 503);
  },

  // Authentication errors
  authentication: (err) => {
    logger.error('Authentication error:', err);
    return new AppError('Authentication failed', 401);
  },

  // Authorization errors
  authorization: (err) => {
    logger.error('Authorization error:', err);
    return new AppError('Access denied', 403);
  }
};

module.exports = {
  AppError,
  handleError,
  handleUnhandledRejection,
  handleUncaughtException,
  asyncHandler,
  formatValidationErrors,
  createError,
  handleSpecificErrors
};
