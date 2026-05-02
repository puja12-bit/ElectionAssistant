# India Election Assistant

An AI-powered, voice-enabled assistant to guide Indian voters through the election process, prioritizing accessibility and practical guidance in crowded environments.

## Features
- **Voice Input & Output:** Built-in speech-to-text and text-to-speech for accessibility.
- **Visual Action Cards:** Easy-to-understand UI replacing standard buttons.
- **Decision Engine:** Automatically handles booth finding and voter ID checking using mock data.
- **EVM Simulator ("WOW" Feature):** A practice mode simulating the Electronic Voting Machine experience.
- **AI Guidance:** Uses Google Gemini to provide structured, step-by-step guidance tailored to the user's specific situation.
- **Firebase Ready:** Configured to integrate with Firebase for session state management.

## Setup Instructions

### Prerequisites
- Node.js installed

### Installation
1. Navigate to the `backend` or root folder (depending on where you run it).
2. Run `npm install` to install dependencies.
3. Copy `.env.example` to `.env` and add your `GEMINI_API_KEY`.

### Running Locally
1. Start the backend server:
   ```bash
   node backend/server.js
   ```
2. Open `frontend/index.html` in your browser (or use a local server like Live Server).

### Deployment to Google Cloud Run
1. Create a `Dockerfile` in the root directory:
   ```dockerfile
   FROM node:18-slim
   WORKDIR /app
   COPY package*.json ./
   RUN npm install --production
   COPY . .
   EXPOSE 3000
   CMD ["node", "backend/server.js"]
   ```
2. Use Google Cloud CLI to deploy:
   ```bash
   gcloud run deploy election-assistant --source . --region us-central1 --allow-unauthenticated
   ```
   *Make sure to set the `GEMINI_API_KEY` environment variable in the Cloud Run console.*

## Tech Stack
- Frontend: HTML, CSS, Vanilla JS
- Backend: Node.js, Express
- AI: Google Gemini (@google/genai)
- State Management: Firebase Admin (Mocked until configured)
