// Gmail service for interacting with Gmail API
import { config } from '../../config/env.js';
import { google } from 'googleapis';

/**
 * Create and authorize a Gmail OAuth2 client
 * @returns {Promise<Object>} - The authorized OAuth2 client
 */
export const createOAuth2Client = async () => {
  try {
    console.log('Creating Gmail OAuth2 client with credentials');
    
    // Create the OAuth client
    const oAuth2Client = new google.auth.OAuth2(
      config.gmail.clientId,
      config.gmail.clientSecret,
      config.gmail.redirectUri
    );
    
    // Set credentials using refresh token
    oAuth2Client.setCredentials({
      refresh_token: config.gmail.refreshToken
    });
    
    return oAuth2Client;
  } catch (error) {
    console.error('Error creating OAuth2 client:', error);
    throw new Error('Failed to create OAuth2 client: ' + error.message);
  }
};

/**
 * Get Gmail API client
 * @returns {Promise<Object>} - The Gmail API client
 */
export const getGmailClient = async () => {
  try {
    const auth = await createOAuth2Client();
    return google.gmail({ version: 'v1', auth });
  } catch (error) {
    console.error('Error getting Gmail client:', error);
    throw new Error('Failed to get Gmail client: ' + error.message);
  }
};

/**
 * Fetch recent unread emails with advanced filtering
 * @param {number} maxResults - Maximum number of emails to fetch
 * @returns {Promise<Array>} - Array of filtered email objects
 */
export const fetchUnreadEmails = async (maxResults = 10) => {
  try {
    // Get Gmail API client
    const gmail = await getGmailClient();
    
    console.log(`Gmail Service - Fetching unread emails with filtering`);
    
    // Step 1: List unread emails with advanced query to exclude promotions/social/spam
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread -category:promotions -category:social -category:spam',
      maxResults: maxResults * 2 // Fetch more initially as we'll filter some out
    });
    
    const messages = listResponse.data.messages || [];
    if (!messages.length) {
      console.log('No unread emails found');
      return [];
    }
    
    // Step 2: Get full email details for each message
    const emails = await Promise.all(
      messages.map(async (message) => {
        const response = await gmail.users.messages.get({
          userId: 'me',
          id: message.id
        });
        
        const email = response.data;
        const headers = email.payload.headers;
        
        // Extract relevant headers
        const getHeader = (name) => {
          const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
          return header ? header.value : '';
        };
        
        // Decode the email body content
        let decodedBody = email.snippet;
        
        // Process the parts to find the body content
        if (email.payload.body && email.payload.body.data) {
          decodedBody = Buffer.from(email.payload.body.data, 'base64').toString('utf-8');
        } else if (email.payload.parts) {
          // Try to find a text part
          const textPart = email.payload.parts.find(part => 
            part.mimeType === 'text/plain' || part.mimeType === 'text/html'
          );
          
          if (textPart && textPart.body && textPart.body.data) {
            decodedBody = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
          }
        }
        
        return {
          id: email.id,
          threadId: email.threadId,
          subject: getHeader('subject'),
          sender: getHeader('from'),
          recipient: getHeader('to'),
          date: getHeader('date'),
          snippet: email.snippet,
          body: decodedBody,
          labels: email.labelIds || [],
          isRead: !(email.labelIds || []).includes('UNREAD')
        };
      })
    );
    
    // Step 3: Apply advanced filtering to exclude automated emails
    const filteredEmails = emails.filter(email => {
      const sender = email.sender.toLowerCase();
      const subject = email.subject.toLowerCase();
      const snippet = email.snippet.toLowerCase();
      const contentToCheck = `${subject} ${snippet}`.toLowerCase();

      // Define important addresses that should always be included (whitelist)
      const whitelistedAddresses = [
        'no-reply@studioninja.app',
        'notifications@pixiesetmail.com',
        'form-submission@squarespace.info'
      ];

      // Check if the email is from an important whitelisted address
      for (const whitelistedAddress of whitelistedAddresses) {
        if (sender.includes(whitelistedAddress.toLowerCase())) {
          return true; // Include this email
        }
      }

      // Check if the sender is a common "no-reply" type address
      const noReplyPatterns = [
        'noreply@', 
        'no-reply@', 
        'mailer@', 
        'auto@', 
        'notifications@', 
        'donotreply@', 
        'automated@'
      ];
      for (const pattern of noReplyPatterns) {
        if (sender.includes(pattern)) {
          return false; // Exclude this email
        }
      }

      // Check if the sender is from common automated domains
      const automatedDomains = [
        '@google.com',
        '@apple.com',
        '@adobe.com',
        '@garmin.com',
        '@ird.govt.nz',
        '@microsoft.com',
        '@amazonses.com',
        '@mailchimp.com',
        '@salesforce.com',
        '@sendinblue.com',
        '@sendgrid.net'
      ];
      for (const domain of automatedDomains) {
        if (sender.endsWith(domain)) {
          return false; // Exclude this email
        }
      }

      // Check for automated content keywords in subject or snippet
      const automatedKeywords = [
        'receipt',
        'invoice',
        'newsletter',
        'password reset',
        'subscription',
        'confirm your email',
        'account update',
        'new login',
        'security alert',
        'payment confirmation',
        'shipping update',
        'order confirmation',
        'verify your',
        'welcome to',
        'invitation to',
        'activation',
        'reminder:',
        'weekly update',
        'monthly update'
      ];
      for (const keyword of automatedKeywords) {
        if (contentToCheck.includes(keyword)) {
          return false; // Exclude this email
        }
      }

      // If the email has passed all exclusion filters, include it
      return true;
    });

    // Limit results to the requested maxResults
    const limitedResults = filteredEmails.slice(0, maxResults);
    
    console.log(`Found ${emails.length} unread emails, ${filteredEmails.length} after filtering`);
    
    return limitedResults;
  } catch (error) {
    console.error('Error in Gmail service:', error);
    throw new Error('Failed to fetch emails: ' + error.message);
  }
};

/**
 * Mark an email as read
 * @param {string} messageId - The email message ID
 * @returns {Promise<Object>} - The updated email
 */
export const markAsRead = async (messageId) => {
  try {
    const gmail = await getGmailClient();
    
    const response = await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        removeLabelIds: ['UNREAD'],
        addLabelIds: []
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(`Error marking email ${messageId} as read:`, error);
    throw new Error(`Failed to mark email as read: ${error.message}`);
  }
};

/**
 * Create a draft email
 * @param {Object} emailData - The email data
 * @param {string} emailData.to - Recipient email
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.body - Email body content (HTML or plain text)
 * @param {string} [emailData.threadId] - Optional thread ID to add to
 * @returns {Promise<Object>} - The created draft information
 */
export const createDraft = async ({ to, subject, body, threadId }) => {
  try {
    const gmail = await getGmailClient();
    
    // Construct RFC 2822 formatted email
    const message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      body
    ].join('\r\n');
    
    // Encode the message to base64 URL-safe format
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    const requestBody = {
      message: {
        raw: encodedMessage,
        threadId
      }
    };
    
    const response = await gmail.users.drafts.create({
      userId: 'me',
      requestBody
    });
    
    return {
      id: response.data.id,
      threadId: threadId || 'new-thread',
      message: {
        to,
        subject,
        snippet: body.substring(0, 100) + (body.length > 100 ? '...' : '')
      },
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error in Gmail service:', error);
    throw new Error('Failed to create draft: ' + error.message);
  }
};

/**
 * Create a draft reply to an existing email in the same thread
 * @param {string} originalMessageId - The ID of the original message being replied to
 * @param {string} threadId - The thread ID to maintain conversation
 * @param {string} replyText - The reply content (plain text)
 * @param {string} toEmail - Recipient email address
 * @returns {Promise<Object>} - The created draft information
 */
export const createReplyDraft = async (originalMessageId, threadId, replyText, toEmail) => {
  try {
    const gmail = await getGmailClient();
    
    // Get original message to extract subject
    const originalMessage = await gmail.users.messages.get({
      userId: 'me',
      id: originalMessageId
    });
    
    const headers = originalMessage.data.payload.headers;
    
    // Extract subject from original message
    const getHeader = (name) => {
      const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
      return header ? header.value : '';
    };
    
    let subject = getHeader('subject');
    
    // Add "Re: " prefix to subject if it doesn't already have it
    if (!subject.toLowerCase().startsWith('re:')) {
      subject = `Re: ${subject}`;
    }
    
    console.log(`Gmail Service - Creating reply draft to ${toEmail} in thread ${threadId}`);
    
    // Construct RFC 2822 formatted email for reply
    const message = [
      `To: ${toEmail}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
      `References: <${originalMessageId}>`,
      `In-Reply-To: <${originalMessageId}>`,
      '',
      replyText
    ].join('\r\n');
    
    // Encode the message to base64 URL-safe format
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    const requestBody = {
      message: {
        raw: encodedMessage,
        threadId: threadId
      }
    };
    
    // Create the draft
    const response = await gmail.users.drafts.create({
      userId: 'me',
      requestBody
    });
    
    return {
      id: response.data.id,
      threadId: threadId,
      message: {
        to: toEmail,
        subject: subject,
        snippet: replyText.substring(0, 100) + (replyText.length > 100 ? '...' : '')
      },
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error creating reply draft:', error);
    throw new Error('Failed to create reply draft: ' + error.message);
  }
};

/**
 * Send an email (either a new email or an existing draft)
 * @param {string} [draftId] - Optional draft ID to send
 * @param {Object} [emailData] - The email data (if not using draft)
 * @returns {Promise<Object>} - The sent email information
 */
export const sendEmail = async (draftId, emailData) => {
  try {
    const gmail = await getGmailClient();
    
    if (draftId) {
      // Send existing draft
      console.log(`Gmail Service - Sending existing draft: ${draftId}`);
      const response = await gmail.users.drafts.send({
        userId: 'me',
        requestBody: { id: draftId }
      });
      
      return {
        id: response.data.id,
        threadId: response.data.threadId || 'new-thread-id',
        status: 'sent',
        sentAt: new Date().toISOString()
      };
    } else if (emailData) {
      // Create and send new email
      const draft = await createDraft(emailData);
      return await sendEmail(draft.id);
    } else {
      throw new Error('Either draftId or emailData must be provided');
    }
  } catch (error) {
    console.error('Error in Gmail service:', error);
    throw new Error('Failed to send email: ' + error.message);
  }
};

export default {
  createOAuth2Client,
  getGmailClient,
  fetchUnreadEmails,
  markAsRead,
  createDraft,
  createReplyDraft,
  sendEmail
}; 