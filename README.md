# Email Assistant Backend

A backend service that checks for new emails, analyzes them using AI, and sends notifications to Telegram.

## Features

- Gmail API integration for email monitoring
- OpenAI integration for email analysis and reply generation
- Telegram integration for notifications and user interaction
- Support for both webhook and polling for Telegram integration

## Environment Configuration

Create a `.env` file with the following variables:

```
# Telegram Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
TELEGRAM_USE_WEBHOOK=true
TELEGRAM_WEBHOOK_URL=your_cloudflare_worker_url
TELEGRAM_WEBHOOK_SECRET=

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Gmail Configuration
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token

# App Configuration
PORT=3000
NODE_ENV=development
```

## Local Development

1. Clone the repository
2. Run `npm install` to install dependencies
3. Create `.env` file with required environment variables
4. Run `npm run dev` to start the development server

## Deployment to Railway

### Prerequisites
- A [Railway](https://railway.app) account
- A GitHub repository with your code

### Steps to Deploy

1. Push your code to GitHub:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin your-github-repo-url
   git push -u origin main
   ```

2. Log in to Railway and create a new project
   - Choose "Deploy from GitHub repo"
   - Select your repository
   - Click "Deploy Now"

3. Add environment variables in the Railway dashboard:
   - Go to your project, then Variables tab
   - Add all the variables from your `.env` file
   - Make sure to set `TELEGRAM_USE_WEBHOOK=true`
   - Update `TELEGRAM_WEBHOOK_URL` with your Cloudflare worker URL

4. Update your Cloudflare worker with your Railway app URL:
   - After your app is deployed, Railway will provide a URL (e.g., `https://your-app-name-production.up.railway.app`)
   - Update the `RAILWAY_APP_URL` constant in your Cloudflare worker to this URL
   - Re-deploy your Cloudflare worker with this update

## Cloudflare Worker Setup

1. Create a Cloudflare Workers account at [dash.cloudflare.com](https://dash.cloudflare.com)
2. Create a new worker with the code from `cloudflare-worker.js`
3. Update the `RAILWAY_APP_URL` variable with your Railway app URL
4. Deploy the worker
5. Update your `.env` file with the worker URL as `TELEGRAM_WEBHOOK_URL`

## Testing

- Check webhook status: `GET /api/telegram/webhook-status`
- Send test message: `GET /api/telegram/send-test-message`

## Authentication

Set up your Gmail credentials by following the [Gmail API Quickstart](https://developers.google.com/gmail/api/quickstart/nodejs).

## License

MIT

## Project Structure

```
email-assistant/
├── src/                 # Source code
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Express middleware
│   ├── models/          # Data models
│   ├── routes/          # Route definitions
│   ├── services/        # External API integrations
│   │   ├── gmail/       # Gmail API service
│   │   ├── openai/      # OpenAI service
│   │   └── sms/         # SMS service (Twilio)
│   └── utils/           # Utility functions
├── .env                 # Environment variables (create from env.example)
├── env.example          # Example environment variables
├── .gitignore           # Git ignore file
└── package.json         # Project dependencies and scripts
```

## Setup

1. Clone the repository
2. Copy `env.example` to `.env` and update with your API keys and configuration
3. Install dependencies (when Node.js is available): `npm install`
4. Start the development server: `npm run dev`

## API Endpoints (Planned)

- `POST /sms-inbound`: Endpoint for receiving SMS messages
- `GET /emails`: Get list of processed emails
- More endpoints to be added

## Development

This project uses ES modules (import/export syntax) and is structured to be modular and maintainable as features are added. # Email-assist-ai
