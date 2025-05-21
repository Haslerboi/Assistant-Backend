// Gmail service for interacting with Gmail API
import { config } from '../../config/env.js';
import { google } from 'googleapis';

/**
 * Create and authorize a Gmail OAuth2 client
 */
const createOAuth2Client = async () => {
  try {
    console.log('Creating Gmail OAuth2 client with credentials');

    const oAuth2Client = new google.auth.OAuth2(
      config.gmail.clientId,
      config.gmail.clientSecret,
      config.gmail.redirectUri
    );

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
 */
const getGmailClient = async () => {
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
 */
const fetchUnreadEmails = async (maxResults = 10) => {
  try {
    const gmail = await getGmailClient();
    console.log(`Gmail Service - Fetching unread emails with filtering`);

    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread -category:promotions -category:social -category:spam',
      maxResults: maxResults * 2
    });

    const messages = listResponse.data.messages || [];
    if (!messages.length) {
      console.log('No unread emails found');
      return [];
    }

    const emails = await Promise.all(
      messages.map(async (message) => {
        const response = await gmail.users.messages.get({
          userId: 'me',
          id: message.id
        });

        const email = response.data;
        const headers = email.payload.headers;

        const getHeader = (name) => {
          const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
          return header ? header.value : '';
        };

        let decodedBody = email.snippet;

        if (email.payload.body && email.payload.body.data) {
          decodedBody = Buffer.from(email.payload.body.data, 'base64').toString('utf-8');
        } else if (email.payload.parts) {
          const textPart = email.payload.parts.find(part =>
            part.mimeType === 'text/plain' || part.mimeType === 'text/html'
          );
          if (textPart?.body?.data) {
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

    const filteredEmails = emails.filter(email => {
      const sender = email.sender.toLowerCase();
      const subject = email.subject.toLowerCase();
      const snippet = email.snippet.toLowerCase();
      const contentToCheck = `${subject} ${snippet}`.toLowerCase();

      const whitelistedAddresses = [
        'no-reply@studioninja.app',
        'notifications@pixiesetmail.com',
        'form-submission@squarespace.info'
      ];

      for (const whitelistedAddress of whitelistedAddresses) {
        if (sender.includes(whitelistedAddress.toLowerCase())) return true;
      }

      const noReplyPatterns = ['noreply@', 'no-reply@', 'mailer@', 'auto@', 'notifications@', 'donotreply@', 'automated@'];
      for (const pattern of noReplyPatterns) {
        if (sender.includes(pattern)) return false;
      }

      const automatedDomains = [
        '@google.com', '@apple.com', '@adobe.com', '@garmin.com', '@ird.govt.nz', '@microsoft.com',
        '@amazonses.com', '@mailchimp.com', '@salesforce.com', '@sendinblue.com', '@sendgrid.net'
      ];
      for (const domain of automatedDomains) {
        if (sender.endsWith(domain)) return false;
      }

      const automatedKeywords = [
        'receipt', 'invoice', 'newsletter', 'password reset', 'subscription', 'confirm your email',
        'account update', 'new login', 'security alert', 'payment confirmation', 'shipping update',
        'order confirmation', 'verify your', 'welcome to', 'invitation to', 'activation',
        'reminder:', 'weekly update', 'monthly update'
      ];
      for (const keyword of automatedKeywords) {
        if (contentToCheck.includes(keyword)) return false;
      }

      return true;
    });

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
 */
const markAsRead = async (messageId) => {
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
 */
const createDraft = async ({ to, subject, body, threadId }) => {
  try {
    const gmail = await getGmailClient();

    const message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      body
    ].join('\r\n');

    const encodedMessage = Buffer.from(message).toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const response = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: {
          raw: encodedMessage,
          threadId
        }
      }
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
 * Create a reply draft to an existing thread
 */
const createReplyDraft = async (originalMessageId, threadId, replyText, toEmail) => {
  try {
    const gmail = await getGmailClient();

    const originalMessage = await gmail.users.messages.get({
      userId: 'me',
      id: originalMessageId
    });

    const headers = originalMessage.data.payload.headers;
    const getHeader = (name) => {
      const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
      return header ? header.value : '';
    };

    let subject = getHeader('subject');
    if (!subject.toLowerCase().startsWith('re:')) {
      subject = `Re: ${subject}`;
    }

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

    const encodedMessage = Buffer.from(message).toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const response = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: {
          raw: encodedMessage,
          threadId
        }
      }
    });

    return {
      id: response.data.id,
      threadId,
      message: {
        to: toEmail,
        subject,
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
 * Send an email (either by sending a draft or creating and sending from data)
 */
const sendEmail = async (draftId, emailData) => {
  try {
    const gmail = await getGmailClient();

    if (draftId) {
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

/**
 * Check for new client emails and log them (starter polling version)
 */
const checkForNewEmails = async () => {
  try {
    const emails = await fetchUnreadEmails(5);

    if (!emails.length) {
      console.log('📬 No new client emails found.');
      return;
    }

    for (const email of emails) {
      console.log(`📩 New Email: "${email.subject}" from ${email.sender}`);
      await markAsRead(email.id);
    }
  } catch (error) {
    console.error('❌ Error in checkForNewEmails:', error.message);
  }
};

export {
  createOAuth2Client,
  getGmailClient,
  fetchUnreadEmails,
  markAsRead,
  createDraft,
  createReplyDraft,
  sendEmail,
  checkForNewEmails
};
