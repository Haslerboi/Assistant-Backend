/**
 * Test Telegram Webhook Setup
 * 
 * This script tests your webhook configuration by:
 * 1. Getting the current webhook info from Telegram
 * 2. Deleting the existing webhook (optional)
 * 3. Setting up a new webhook with your configuration
 */

import { config } from './src/config/env.js';
import fetch from 'node-fetch';
import readline from 'readline';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Get Telegram bot token from env or user input
const getBotToken = async () => {
  if (config.telegram.botToken) {
    return config.telegram.botToken;
  }
  
  return new Promise((resolve) => {
    rl.question('Enter your Telegram bot token: ', (answer) => {
      resolve(answer.trim());
    });
  });
};

// Get webhook URL from env or user input
const getWebhookUrl = async () => {
  if (config.telegram.webhookUrl) {
    return config.telegram.webhookUrl;
  }
  
  return new Promise((resolve) => {
    rl.question('Enter your webhook URL (https required): ', (answer) => {
      resolve(answer.trim());
    });
  });
};

// Get webhook info from Telegram
const getWebhookInfo = async (botToken) => {
  console.log('Fetching current webhook info...');
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(data.description || 'Unknown error');
    }
    
    return data.result;
  } catch (error) {
    console.error(`Error getting webhook info: ${error.message}`);
    return null;
  }
};

// Delete existing webhook
const deleteWebhook = async (botToken) => {
  console.log('Deleting existing webhook...');
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`);
    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(data.description || 'Unknown error');
    }
    
    console.log('✅ Existing webhook deleted successfully');
    return true;
  } catch (error) {
    console.error(`Error deleting webhook: ${error.message}`);
    return false;
  }
};

// Set up new webhook
const setWebhook = async (botToken, webhookUrl, secret = '') => {
  console.log(`Setting up webhook to ${webhookUrl}...`);
  
  // Prepare webhook URL with secret if provided
  let fullWebhookUrl = webhookUrl;
  if (secret) {
    // Check if URL already has parameters
    if (webhookUrl.includes('?')) {
      fullWebhookUrl = `${webhookUrl}&token=${secret}`;
    } else {
      fullWebhookUrl = `${webhookUrl}?token=${secret}`;
    }
  }
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
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
    
    if (!data.ok) {
      throw new Error(data.description || 'Unknown error');
    }
    
    console.log('✅ Webhook set up successfully');
    return true;
  } catch (error) {
    console.error(`Error setting webhook: ${error.message}`);
    return false;
  }
};

// Main function
const main = async () => {
  try {
    // Get bot token and webhook URL
    const botToken = await getBotToken();
    if (!botToken) {
      throw new Error('Bot token is required');
    }
    
    // Get current webhook info
    const webhookInfo = await getWebhookInfo(botToken);
    if (webhookInfo) {
      console.log('\nCurrent webhook configuration:');
      console.log(`URL: ${webhookInfo.url || 'None'}`);
      console.log(`Has custom certificate: ${webhookInfo.has_custom_certificate}`);
      console.log(`Pending update count: ${webhookInfo.pending_update_count}`);
      console.log(`Last error: ${webhookInfo.last_error_message || 'None'}`);
      console.log(`Last error time: ${webhookInfo.last_error_date ? new Date(webhookInfo.last_error_date * 1000).toISOString() : 'None'}`);
      console.log(`Max connections: ${webhookInfo.max_connections}`);
      console.log(`Allowed updates: ${webhookInfo.allowed_updates ? webhookInfo.allowed_updates.join(', ') : 'All'}`);
    }
    
    // Ask user if they want to delete the existing webhook
    const shouldDelete = await new Promise((resolve) => {
      rl.question('\nDo you want to delete the existing webhook? (y/N): ', (answer) => {
        resolve(answer.toLowerCase() === 'y');
      });
    });
    
    if (shouldDelete) {
      await deleteWebhook(botToken);
    }
    
    // Ask user if they want to set up a new webhook
    const shouldSetup = await new Promise((resolve) => {
      rl.question('Do you want to set up a new webhook? (Y/n): ', (answer) => {
        resolve(answer.toLowerCase() !== 'n');
      });
    });
    
    if (shouldSetup) {
      const webhookUrl = await getWebhookUrl();
      if (!webhookUrl || !webhookUrl.startsWith('https://')) {
        throw new Error('Webhook URL must start with https://');
      }
      
      // Get webhook secret from env or user input
      const webhookSecret = config.telegram.webhookSecret || await new Promise((resolve) => {
        rl.question('Enter your webhook secret (optional): ', (answer) => {
          resolve(answer.trim());
        });
      });
      
      await setWebhook(botToken, webhookUrl, webhookSecret);
      
      // Get updated webhook info
      console.log('\nFetching updated webhook info...');
      const updatedWebhookInfo = await getWebhookInfo(botToken);
      if (updatedWebhookInfo) {
        console.log('\nUpdated webhook configuration:');
        console.log(`URL: ${updatedWebhookInfo.url || 'None'}`);
        console.log(`Has custom certificate: ${updatedWebhookInfo.has_custom_certificate}`);
        console.log(`Pending update count: ${updatedWebhookInfo.pending_update_count}`);
        console.log(`Last error: ${updatedWebhookInfo.last_error_message || 'None'}`);
      }
    }
    
    console.log('\n🎉 Webhook testing completed!');
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
  } finally {
    rl.close();
  }
};

// Run the main function
main(); 