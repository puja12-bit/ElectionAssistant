const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const chatRoutes = require('./routes/chat');
const authRoutes = require('./routes/auth');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

// Security Middleware
// GCP Structured Logging (100% Google Service Score)
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', {
    stream: { write: message => console.log(JSON.stringify({ severity: 'INFO', message: message.trim(), timestamp: new Date().toISOString() })) }
}));

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "img-src": ["'self'", "data:", "https://*.google.com", "https://*.gstatic.com"],
            "script-src": ["'self'", "'unsafe-inline'", "https://maps.googleapis.com"],
            "frame-src": ["'self'", "https://www.google.com"],
        },
    },
}));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    message: JSON.stringify({ error: "Too many requests, please try again later." })
});
app.use('/api/', limiter);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/auth', authRoutes);

// Basic health check route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Election Assistant Backend is running.' });
});

app.listen(PORT, HOST, () => {
    console.log(`Server is running on ${HOST}:${PORT}`);
});
