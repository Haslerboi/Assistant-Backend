/**
 * Configure Telegram Webhook Mode
 * 
 * This script sets up your application to use webhook mode for Telegram notifications
 * instead of polling mode.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import dotenv from 'dotenv';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse .env file
const envPath = path.join(__dirname, '.env');
let envConfig = {};

try {
  const envContent = await fs.readFile(envPath, 'utf8');
  envConfig = dotenv.parse(envContent);
} catch (error) {
  console.error(`Error reading .env file: ${error.message}`);
  console.log('Creating new .env file...');
  envConfig = {};
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Get webhook URL from user
const webhookUrl = await new Promise(resolve => {
  const currentWebhookUrl = envConfig.TELEGRAM_WEBHOOK_URL || '';
  
  rl.question(`Enter your webhook URL ${currentWebhookUrl ? `(current: ${currentWebhookUrl})` : ''}: `, (answer) => {
    resolve(answer || currentWebhookUrl);
  });
});

// Generate a webhook secret if needed
const currentSecret = envConfig.TELEGRAM_WEBHOOK_SECRET || '';
const webhookSecret = await new Promise(resolve => {
  rl.question(`Enter a webhook secret for security ${currentSecret ? '(current: ********)' : ''} or press enter to generate one: `, (answer) => {
    if (answer) {
      resolve(answer);
    } else if (currentSecret) {
      resolve(currentSecret);
    } else {
      // Generate a random secret
      const randomSecret = Math.random().toString(36).substring(2, 15) + 
                          Math.random().toString(36).substring(2, 15);
      console.log(`Generated random webhook secret: ${randomSecret}`);
      resolve(randomSecret);
    }
  });
});

// Update environment variables
envConfig.TELEGRAM_USE_WEBHOOK = 'true';
envConfig.TELEGRAM_WEBHOOK_URL = webhookUrl;
envConfig.TELEGRAM_WEBHOOK_SECRET = webhookSecret;

// Save updated .env file
const envContent = Object.entries(envConfig)
  .map(([key, value]) => `${key}=${value}`)
  .join('\n');

await fs.writeFile(envPath, envContent, 'utf8');

console.log('\n✅ Configuration updated successfully!');
console.log('The application is now configured to use webhook mode for Telegram notifications.');
console.log(`Webhook URL: ${webhookUrl}`);
console.log(`Webhook Secret: ${webhookSecret ? '********' : 'None'}`);

// Provide instructions for setting up a proxy if needed
console.log('\n🔧 Next steps:');
console.log('1. Make sure your webhook URL is publicly accessible (HTTPS required)');
console.log('2. If needed, set up a Cloudflare Worker or similar service to proxy requests to your webhook');
console.log('3. Restart your application to apply the changes');
console.log('\nFor more information, see the documentation on webhook setup.');

rl.close(); 