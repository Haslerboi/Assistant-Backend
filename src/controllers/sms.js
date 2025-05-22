// SMS controller for handling SMS-related requests
import smsService from '../services/sms/index.js';

/**
 * Receive inbound SMS (webhook for Twilio or similar)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const receiveSms = async (req, res, next) => {
  try {
    // Placeholder for SMS receiving logic
    console.log('Received SMS webhook:', req.body);
    
    // Example response structure
    res.status(200).json({
      success: true,
      message: 'SMS received successfully',
      data: {
        id: 'placeholder-id',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error receiving SMS:', error);
    next(error);
  }
};

/**
 * Process incoming SMS messages
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const receiveMessage = (req, res) => {
  // Extract message details - works with Twilio or generic format
  const from = req.body.From || req.body.from || req.body.sender || 'unknown';
  const messageText = req.body.Body || req.body.body || req.body.message || req.body.text || '';
  
  // Log the incoming message details
  console.log('Incoming SMS:');
  console.log(`From: ${from}`);
  console.log(`Message: ${messageText}`);
  
  // Send a simple successful response
  res.status(200).json({
    success: true,
    message: 'Message received'
  });
};

/**
 * Send SMS notification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const sendSms = async (req, res, next) => {
  try {
    const { to, message } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to, message',
      });
    }
    
    // Placeholder for SMS sending logic
    console.log(`Sending SMS to ${to}: ${message}`);
    
    // Example response structure
    res.status(200).json({
      success: true,
      message: 'SMS queued for delivery',
      data: {
        id: 'placeholder-id',
        to,
        status: 'queued',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error sending SMS:', error);
    next(error);
  }
};

/**
 * Get SMS delivery status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getSmsStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: id',
      });
    }
    
    // Placeholder for SMS status checking logic
    console.log(`Checking status of SMS with ID: ${id}`);
    
    // Example response structure
    res.status(200).json({
      success: true,
      data: {
        id,
        status: 'delivered', // placeholder status
        deliveredAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error checking SMS status:', error);
    next(error);
  }
}; 