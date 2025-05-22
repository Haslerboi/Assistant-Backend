/**
 * Telegram Webhook Proxy
 * 
 * This Cloudflare Worker proxies webhook requests from Telegram to your backend server
 * Copy this code to your Cloudflare Worker
 */

// CONFIGURATION
// Replace with your actual server URL (without trailing slash)
const BACKEND_URL = 'https://your-backend-server.com';

// Replace with your webhook secret (must match TELEGRAM_WEBHOOK_SECRET in your .env)
const WEBHOOK_SECRET = 'your-webhook-secret';

// Path to your webhook endpoint (default: /api/telegram/webhook)
const WEBHOOK_PATH = '/api/telegram/webhook';

/**
 * Handle webhook requests
 */
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

/**
 * Forward webhook requests to backend
 * @param {Request} request - The original request
 */
async function handleRequest(request) {
  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Create URL to forward to backend with secret token
    const url = new URL(BACKEND_URL + WEBHOOK_PATH);
    url.searchParams.append('token', WEBHOOK_SECRET);
    
    // Clone the request and modify it to forward to your backend
    const requestBody = await request.json();
    
    // Log the request (useful for debugging)
    console.log('Forwarding webhook request:', JSON.stringify(requestBody).substring(0, 200) + '...');
    
    // Forward the request to your backend
    const backendResponse = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': request.headers.get('CF-Connecting-IP') || '',
        'User-Agent': request.headers.get('User-Agent') || '',
        'X-Telegram-Proxy': 'Cloudflare-Worker'
      },
      body: JSON.stringify(requestBody)
    });
    
    // Return response from your backend to Telegram
    const responseBody = await backendResponse.text();
    
    return new Response(responseBody, {
      status: backendResponse.status,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error forwarding webhook:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
} 