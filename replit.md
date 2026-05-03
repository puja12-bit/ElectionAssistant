# VoteSeva — India Election Assistant

## Overview
A full-stack AI-powered election assistant for India, built on Node.js/Express (backend) and Vanilla JS (frontend). Supports 6 Indian languages, WCAG 2.1 AA accessibility, and is powered by Google Gemini AI.

## Architecture
- **Backend**: Node.js 20, Express 5, CommonJS (`"type": "commonjs"`), port 5000
- **Frontend**: Vanilla JS, served as static files from `frontend/`
- **AI**: Google Gemini 2.5 Flash via `@google/generative-ai`
- **DB**: Firebase mock (for session state — no real Firebase credentials required)
- **Cache**: `node-cache` for voter search results (10-min TTL)

## Key Features

### Auth / Onboarding Flow
- **First visit**: Onboarding modal appears (India flag gradient background)
- **3 sign-in modes**: Voter ID (EPIC), Name Search, or Guest
- **Voter ID login**: Calls `/api/auth/verify-voter` → searches local voter DB → pre-loads booth details
- **Personalized experience**: After login, hero greeting uses user's name, booth pre-loaded in sidebar + right panel
- **Guest mode**: Full app access, find booth by chatting. Sidebar shows "Guest Mode" banner with sign-in prompt
- **Session persistence**: Saved to `localStorage` as `vsUser` — skips onboarding on revisit

### Chat Decision Engine (3 layers)
1. **Layer 1 — Pattern match** (fast, no AI): Deterministic handlers for:
   - New to area / recently moved
   - Not registered / first-time voter
   - Fake news / rumour / fact-check requests
   - Election process / timeline questions
   - No voter ID (12 alternatives)
   - SOS / emergency
   - Directions to booth
   - At polling station guidance
2. **Layer 2 — Voter DB search**: Matches by EPIC number or name, injects booth data into AI context
3. **Layer 3 — Gemini AI**: Full Gemini 2.5 Flash response with detailed system prompt covering all election scenarios

### Right Panel (desktop only, ≥900px)
- Voter details card (populated after booth found or after EPIC login)
- Election Day Reference: polling hours, ECI helpline 1950, voter roll search, nvsp.in
- Official results: results.eci.gov.in
- Fact-check box with quick AI button
- What-to-Bring checklist

### Languages Supported
English (en-IN), Hindi (hi-IN), Telugu (te-IN), Tamil (ta-IN), Kannada (kn-IN), Marathi (mr-IN)

## API Endpoints
- `POST /api/chat` — Main conversational endpoint
- `POST /api/auth/verify-voter` — Voter ID / name verification (returns booth details)
- `POST /api/auth/verify-google-token` — Google OAuth stub
- `GET /health` — Health check

## Environment Variables
- `GEMINI_API_KEY` — Set as Replit Secret (NOT in .env)
- `PORT` — Set to 5000 in `.env`

## Test Data (voters.json)
8 sample voters including:
- Ravi Kumar, EPIC: ABC1234567, Guntur West, AP
- Priya Sharma, EPIC: XYZ9876543, Indiranagar, Bangalore
- Vikram Singh, EPIC: DLH5566778, Dwarka, Delhi
- (and 5 more across India)

## File Structure
```
backend/
  server.js          — Express app, middleware, routing
  routes/
    chat.js          — Main chat endpoint with 3-layer decision engine
    auth.js          — Voter verification + Google OAuth stub
  services/
    gemini.js        — Gemini AI integration with election-specific system prompt
    voterService.js  — Voter DB search (EPIC/name/location)
    mapService.js    — Google Maps link generation
  config/
    appConfig.js     — Rate limits, SOS config, cache settings
    firebase.js      — Firebase/mock DB setup
  data/
    voters.json      — 8 test voters
  tests/
    integration.test.js  — 34 integration tests (Jest + Supertest)
frontend/
  index.html         — Full app HTML including onboarding modal
  app.js             — Auth flow, chat, personalization, EVM simulator, accessibility
  style.css          — WCAG 2.1 AA styles, dark mode, onboarding styles
```

## GitHub
Remote: `origin https://github.com/puja12-bit/ElectionAssistant`
