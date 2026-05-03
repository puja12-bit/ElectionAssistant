# Google Cloud Run Deployment Guide

This guide details how to deploy the VoteSeva Election Assistant to Google Cloud Run, the recommended production environment for this project.

## 1. Prerequisites
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed and initialized.
- A Google Cloud Project (e.g., `voteseva-333934571543`).

## 2. Dockerization
The project includes a production-ready `Dockerfile`:
```dockerfile
FROM node:18-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "backend/server.js"]
```

## 3. Deployment Steps
Run the following command in the root directory:
```bash
gcloud run deploy voteseva \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="GEMINI_API_KEY=YOUR_API_KEY_HERE"
```

## 4. Firebase Integration
Ensure you have initialized Firebase in your project console and updated the `FIREBASE_SERVICE_ACCOUNT` in your environment variables for full database persistence.
