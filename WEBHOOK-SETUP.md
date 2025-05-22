# Telegram Webhook Setup Guide

This guide explains how to set up your Email Assistant to use webhook mode for Telegram notifications instead of polling mode.

## Why Use Webhook Mode?

1. **More Efficient**: Webhook mode receives updates instantly without constant polling
2. **More Reliable**: No issues with multiple instances causing polling conflicts
3. **Faster Responses**: Immediate delivery of messages without polling delays
4. **Lower Resource Usage**: Reduces server load and API requests

## Requirements

To use webhook mode, you need:

1. A publicly accessible HTTPS URL (Telegram only supports HTTPS)
2. A server that can receive webhook requests
3. Your Telegram Bot Token

## Setup Options

You have two main options for setting up webhook mode:

### Option 1: Direct Webhook (if you have a public HTTPS server)

If your server has a public HTTPS URL, you can configure Telegram to send webhooks directly to it.

1. Run the configuration script:
   ```
   node configure-webhook.js
   ```

2. Enter your public HTTPS URL in the format:
   ```
   https://your-domain.com/api/telegram/webhook
   ```

3. Test your webhook configuration:
   ```
   node test-webhook.js
   ```

4. Make sure `TELEGRAM_USE_WEBHOOK=true` is set in your `.env` file

### Option 2: Using a Proxy (recommended for most deployments)

If you don't have a public HTTPS URL, you can use a proxy service like Cloudflare Workers.

1. Create a Cloudflare Worker at [workers.cloudflare.com](https://workers.cloudflare.com)

2. Copy the code from `cloudflare-worker-template.js` to your worker

3. Update the configuration variables in the worker:
   ```javascript
   const BACKEND_URL = 'https://your-backend-server.com'; // Your Railway or other hosting URL
   const WEBHOOK_SECRET = 'your-webhook-secret';          // A secret token for security
   ```

4. Run the configuration script to set up your environment:
   ```
   node configure-webhook.js
   ```

5. Use the Cloudflare Worker URL as your webhook URL:
   ```
   https://your-worker.your-subdomain.workers.dev
   ```

6. Test your webhook configuration:
   ```
   node test-webhook.js
   ```

## Troubleshooting

### Common Issues

1. **Webhook URL not working**:
   - Ensure the URL is publicly accessible
   - Verify it uses HTTPS (not HTTP)
   - Check your server/worker logs for errors

2. **Telegram reports "webhook failed"**:
   - Ensure your server responds with a 200 OK status code
   - Verify the URL is correct and accessible
   - Check server/worker logs for errors

3. **No messages being received**:
   - Verify the webhook is set correctly using `test-webhook.js`
   - Check your server logs for incoming requests
   - Ensure your Telegram bot is properly configured

### Testing Your Webhook

You can use the `test-webhook.js` script to verify your webhook configuration:

```
node test-webhook.js
```

This will show you the current webhook status and allow you to update it if needed.

## Switching Back to Polling Mode

If you need to switch back to polling mode:

1. Edit your `.env` file and set:
   ```
   TELEGRAM_USE_WEBHOOK=false
   ```

2. Delete the webhook from Telegram:
   ```
   node test-webhook.js
   ```
   Then select "yes" when asked if you want to delete the webhook.

3. Restart your application.

## Additional Resources

- [Telegram Bot API Documentation](https://core.telegram.org/bots/api#setwebhook)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Railway Documentation](https://docs.railway.app/) 