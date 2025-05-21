// Environment variable configuration
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: join(dirname(__dirname), '..', '.env') });

// Configuration object with all environment variables
export const config = {
  // Server configuration
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Gmail API configuration
  gmail: {
    clientId: process.env.GMAIL_CLIENT_ID,
    clientSecret: process.env.GMAIL_CLIENT_SECRET,
    refreshToken: process.env.GMAIL_REFRESH_TOKEN,
    redirectUri: process.env.GMAIL_REDIRECT_URI,
  },
  
  // OpenAI configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  
  // SMS service configuration (Twilio)
  sms: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },
  
  // Telegram configuration
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
  },
};

/**
 * Validate format of API keys and credentials
 * @returns {Object} - Object with validation results
 */
export const validateApiKeyFormats = () => {
  const validationResults = {
    isValid: true,
    issues: [],
  };

  // Validate OpenAI API key format (typically starts with "sk-" and is 51 chars)
  if (process.env.OPENAI_API_KEY && 
      (!process.env.OPENAI_API_KEY.startsWith('sk-') || 
       process.env.OPENAI_API_KEY.length < 40)) {
    validationResults.isValid = false;
    validationResults.issues.push(
      'OPENAI_API_KEY has an invalid format. Should start with "sk-" and be at least 40 characters'
    );
  }

  // Validate Gmail credential formats
  if (process.env.GMAIL_CLIENT_ID && 
      !process.env.GMAIL_CLIENT_ID.endsWith('.apps.googleusercontent.com')) {
    validationResults.isValid = false;
    validationResults.issues.push(
      'GMAIL_CLIENT_ID has an invalid format. Should end with ".apps.googleusercontent.com"'
    );
  }

  // Validate Twilio Account SID format (starts with "AC" and is 34 chars)
  if (process.env.TWILIO_ACCOUNT_SID && 
      (!process.env.TWILIO_ACCOUNT_SID.startsWith('AC') || 
       process.env.TWILIO_ACCOUNT_SID.length !== 34)) {
    validationResults.isValid = false;
    validationResults.issues.push(
      'TWILIO_ACCOUNT_SID has an invalid format. Should start with "AC" and be 34 characters long'
    );
  }

  return validationResults;
};

// Validate required environment variables
export const validateEnv = () => {
  const requiredEnvVars = [
    'GMAIL_CLIENT_ID',
    'GMAIL_CLIENT_SECRET',
    'GMAIL_REFRESH_TOKEN',
    'OPENAI_API_KEY',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER',
  ];
  
  // If in development, make certain variables optional
  const requiredInProduction = [...requiredEnvVars];
  if (process.env.NODE_ENV !== 'production') {
    // In development, only these are absolutely required
    const requiredInDev = ['OPENAI_API_KEY'];
    const optionalInDev = requiredEnvVars.filter(env => !requiredInDev.includes(env));
    
    requiredEnvVars.length = 0;
    requiredEnvVars.push(...requiredInDev);
  }
  
  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  );
  
  // Get missing vars that are only required in production
  const missingProdOnlyVars = process.env.NODE_ENV !== 'production' 
    ? requiredInProduction.filter(
        (envVar) => !requiredEnvVars.includes(envVar) && !process.env[envVar]
      )
    : [];
  
  if (missingEnvVars.length > 0) {
    console.warn(
      `WARNING: Missing required environment variables: ${missingEnvVars.join(
        ', '
      )}`
    );
    
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `Missing required environment variables: ${missingEnvVars.join(', ')}`
      );
    }
  }
  
  // Warn about variables that would be required in production
  if (missingProdOnlyVars.length > 0) {
    console.warn(
      `NOTICE: The following variables would be required in production: ${missingProdOnlyVars.join(
        ', '
      )}`
    );
  }
  
  // Validate API key formats
  const formatValidation = validateApiKeyFormats();
  if (!formatValidation.isValid) {
    formatValidation.issues.forEach(issue => {
      console.warn(`VALIDATION WARNING: ${issue}`);
    });
    
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `API key validation failed: ${formatValidation.issues.join('; ')}`
      );
    }
  }
  
  return true;
};

// Call validateEnv but don't throw in development
validateEnv();

export default { config, validateEnv, validateApiKeyFormats }; 