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
    const update = req.body;
    
    // Verify this is a valid Telegram update
    if (!update || !update.update_id) {
      logger.warn('Received invalid Telegram update', { tag: 'telegram' });
      return res.status(400).json({ success: false, error: 'Invalid update format' });
    }
    
    logger.info(`Received Telegram update ID: ${update.update_id}`, { tag: 'telegram' });
    
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
      
      // Process the message
      if (messageText && messageText.startsWith('/')) {
        // This is a command
        const result = telegramController.handleCommandMessage(update.message);
        // Process command (will be implemented in the future)
      } else {
        // This is a regular message
        const result = telegramController.handleIncomingMessage(update.message);
        
        // If this message contains answers, process them
        if (result.success && result.type === 'answers') {
          logger.info(`Processing ${Object.keys(result.data).length} answers from user ${result.userId}`, { 
            tag: 'telegram',
            answers: result.data
          });
          
          // Check if we have an active email for this chat
          const emailData = activeEmails.get(chatId);
          
          if (emailData && emailData.questions) {
            try {
              // Match numbered answers to original questions
              const finalAnswersObject = telegramParser.matchAnswersToQuestions(
                emailData.questions,
                result.data
              );
              
              logger.info('Matched answers to questions', { 
                tag: 'telegram',
                matchedAnswers: finalAnswersObject 
              });
              
              // Generate reply using OpenAI
              const draftText = await openaiService.generateReply(
                emailData.originalEmail,
                finalAnswersObject
              );
              
              // Send the draft back to the user
              await telegramService.sendMessage(
                chatId,
                `<b>📝 Here's the draft reply:</b>\n\n${draftText.replyText}`,
                { parseMode: 'HTML' }
              );
              
              // Clear the active email data
              activeEmails.delete(chatId);
            } catch (error) {
              logger.error(`Error generating reply: ${error.message}`, { 
                tag: 'telegram', 
                error: error.stack 
              });
              
              // Notify the user about the error
              await telegramService.sendMessage(
                chatId,
                '❌ Sorry, there was an error generating your reply. Please try again later.',
                { parseMode: 'HTML' }
              );
            }
          } else {
            // No active email found
            await telegramService.sendMessage(
              chatId,
              '⚠️ I don\'t have an active email to respond to. Please ask me to check your email first.',
              { parseMode: 'HTML' }
            );
          }
        }
      }
    }
    
    // Always respond with 200 OK to Telegram
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error(`Error processing Telegram webhook: ${error.message}`, { 
      tag: 'telegram', 
      error: error.stack 
    });
    
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
    // This endpoint would be implemented to set up the webhook with Telegram
    // For now, just return instructions
    res.json({
      success: true,
      message: 'Webhook setup endpoint (to be implemented)',
      instructions: 'To set up your webhook manually, visit: ' +
        `https://api.telegram.org/bot${config.telegram.botToken}/setWebhook?url=https://your-domain.com/api/telegram/webhook`
    });
  } catch (error) {
    logger.error(`Error setting up Telegram webhook: ${error.message}`, { 
      tag: 'telegram',
      error: error.stack 
    });
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to set up webhook' 
    });
  }
});

export default router; 