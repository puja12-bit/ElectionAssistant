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
 * Main conversational endpoint with a multi-layer decision engine.
 * Layer 1: Local pattern-match for deterministic answers (speed + reliability)
 * Layer 2: Voter database lookup
 * Layer 3: Gemini AI for complex / open-ended queries
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
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { sessionId, query, contextType = 'general', name, relativeName, language } = req.body;
        const userLanguage = language || 'en-IN';
        const lq = query.toLowerCase();

        let contextString = '';
        let mapLink = null;
        let responseType = 'chat';

        // ── SESSION STATE ─────────────────────────────────────────────────────
        let userState = { stage: 'not_started', lastQuery: '', voterDetails: null };
        if (sessionId) {
            try {
                const userDoc = await db.collection('users').doc(sessionId).get();
                if (userDoc.exists) userState = { ...userState, ...userDoc.data() };
            } catch (_) { /* mock DB – continue */ }
        }

        // Re-inject previously found voter details for session continuity
        if (userState.voterDetails) {
            const v = userState.voterDetails;
            contextString += `PERSISTENT DATA: Voter Found — Name: ${v.name}, EPIC: ${v.epicNumber}, Booth: ${v.boothName}, Part: ${v.partNumber}, Serial: ${v.serialNumber}. Use this booth for any guidance. `;
            mapLink = mapService.getBoothLocationLink(v.boothName);
            responseType = 'booth_info';
        }

        // ── DECISION ENGINE — LAYER 1 (PATTERN MATCH) ────────────────────────

        // 0. Greeting / intro
        if (/^(hello|hi|namaste|start|hey)\b/i.test(query) && !userState.voterDetails) {
            contextString += 'GUIDANCE: User is starting fresh. Give a warm welcome. Mention you can help find booth, check registration, guide through voting, and fact-check election news. Ask their preferred first step. ';
        }

        // 1. No Voter ID — check BEFORE SOS so "lost voter ID" doesn't trigger SOS
        if (contextType === 'no_voter_id' || /(?:no voter id|no id card|lost (?:my )?voter|voter id missing|missing voter|don[''']t have (?:a )?voter|no voter card)/i.test(query)) {
            return res.json({
                reply: `✅ **You CAN vote without your Voter ID card!**

If your name is in the voter list, show any of these **12 ECI-approved alternative IDs**:

1. Aadhaar Card
2. PAN Card
3. MGNREGA Job Card
4. Bank / Post Office Passbook with photograph
5. Driving Licence
6. Passport
7. Unique Disability ID (UDID)
8. Health Insurance Smart Card (issued under ESIC)
9. Smart Card issued under NPR
10. Pension document with photograph
11. Service ID card (Central / State Govt / PSU)
12. MP / MLA / MLC official identity card

**Important:** Your name must appear in the voter roll even when using alternate ID.

Step 1: Check your name is in the list → electoralsearch.eci.gov.in
Step 2: Carry ANY of the above IDs to the booth.
Step 3: Proceed normally — show ID to the officer at the entrance.
Step 4: Call 1950 (toll-free) if you face any trouble at the booth.`,
                type: 'no_id_guide',
                stage: 2
            });
        }

        // 2. SOS / Emergency
        if (/(?:i am lost|i'm lost|help me|where am i|emergency|sos)\b/i.test(query)) {
            return res.json({
                reply: `🚨 **EMERGENCY ASSISTANCE ACTIVATED**

Don't worry — I'm here to help you right now.

Step 1: **Call ECI Helpline 1950** (toll-free, available election day). Tell them your name and location.
Step 2: **Find the Voter Assistance Booth** — it's at the entrance of every polling station (usually near the school gate). Officers there have the voter list and will guide you.
Step 3: **Your nearest booth**: ${appConfig.sos.boothDisplay}
Step 4: **Never share your OTP, voter ID number, or personal details** with anyone except official booth officers.`,
                type: 'sos',
                stage: 4,
                mapLink: appConfig.sos.mapUrl
            });
        }

        // 3. New to area / recently moved / transferred
        if (/(?:new to (?:the )?area|recently moved|just moved|shifted|transferred|new address|changed address|relocat)/i.test(query)) {
            return res.json({
                reply: `📍 **New to the Area? Here's What to Do**

Step 1: **Check if you're still registered** at your OLD address — go to electoralsearch.eci.gov.in and search by your details. Your vote may still be valid there for this election.

Step 2: **For THIS election** — if your name is in the voter roll at your old booth, you can travel there to vote. Bring a valid photo ID.

Step 3: **To update your address permanently** — submit Form 8A (Transposition within constituency) or Form 8 (Correction of entries) at nvsp.in or via the Voter Helpline App on your phone.

Step 4: Address updates take 30–45 days to process. Use **1950** (toll-free) or the Voter Helpline App to track status. You can also visit your local BLO (Booth Level Officer) at your nearest government school.`,
                type: 'new_to_area',
                stage: 2
            });
        }

        // 4. Not registered / checking registration / first-time voter
        if (/(?:not registered|am i registered|check (?:my )?registration|how to register|new voter|first.?time voter|never voted|register (?:to vote|as voter)|how do i vote for the first)/i.test(query)) {
            return res.json({
                reply: `📋 **How to Check & Complete Your Voter Registration**

Step 1: **Check if you're already registered** → Visit electoralsearch.eci.gov.in → click "Search by Details" tab → enter your Name, Father's/Husband's name, Age, and State.

Step 2: **If NOT registered** → Register online at nvsp.in (Form 6) OR download the **Voter Helpline App** (Android / iOS) and fill Form 6 digitally.

Step 3: **Documents needed**: Aadhaar or any address proof + one passport-size photo. You must be 18+ as of January 1st of the election year.

Step 4: Registration takes **30–45 days** to process. For the CURRENT election, you can vote only if you were already enrolled. Call **1950** (toll-free) anytime for help.`,
                type: 'registration_guide',
                stage: 2
            });
        }

        // 5. Fake news / rumour / fact-check / incident report request
        if (/(?:fake news|is it true|heard that|rumou?r|whatsapp (?:forward|message)|they say|someone said|i heard|fact.?check|real or fake|misinformation|propaganda|rigged|rigging|fight|fighting|clash|clashes|violence|incident|incident[s]?|commotion|disturbance|booth issue|polling booth issue|party clash|party clashes|law and order)/i.test(query)) {
            return res.json({
                reply: `🔍 **Election News & Incident Guide**

Step 1: **ONLY trust these official sources** for election information:
 • ECI official site: **eci.gov.in**
 • Live results: **results.eci.gov.in**
 • Press releases: **press.eci.gov.in**
 • Voter helpline: **1950** (toll-free)

Step 2: **How to treat election news safely**:
 ✅ If it is a confirmed incident, follow official instructions from police / ECI / CEO
 ✅ If it is a rumour, verify it before sharing
 ✅ If there is any violence or disturbance, stay away from the spot and keep yourself safe

Step 3: **Common fake news to IGNORE**:
 ❌ WhatsApp messages declaring winners before official counting
 ❌ Altered voting dates or timing (always 7 AM–6 PM on official poll day)
 ❌ Rumours about booth rigging or EVM tampering (EVMs are standalone, not networked)
 ❌ "Vote only if you receive an SMS" — FALSE. Your right to vote does not require any SMS.
 ❌ Unverified claims about party clashes, booth fights, or polling booth chaos without official confirmation

Step 4: **If the news is about a real incident** → Do not panic, do not spread videos blindly, and follow:
 • Police instructions
 • Election Commission / CEO updates
 • District administration advisories
 • Local polling officer guidance

Step 5: **If you are near the spot** → move away, stay safe, and call **112** for emergencies or **1950** for election help.

Step 6: Spreading election misinformation is punishable under the Representation of the People Act. Report it to your state's Chief Electoral Officer (CEO) website.`,
                type: 'fact_check',
                stage: 2
            });
        }

        // 6. Election timeline / process / how elections work
        if (/(?:how does (?:the )?election work|election process|election timeline|when (?:is|are) (?:the )?(?:election|result|counting)|how is vote counted|what is vvpat|model code)/i.test(query)) {
            return res.json({
                reply: `🗳️ **How Indian Elections Work — Step by Step**

**Before Election Day**
• Voter registration closes ~30 days before polling (nvsp.in / Voter Helpline App)
• Model Code of Conduct enforced from announcement → candidates cannot make policy promises
• Voter slip / polling notification issued by your BLO

**On Election Day** (Polling: 7:00 AM – 6:00 PM)
• Carry valid photo ID + know your serial number
• Queue at your designated polling station (check via this app!)
• Officer verifies name in register → inks left index finger → you sign/thumb print
• Enter voting compartment → press BLUE button on EVM for your candidate
• Wait for **long BEEP** → VVPAT slip shows your symbol for 7 seconds (verification)

**Counting Day** (usually 2–3 days after polling)
• Votes counted at Returning Officer's office
• Official results published at **results.eci.gov.in**
• Ignore all media/WhatsApp "exit poll" claims until official results

**After Election**
• Download e-EPIC (digital voter card) at nvsp.in or DigiLocker
• Report booth malpractice to CEO of your state

Step 4: For any questions, call **1950** (ECI Voter Helpline) — toll-free, available in all languages.`,
                type: 'election_guide',
                stage: 2
            });
        }

        // 7. Direction intent
        if (/(?:direction|direct|route|map|where is (?:my )?booth|how to go|how to reach|navigate)/i.test(query)) {
            if (userState.voterDetails) {
                const v = userState.voterDetails;
                const mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(v.boothName + ', ' + (v.location || 'India'))}`;
                return res.json({
                    reply: `📍 **Directions to Your Polling Booth**

Step 1: Your booth is **${v.boothName}**. The map below shows the route from your current location.
Step 2: Follow the blue line on the map. Look for the **Election Commission sign** and **Indian flag** at the entrance.
Step 3: When you arrive, find **Room No. ${v.partNumber || '—'}** and look for the officer with the voter register.
Step 4: Your **Serial No. is ${v.serialNumber}** — mention this to the help desk officer outside.`,
                    type: 'direction',
                    stage: 4,
                    mapLink: mapUrl
                });
            }
            return res.json({
                reply: `🗺️ **Let me find your route!**

Step 1: To give you exact directions, I need to find your polling booth first.
Step 2: Please tell me your **Voter ID (EPIC number)** — e.g., "My EPIC is ABC1234567" — OR your **full name**.
Step 3: Once I find your booth, I'll open the map with turn-by-turn directions.
Step 4: If you can't find your EPIC, check at electoralsearch.eci.gov.in or call 1950.`,
                type: 'booth_search_prompt',
                stage: 3
            });
        }

        // 8. At polling station
        if (/(?:at booth|at station|reached|i am at|standing in (?:a )?(?:line|queue)|security check|help at booth)/i.test(query) || contextType === 'at_station') {
            const serial = userState.voterDetails?.serialNumber || 'shown on your voter slip';
            const part = userState.voterDetails?.partNumber || 'your designated room';
            return res.json({
                reply: `🏢 **You're at the Polling Station — Here's Exactly What to Do**

Step 1: Go to the **Voter Assistance Booth** at the entrance. Tell the officer: *"My Serial No. is ${serial}"*. They'll confirm your queue.
Step 2: Enter **Room No. ${part}**. Show your photo ID to the first officer. They'll check your name in the register and apply ink on your left index finger.
Step 3: Go to the voting compartment. Press the **BLUE button** next to your chosen candidate on the EVM. Wait for the **long BEEP** — this confirms your vote is recorded.
Step 4: The VVPAT machine next to the EVM will show your candidate's symbol for 7 seconds. This is your receipt. Leave only after the BEEP.`,
                type: 'at_station_guide',
                stage: 5
            });
        }

        // ── DECISION ENGINE — LAYER 2 (VOTER SEARCH) ─────────────────────────
        const nameMatch = query.match(/(?:i am|my name is|i'm|name:)\s+([a-zA-Z\s]{2,40})/i);
        const locMatch  = query.match(/(?:from|at|in|near|lives? in|located in)\s+([a-zA-Z\s,]{2,40})/i);
        const epicMatch = query.match(/[A-Z]{2,3}[0-9]{7,8}/i);

        let searchName = name || (nameMatch ? nameMatch[1].trim() : null);
        let searchLoc  = locMatch ? locMatch[1].replace(/[?.!]/g, '').trim() : null;
        const searchEpic = epicMatch ? epicMatch[0].toUpperCase() : null;

        // Short alphabetic queries treated as name searches
        if (!searchName && !searchEpic && query.split(' ').length <= 3 && /^[a-zA-Z\s]+$/.test(query)) {
            searchName = query.trim();
        }

        if (contextType === 'find_booth' || searchEpic || (contextType === 'general' && searchName)) {
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
                contextString += `SEARCH NOTE: No voter found for "${searchEpic || searchName}". Guide user to: (1) Check electoralsearch.eci.gov.in — Search by Details tab, or (2) Visit the Voter Assistance Booth at the nearest school. `;
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

        contextString += `User Stage: ${userState.stage}. Language: ${userLanguage}. `;

        // Persist state
        if (sessionId) {
            try {
                await db.collection('users').doc(sessionId).set({
                    stage: userState.stage,
                    lastQuery: query,
                    voterDetails: userState.voterDetails || null,
                    updatedAt: new Date().toISOString()
                }, { merge: true });
            } catch (_) { /* mock DB – continue */ }
        }

        // ── DECISION ENGINE — LAYER 3 (GEMINI AI) ────────────────────────────
        let aiResponse;
        try {
            aiResponse = await geminiService.generateResponse(query, contextString, userLanguage);
        } catch (err) {
            console.warn('Gemini unavailable, using contextual fallback.', err.message);
            if (responseType === 'booth_info' && contextString.includes('Booth:')) {
                const booth = contextString.match(/Booth: ([^,]+)/)?.[1] || 'your assigned polling station';
                aiResponse = `Step 1: Your polling booth is **${booth}**.\nStep 2: Head there before 6 PM and carry a valid photo ID.\nStep 3: Tell the officer your Serial No. and proceed to vote.\nStep 4: Call 1950 (toll-free) if you need further help.`;
            } else {
                aiResponse = 'I am here to help with your voting journey. Ask me to find your booth, check your registration, guide you through the voting process, or fact-check any election news.';
            }
        }

        res.json({ reply: aiResponse, mapLink, type: responseType });

    } catch (error) {
        console.error('Chat route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
