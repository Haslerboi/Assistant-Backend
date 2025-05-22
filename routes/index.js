// Main router that combines all route modules
import { Router } from 'express';
import smsRoutes from './sms.js';
import telegramRoutes from './telegram.js';

const router = Router();

// Welcome route
router.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the Email Assistant API',
    version: '1.0.0',
    endpoints: {
      sms: '/api/sms',
      telegram: '/api/telegram',
      // Future endpoints will be added here
    },
  });
});

// Mount route modules
router.use('/sms', smsRoutes);
router.use('/telegram', telegramRoutes);

// Future route modules will be mounted here
// router.use('/emails', emailRoutes);
// router.use('/auth', authRoutes);

export default router; 