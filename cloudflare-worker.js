/**
 * Cloudflare Worker script to forward Telegram webhook requests to your Railway app
 *
 * This script acts as a proxy/forwarder between Telegram and your Railway app.
 * Telegram requires HTTPS for webhooks, and this allows you to receive webhooks
 * even when your Railway app only exposes HTTP endpoints.
 */

// Your Railway app URL (update this with your actual Railway app URL)
const RAILWAY_APP_URL = 'https://email-assistant-backend-production.up.railway.app';

// Optional secret token for additional security
const WEBHOOK_SECRET = ''; // Add a secret here if configured in your app

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // Only allow POST requests (which is what Telegram uses for webhooks)
  if (request.method !== 'POST') {
    return new Response('This endpoint only accepts POST requests from Telegram', { status: 405 });
  }

  try {
    // Clone the request so we can read the body
    const telegramRequest = request.clone();
    
    // Read the telegram update data
    const telegramData = await telegramRequest.json();
    
    // Log the update for debugging (optional)
    console.log('Received Telegram update:', JSON.stringify(telegramData));

    // Build URL for your Railway app
    const forwardUrl = `${RAILWAY_APP_URL}/api/telegram/webhook`;
    const forwardUrlWithSecret = WEBHOOK_SECRET 
      ? `${forwardUrl}?token=${WEBHOOK_SECRET}` 
      : forwardUrl;

    // Forward the request to your Railway app
    const railwayResponse = await fetch(forwardUrlWithSecret, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-From': 'Cloudflare-Worker',
      },
      body: JSON.stringify(telegramData),
    });

    // Check if the request was successful
    if (!railwayResponse.ok) {
      const errorText = await railwayResponse.text();
      console.error(`Error forwarding to Railway: ${railwayResponse.status} ${errorText}`);
      return new Response(`Error forwarding request: ${railwayResponse.status}`, { status: 500 });
    }

    // Return the response from your Railway app
    const responseData = await railwayResponse.json();
    return new Response(JSON.stringify(responseData), {
      headers: { 'Content-Type': 'application/json' },
      status: railwayResponse.status,
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(`Error processing webhook: ${error.message}`, { status: 500 });
  }
} 