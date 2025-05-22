/**
 * Email State Manager Service
 * 
 * Manages the active email state between Telegram messages
 * In a production app, this would use a database instead of in-memory Map
 */

import logger from '../utils/logger.js';

// Store email data temporarily (in a real app, this would use a database)
const activeEmails = new Map();

/**
 * Email State Manager
 */
const EmailStateManager = {
  /**
   * Store email data for a chat
   * @param {string} chatId - The chat ID
   * @param {Object} emailData - The email data object
   */
  storeEmail: (chatId, emailData) => {
    if (!chatId || !emailData) return;
    
    // Add timestamp and store
    emailData.timestamp = Date.now();
    activeEmails.set(String(chatId), emailData);
    
    console.log(`📝 Stored active email for chat ${chatId} with thread ID: ${emailData.originalEmail?.threadId || 'unknown'}`);
    logger.info(`Stored active email state for chat`, { 
      tag: 'telegram',
      chatId,
      emailSubject: emailData.originalEmail?.subject,
      threadId: emailData.originalEmail?.threadId
    });
  },
  
  /**
   * Get email data for a chat
   * @param {string} chatId - The chat ID
   * @returns {Object|null} - The email data or null if not found
   */
  getEmail: (chatId) => {
    if (!chatId) return null;
    
    const emailData = activeEmails.get(String(chatId));
    if (!emailData) {
      console.log(`No active email found for chat ${chatId}`);
      return null;
    }
    
    // Check if it's expired (older than 24 hours)
    const now = Date.now();
    const expiryTime = 24 * 60 * 60 * 1000; // 24 hours
    
    if (now - emailData.timestamp > expiryTime) {
      console.log(`Active email for chat ${chatId} has expired (>24h old)`);
      activeEmails.delete(String(chatId));
      return null;
    }
    
    return emailData;
  },
  
  /**
   * Clear email data for a chat
   * @param {string} chatId - The chat ID
   */
  clearEmail: (chatId) => {
    if (!chatId) return;
    
    activeEmails.delete(String(chatId));
    console.log(`Cleared active email data for chat ${chatId}`);
  },
  
  /**
   * Debug function to list all active emails
   * @returns {Array} - Array of active email entries
   */
  listActiveEmails: () => {
    const result = [];
    activeEmails.forEach((value, key) => {
      result.push({
        chatId: key,
        subject: value.originalEmail?.subject,
        timestamp: new Date(value.timestamp).toISOString(),
        age: Math.round((Date.now() - value.timestamp) / (60 * 1000)) + ' minutes'
      });
    });
    return result;
  }
};

export default EmailStateManager; 