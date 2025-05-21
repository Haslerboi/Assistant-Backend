// SMS routes for handling SMS-related endpoints
import { Router } from 'express';
import { receiveSms, receiveMessage, sendSms, getSmsStatus } from '../controllers/sms.js';

const router = Router();

/**
 * @route   POST /api/sms/inbound
 * @desc    Receive inbound SMS from Twilio webhook
 * @access  Public
 */
router.post('/inbound', receiveMessage);

/**
 * @route   POST /api/sms/send
 * @desc    Send SMS notification
 * @access  Private
 */
router.post('/send', sendSms);

/**
 * @route   GET /api/sms/status/:id
 * @desc    Get SMS delivery status
 * @access  Private
 */
router.get('/status/:id', getSmsStatus);

export default router; 