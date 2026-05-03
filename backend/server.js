const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const chatRoutes = require('./routes/chat');
const authRoutes = require('./routes/auth');
const appConfig = require('./config/appConfig');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

// ── COMPRESSION ─────────────────────────────────────────────────────────────
// Gzip/Brotli all responses — critical for 970M Indian users on slow networks
app.use(compression());

// ── STRUCTURED LOGGING (GCP-compatible) ─────────────────────────────────────
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', {
    stream: {
        write: msg => console.log(JSON.stringify({
            severity: 'INFO',
            message: msg.trim(),
            timestamp: new Date().toISOString()
        }))
    }
}));

// ── SECURITY HEADERS ─────────────────────────────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://maps.googleapis.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https://*.google.com", "https://*.gstatic.com"],
            frameSrc: ["'self'", "https://www.google.com"],
            connectSrc: ["'self'"],
            upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
        }
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// ── RATE LIMITING ────────────────────────────────────────────────────────────
const limiter = rateLimit({
    windowMs: appConfig.rateLimit.windowMs,
    max: appConfig.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: JSON.stringify({ error: 'Too many requests. Please try again later.' })
});
app.use('/api/', limiter);

// ── CORE MIDDLEWARE ──────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// ── STATIC FILES with cache headers ─────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend'), {
    maxAge: appConfig.cache.staticMaxAge,
    etag: true,
    lastModified: true
}));

// ── ROUTES ───────────────────────────────────────────────────────────────────
app.use('/api/chat', chatRoutes);
app.use('/api/auth', authRoutes);

// Health check endpoint (used by Cloud Run and load balancers)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'VoteSeva Election Assistant',
        version: '2.0.0',
        timestamp: new Date().toISOString()
    });
});

// ── 404 HANDLER ─────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// ── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error(JSON.stringify({ severity: 'ERROR', message: err.message, stack: err.stack }));
    res.status(500).json({ error: 'Internal server error' });
});

// ── START ─────────────────────────────────────────────────────────────────────
app.listen(PORT, HOST, () => {
    console.log(JSON.stringify({
        severity: 'INFO',
        message: `VoteSeva server running on ${HOST}:${PORT}`,
        timestamp: new Date().toISOString()
    }));
});

module.exports = app;
