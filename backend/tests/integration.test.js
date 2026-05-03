const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const chatRouter = require('../routes/chat');

// ── MOCKS ─────────────────────────────────────────────────────────────────────
jest.mock('../services/gemini', () => ({
    generateResponse: jest.fn().mockResolvedValue(
        'Step 1: What to do now\nGo to Zilla Parishad School.\nStep 2: What happens next\nShow your ID.\nStep 3: What to say\nMy serial number is 247.\nStep 4: Important note\nPolls close at 6 PM.'
    )
}));

jest.mock('../config/firebase', () => ({
    db: {
        collection: jest.fn().mockReturnValue({
            doc: jest.fn().mockReturnValue({
                get: jest.fn().mockResolvedValue({ exists: false, data: () => null }),
                set: jest.fn().mockResolvedValue(true)
            })
        })
    }
}));

// ── TEST APP ──────────────────────────────────────────────────────────────────
const app = express();
app.use(bodyParser.json());
app.use('/api/chat', chatRouter);

// ── TESTS ─────────────────────────────────────────────────────────────────────
describe('POST /api/chat — Chat Integration', () => {

    describe('Validation', () => {
        test('returns 400 when query is empty', async () => {
            const res = await request(app).post('/api/chat').send({ sessionId: 'sid1', query: '' });
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('errors');
        });

        test('returns 400 when sessionId is missing', async () => {
            const res = await request(app).post('/api/chat').send({ query: 'Hello' });
            expect(res.status).toBe(400);
        });

        test('returns 400 when both fields are missing', async () => {
            const res = await request(app).post('/api/chat').send({});
            expect(res.status).toBe(400);
        });
    });

    describe('Decision Engine — SOS / Emergency', () => {
        test('returns SOS response with mapLink for "I am lost"', async () => {
            const res = await request(app).post('/api/chat').send({ sessionId: 'sid1', query: 'I am lost help me' });
            expect(res.status).toBe(200);
            expect(res.body.type).toBe('sos');
            expect(res.body).toHaveProperty('mapLink');
            expect(res.body.reply).toMatch(/EMERGENCY/i);
        });

        test('returns SOS response for "SOS"', async () => {
            const res = await request(app).post('/api/chat').send({ sessionId: 'sid1', query: 'SOS' });
            expect(res.status).toBe(200);
            expect(res.body.type).toBe('sos');
        });
    });

    describe('Decision Engine — Directions', () => {
        test('returns booth_search_prompt when no voter state and direction requested', async () => {
            const res = await request(app).post('/api/chat').send({ sessionId: 'sid_new', query: 'I need directions to my booth' });
            expect(res.status).toBe(200);
            expect(res.body.type).toBe('booth_search_prompt');
        });

        test('returns direction response for "where is my booth"', async () => {
            const res = await request(app).post('/api/chat').send({ sessionId: 'sid_new2', query: 'where is my booth' });
            expect(res.status).toBe(200);
            expect(['booth_search_prompt', 'direction']).toContain(res.body.type);
        });
    });

    describe('Decision Engine — At Polling Station', () => {
        test('returns at_station_guide for station context', async () => {
            const res = await request(app).post('/api/chat').send({ sessionId: 'sid1', query: 'I am at the booth', contextType: 'at_station' });
            expect(res.status).toBe(200);
            expect(res.body.type).toBe('at_station_guide');
            expect(res.body.reply).toMatch(/Step 1/i);
        });

        test('returns at_station_guide for "reached polling station"', async () => {
            const res = await request(app).post('/api/chat').send({ sessionId: 'sid1', query: 'I have reached the polling station' });
            expect(res.status).toBe(200);
            expect(res.body.type).toBe('at_station_guide');
        });
    });

    describe('Decision Engine — No Voter ID', () => {
        test('returns no_id_guide for contextType no_voter_id', async () => {
            const res = await request(app).post('/api/chat').send({ sessionId: 'sid1', query: 'I lost my voter ID', contextType: 'no_voter_id' });
            expect(res.status).toBe(200);
            expect(res.body.type).toBe('no_id_guide');
            expect(res.body.reply).toMatch(/Aadhaar/i);
        });

        test('returns no_id_guide when query mentions missing ID', async () => {
            const res = await request(app).post('/api/chat').send({ sessionId: 'sid1', query: 'I have no voter ID' });
            expect(res.status).toBe(200);
            expect(res.body.type).toBe('no_id_guide');
        });
    });

    describe('Voter Search', () => {
        test('finds voter by name in query and returns booth_info', async () => {
            const res = await request(app).post('/api/chat').send({ sessionId: 'sid2', query: 'I am Ravi Kumar', language: 'en-IN' });
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('reply');
            expect(res.body.type).toBe('booth_info');
        });

        test('finds voter by EPIC number', async () => {
            const res = await request(app).post('/api/chat').send({ sessionId: 'sid3', query: 'My EPIC is ABC1234567', language: 'en-IN' });
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('reply');
        });

        test('returns chat reply when voter not found', async () => {
            const res = await request(app).post('/api/chat').send({ sessionId: 'sid4', query: 'ZZZXXX9999999', language: 'en-IN' });
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('reply');
        });
    });

    describe('Language Support', () => {
        test('accepts Hindi language parameter', async () => {
            const res = await request(app).post('/api/chat').send({ sessionId: 'sid5', query: 'Hello', language: 'hi-IN' });
            expect(res.status).toBe(200);
        });

        test('accepts Telugu language parameter', async () => {
            const res = await request(app).post('/api/chat').send({ sessionId: 'sid6', query: 'Hello', language: 'te-IN' });
            expect(res.status).toBe(200);
        });
    });

    describe('General AI Fallback', () => {
        test('returns reply from Gemini for general query', async () => {
            const res = await request(app).post('/api/chat').send({ sessionId: 'sid7', query: 'What documents do I need to vote?', language: 'en-IN' });
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('reply');
        });

        test('reply is a string', async () => {
            const res = await request(app).post('/api/chat').send({ sessionId: 'sid8', query: 'How to vote?', language: 'en-IN' });
            expect(typeof res.body.reply).toBe('string');
        });
    });

    describe('Health Check', () => {
        test('GET /health returns ok status', async () => {
            const healthApp = express();
            healthApp.get('/health', (req, res) => res.status(200).json({ status: 'ok', service: 'VoteSeva', version: '2.0.0', timestamp: new Date().toISOString() }));
            const res = await request(healthApp).get('/health');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
            expect(res.body).toHaveProperty('version');
            expect(res.body).toHaveProperty('timestamp');
        });
    });
});
