/**
 * Email State Manager Service
 * 
 * Manages the active email state between Telegram messages
 * Uses a JSON file for persistence to maintain state across app restarts
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the JSON storage file
const STORAGE_FILE = path.join(__dirname, '../../data/email-state.json');
const STORAGE_DIR = path.join(__dirname, '../../data');

// Store email data in memory and persist to file
let activeEmails = new Map();

/**
 * Ensure storage directory exists
 */
const ensureStorageDirectory = async () => {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  } catch (error) {
    console.error(`❌ Error creating storage directory: ${error.message}`);
    logger.error(`Error creating storage directory: ${error.message}`, { 
      tag: 'email-state',
      error: error.stack
    });
  }
};

/**
 * Load email state from file
 */
const loadStateFromFile = async () => {
  try {
    await ensureStorageDirectory();
    
    const data = await fs.readFile(STORAGE_FILE, 'utf8');
    const jsonData = JSON.parse(data);
    
    // Convert from array of entries back to Map
    activeEmails = new Map(jsonData.map(item => [String(item.chatId), item.data]));
    
    const count = activeEmails.size;
    console.log(`📥 Loaded ${count} active email states from storage`);
    logger.info(`Loaded email states from file`, { 
      tag: 'email-state',
      count
    });
    
    // Clean up expired entries
    const now = Date.now();
    const expiryTime = 24 * 60 * 60 * 1000; // 24 hours
    let expiredCount = 0;
    
    for (const [chatId, data] of activeEmails.entries()) {
      if (now - data.timestamp > expiryTime) {
        activeEmails.delete(chatId);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      console.log(`🧹 Removed ${expiredCount} expired email states`);
      // Save immediately after cleanup
      await saveStateToFile();
    }
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('📝 No existing email state file found, starting fresh');
      activeEmails = new Map();
    } else {
      console.error(`❌ Error loading email states: ${error.message}`);
      logger.error(`Error loading email states: ${error.message}`, { 
        tag: 'email-state',
        error: error.stack
      });
      // Start with empty state in case of errors
      activeEmails = new Map();
    }
  }
};

/**
 * Save email state to file
 */
const saveStateToFile = async () => {
  try {
    await ensureStorageDirectory();
    
    // Convert Map to serializable array
    const serializedData = Array.from(activeEmails.entries())
      .map(([chatId, data]) => ({
        chatId,
        data
      }));
    
    await fs.writeFile(STORAGE_FILE, JSON.stringify(serializedData, null, 2), 'utf8');
    
    logger.info(`Saved email states to file`, { 
      tag: 'email-state',
      count: activeEmails.size
    });
  } catch (error) {
    console.error(`❌ Error saving email states: ${error.message}`);
    logger.error(`Error saving email states: ${error.message}`, { 
      tag: 'email-state',
      error: error.stack
    });
  }
};

// Load state immediately when the module is imported
loadStateFromFile().catch(error => {
  console.error(`❌ Initial state loading failed: ${error.message}`);
});

/**
 * Email State Manager
 */
const EmailStateManager = {
  /**
   * Store email data for a chat
   * @param {string} chatId - The chat ID
   * @param {Object} emailData - The email data object
   */
  storeEmail: async (chatId, emailData) => {
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
    
    // Persist to file
    await saveStateToFile();
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
      console.log(`❌ No active email found for chat ${chatId}`);
      return null;
    }
    
    // Check if it's expired (older than 24 hours)
    const now = Date.now();
    const expiryTime = 24 * 60 * 60 * 1000; // 24 hours
    
    if (now - emailData.timestamp > expiryTime) {
      console.log(`⏰ Active email for chat ${chatId} has expired (>24h old)`);
      activeEmails.delete(String(chatId));
      // Schedule async save without blocking
      saveStateToFile().catch(error => {
        console.error(`❌ Error saving state after expiry: ${error.message}`);
      });
      return null;
    }
    
    return emailData;
  },
  
  /**
   * Clear email data for a chat
   * @param {string} chatId - The chat ID
   */
  clearEmail: async (chatId) => {
    if (!chatId) return;
    
    activeEmails.delete(String(chatId));
    console.log(`🧹 Cleared active email data for chat ${chatId}`);
    
    // Persist changes
    await saveStateToFile();
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
  },
  
  /**
   * Force reload from file (for debugging or recovery)
   */
  forceReload: async () => {
    await loadStateFromFile();
    return activeEmails.size;
  }
};

export default EmailStateManager; 