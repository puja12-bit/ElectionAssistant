FROM node:18-slim

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install --production

# Bundle app source
COPY . .

# Cloud Run expects the app to listen on the port provided by the PORT env var
# We'll default to 3000 in server.js but Cloud Run will override it
EXPOSE 8080

# Run the app
CMD [ "node", "backend/server.js" ]
