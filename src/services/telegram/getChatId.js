#!/usr/bin/env node

/**
 * Telegram Chat ID Capture Script
 * 
 * This script starts a simple Telegram bot that listens for messages
 * and outputs the chat_id of users who send messages to the bot.
 * 
 * Usage:
 * 1. Make sure TELEGRAM_BOT_TOKEN is set in your .env file
 * 2. Run with: node src/services/telegram/getChatId.js
 * 3. Send a message to your bot in Telegram
 * 4. The script will output the chat_id, which you can use in your .env file
 */

import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from '../../config/env.js';

// Get the chat ID from users messaging the bot
async function startChatIdCapture() {
  try {
    // Check if bot token is available
    if (!config.telegram?.botToken) {
      console.error('ERROR: TELEGRAM_BOT_TOKEN is not set in your .env file');
      console.log('Please add your bot token to the .env file and try again.');
      process.exit(1);
    }

    console.log('\n📱 Telegram Chat ID Capture Tool');
    console.log('===============================\n');
    console.log('Bot is starting...');
    
    // Create the bot with polling enabled
    const bot = new TelegramBot(config.telegram.botToken, { polling: true });
    
    console.log('\n✅ Bot is now listening for messages!');
    console.log('Send a message to your bot in Telegram to capture your chat_id');
    console.log('Press Ctrl+C to stop the script when done\n');
    
    // Listen for any message
    bot.on('message', (msg) => {
      const chatId = msg.chat.id;
      const firstName = msg.chat.first_name || 'User';
      const username = msg.chat.username ? `@${msg.chat.username}` : 'No username';
      const chatType = msg.chat.type;
      
      console.log(`\n🔔 New message received!`);
      console.log(`-----------------------------`);
      console.log(`📝 Message: "${msg.text}"`);
      console.log(`👤 From: ${firstName} (${username})`);
      console.log(`🆔 Chat ID: ${chatId}`);
      console.log(`💬 Chat Type: ${chatType}`);
      console.log(`-----------------------------`);
      
      // Send a confirmation message to the user
      bot.sendMessage(chatId, 
        `✅ Your Chat ID has been captured: <code>${chatId}</code>\n\n` +
        `Add this to your .env file as:\n` +
        `<code>TELEGRAM_CHAT_ID=${chatId}</code>`, 
        { parse_mode: 'HTML' }
      );
      
      console.log(`\n📝 Add this to your .env file:`);
      console.log(`TELEGRAM_CHAT_ID=${chatId}\n`);
    });
    
    // Handle errors
    bot.on('polling_error', (error) => {
      console.error('Polling error:', error);
    });
    
  } catch (error) {
    console.error('Error starting the bot:', error);
    process.exit(1);
  }
}

// Start the chat ID capture
startChatIdCapture(); 