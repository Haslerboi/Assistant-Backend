// Telegram controller for handling webhook events
import { config } from '../config/env.js';
import logger from '../utils/logger.js';
import EmailStateManager from '../services/email-state.js';
import { 
  processEmailResponse,
  handleUserInput
} from '../services/telegram/index.js';

/**
 * Process Telegram webhook update
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const processWebhook = async (req, res) => {
  try {
    // Validate webhook secret token if using one
    const secretToken = req.query.token;
    if (config.telegram.webhookSecret && secretToken !== config.telegram.webhookSecret) {
      logger.warn('Invalid webhook secret token', { tag: 'telegram' });
      return res.status(403).json({ error: 'Invalid token' });
    }

    // Get update from request body
    const update = req.body;
    if (!update) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    logger.info(`Received Telegram webhook update`, { tag: 'telegram', updateId: update.update_id });
    console.log(`📩 Received Telegram webhook update ID: ${update.update_id}`);
    
    // Immediately respond to Telegram to acknowledge receipt
    res.status(200).json({ ok: true });
    
    // Process the update asynchronously
    processUpdate(update).catch(error => {
      logger.error(`Error processing webhook update: ${error.message}`, { 
        tag: 'telegram', 
        error: error.stack 
      });
      console.error(`❌ Error processing webhook update: ${error.message}`);
    });
    
  } catch (error) {
    logger.error(`Webhook processing error: ${error.message}`, { 
      tag: 'telegram', 
      error: error.stack 
    });
    console.error(`❌ Webhook error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Process a Telegram update
 * @param {Object} update - The Telegram update object
 */
const processUpdate = async (update) => {
  try {
    // Handle message updates
    if (update.message) {
      const message = update.message;
      const chatId = message.chat.id;
      const text = message.text;
      
      if (!text) {
        console.log('Received non-text message, ignoring');
        return;
      }
      
      console.log(`Received message from ${message.from.first_name} (${chatId}): ${text}`);
      
      // Check if we have an active email for this chat
      const activeEmail = EmailStateManager.getEmail(chatId);
      
      if (activeEmail) {
        // Process response to active email
        await processEmailResponse(chatId, text, activeEmail);
      } else {
        // No active email, handle as general user input
        await handleUserInput(chatId, text);
      }
    }
    
    // Handle callback queries (button clicks)
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const chatId = callbackQuery.message.chat.id;
      const data = callbackQuery.data;
      
      console.log(`Received callback query from ${callbackQuery.from.first_name} (${chatId}): ${data}`);
      
      // Process callback query data
      // You can add specific handlers for different callback data
    }
  } catch (error) {
    logger.error(`Error in processUpdate: ${error.message}`, {
      tag: 'telegram',
      error: error.stack
    });
    console.error(`❌ Error processing update: ${error.message}`);
  }
};

/**
 * Set up the Telegram webhook
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const setupWebhook = async (req, res) => {
  try {
    // The webhook URL should be HTTPS and publicly accessible
    const webhookUrl = req.body.url;
    if (!webhookUrl || !webhookUrl.startsWith('https://')) {
      return res.status(400).json({ 
        error: 'Invalid webhook URL. Must start with https://' 
      });
    }
    
    // Add secret token if configured
    let fullWebhookUrl = webhookUrl;
    if (config.telegram.webhookSecret) {
      fullWebhookUrl = `${webhookUrl}?token=${config.telegram.webhookSecret}`;
    }
    
    // Set the webhook with Telegram
    const setWebhookUrl = `https://api.telegram.org/bot${config.telegram.botToken}/setWebhook`;
    const response = await fetch(setWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: fullWebhookUrl,
        allowed_updates: ['message', 'callback_query']
      })
    });
    
    const data = await response.json();
    
    if (data.ok) {
      logger.info(`Successfully set webhook to ${webhookUrl}`, { tag: 'telegram' });
      res.json({ 
        success: true, 
        message: 'Webhook set successfully',
        result: data.result 
      });
    } else {
      logger.error(`Failed to set webhook: ${data.description}`, { tag: 'telegram' });
      res.status(500).json({ 
        error: 'Failed to set webhook', 
        description: data.description 
      });
    }
  } catch (error) {
    logger.error(`Error setting webhook: ${error.message}`, { 
      tag: 'telegram', 
      error: error.stack 
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete the Telegram webhook
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const deleteWebhook = async (req, res) => {
  try {
    const deleteWebhookUrl = `https://api.telegram.org/bot${config.telegram.botToken}/deleteWebhook`;
    const response = await fetch(deleteWebhookUrl);
    const data = await response.json();
    
    if (data.ok) {
      logger.info('Successfully deleted webhook', { tag: 'telegram' });
      res.json({ 
        success: true, 
        message: 'Webhook deleted successfully' 
      });
    } else {
      logger.error(`Failed to delete webhook: ${data.description}`, { tag: 'telegram' });
      res.status(500).json({ 
        error: 'Failed to delete webhook', 
        description: data.description 
      });
    }
  } catch (error) {
    logger.error(`Error deleting webhook: ${error.message}`, { 
      tag: 'telegram', 
      error: error.stack 
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get webhook info from Telegram
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getWebhookInfo = async (req, res) => {
  try {
    const getWebhookInfoUrl = `https://api.telegram.org/bot${config.telegram.botToken}/getWebhookInfo`;
    const response = await fetch(getWebhookInfoUrl);
    const data = await response.json();
    
    if (data.ok) {
      logger.info('Successfully retrieved webhook info', { tag: 'telegram' });
      res.json({ 
        success: true, 
        webhookInfo: data.result 
      });
    } else {
      logger.error(`Failed to get webhook info: ${data.description}`, { tag: 'telegram' });
      res.status(500).json({ 
        error: 'Failed to get webhook info', 
        description: data.description 
      });
    }
  } catch (error) {
    logger.error(`Error getting webhook info: ${error.message}`, { 
      tag: 'telegram', 
      error: error.stack 
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Export controllers
export default {
  processWebhook,
  setupWebhook,
  deleteWebhook,
  getWebhookInfo
}; 