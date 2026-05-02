const express = require('express');
const router = express.Router();
const geminiService = require('../services/gemini');
const voterService = require('../services/voterService');
const mapService = require('../services/mapService');
const { db } = require('../config/firebase');

// Decision Engine logic built into the route
router.post('/', async (req, res) => {
    try {
        const { sessionId, query, contextType, name, relativeName, language } = req.body;
        const userLanguage = language || 'en-IN';

        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        let contextString = "";
        let mapLink = null;
        let responseType = "chat";

        // Fetch user state from Firebase
        let userState = { stage: 'not_started', lastQuery: '', voterDetails: null };
        if (sessionId) {
            const userDoc = await db.collection('users').doc(sessionId).get();
            if (userDoc.exists) {
                userState = { ...userState, ...userDoc.data() };
            }
        }

        // If we already have voterDetails in the session, use them to build context immediately
        if (userState.voterDetails) {
            const v = userState.voterDetails;
            contextString += `PERSISTENT DATA: Previously Found Voter - Name: ${v.name}, EPIC: ${v.epicNumber}, Booth: ${v.boothName}, Part: ${v.partNumber}, Serial: ${v.serialNumber}. IF THE USER ASKS FOR GUIDANCE, USE THIS BOOTH. `;
            mapLink = mapService.getBoothLocationLink(v.boothName);
            responseType = "booth_info";
        }

        // Decision Engine: Intercept specific contexts or extract from general query
        let searchName = name;
        let searchLoc = null;

        // Improved intent detection for "I am [Name] from [Location]" or EPIC numbers
        const nameMatch = query.match(/(?:i am|my name is|i'm)\s+([a-zA-Z]+)/i);
        const locMatch = query.match(/(?:from|at|in|near|lives in)\s+([a-zA-Z\s]+)/i);
        const epicMatch = query.match(/[A-Z]{3}[0-9]{7}|[A-Z]{2}[0-9]{8}/i); // Common EPIC formats
        
        if (nameMatch) searchName = nameMatch[1];
        if (locMatch) searchLoc = locMatch[1].replace(/[\?\.!]/g, '').trim();
        const searchEpic = epicMatch ? epicMatch[0].toUpperCase() : null;
        
        // If the query is just a name (1-2 words), treat it as a name
        if (!searchName && !searchEpic && query.split(' ').length <= 2 && /^[a-zA-Z\s]+$/.test(query)) {
            searchName = query.trim();
        }

        if (contextType === 'find_booth' || contextType === 'no_voter_id' || searchEpic || (contextType === 'general' && searchName)) {
            const results = voterService.searchVoter(searchName, relativeName, searchLoc, searchEpic);
            if (results && results.length > 0) {
                const voter = results[0];
                userState.voterDetails = voter; // Store for persistence
                contextString += `CRITICAL DATA: Voter Found! Name: ${voter.name}, EPIC: ${voter.epicNumber}, Booth: ${voter.boothName}, Part: ${voter.partNumber}, Serial: ${voter.serialNumber}. YOU MUST USE THIS DATA IN STEP 1. `;
                mapLink = mapService.getBoothLocationLink(voter.boothName);
                responseType = "booth_info";
            } else if (searchEpic || searchName) {
                contextString += `User provided details (${searchEpic || searchName}) but no match found in local database. Guide them to the 'Voter Assistance Booth' at their local school or polling center entrance. `;
            }
        }

        if (contextType === 'at_station' || query.toLowerCase().includes('at booth')) {
            userState.stage = 'at_station';
        } else if (contextType === 'find_booth' || query.toLowerCase().includes('where')) {
            userState.stage = 'finding_booth';
        } else if (searchName || searchEpic) {
            userState.stage = 'finding_details';
        }

        // Save updated state back to Firebase
        if (sessionId) {
            await db.collection('users').doc(sessionId).set({
                stage: userState.stage,
                lastQuery: query,
                voterDetails: userState.voterDetails,
                updatedAt: new Date().toISOString()
            }, { merge: true });
        }

        // Add user state to context
        contextString += `User Current Stage: ${userState.stage}. `;

        // Call Gemini
        let aiResponse;
        try {
            aiResponse = await geminiService.generateResponse(query, contextString, userLanguage);
        } catch (error) {
            console.error("Gemini failed, using fallback logic if possible.");
            if (responseType === "booth_info") {
                // Generate a manual response if we have the voter data but AI failed
                aiResponse = `Step 1: Go to your assigned polling booth.
Step 2: Reach ${contextString.match(/Booth: ([^,]+)/)[1]}.
Step 3: Show your ID and mention you are serial number ${contextString.match(/Serial No: (\d+)/)[1]}.
Step 4: Important: Reach before 5 PM to ensure you can vote.`;
            } else {
                throw error;
            }
        }

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
