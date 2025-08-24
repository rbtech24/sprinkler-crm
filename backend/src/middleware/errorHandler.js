// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  const error = {
    message: err.message || 'Internal Server Error',
    status: err.status || 500,
  };

  // Validation errors
  if (err.name === 'ValidationError') {
    error.status = 400;
    error.message = 'Validation Error';
    error.details = err.details;
  }

  // Database errors
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique violation
        error.status = 409;
        error.message = 'Resource already exists';
        break;
      case '23503': // Foreign key violation
        error.status = 400;
        error.message = 'Invalid reference to related resource';
        break;
      case '23502': // Not null violation
        error.status = 400;
        error.message = 'Required field missing';
        break;
      case '42P01': // Undefined table
        error.status = 500;
        error.message = 'Database configuration error';
        break;
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error.status = 401;
    error.message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    error.status = 401;
    error.message = 'Token expired';
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error.status = 413;
    error.message = 'File too large';
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && error.status === 500) {
    error.message = 'Internal Server Error';
    delete error.stack;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    error.stack = err.stack;
  }

  res.status(error.status).json({
    error: error.message,
    ...(error.details && { details: error.details }),
    ...(error.stack && { stack: error.stack }),
  });
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Custom error class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.status = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  errorHandler,
  asyncHandler,
  AppError,
};
