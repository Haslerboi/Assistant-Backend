import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const {
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_WEBHOOK_URL,
  TELEGRAM_WEBHOOK_SECRET
} = process.env;

async function setupWebhook() {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('⚠️ TELEGRAM_BOT_TOKEN is not set in your .env file.');
    process.exit(1);
  }

  if (!TELEGRAM_WEBHOOK_URL) {
    console.error('⚠️ TELEGRAM_WEBHOOK_URL is not set in your .env file.');
    process.exit(1);
  }

  console.log('Setting up Telegram webhook...');

  // First, get current webhook info
  try {
    const infoResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`
    );
    
    const infoData = await infoResponse.json();
    
    if (infoData.ok) {
      console.log('Current webhook info:');
      console.log(JSON.stringify(infoData.result, null, 2));
    } else {
      console.error('Failed to get webhook info:', infoData.description);
    }
  } catch (error) {
    console.error('Error checking webhook info:', error.message);
  }

  // Delete any existing webhook
  try {
    const deleteResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook`
    );
    
    const deleteData = await deleteResponse.json();
    
    if (deleteData.ok) {
      console.log('✅ Successfully deleted existing webhook');
    } else {
      console.error('Failed to delete webhook:', deleteData.description);
    }
  } catch (error) {
    console.error('Error deleting webhook:', error.message);
  }

  // Set the new webhook
  try {
    const webhookOptions = {
      url: TELEGRAM_WEBHOOK_URL,
      allowed_updates: ['message', 'callback_query'],
      drop_pending_updates: true
    };

    const setResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, 
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(webhookOptions)
      }
    );
    
    const setData = await setResponse.json();
    
    if (setData.ok) {
      console.log(`✅ Successfully set webhook to: ${TELEGRAM_WEBHOOK_URL}`);
    } else {
      console.error('Failed to set webhook:', setData.description);
    }
  } catch (error) {
    console.error('Error setting webhook:', error.message);
  }
}

// Run the function
setupWebhook().catch(error => {
  console.error('Unhandled error:', error);
}); 