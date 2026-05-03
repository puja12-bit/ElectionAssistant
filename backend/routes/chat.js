const express = require('express');
const router = express.Router();
const geminiService = require('../services/gemini');
const voterService = require('../services/voterService');
const mapService = require('../services/mapService');
const { db } = require('../config/firebase');
const appConfig = require('../config/appConfig');
const { body, validationResult } = require('express-validator');

/**
 * POST /api/chat
 * Main conversational endpoint. Runs a local decision engine before
 * falling back to Gemini for AI-generated responses.
 */
router.post('/', [
    body('sessionId').isString().notEmpty().trim().escape(),
    body('query').isString().notEmpty().trim(),
    body('language').optional().isString().trim().escape(),
    body('contextType').optional().isString().trim().escape(),
    body('name').optional().isString().trim().escape(),
    body('relativeName').optional().isString().trim().escape()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { sessionId, query, contextType = 'general', name, relativeName, language } = req.body;
        const userLanguage = language || 'en-IN';

        let contextString = '';
        let mapLink = null;
        let responseType = 'chat';

        // Retrieve user state from Firebase (or mock DB)
        let userState = { stage: 'not_started', lastQuery: '', voterDetails: null };
        if (sessionId) {
            const userDoc = await db.collection('users').doc(sessionId).get();
            if (userDoc.exists) {
                userState = { ...userState, ...userDoc.data() };
            }
        }

        // Voice-First greeting hint
        if (/(?:hello|start|hi|namaste)/i.test(query) && userLanguage === 'en-IN') {
            contextString += 'GUIDANCE: User is starting fresh. Mention voice command support briefly. ';
        }

        // Re-inject previously found voter details for session continuity
        if (userState.voterDetails) {
            const v = userState.voterDetails;
            contextString += `PERSISTENT DATA: Voter Found — Name: ${v.name}, EPIC: ${v.epicNumber}, Booth: ${v.boothName}, Part: ${v.partNumber}, Serial: ${v.serialNumber}. Use this booth for any guidance. `;
            mapLink = mapService.getBoothLocationLink(v.boothName);
            responseType = 'booth_info';
        }

        // ── DECISION ENGINE ───────────────────────────────────────────────

        // 0. No Voter ID (check before SOS so "lost my voter ID" doesn't trigger SOS)
        if (contextType === 'no_voter_id' || /(?:no voter id|no id|lost (?:my )?voter|voter id missing|missing voter|no voter)/i.test(query)) {
            return res.json({
                reply: '✅ **You CAN vote without a Voter ID!**\n\nIf your name is in the voter list, show any of these 12 alternative IDs:\n\n1. Aadhaar Card\n2. PAN Card\n3. MGNREGA Job Card\n4. Passbook with photo (Bank / Post Office)\n5. Driving License\n6. Passport\n7. Unique Disability ID (UDID)\n8. Health Insurance Smart Card\n9. Smart Card issued under NPR\n10. Pension document with photo\n11. Service ID card (Govt/PSU)\n12. MP/MLA official ID\n\n**Next Step**: Shall I check if your name is in the voter list?',
                type: 'no_id_guide',
                stage: 2
            });
        }

        // 1. SOS / Emergency
        if (/(?:i am lost|help me|where am i|emergency|sos)\b/i.test(query)) {
            return res.json({
                reply: `🚨 **EMERGENCY ASSISTANCE ACTIVATED**\n\nDon't worry — I'm here to help.\n\n1. **Nearest Booth**: ${appConfig.sos.boothDisplay}\n2. **Emergency Helpline**: ${appConfig.sos.helpline} (ECI)\n3. **Action**: Map opened below to guide you safely.`,
                type: 'sos',
                stage: 4,
                mapLink: appConfig.sos.mapUrl
            });
        }

        // 2. Direction intent
        if (/(?:direction|direct|route|map|where is|how to go|booth location|navigate)/i.test(query)) {
            if (userState.voterDetails) {
                const v = userState.voterDetails;
                const mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(v.boothName + ', ' + (v.location || 'India'))}`;
                return res.json({
                    reply: `📍 **Directions to Your Booth**\n\nYour booth: **${v.boothName}**\n\n1. Follow the blue line on the map below.\n2. Approx. 10 minutes from your registered area in ${v.location || 'your locality'}.\n3. Look for **Room No. ${v.partNumber || '2'}** once you arrive.\n\nWould you like step-by-step guidance once you reach the entrance?`,
                    type: 'direction',
                    stage: 4,
                    mapLink: mapUrl
                });
            }
            return res.json({
                reply: '🗺️ **Let\'s find your route!**\n\nTo give you exact directions, I first need your booth details.\n\nPlease share your **EPIC number** (Voter ID) or your **Name and Location**.',
                type: 'booth_search_prompt',
                stage: 3
            });
        }

        // 3. At polling station
        if (/(?:at booth|at station|reached|standing in line|security check|help at booth)/i.test(query) || contextType === 'at_station') {
            const serial = userState.voterDetails?.serialNumber || 'shown on your voter slip';
            const part = userState.voterDetails?.partNumber || 'your designated room';
            return res.json({
                reply: `🏢 **Immediate Steps: At the Polling Station**\n\n**Step 1: Locate your Queue**\nShow your ID to the help-desk outside. Give your **Serial No: ${serial}**.\n\n**Step 2: ID Verification**\nEnter **Room No: ${part}** and show ID to the first officer.\n\n**Step 3: Inking & Register**\nThe second officer inks your left index finger and takes your signature.\n\n**Step 4: Cast Your Vote**\nPress the BLUE button on the EVM. Wait for the **long beep** — your vote is cast!\n\nWould you like to open the EVM practice simulator?`,
                type: 'at_station_guide',
                stage: 5
            });
        }

        // 4. No Voter ID
        if (contextType === 'no_voter_id' || /(?:no id|lost id|missing id|voter id missing|no voter)/i.test(query)) {
            return res.json({
                reply: '✅ **You CAN vote without a Voter ID!**\n\nIf your name is in the voter list, show any of these 12 alternative IDs:\n\n1. Aadhaar Card\n2. PAN Card\n3. MGNREGA Job Card\n4. Passbook with photo (Bank / Post Office)\n5. Driving License\n6. Passport\n7. Unique Disability ID (UDID)\n8. Health Insurance Smart Card\n9. Smart Card issued under NPR\n10. Pension document with photo\n11. Service ID card (Govt/PSU)\n12. MP/MLA official ID\n\n**Next Step**: Shall I check if your name is in the voter list?',
                type: 'no_id_guide',
                stage: 2
            });
        }

        // ── VOTER SEARCH ─────────────────────────────────────────────────
        const nameMatch = query.match(/(?:i am|my name is|i'm)\s+([a-zA-Z\s]+)/i);
        const locMatch = query.match(/(?:from|at|in|near|lives in)\s+([a-zA-Z\s]+)/i);
        const epicMatch = query.match(/[A-Z]{2,3}[0-9]{7,8}/i);

        let searchName = name || (nameMatch ? nameMatch[1].trim() : null);
        let searchLoc = locMatch ? locMatch[1].replace(/[?.!]/g, '').trim() : null;
        const searchEpic = epicMatch ? epicMatch[0].toUpperCase() : null;

        // Single/two-word queries without special chars treated as name searches
        if (!searchName && !searchEpic && query.split(' ').length <= 2 && /^[a-zA-Z\s]+$/.test(query)) {
            searchName = query.trim();
        }

        if (contextType === 'find_booth' || contextType === 'no_voter_id' || searchEpic || (contextType === 'general' && searchName)) {
            const results = voterService.searchVoter({ name: searchName, relativeName, location: searchLoc, epicNumber: searchEpic });

            const filteredResults = (results || []).filter(voter => {
                if (name && (!voter.name || !voter.name.toLowerCase().includes(name.toLowerCase()))) return false;
                if (relativeName && (!voter.relativeName || !voter.relativeName.toLowerCase().includes(relativeName.toLowerCase()))) return false;
                return true;
            });

            if (filteredResults.length > 0) {
                const voter = filteredResults[0];
                userState.voterDetails = voter;
                contextString += `CRITICAL DATA: Voter Found! Name: ${voter.name}, EPIC: ${voter.epicNumber}, Booth: ${voter.boothName}, Part: ${voter.partNumber}, Serial: ${voter.serialNumber}. State this in Step 1. `;
                mapLink = mapService.getBoothLocationLink(voter.boothName);
                responseType = 'booth_info';
            } else if (searchEpic || searchName) {
                contextString += `User provided details (${searchEpic || searchName}) but no match found locally. Direct them to the Voter Assistance Booth near their local school entrance. `;
            }
        }

        // Update journey stage
        if (contextType === 'at_station' || /at booth/i.test(query)) {
            userState.stage = 'at_station';
        } else if (contextType === 'find_booth' || /where/i.test(query)) {
            userState.stage = 'finding_booth';
        } else if (searchName || searchEpic) {
            userState.stage = 'finding_details';
        }

        contextString += `User Stage: ${userState.stage}. `;

        // Persist state
        if (sessionId) {
            await db.collection('users').doc(sessionId).set({
                stage: userState.stage,
                lastQuery: query,
                voterDetails: userState.voterDetails || null,
                updatedAt: new Date().toISOString()
            }, { merge: true });
        }

        // ── GEMINI RESPONSE ──────────────────────────────────────────────
        let aiResponse;
        try {
            aiResponse = await geminiService.generateResponse(query, contextString, userLanguage);
        } catch (err) {
            console.warn('Gemini unavailable, using contextual fallback.', err.message);
            if (responseType === 'booth_info' && contextString.includes('Booth:')) {
                const booth = contextString.match(/Booth: ([^,]+)/)?.[1] || 'your assigned polling station';
                aiResponse = `I found your details!\n\n**Booth**: ${booth}\n**Serial No**: ${contextString.match(/Serial: ([^.]+)/)?.[1] || 'check with officer'}\n\n**Next Steps**:\n1. Reach the station before 5 PM.\n2. Show your ID at the entrance.\n3. Proceed to the voting compartment.`;
            } else {
                aiResponse = 'I am here to help with your voting process. You can ask me about finding your booth, valid IDs, or how to use the EVM machine.';
            }
        }

        res.json({ reply: aiResponse, mapLink, type: responseType });

    } catch (error) {
        console.error('Chat route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
