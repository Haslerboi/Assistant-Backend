// Error handling middleware
import logger from '../utils/logger.js';
import { config } from '../config/env.js';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(statusCode, message, data = {}) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
    this.name = 'ApiError';
  }
}

/**
 * Not found middleware - creates 404 errors for undefined routes
 */
export const notFoundHandler = (req, res, next) => {
  const error = new ApiError(
    404,
    `Not Found - ${req.originalUrl}`
  );
  next(error);
};

/**
 * Global error handling middleware
 */
export const errorHandler = (err, req, res, next) => {
  // Default status code and message
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Log the error
  if (statusCode === 500) {
    logger.error(`Unhandled error: ${message}`, err);
  } else {
    logger.warn(`API error: ${message}`, {
      statusCode,
      path: req.originalUrl,
      method: req.method,
    });
  }
  
  // Prepare response
  const response = {
    success: false,
    message,
    ...(statusCode === 500 && config.NODE_ENV === 'production'
      ? {}
      : { error: err.name, ...(err.data && { data: err.data }) }),
  };
  
  // Add stack trace in development
  if (config.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }
  
  res.status(statusCode).json(response);
};

export default {
  ApiError,
  notFoundHandler,
  errorHandler,
}; 