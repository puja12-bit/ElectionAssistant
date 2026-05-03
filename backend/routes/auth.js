const express = require('express');
const router = express.Router();
const voterService = require('../services/voterService');
const { body, validationResult } = require('express-validator');

/**
 * POST /api/auth/verify-voter
 * Lets the user verify their identity by EPIC number or name.
 * Returns their voter record (without sensitive fields) so the frontend
 * can personalise the assistant experience.
 */
router.post('/verify-voter', [
    body('epicNumber').optional().isString().trim().escape(),
    body('name').optional().isString().trim().escape(),
    body('relativeName').optional().isString().trim().escape(),
    body('location').optional().isString().trim().escape()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { epicNumber, name, relativeName, location } = req.body;

    if (!epicNumber && !name) {
        return res.status(400).json({ error: 'Please provide an EPIC number or your name to verify.' });
    }

    const results = voterService.searchVoter({ epicNumber, name, relativeName, location });

    if (!results || results.length === 0) {
        return res.json({
            found: false,
            message: 'No matching record found. You can still use VoteSeva as a guest, or check electoralsearch.eci.gov.in to verify your registration.'
        });
    }

    const voter = results[0];
    return res.json({
        found: true,
        voter: {
            name: voter.name,
            epicNumber: voter.epicNumber,
            boothName: voter.boothName,
            partNumber: voter.partNumber,
            serialNumber: voter.serialNumber,
            location: voter.location
        }
    });
});

/**
 * POST /api/auth/verify-google-token
 * Stub for Google OAuth — returns a mock session for demo purposes.
 * In production, replace with Firebase Admin SDK token verification.
 */
router.post('/verify-google-token', (req, res) => {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'Token missing' });
    const mockUser = { uid: 'google_user_123', email: 'voter@example.com', name: 'Verified Voter' };
    res.json({ success: true, user: mockUser });
});

module.exports = router;
