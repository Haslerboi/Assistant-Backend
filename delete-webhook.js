// Script to manually delete the Telegram webhook
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: join(__dirname, '.env') });

const botToken = process.env.TELEGRAM_BOT_TOKEN;

if (!botToken) {
  console.error('❌ TELEGRAM_BOT_TOKEN is missing in .env file');
  process.exit(1);
}

console.log('Deleting Telegram webhook...');

// First, check the current webhook info
const getWebhookInfoUrl = `https://api.telegram.org/bot${botToken}/getWebhookInfo`;

async function run() {
  try {
    // Get current webhook info
    const infoResponse = await fetch(getWebhookInfoUrl);
    const infoData = await infoResponse.json();
    
    console.log('\nCurrent webhook info:');
    console.log(JSON.stringify(infoData.result, null, 2));
    
    if (infoData.result.url) {
      // Delete the webhook
      const deleteWebhookUrl = `https://api.telegram.org/bot${botToken}/deleteWebhook`;
      const deleteResponse = await fetch(deleteWebhookUrl);
      const deleteData = await deleteResponse.json();
      
      if (deleteData.ok) {
        console.log('\n✅ Webhook successfully deleted!');
        
        // Verify webhook is removed
        const verifyResponse = await fetch(getWebhookInfoUrl);
        const verifyData = await verifyResponse.json();
        
        console.log('\nWebhook status after deletion:');
        console.log(JSON.stringify(verifyData.result, null, 2));
      } else {
        console.error('\n❌ Failed to delete webhook:', deleteData.description);
      }
    } else {
      console.log('\n✅ No webhook is currently set');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

run(); 