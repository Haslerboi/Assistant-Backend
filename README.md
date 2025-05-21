# Email Assistant Backend

A Node.js backend application that connects to Gmail, OpenAI, and SMS services to help manage email communications.

## Features (Planned)

- Gmail API integration for checking and managing emails
- OpenAI integration for email classification and reply generation
- SMS notifications via Twilio (or similar)
- Gmail draft creation for generated replies

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
