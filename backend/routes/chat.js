const express = require('express');
const router = express.Router();
const geminiService = require('../services/gemini');
const voterService = require('../services/voterService');
const mapService = require('../services/mapService');
const { db } = require('../config/firebase');

// Decision Engine logic built into the route
router.post('/', async (req, res) => {
    try {
        const { sessionId, query, contextType, name, relativeName } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        let contextString = "";
        let mapLink = null;
        let responseType = "chat";

        // Fetch user state from Firebase
        let userState = { stage: 'before', lastQuery: '' };
        if (sessionId) {
            const userDoc = await db.collection('users').doc(sessionId).get();
            if (userDoc.exists) {
                userState = { ...userState, ...userDoc.data() };
            }
        }

        // Decision Engine: Intercept specific contexts
        if (contextType === 'find_booth' || contextType === 'no_voter_id') {
            if (name) {
                const results = voterService.searchVoter(name, relativeName);
                if (results && results.length > 0) {
                    const voter = results[0]; // Take the first match for simplicity
                    contextString += `User found in voter list. Name: ${voter.name}, Booth: ${voter.boothName}, Part No: ${voter.partNumber}, Serial No: ${voter.serialNumber}. `;
                    mapLink = mapService.getBoothLocationLink(voter.boothName);
                    responseType = "booth_info";
                } else {
                    contextString += `User not found in the dummy voter list. Tell them clearly they cannot vote if their name is not in the list. `;
                }
            } else {
                contextString += `Ask the user for their name and father's/husband's name to search the voter list. `;
            }
        }

        if (contextType === 'at_station') {
            contextString += `User is currently at the polling station. Focus on queueing, ID verification, and EVM usage. `;
            userState.stage = 'during';
        }

        // Save updated state back to Firebase
        if (sessionId) {
            await db.collection('users').doc(sessionId).set({
                stage: userState.stage,
                lastQuery: query,
                updatedAt: new Date().toISOString()
            }, { merge: true });
        }

        // Add user state to context
        contextString += `User Stage: ${userState.stage}. `;

        // Call Gemini
        const aiResponse = await geminiService.generateResponse(query, contextString);

        res.json({
            reply: aiResponse,
            mapLink: mapLink,
            type: responseType
        });

    } catch (error) {
        console.error("Chat route error:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
