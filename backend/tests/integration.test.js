const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const chatRouter = require('../routes/chat');

// Mock dependencies
jest.mock('../services/geminiService', () => ({
    generateResponse: jest.fn().mockResolvedValue('Mocked Response')
}));

jest.mock('../config/firebase', () => ({
    db: {
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ currentStage: 1, voterDetails: null })
        }),
        set: jest.fn().mockResolvedValue(true)
    }
}));

const app = express();
app.use(bodyParser.json());
app.use('/api/chat', chatRouter);

describe('Chat Integration API', () => {
    test('POST /api/chat should return a valid response with session persistence', async () => {
        const response = await request(app)
            .post('/api/chat')
            .send({ 
                sessionId: 'test_session_123', 
                query: 'I am Ravi Kumar', 
                language: 'en-IN' 
            });
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('reply');
    });

    test('POST /api/chat should handle validation errors for empty queries', async () => {
        const response = await request(app)
            .post('/api/chat')
            .send({ sessionId: 'test_session_123', query: '' });
        
        expect(response.status).toBe(400);
    });
});
