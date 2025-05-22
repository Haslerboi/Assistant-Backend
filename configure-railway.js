#!/usr/bin/env node
// Script to generate Railway environment variable configuration for webhook mode

import readline from 'readline';
import { exec } from 'child_process';
import { promises as fs } from 'fs';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function getRepoUrl() {
  return new Promise((resolve, reject) => {
    exec('git config --get remote.origin.url', (error, stdout, stderr) => {
      if (error) {
        console.error('Error getting repository URL:', error);
        resolve('unknown');
        return;
      }
      resolve(stdout.trim());
    });
  });
}

async function run() {
  console.log('\n📋 Railway Configuration Helper for Webhook Mode\n');
  
  console.log('This script will help you set up the correct environment variables for Railway deployment with webhook mode.');
  console.log('Make sure you have already created your project on Railway and have the Railway CLI installed.\n');
  
  const webhookUrl = await askQuestion('Enter your Cloudflare webhook URL (e.g., https://your-subdomain.workers.dev/telegram-webhook): ');
  const botToken = await askQuestion('Enter your Telegram Bot Token (or press Enter to use the one from .env): ');
  
  console.log('\nGenerating configuration...\n');
  
  let envConfig = '';
  
  // Try to read existing .env file for reference
  try {
    const envData = await fs.readFile('.env', 'utf8');
    const lines = envData.split('\n');
    
    for (const line of lines) {
      if (line.trim() && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=');
        
        // Skip the webhook-specific variables as we'll set them manually
        if (key === 'TELEGRAM_USE_WEBHOOK' || key === 'TELEGRAM_WEBHOOK_URL') {
          continue;
        }
        
        // Use provided bot token if available
        if (key === 'TELEGRAM_BOT_TOKEN' && botToken) {
          envConfig += `TELEGRAM_BOT_TOKEN=${botToken}\n`;
        } else {
          envConfig += `${line}\n`;
        }
      }
    }
  } catch (error) {
    console.log('Could not read .env file, creating minimal configuration...');
    if (botToken) {
      envConfig += `TELEGRAM_BOT_TOKEN=${botToken}\n`;
    }
  }
  
  // Add webhook configuration
  envConfig += 'TELEGRAM_USE_WEBHOOK=true\n';
  envConfig += `TELEGRAM_WEBHOOK_URL=${webhookUrl}\n`;
  
  const repoUrl = await getRepoUrl();
  console.log(`\nRepository URL: ${repoUrl}`);
  
  // Generate the Railway commands
  console.log('\n📝 Railway Configuration Steps:\n');
  console.log('1. Run these commands to set up your Railway project:\n');
  console.log('   railway login');
  console.log('   railway link    # Link to your existing project');
  console.log('   railway variables set PORT=8080');
  console.log('   railway variables set TELEGRAM_USE_WEBHOOK=true');
  console.log(`   railway variables set TELEGRAM_WEBHOOK_URL=${webhookUrl}`);
  
  if (botToken) {
    console.log(`   railway variables set TELEGRAM_BOT_TOKEN=${botToken}`);
  }
  
  console.log('\n2. Make sure your start script in package.json is correct:');
  console.log('   "start": "node src/index.js"');
  
  console.log('\n3. Push your code to GitHub and deploy from the Railway dashboard');
  
  console.log('\n🚀 Additional Configuration Tips:');
  console.log('- Check that your Cloudflare worker is correctly configured');
  console.log('- Verify your bot is receiving updates using the /getWebhookInfo endpoint');
  console.log('- Use Railway logs to debug any issues during startup');
  
  // Write the configuration to a file for reference
  try {
    await fs.writeFile('railway-env-reference.txt', envConfig);
    console.log('\n✅ Saved reference configuration to railway-env-reference.txt');
  } catch (error) {
    console.error('Error saving configuration file:', error);
  }
  
  rl.close();
}

run().catch(error => {
  console.error('Error:', error);
  rl.close();
}); 