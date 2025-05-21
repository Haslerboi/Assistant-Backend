// Telegram service for interacting with Telegram Bot API
import { config } from '../../config/env.js';
import fetch from 'node-fetch';
import logger from '../../utils/logger.js';
import TelegramBot from 'node-telegram-bot-api';

/**
 * Send a message to a Telegram chat
 * @param {string} chatId - The Telegram chat ID to send the message to
 * @param {string} text - The message text to send
 * @param {Object} [options] - Additional options for the message
 * @returns {Promise<Object>} - The API response
 */
export const sendMessage = async (chatId, text, options = {}) => {
  try {
    if (!config.telegram?.botToken) {
      throw new Error('Telegram bot token is not configured');
    }

    if (!chatId) {
      throw new Error('Chat ID is required');
    }

    if (!text || typeof text !== 'string') {
      throw new Error('Message text is required and must be a string');
    }

    logger.info(`Telegram Service - Sending message to chat ${chatId}`, { tag: 'telegram' });

    const apiUrl = `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`;
    
    const requestBody = {
      chat_id: chatId,
      text: text,
      parse_mode: options.parseMode || 'HTML',
      disable_web_page_preview: options.disableWebPagePreview || false,
      disable_notification: options.disableNotification || false,
      ...options
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Telegram API error: ${errorData.description || response.statusText}`);
    }

    const data = await response.json();
    
    logger.info('Message sent successfully to Telegram', { tag: 'telegram' });
    
    return {
      success: true,
      messageId: data.result.message_id,
      chatId,
      sentAt: new Date().toISOString()
    };
  } catch (error) {
    logger.error(`Error sending Telegram message: ${error.message}`, { 
      tag: 'telegram', 
      error: error.stack 
    });
    throw new Error(`Failed to send Telegram message: ${error.message}`);
  }
};

/**
 * Send a Telegram notification with email details and actions taken
 * @param {Object} params - Message parameters
 * @param {string} params.to - The chat ID to send to
 * @param {Object} params.email - The email object with details
 * @param {Array} params.questions - Questions extracted from the email (if any)
 * @param {string} params.action - What action was taken (e.g., "Created draft reply")
 * @param {string} params.classification - Email classification (auto_draft or needs_input)
 * @returns {Promise<Object>} - The result of the send operation
 */
export const sendTelegramMessage = async (params) => {
  try {
    // Check if Telegram is configured
    if (!config.telegram?.botToken) {
      console.error('Error: Telegram bot token is not configured');
      return { success: false, error: 'Bot token not configured' };
    }

    // Default to the configured chat ID if not provided
    const chatId = params.to || config.telegram.chatId;

    if (!chatId) {
      console.error('Error: Telegram chat ID is not configured');
      return { success: false, error: 'Chat ID not configured' };
    }

    if (!params.email) {
      console.error('Error: Email details are required');
      return { success: false, error: 'Email details missing' };
    }

    console.log(`Sending Telegram notification to chat ID: ${chatId}`);
    
    // Format email details with action taken
    let messageText = `
📩 <b>New Email</b>

<b>From:</b> ${params.email.sender}
<b>Subject:</b> ${params.email.subject}
<b>Status:</b> ${params.classification === 'auto_draft' ? '✅ Auto-draft' : '❓ Needs input'}
<b>Action:</b> ${params.action || 'No action taken'}
`;

    // If there are questions, add them to the message
    if (params.questions && params.questions.length > 0) {
      messageText += `\n<b>Please answer these questions:</b>`;
      params.questions.forEach((question, index) => {
        messageText += `\n${index + 1}. ${question}`;
      });
      messageText += `\n\nReply with numbered answers (e.g., "1. Yes, 2. Tomorrow")`;
    } else if (params.classification === 'auto_draft') {
      // If auto-drafted, add a note about checking drafts
      messageText += `\n\nA reply has been drafted and saved to your Gmail drafts folder.`;
    }

    // Create Telegram bot instance without polling (just for sending)
    const bot = new TelegramBot(config.telegram.botToken, { polling: false });
    
    // Send the message with HTML formatting
    const result = await bot.sendMessage(chatId, messageText, { parse_mode: 'HTML' });
    
    console.log('Telegram notification sent successfully!');
    
    return {
      success: true,
      messageId: result.message_id,
      chatId: chatId,
      sentAt: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error sending Telegram notification: ${error.message}`);
    return { 
      success: false, 
      error: error.message
    };
  }
};

/**
 * Send a photo to a Telegram chat
 * @param {string} chatId - The Telegram chat ID to send the photo to
 * @param {string} photoUrl - URL of the photo to send, or file path for uploading
 * @param {string} [caption] - Optional caption for the photo
 * @param {Object} [options] - Additional options for the message
 * @returns {Promise<Object>} - The API response
 */
export const sendPhoto = async (chatId, photoUrl, caption = '', options = {}) => {
  try {
    if (!config.telegram?.botToken) {
      throw new Error('Telegram bot token is not configured');
    }

    if (!chatId) {
      throw new Error('Chat ID is required');
    }

    if (!photoUrl) {
      throw new Error('Photo URL is required');
    }

    logger.info(`Telegram Service - Sending photo to chat ${chatId}`, { tag: 'telegram' });

    const apiUrl = `https://api.telegram.org/bot${config.telegram.botToken}/sendPhoto`;
    
    const requestBody = {
      chat_id: chatId,
      photo: photoUrl,
      caption: caption,
      parse_mode: options.parseMode || 'HTML',
      disable_notification: options.disableNotification || false,
      ...options
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Telegram API error: ${errorData.description || response.statusText}`);
    }

    const data = await response.json();
    
    logger.info('Photo sent successfully to Telegram', { tag: 'telegram' });
    
    return {
      success: true,
      messageId: data.result.message_id,
      chatId,
      sentAt: new Date().toISOString()
    };
  } catch (error) {
    logger.error(`Error sending Telegram photo: ${error.message}`, { 
      tag: 'telegram', 
      error: error.stack 
    });
    throw new Error(`Failed to send Telegram photo: ${error.message}`);
  }
};

/**
 * Send an email notification via Telegram
 * @param {string} chatId - The Telegram chat ID to send the notification to
 * @param {Object} email - The email object with details
 * @param {string} email.subject - The email subject
 * @param {string} email.sender - The email sender
 * @param {string} email.snippet - Short preview of the email content
 * @returns {Promise<Object>} - The API response
 */
export const sendEmailNotification = async (chatId, email) => {
  try {
    if (!email || !email.subject || !email.sender) {
      throw new Error('Email object with subject and sender is required');
    }
    
    // Format the message with HTML styling
    const message = `
<b>📧 New Email</b>

<b>From:</b> ${email.sender}
<b>Subject:</b> ${email.subject}

<i>${email.snippet || ''}</i>

Reply to this notification to provide input on how to respond.
`;

    return await sendMessage(chatId, message, { parseMode: 'HTML' });
  } catch (error) {
    logger.error(`Error sending email notification via Telegram: ${error.message}`, { 
      tag: 'telegram', 
      error: error.stack 
    });
    throw new Error(`Failed to send email notification: ${error.message}`);
  }
};

/**
 * Send email questions via Telegram to get user input
 * @param {string} chatId - The Telegram chat ID to send the questions to
 * @param {Array<string>} questions - List of questions extracted from the email
 * @param {Object} email - Basic email info for context
 * @returns {Promise<Object>} - The API response
 */
export const sendEmailQuestions = async (chatId, questions, email) => {
  try {
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('At least one question is required');
    }
    
    // Build the message with the questions
    let message = `
<b>❓ Email Questions</b>

<b>From:</b> ${email.sender}
<b>Subject:</b> ${email.subject}

<b>Please answer these questions to help draft a reply:</b>
`;

    // Add each question as a numbered item
    questions.forEach((question, index) => {
      message += `\n${index + 1}. ${question}`;
    });
    
    message += '\n\nPlease reply with your answers in this format:\n1. [your answer to question 1]\n2. [your answer to question 2]';

    return await sendMessage(chatId, message, { parseMode: 'HTML' });
  } catch (error) {
    logger.error(`Error sending email questions via Telegram: ${error.message}`, { 
      tag: 'telegram', 
      error: error.stack 
    });
    throw new Error(`Failed to send email questions: ${error.message}`);
  }
};

/**
 * Send draft email preview via Telegram
 * @param {string} chatId - The Telegram chat ID to send the preview to
 * @param {string} replyText - The draft reply text
 * @param {Object} email - Basic email info for context
 * @returns {Promise<Object>} - The API response
 */
export const sendDraftPreview = async (chatId, replyText, email) => {
  try {
    if (!replyText || typeof replyText !== 'string') {
      throw new Error('Reply text is required');
    }
    
    // Format the message with HTML styling
    const message = `
<b>📝 Draft Email Reply</b>

<b>To:</b> ${email.sender}
<b>Subject:</b> ${email.subject}

<b>Draft:</b>
<pre>${replyText.substring(0, 800)}${replyText.length > 800 ? '...' : ''}</pre>

Reply with "SEND" to send this draft, or provide feedback to revise it.
`;

    return await sendMessage(chatId, message, { parseMode: 'HTML' });
  } catch (error) {
    logger.error(`Error sending draft preview via Telegram: ${error.message}`, { 
      tag: 'telegram', 
      error: error.stack 
    });
    throw new Error(`Failed to send draft preview: ${error.message}`);
  }
};

export default {
  sendMessage,
  sendTelegramMessage,
  sendPhoto,
  sendEmailNotification,
  sendEmailQuestions,
  sendDraftPreview
}; 