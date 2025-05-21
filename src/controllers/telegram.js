// Telegram controller for handling webhook events
import telegramParser from '../utils/telegramParser.js';
import logger from '../utils/logger.js';

/**
 * Handle an incoming Telegram message
 * @param {Object} message - The Telegram message object
 * @returns {Object} - Response with parsed data or error
 */
export const handleIncomingMessage = (message) => {
  try {
    if (!message || !message.text) {
      return { success: false, error: 'No message text provided' };
    }

    logger.info('Processing incoming Telegram message', { tag: 'telegram' });

    // Check if message contains numbered answers
    const answers = telegramParser.parseNumberedAnswers(message.text);
    
    // If we found at least one numbered answer
    if (Object.keys(answers).length > 0) {
      logger.info(`Extracted ${Object.keys(answers).length} answers from message`, { tag: 'telegram' });
      
      return {
        success: true,
        type: 'answers',
        data: answers,
        chatId: message.chat?.id,
        userId: message.from?.id,
        messageId: message.message_id
      };
    }
    
    // If no numbered answers found, treat as general response
    return {
      success: true,
      type: 'message',
      data: { text: message.text },
      chatId: message.chat?.id,
      userId: message.from?.id,
      messageId: message.message_id
    };
  } catch (error) {
    logger.error(`Error handling Telegram message: ${error.message}`, { 
      tag: 'telegram', 
      error: error.stack 
    });
    
    return { 
      success: false, 
      error: error.message 
    };
  }
};

/**
 * Process a command message (starting with /)
 * @param {Object} message - The Telegram message object
 * @returns {Object} - Response with command data
 */
export const handleCommandMessage = (message) => {
  try {
    if (!message || !message.text || !message.text.startsWith('/')) {
      return { success: false, error: 'Not a valid command' };
    }
    
    // Extract command and arguments
    const fullCommand = message.text.substring(1); // remove leading /
    const parts = fullCommand.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    logger.info(`Processing Telegram command: /${command}`, { tag: 'telegram' });
    
    return {
      success: true,
      type: 'command',
      data: {
        command,
        args
      },
      chatId: message.chat?.id,
      userId: message.from?.id,
      messageId: message.message_id
    };
  } catch (error) {
    logger.error(`Error handling Telegram command: ${error.message}`, { 
      tag: 'telegram', 
      error: error.stack 
    });
    
    return { 
      success: false, 
      error: error.message 
    };
  }
};

export default {
  handleIncomingMessage,
  handleCommandMessage
}; 