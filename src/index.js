// Main entry point for the Email Assistant application
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/env.js';
import routes from './routes/index.js';
import { checkForNewEmails } from './services/gmail/index.js'; // ✅ move this here
import telegramPolling from './services/telegram/polling.js';

const app = express();
const PORT = config.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Routes
app.use('/api', routes);

// Health check route
app.get('/', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Email Assistant API is running' });
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
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT} in ${config.NODE_ENV} mode`);
  console.log(`http://localhost:${PORT}`);
  
  // Start Telegram polling (instead of webhooks)
  console.log('Starting Telegram polling service...');
  try {
    // Import the webhook route handler directly
    const telegramWebhookHandler = async (update) => {
      try {
        // Create a request object
        const req = { 
          body: update,
          headers: {},
          protocol: 'http',
          get: () => 'localhost'
        };
        
        // Create a mock response object
        const res = {
          status: (code) => ({ 
            json: (data) => {}
          }),
          json: (data) => {}
        };
        
        // Get the router
        const telegramRouter = (await import('./routes/telegram.js')).default;
        
        // Find and call the webhook POST handler
        const webhookRoute = telegramRouter.stack.find(
          layer => layer.route && layer.route.path === '/webhook' && layer.route.methods.post
        );
        
        if (webhookRoute && webhookRoute.route.stack[0]) {
          await webhookRoute.route.stack[0].handle(req, res);
          return true;
        } else {
          console.error('❌ Could not find Telegram webhook POST handler');
          return false;
        }
      } catch (error) {
        console.error('❌ Error handling update:', error);
        return false;
      }
    };
    
    // Start polling
    await telegramPolling.startPolling(async (update) => {
      return await telegramWebhookHandler(update);
    }, 2000); // Poll every 2 seconds
    
    console.log('✅ Telegram polling service started successfully');
  } catch (error) {
    console.error('❌ Error starting Telegram polling:', error);
  }
});

// ✅ Gmail polling loop
setInterval(() => {
  console.log("🔍 Checking Gmail...");
  checkForNewEmails();
}, 60 * 1000);

export default app;