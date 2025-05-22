// Main entry point for the Email Assistant application
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/env.js';
import routes from './routes/index.js';
import { checkForNewEmails } from './services/gmail/index.js'; // ✅ move this here
import telegramPolling from './services/telegram/polling.js';
import logger from './utils/logger.js';

const app = express();
const PORT = config.PORT || 3000;
const APP_INSTANCE_ID = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);

// Configure logger with instance ID
logger.info(`Starting server instance ${APP_INSTANCE_ID}`, { instanceId: APP_INSTANCE_ID });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Routes
app.use('/api', routes);

// Health check route
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Email Assistant API is running',
    instanceId: APP_INSTANCE_ID
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Starting server instance ${APP_INSTANCE_ID}`, { instanceId: APP_INSTANCE_ID });
  console.log(`Server running on port ${PORT} in ${config.NODE_ENV} mode`);
  console.log(`Instance ID: ${APP_INSTANCE_ID}`);
  console.log(`http://localhost:${PORT}`);
});

// Add support for both webhook and polling modes
if (config.telegram.useWebhook) {
  logger.info('Using webhook mode for Telegram', { tag: 'telegram' });
  console.log('✅ Using webhook mode for Telegram notifications');
  
  // If we have a webhook URL configured, set it up
  if (config.telegram.webhookUrl) {
    fetch(`https://api.telegram.org/bot${config.telegram.botToken}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: config.telegram.webhookUrl,
        allowed_updates: ['message', 'callback_query']
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.ok) {
        logger.info(`Successfully set webhook to ${config.telegram.webhookUrl}`, { tag: 'telegram' });
        console.log(`✅ Webhook set to ${config.telegram.webhookUrl}`);
      } else {
        logger.error(`Failed to set webhook: ${data.description}`, { tag: 'telegram' });
        console.error(`❌ Failed to set webhook: ${data.description}`);
      }
    })
    .catch(error => {
      logger.error(`Error setting webhook: ${error.message}`, { tag: 'telegram' });
      console.error(`❌ Error setting webhook: ${error.message}`);
    });
  } else {
    logger.warn('Webhook mode enabled but no webhook URL provided', { tag: 'telegram' });
    console.warn('⚠️ Webhook mode enabled but no webhook URL provided');
  }
} else {
  // Start polling service after a short delay
  console.log('Starting Telegram polling service...');
  const startupDelay = Math.random() * 3000; // Random delay up to 3 seconds
  console.log(`Delaying Telegram polling startup by ${Math.round(startupDelay)}ms to reduce conflicts...`);
  
  setTimeout(() => {
    logger.info('Starting Telegram polling service', { tag: 'telegram' });
    import('./services/telegram/polling.js')
      .then(telegramPolling => {
        // Import and use processUpdate directly from controller
        import('./controllers/telegram.js')
          .then(telegramController => {
            // Define the handler that will process updates
            const handleUpdate = async (update) => {
              try {
                if (update.message) {
                  const message = update.message;
                  const chatId = message.chat.id;
                  const text = message.text;
                  
                  if (!text) {
                    console.log('Received non-text message, ignoring');
                    return { success: false, error: 'Non-text message' };
                  }
                  
                  console.log(`Received message from ${message.from?.first_name || 'user'} (${chatId}): ${text}`);
                  
                  // Process the message using our imported services
                  import('./services/email-state.js')
                    .then(EmailStateModule => {
                      const EmailStateManager = EmailStateModule.default;
                      const activeEmail = EmailStateManager.getEmail(chatId);
                      
                      import('./services/telegram/index.js')
                        .then(async telegramService => {
                          if (activeEmail) {
                            // Process response to active email
                            await telegramService.processEmailResponse(chatId, text, activeEmail);
                          } else {
                            // No active email, handle as general user input
                            await telegramService.handleUserInput(chatId, text);
                          }
                        });
                    });
                  
                  return { success: true };
                }
                
                return { success: false, error: 'Unsupported update type' };
              } catch (error) {
                logger.error(`Error in handleUpdate: ${error.message}`, {
                  tag: 'telegram',
                  error: error.stack
                });
                console.error(`❌ Error processing update: ${error.message}`);
                return { success: false, error: error.message };
              }
            };
            
            telegramPolling.default.startPolling(handleUpdate, 3000 + Math.random() * 2000);
            console.log('✅ Telegram polling service started successfully');
          })
          .catch(error => {
            logger.error(`Failed to import telegram controller: ${error.message}`, { tag: 'telegram' });
            console.error(`❌ Failed to start Telegram polling: ${error.message}`);
          });
      })
      .catch(error => {
        logger.error(`Failed to start Telegram polling: ${error.message}`, { tag: 'telegram' });
        console.error(`❌ Failed to start Telegram polling: ${error.message}`);
      });
  }, startupDelay);
}

// ✅ Gmail polling loop
const GMAIL_CHECK_INTERVAL = 60 * 1000; // 1 minute
let gmailCheckCount = 0;

const checkGmail = () => {
  gmailCheckCount++;
  console.log(`🔍 Checking Gmail... (Check #${gmailCheckCount}, Instance ${APP_INSTANCE_ID})`);
  
  // Add jitter to avoid synchronization between instances
  const nextCheckDelay = GMAIL_CHECK_INTERVAL + (Math.random() * 10000);
  
  checkForNewEmails().finally(() => {
    setTimeout(checkGmail, nextCheckDelay);
  });
};

// Start Gmail checking with initial delay to reduce startup load
setTimeout(checkGmail, 15000 + Math.floor(Math.random() * 10000));

export default app;