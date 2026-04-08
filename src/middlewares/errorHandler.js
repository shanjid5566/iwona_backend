import { ApiError } from '../utils/apiError.js';

/**
 * Not Found Handler
 */
const notFoundHandler = (req, res, next) => {
  const error = new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`);
  next(error);
};

/**
 * Global Error Handler
 */
const errorHandler = (err, req, res, next) => {
  let error = err;
  
  // Log error
  console.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
  
  // Handle Prisma errors
  if (err.code) {
    switch (err.code) {
      case 'P2002':
        // Unique constraint violation
        error = new ApiError(400, 'Duplicate field value entered');
        break;
      case 'P2014':
        // Invalid ID
        error = new ApiError(400, 'Invalid ID provided');
        break;
      case 'P2003':
        // Foreign key constraint failed
        error = new ApiError(400, 'Related record not found');
        break;
      case 'P2025':
        // Record not found
        error = new ApiError(404, 'Record not found');
        break;
      default:
        break;
    }
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new ApiError(401, 'Invalid token');
  }
  
  if (err.name === 'TokenExpiredError') {
    error = new ApiError(401, 'Token expired');
  }
  
  // Handle validation errors
  if (err.name === 'ValidationError') {
    error = new ApiError(400, err.message);
  }
  
  // Default error response
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      error: err,
    }),
  });
};

export { notFoundHandler, errorHandler };
