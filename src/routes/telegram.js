// Telegram webhook routes
import express from 'express';
import telegramController from '../controllers/telegram.js';
import telegramService from '../services/telegram/index.js';
import openaiService from '../services/openai/index.js';
import telegramParser from '../utils/telegramParser.js';
import { config } from '../config/env.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Store email data temporarily (in a real app, this would use a database)
const activeEmails = new Map();

/**
 * POST /webhook
 * Receive updates from Telegram
 */
router.post('/webhook', async (req, res) => {
  try {
    // Log raw request for debugging
    console.log('📩 TELEGRAM WEBHOOK RECEIVED - RAW REQUEST:');
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    
    const update = req.body;
    
    // Verify this is a valid Telegram update
    if (!update || !update.update_id) {
      logger.warn('Received invalid Telegram update', { tag: 'telegram' });
      console.error('❌ Invalid Telegram update format received');
      return res.status(400).json({ success: false, error: 'Invalid update format' });
    }
    
    logger.info(`Received Telegram update ID: ${update.update_id}`, { tag: 'telegram' });
    console.log(`✅ Valid Telegram update ID: ${update.update_id}`);
    
    // Handle different types of updates
    if (update.message) {
      const chatId = update.message.chat?.id;
      const messageText = update.message.text || '';
      
      // Log the message text and sender chat_id
      logger.info(`Received message from chat_id: ${chatId}`, { 
        tag: 'telegram',
        chatId,
        messageText: messageText.substring(0, 100) // Log first 100 chars to avoid huge logs
      });
      
      console.log(`📝 Telegram message from ${chatId}: "${messageText.substring(0, 100)}${messageText.length > 100 ? '...' : ''}"`);
      
      // Process the message
      if (messageText && messageText.startsWith('/')) {
        // This is a command
        console.log(`🤖 Processing Telegram command: ${messageText}`);
        const result = telegramController.handleCommandMessage(update.message);
        console.log('Command processing result:', result);
        // Process command (will be implemented in the future)
      } else {
        // This is a regular message
        console.log('🔄 Processing Telegram message as potential response...');
        const result = telegramController.handleIncomingMessage(update.message);
        console.log('Message processing result:', result);
        
        // All text messages are now treated as answers/responses
        if (result.success && result.type === 'answers') {
          console.log(`✅ Received response: "${result.originalText.substring(0, 50)}${result.originalText.length > 50 ? '...' : ''}"`);
          logger.info(`Processing response from user ${result.userId}`, { 
            tag: 'telegram',
            responseLength: result.originalText?.length || 0
          });
          
          // Check if we have an active email for this chat
          const emailData = activeEmails.get(chatId);
          
          if (emailData && emailData.questions) {
            console.log('✅ Found matching active email for this chat');
            try {
              // Match user's response to questions
              const finalAnswersObject = telegramParser.matchAnswersToQuestions(
                emailData.questions,
                result.data
              );
              
              console.log('✅ Processed user response:', finalAnswersObject);
              logger.info('User response processed', { 
                tag: 'telegram',
                response: finalAnswersObject 
              });
              
              // Debug log to check email object fields
              console.log('Email object being passed to generateReply:', {
                subject: emailData.originalEmail.subject,
                body: emailData.originalEmail.body ? emailData.originalEmail.body.substring(0, 100) + '...' : null,
                sender: emailData.originalEmail.sender
              });

              // Ensure required fields are present
              if (!emailData.originalEmail.subject || !emailData.originalEmail.body || !emailData.originalEmail.sender) {
                logger.warn('Missing required email fields for generateReply', {
                  hasSubject: !!emailData.originalEmail.subject,
                  hasBody: !!emailData.originalEmail.body,
                  hasSender: !!emailData.originalEmail.sender
                });
                
                // Set default values for missing fields
                emailData.originalEmail.subject = emailData.originalEmail.subject || '[No Subject]';
                emailData.originalEmail.body = emailData.originalEmail.body || '';
                emailData.originalEmail.sender = emailData.originalEmail.sender || '[Unknown Sender]';
              }
              
              // Generate reply using OpenAI
              console.log('🤖 Generating reply using OpenAI...');
              const draftText = await openaiService.generateReply(
                emailData.originalEmail,
                finalAnswersObject
              );
              
              console.log('✅ Reply generated successfully:', draftText.replyText.substring(0, 100) + '...');
              
              // Send the draft back to the user
              console.log('📤 Sending draft back to user...');
              await telegramService.sendMessage(
                chatId,
                `<b>📝 Here's the draft reply:</b>\n\n${draftText.replyText}`,
                { parseMode: 'HTML' }
              );
              
              // Save draft to Gmail
              console.log('💾 Saving draft to Gmail...');
              try {
                const gmailService = await import('../services/gmail/index.js');
                await gmailService.createDraft(
                  emailData.originalEmail.threadId,
                  emailData.originalEmail.sender,
                  emailData.originalEmail.subject,
                  draftText.replyText
                );
                console.log('✅ Draft saved to Gmail successfully');
                
                // Notify user that draft was saved
                await telegramService.sendMessage(
                  chatId,
                  '✅ Draft has been saved to your Gmail drafts folder',
                  { parseMode: 'HTML' }
                );
              } catch (draftError) {
                console.error('❌ Error saving draft to Gmail:', draftError);
                await telegramService.sendMessage(
                  chatId,
                  '⚠️ Draft was generated but could not be saved to Gmail',
                  { parseMode: 'HTML' }
                );
              }
              
              // Clear the active email data
              activeEmails.delete(chatId);
              console.log('✅ Cleared active email data for chat');
            } catch (error) {
              logger.error(`Error generating reply: ${error.message}`, { 
                tag: 'telegram', 
                error: error.stack 
              });
              
              console.error('❌ Error generating reply:', error);
              console.error('Error stack:', error.stack || error);
              
              // Notify the user about the error
              await telegramService.sendMessage(
                chatId,
                '❌ Sorry, there was an error generating your reply. Please try again later.',
                { parseMode: 'HTML' }
              );
            }
          } else {
            console.log('❌ No active email found for this chat');
            // No active email found
            await telegramService.sendMessage(
              chatId,
              '⚠️ I don\'t have an active email to respond to. Please ask me to check your email first.',
              { parseMode: 'HTML' }
            );
          }
        } else {
          console.log('ℹ️ Message could not be processed:', result.error || 'Unknown error');
        }
      }
    } else {
      console.log('ℹ️ Telegram update does not contain a message');
    }
    
    // Always respond with 200 OK to Telegram
    console.log('📤 Sending 200 OK response to Telegram webhook');
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error(`Error processing Telegram webhook: ${error.message}`, { 
      tag: 'telegram', 
      error: error.stack 
    });
    
    console.error('❌ Error processing Telegram webhook:', error);
    console.error('Error stack:', error.stack || error);
    
    // Always respond with 200 OK to Telegram even on error
    // This prevents Telegram from retrying the request
    res.status(200).json({ success: true });
  }
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
    activeEmails.set(chatId, {
      originalEmail: email,
      questions: questions,
      timestamp: new Date().toISOString()
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