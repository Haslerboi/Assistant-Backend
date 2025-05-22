// Enhanced logger utility with timestamps, tags and log levels
import { config } from '../config/env.js';

// Log levels with numeric priority values
export const LOG_LEVELS = {
  ERROR: { name: 'ERROR', value: 0, color: '\x1b[31m' }, // Red
  WARN: { name: 'WARN', value: 1, color: '\x1b[33m' },  // Yellow
  INFO: { name: 'INFO', value: 2, color: '\x1b[36m' },  // Cyan
  DEBUG: { name: 'DEBUG', value: 3, color: '\x1b[90m' }, // Gray
};

// Reset ANSI color code
const RESET_COLOR = '\x1b[0m';

// Get current log level from environment or default to INFO
const getCurrentLogLevel = () => {
  const envLevel = process.env.LOG_LEVEL?.toUpperCase();
  return envLevel && LOG_LEVELS[envLevel] ? LOG_LEVELS[envLevel].value : LOG_LEVELS.INFO.value;
};

// Whether to use colors in console output
const useColors = process.env.NO_COLOR !== 'true' && process.stdout.isTTY;

// Current log level value
const currentLogLevel = getCurrentLogLevel();

// Whether to log debug messages
const shouldLogDebug = currentLogLevel >= LOG_LEVELS.DEBUG.value;

/**
 * Format a log message with timestamp, level, tag and optional metadata
 * @param {Object} level - Log level object from LOG_LEVELS
 * @param {string} message - Log message
 * @param {string} tag - Tag for the log message source (e.g., [SMS], [GMAIL])
 * @param {Object} [meta] - Additional metadata
 * @returns {string} - Formatted log message
 */
const formatLog = (level, message, tag, meta) => {
  const timestamp = new Date().toISOString();
  const tagFormatted = tag ? `[${tag}] ` : '';
  
  let levelText = level.name.padEnd(5);
  if (useColors) {
    levelText = `${level.color}${levelText}${RESET_COLOR}`;
  }
  
  let formattedMessage = `[${timestamp}] ${levelText} ${tagFormatted}${message}`;
  
  if (meta) {
    try {
      if (typeof meta === 'string') {
        formattedMessage += ` ${meta}`;
      } else if (meta instanceof Error) {
        formattedMessage += ` ${meta.message}`;
        if (meta.stack && shouldLogDebug) {
          formattedMessage += `\n${meta.stack}`;
        }
      } else {
        formattedMessage += ` ${JSON.stringify(meta)}`;
      }
    } catch (error) {
      formattedMessage += ' [Error serializing metadata]';
    }
  }
  
  return formattedMessage;
};

/**
 * Log an error message
 * @param {string} message - Error message
 * @param {string} [tag] - Tag for the log source
 * @param {Error|Object} [error] - Error object or metadata
 */
export const error = (message, tag = '', error) => {
  if (currentLogLevel >= LOG_LEVELS.ERROR.value) {
    console.error(formatLog(LOG_LEVELS.ERROR, message, tag, error));
  }
};

/**
 * Log a warning message
 * @param {string} message - Warning message
 * @param {string} [tag] - Tag for the log source
 * @param {Object} [meta] - Additional metadata
 */
export const warn = (message, tag = '', meta) => {
  if (currentLogLevel >= LOG_LEVELS.WARN.value) {
    console.warn(formatLog(LOG_LEVELS.WARN, message, tag, meta));
  }
};

/**
 * Log an info message
 * @param {string} message - Info message
 * @param {string} [tag] - Tag for the log source
 * @param {Object} [meta] - Additional metadata
 */
export const info = (message, tag = '', meta) => {
  if (currentLogLevel >= LOG_LEVELS.INFO.value) {
    console.info(formatLog(LOG_LEVELS.INFO, message, tag, meta));
  }
};

/**
 * Log a debug message (only in development or when debug level enabled)
 * @param {string} message - Debug message
 * @param {string} [tag] - Tag for the log source
 * @param {Object} [meta] - Additional metadata
 */
export const debug = (message, tag = '', meta) => {
  if (shouldLogDebug) {
    console.debug(formatLog(LOG_LEVELS.DEBUG, message, tag, meta));
  }
};

/**
 * Create a logger instance with a specific tag
 * @param {string} tag - Tag for the logger instance
 * @returns {Object} - Tagged logger instance
 */
export const createTaggedLogger = (tag) => {
  return {
    error: (message, error) => error(message, tag, error),
    warn: (message, meta) => warn(message, tag, meta),
    info: (message, meta) => info(message, tag, meta),
    debug: (message, meta) => debug(message, tag, meta)
  };
};

export default {
  LOG_LEVELS,
  error,
  warn,
  info,
  debug,
  createTaggedLogger
}; 