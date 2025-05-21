// Telegram polling service - alternative to webhooks
import fetch from 'node-fetch';
import { config } from '../../config/env.js';
import logger from '../../utils/logger.js';

// Keep track of which updates we've processed
let lastUpdateId = 0;

/**
 * Start polling for Telegram updates
 * @param {Function} handleUpdate - Function to process updates
 * @param {number} interval - Polling interval in milliseconds
 */
export const startPolling = async (handleUpdate, interval = 1000) => {
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
  
  // Start polling loop
  console.log(`🔄 Starting polling loop with ${interval}ms interval`);
  setInterval(async () => {
    try {
      const updates = await getUpdates();
      
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
    } catch (error) {
      logger.error(`Polling error: ${error.message}`, { 
        tag: 'telegram', 
        error: error.stack 
      });
      console.error(`❌ Polling error: ${error.message}`);
    }
  }, interval);
  
  return true;
};

/**
 * Get updates from Telegram
 * @returns {Promise<Array>} - Array of updates
 */
const getUpdates = async () => {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${config.telegram.botToken}/getUpdates?offset=${lastUpdateId + 1}&timeout=1`
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
    logger.error(`Error getting updates: ${error.message}`, { 
      tag: 'telegram', 
      error: error.stack 
    });
    console.error(`❌ Error getting updates: ${error.message}`);
    return [];
  }
};

export default { startPolling }; 