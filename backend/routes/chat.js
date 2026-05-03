const express = require('express');
const router = express.Router();
const geminiService = require('../services/gemini');
const voterService = require('../services/voterService');
const mapService = require('../services/mapService');
const { db } = require('../config/firebase');
const { body, validationResult } = require('express-validator');

// Decision Engine logic built into the route
router.post('/', [
    body('sessionId').isString().notEmpty().trim().escape(),
    body('query').isString().notEmpty().trim(),
    body('language').optional().isString().trim().escape()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { sessionId, query, contextType = 'general', name, relativeName, language } = req.body;
        const userLanguage = language || 'en-IN';

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

        // Voice-First Orientation for Blind Users
        if (query.match(/(?:hello|start|hi|namaste)/i) && userLanguage === 'en-IN') {
            contextString += "GUIDANCE: User is starting. Mention that they can use voice commands at any time. ";
        }
        if (userState.voterDetails) {
            const v = userState.voterDetails;
            contextString += `PERSISTENT DATA: Previously Found Voter - Name: ${v.name}, EPIC: ${v.epicNumber}, Booth: ${v.boothName}, Part: ${v.partNumber}, Serial: ${v.serialNumber}. IF THE USER ASKS FOR GUIDANCE, USE THIS BOOTH. `;
            mapLink = mapService.getBoothLocationLink(v.boothName);
            responseType = "booth_info";
        }

        // Decision Engine: Intercept specific contexts or extract from general query
        let searchName = name;
        let searchLoc = null;

        // 1. SOS / Emergency Mode
        const sosMatch = query.match(/(?:i am lost|help me|lost|where am i|emergency|sos)/i);
        if (sosMatch) {
            return res.json({
                reply: "🚨 **EMERGENCY ASSISTANCE ACTIVATED**\n\nDon't worry, I am here to help. \n\n1. **Your Nearest Booth**: Zilla Parishad School (Guntur West)\n2. **Emergency Help**: 1950 (ECI Helpline)\n3. **Action**: I have opened the map below to guide you safely.",
                type: 'sos',
                stage: 4,
                mapLink: "https://www.google.com/maps/dir/?api=1&destination=Zilla+Parishad+High+School+Guntur"
            });
        }

        // 2. Direction Intent (CRITICAL FIX)
        const directionMatch = query.match(/(?:direction|direct|route|map|where is|how to go|booth location|navigate)/i);
        if (directionMatch) {
            if (userState.voterDetails) {
                const voter = userState.voterDetails;
                const mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(voter.boothName + ", " + voter.location)}`;
                return res.json({
                    reply: `📍 **Directions to your Booth**\n\nI have found your booth: **${voter.boothName}**.\n\n**Step-by-Step Route:**\n1. Follow the blue line on the map below.\n2. It's approximately 10 minutes from your registered area in ${voter.location}.\n3. Once you arrive, look for **Room No. ${voter.partNumber || '2'}**.\n\nWould you like me to guide you through the entrance steps now?`,
                    type: 'direction',
                    stage: 4,
                    mapLink: mapUrl
                });
            } else {
                return res.json({
                    reply: "🗺️ **Let's find your route!**\n\nTo give you the exact directions, I first need to know which booth is yours. \n\nPlease provide your **EPIC number** (Voter ID) or your **Name and Location**. \n\nOnce you do, I will show you the exact map and turn-by-turn directions.",
                    type: 'booth_search_prompt',
                    stage: 3
                });
            }
        }
        // 3. At Polling Station Context (ACTION-FIRST FIX)
        const atStationMatch = query.match(/(?:at booth|at station|reached|standing in line|security check|help at booth)/i);
        if (atStationMatch || contextType === 'at_station') {
            const serial = userState.voterDetails?.serialNumber || 'to be checked with officer';
            const part = userState.voterDetails?.partNumber || 'your designated room';
            return res.json({
                reply: `🏢 **Immediate Steps: At the Polling Station**\n\nI see you are at the booth. Follow these exact steps for a fast vote:\n\n**Step 1: Locate your Queue**\nShow your ID to the help-desk officer outside. Tell them your **Serial No: ${serial}**.\n\n**Step 2: ID Verification**\nEnter **Room No: ${part}** and show your ID to the first polling officer.\n\n**Step 3: Inking & Register**\nThe second officer will ink your finger and take your signature.\n\n**Step 4: Casting Vote**\nGo to the EVM booth. Press the BLUE button for your candidate. Wait for the **LONG BEEP**.\n\nWould you like me to open the EVM practice simulator now?`,
                type: 'at_station_guide',
                stage: 5
            });
        }

        // Improved intent detection for "I am [Name] from [Location]" or EPIC numbers
        const nameMatch = query.match(/(?:i am|my name is|i'm)\s+([a-zA-Z\s]+)/i);
        const locMatch = query.match(/(?:from|at|in|near|lives in)\s+([a-zA-Z\s]+)/i);
        const epicMatch = query.match(/[A-Z]{3}[0-9]{7}|[A-Z]{2}[0-9]{8}/i); // Common EPIC formats
        
        if (nameMatch) {
            searchName = nameMatch[1].trim();
            console.log(`[DEBUG] Matched Name: "${searchName}"`);
        }
        if (locMatch) searchLoc = locMatch[1].replace(/[\?\.!]/g, '').trim();
        const searchEpic = epicMatch ? epicMatch[0].toUpperCase() : null;
        
        // If the query is just a name (1-2 words), treat it as a name
        if (!searchName && !searchEpic && query.split(' ').length <= 2 && /^[a-zA-Z\s]+$/.test(query)) {
            searchName = query.trim();
        }

        if (contextType === 'find_booth' || contextType === 'no_voter_id' || searchEpic || (contextType === 'general' && searchName)) {
            const results = voterService.searchVoter({ 
                name: searchName, 
                relativeName: relativeName, 
                location: searchLoc, 
                epicNumber: searchEpic 
            });
            
            // Filter results manually if needed
            const filteredResults = results ? results.filter(voter => {
                let matches = true;
                if (name) {
                    if (!voter.name || typeof voter.name !== 'string' || !voter.name.toLowerCase().includes(name.toLowerCase())) matches = false;
                }
                if (relativeName) {
                    if (!voter.relativeName || typeof voter.relativeName !== 'string' || !voter.relativeName.toLowerCase().includes(relativeName.toLowerCase())) matches = false;
                }
                return matches;
            }) : [];

            if (filteredResults && filteredResults.length > 0) {
                const voter = filteredResults[0];
                userState.voterDetails = voter; // Store for persistence
                contextString += `CRITICAL DATA: Voter Found! Name: ${voter.name}, EPIC: ${voter.epicNumber}, Booth: ${voter.boothName}, Part: ${voter.partNumber}, Serial: ${voter.serialNumber}. YOU MUST USE THIS DATA IN STEP 1. `;
                mapLink = mapService.getBoothLocationLink(voter.boothName);
                responseType = "booth_info";
            } else if (searchEpic || searchName) {
                contextString += `User provided details (${searchEpic || searchName}) but no match found in local database. Guide them to the 'Voter Assistance Booth' at their local school or polling center entrance. `;
            }
        }

        if (contextType === 'no_voter_id' || query.match(/(?:no id|lost id|missing id|voter id missing)/i)) {
            return res.json({
                reply: "✅ **You CAN still vote without a Voter ID!**\n\nIf your name is in the voter list, you can show ANY of these 12 alternative IDs:\n\n1. Aadhaar Card\n2. PAN Card\n3. Unique Disability ID (UDID) Card\n4. MGNREGA Job Card\n5. Passbook with photo (Bank/Post Office)\n6. Health Insurance Smart Card\n7. Driving License\n8. Passport\n9. Smart Card issued by RGI under NPR\n10. Pension document with photo\n11. Service ID card (Govt/PSU)\n12. MP/MLA official ID card\n\n**Action**: Should I help you check if your name is in the list now?",
                type: 'no_id_guide',
                stage: 2
            });
        }

        // Update stage based on context
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
            console.warn("Gemini service unavailable, using contextual fallback.");
            if (responseType === "booth_info" && contextString.includes('Booth:')) {
                aiResponse = `I have found your details! \n\n**Booth**: ${contextString.match(/Booth: ([^,]+)/)?.[1] || 'Assigned Polling Station'}\n**Serial No**: ${contextString.match(/Serial: ([^.]+)/)?.[1] || 'Check with officer'}\n\n**Next Steps**:\n1. Reach the station before 5 PM.\n2. Show your ID at the entrance.\n3. Proceed to the voting compartment.`;
            } else if (userState.stage === 'finding_booth') {
                aiResponse = "To help you find your booth, please provide your **Name** or **EPIC Number**. I will then show you the exact map and directions.";
            } else {
                aiResponse = "I am here to help you with your voting process. You can ask me about finding your booth, what IDs are valid, or how to use the EVM machine.";
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
