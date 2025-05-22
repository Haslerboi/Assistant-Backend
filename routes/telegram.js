// Telegram webhook routes
import express from 'express';
import telegramController from '../controllers/telegram.js';
import telegramService from '../services/telegram/index.js';
import openaiService from '../services/openai/index.js';
import telegramParser from '../utils/telegramParser.js';
import EmailStateManager from '../services/email-state.js';
import { config } from '../config/env.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Webhook endpoint for Telegram
router.post('/webhook', telegramController.processWebhook);

// API endpoints for managing webhook
router.post('/webhook/setup', telegramController.setupWebhook);
router.get('/webhook/info', telegramController.getWebhookInfo);
router.delete('/webhook', telegramController.deleteWebhook);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'telegram' });
});

/**
 * POST /send-email-questions
 * Send email questions to a user via Telegram
 * This endpoint would be called by other parts of the application
 */
router.post('/send-email-questions', async (req, res) => {
  try {
    const { chatId, questions, email } = req.body;
    
    if (!chatId || !Array.isArray(questions) || questions.length === 0 || !email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: chatId, questions, and email' 
      });
    }
    
    // Store email data for later use
    EmailStateManager.storeEmail(chatId, {
      originalEmail: email,
      questions: questions,
      timestamp: Date.now()
    });
    
    // Send questions to the user
    const result = await telegramService.sendEmailQuestions(chatId, questions, email);
    
    res.json({
      success: true,
      result
    });
  } catch (error) {
    logger.error(`Error sending email questions: ${error.message}`, { 
      tag: 'telegram', 
      error: error.stack 
    });
    
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /setup-webhook
 * Set up the Telegram webhook
 */
router.get('/setup-webhook', async (req, res) => {
  try {
    // Get the full URL for the webhook endpoint
    const baseUrl = req.protocol + '://' + req.get('host');
    const webhookUrl = `${baseUrl}/api/telegram/webhook`;
    
    console.log(`Setting up Telegram webhook with URL: ${webhookUrl}`);
    
    if (!config.telegram?.botToken) {
      const error = 'Telegram bot token is not configured';
      console.error('❌ ' + error);
      return res.status(500).json({ 
        success: false, 
        error 
      });
    }
    
    // Make request to Telegram API to set webhook
    const telegramApiUrl = `https://api.telegram.org/bot${config.telegram.botToken}/setWebhook`;
    console.log(`Calling Telegram API: ${telegramApiUrl}`);
    
    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query']
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = `Telegram API error: ${errorData.description || response.statusText}`;
      console.error('❌ ' + errorMessage);
      return res.status(500).json({ 
        success: false, 
        error: errorMessage 
      });
    }
    
    const data = await response.json();
    console.log('✅ Telegram webhook setup response:', data);
    
    // Also fetch webhook info to verify
    const infoResponse = await fetch(`https://api.telegram.org/bot${config.telegram.botToken}/getWebhookInfo`);
    const infoData = await infoResponse.json();
    
    res.json({
      success: true,
      message: 'Webhook successfully configured',
      webhookUrl,
      setupResponse: data,
      webhookInfo: infoData.result
    });
  } catch (error) {
    logger.error(`Error setting up Telegram webhook: ${error.message}`, { 
      tag: 'telegram',
      error: error.stack 
    });
    
    console.error('❌ Error setting up webhook:', error);
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to set up webhook: ' + error.message
    });
  }
});

/**
 * GET /webhook-status
 * Check current webhook status
 */
router.get('/webhook-status', async (req, res) => {
  try {
    console.log('Checking Telegram webhook status');
    
    if (!config.telegram?.botToken) {
      const error = 'Telegram bot token is not configured';
      console.error('❌ ' + error);
      return res.status(500).json({ 
        success: false, 
        error 
      });
    }
    
    // Make request to Telegram API to get webhook info
    const infoResponse = await fetch(`https://api.telegram.org/bot${config.telegram.botToken}/getWebhookInfo`);
    
    if (!infoResponse.ok) {
      const errorData = await infoResponse.json();
      const errorMessage = `Telegram API error: ${errorData.description || infoResponse.statusText}`;
      console.error('❌ ' + errorMessage);
      return res.status(500).json({ 
        success: false, 
        error: errorMessage 
      });
    }
    
    const infoData = await infoResponse.json();
    console.log('✅ Telegram webhook info:', infoData);
    
    // Check if the webhook is properly set up
    const webhookInfo = infoData.result;
    const isConfigured = !!webhookInfo.url;
    const isPendingUpdates = webhookInfo.pending_update_count > 0;
    
    res.json({
      success: true,
      status: isConfigured ? 'configured' : 'not_configured',
      webhookInfo,
      pendingUpdates: webhookInfo.pending_update_count,
      hasPendingUpdates: isPendingUpdates,
      lastErrorMessage: webhookInfo.last_error_message || null,
      lastErrorTime: webhookInfo.last_error_date ? new Date(webhookInfo.last_error_date * 1000).toISOString() : null
    });
  } catch (error) {
    logger.error(`Error checking Telegram webhook status: ${error.message}`, { 
      tag: 'telegram',
      error: error.stack 
    });
    
    console.error('❌ Error checking webhook status:', error);
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check webhook status: ' + error.message
    });
  }
});

/**
 * GET /send-test-message
 * Send a test message to the configured chat ID
 */
router.get('/send-test-message', async (req, res) => {
  try {
    console.log('Sending test message to Telegram');
    
    if (!config.telegram?.botToken) {
      const error = 'Telegram bot token is not configured';
      console.error('❌ ' + error);
      return res.status(500).json({ 
        success: false, 
        error 
      });
    }
    
    if (!config.telegram?.chatId) {
      const error = 'Telegram chat ID is not configured';
      console.error('❌ ' + error);
      return res.status(500).json({ 
        success: false, 
        error 
      });
    }
    
    // Send a test message via the service
    const timestamp = new Date().toISOString();
    const message = `🧪 Test message from Email Assistant API\n\nThis is a test message sent at ${timestamp} to verify Telegram integration is working correctly.\n\nReply with "test" to check if webhook is receiving messages.`;
    
    console.log(`Sending test message to chat ID: ${config.telegram.chatId}`);
    const result = await telegramService.sendMessage(
      config.telegram.chatId,
      message,
      { parseMode: 'HTML' }
    );
    
    console.log('✅ Test message sent:', result);
    
    res.json({
      success: true,
      message: 'Test message sent successfully',
      sentTo: config.telegram.chatId,
      timestamp,
      result
    });
  } catch (error) {
    logger.error(`Error sending test message: ${error.message}`, { 
      tag: 'telegram',
      error: error.stack 
    });
    
    console.error('❌ Error sending test message:', error);
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send test message: ' + error.message
    });
  }
});

export default router; 