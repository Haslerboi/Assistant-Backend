// Telegram polling service - alternative to webhooks
import fetch from 'node-fetch';
import { config } from '../../config/env.js';
import logger from '../../utils/logger.js';

// Keep track of which updates we've processed
let lastUpdateId = 0;

// Track backoff state
let isPollingActive = false;
let retryCount = 0;
let retryDelay = 5000; // Start with 5 second delay

/**
 * Start polling for Telegram updates
 * @param {Function} handleUpdate - Function to process updates
 * @param {number} interval - Polling interval in milliseconds
 */
export const startPolling = async (handleUpdate, interval = 5000) => {
  logger.info('Starting Telegram polling service', { tag: 'telegram' });
  console.log('🚀 Starting Telegram polling service...');
  
  // First, delete any webhook to prevent conflicts
  try {
    const deleteResponse = await fetch(`https://api.telegram.org/bot${config.telegram.botToken}/deleteWebhook`);
    const deleteData = await deleteResponse.json();
    
    if (deleteData.ok) {
      logger.info('Successfully deleted existing webhook', { tag: 'telegram' });
      console.log('✅ Deleted existing webhook');
    } else {
      logger.warn(`Failed to delete webhook: ${deleteData.description}`, { tag: 'telegram' });
      console.warn(`⚠️ Failed to delete webhook: ${deleteData.description}`);
    }
  } catch (error) {
    logger.error('Error deleting webhook:', error);
    console.error('❌ Error deleting webhook:', error);
  }
  
  // Set a flag to indicate we're the active instance
  isPollingActive = true;
  
  // Define a single polling function we can call recursively with backoff
  const pollOnce = async () => {
    if (!isPollingActive) return;
    
    try {
      const updates = await getUpdates();
      
      // Reset retry counter on success
      retryCount = 0;
      retryDelay = 5000;
      
      if (updates && updates.length > 0) {
        logger.info(`Received ${updates.length} updates from Telegram`, { tag: 'telegram' });
        console.log(`📩 Received ${updates.length} updates from Telegram`);
        
        // Process each update
        for (const update of updates) {
          try {
            console.log(`Processing update ID: ${update.update_id}`);
            await handleUpdate(update);
          } catch (processError) {
            logger.error(`Error processing update: ${processError.message}`, { 
              tag: 'telegram', 
              error: processError.stack 
            });
            console.error(`❌ Error processing update: ${processError.message}`);
          }
        }
      }
      
      // Schedule next poll with regular interval
      setTimeout(pollOnce, interval);
    } catch (error) {
      // Check for conflict error
      if (error.message && error.message.includes('Conflict: terminated by other getUpdates request')) {
        // If we get a conflict, we'll back off with exponential delay
        retryCount++;
        
        // Calculate backoff with exponential increase and some jitter
        const jitter = Math.random() * 1000;
        retryDelay = Math.min(60000, retryDelay * 1.5) + jitter;
        
        console.log(`⚠️ Conflict detected. Another instance is running. Retry #${retryCount} in ${Math.round(retryDelay/1000)} seconds`);
        logger.warn(`Conflict detected. Another instance is running. Retry #${retryCount} in ${Math.round(retryDelay/1000)} seconds`, { tag: 'telegram' });
        
        // If we've tried more than 10 times, we might want to give up being the active poller
        if (retryCount > 10) {
          console.log('⚠️ Too many conflicts. This instance will stop polling.');
          logger.warn('Too many conflicts. This instance will stop polling.', { tag: 'telegram' });
          isPollingActive = false;
          return;
        }
        
        // Wait longer before trying again
        setTimeout(pollOnce, retryDelay);
      } else {
        // For other errors, retry with standard interval
        logger.error(`Polling error: ${error.message}`, { 
          tag: 'telegram', 
          error: error.stack 
        });
        console.error(`❌ Polling error: ${error.message}`);
        
        setTimeout(pollOnce, interval);
      }
    }
  };
  
  // Start the polling loop
  console.log(`🔄 Starting polling with ${interval}ms interval`);
  pollOnce();
  
  return true;
};

/**
 * Get updates from Telegram
 * @returns {Promise<Array>} - Array of updates
 */
const getUpdates = async () => {
  try {
    // Add a random timeout between 1-3 seconds to reduce conflicts
    const timeout = 1 + Math.floor(Math.random() * 2);
    
    const response = await fetch(
      `https://api.telegram.org/bot${config.telegram.botToken}/getUpdates?offset=${lastUpdateId + 1}&timeout=${timeout}`
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Telegram API error: ${error.description || response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(`Telegram API returned error: ${data.description}`);
    }
    
    if (data.result.length > 0) {
      // Update lastUpdateId to acknowledge these updates
      lastUpdateId = Math.max(...data.result.map(update => update.update_id));
    }
    
    return data.result;
  } catch (error) {
    // Don't log conflict errors as they're handled in the caller
    if (!error.message || !error.message.includes('Conflict: terminated by other getUpdates request')) {
      logger.error(`Error getting updates: ${error.message}`, { 
        tag: 'telegram', 
        error: error.stack 
      });
      console.error(`❌ Error getting updates: ${error.message}`);
    }
    throw error; // Rethrow for the caller to handle
  }
};

export default { startPolling }; 