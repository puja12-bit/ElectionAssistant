'use strict';

// ── SESSION ───────────────────────────────────────────────────────────────────
const sessionId = (() => {
    let id = localStorage.getItem('voteSevaSessionId');
    if (!id) { id = 'session_' + Math.random().toString(36).substr(2, 9); localStorage.setItem('voteSevaSessionId', id); }
    return id;
})();

// ── STATE ─────────────────────────────────────────────────────────────────────
let currentLanguage = localStorage.getItem('vsLang') || 'en-IN';
let isAudioEnabled = localStorage.getItem('vsAudio') === 'true';
let currentJourneyStep = 2; // 1=Check Roll, 2=Find Booth, 3=At Station, 4=Vote Cast

// ── DOM REFS ──────────────────────────────────────────────────────────────────
const chatPanel      = document.getElementById('chatPanel');
const landingPanel   = document.getElementById('landingPanel');
const chatInput      = document.getElementById('chatInput');
const sendBtn        = document.getElementById('sendBtn');
const micBtn         = document.getElementById('micBtn');
const backBtn        = document.getElementById('backBtn');
const mapContainer   = document.getElementById('mapContainer');
const mapFrame       = document.getElementById('mapFrame');
const mapDirectLink  = document.getElementById('mapDirectLink');
const mainScroll     = document.getElementById('mainScroll');
const evmModal       = document.getElementById('evmModal');
const accModal       = document.getElementById('accModal');
const evmFeedback    = document.getElementById('evmFeedback');
const evmScreen      = document.getElementById('evmScreen');

// Sidebar (left) voter info
const sidebarVoterCard = document.getElementById('sidebarVoterCard');
const sidebarName      = document.getElementById('sidebarName');
const sidebarEpic      = document.getElementById('sidebarEpic');
const sidebarBooth     = document.getElementById('sidebarBooth');
const sidebarSerial    = document.getElementById('sidebarSerial');

// Right panel voter card
const voterFoundSection = document.getElementById('voterFoundSection');
const voterSearchPrompt = document.getElementById('voterSearchPrompt');
const vfcName           = document.getElementById('vfcName');
const vfcEpic           = document.getElementById('vfcEpic');
const vfcBooth          = document.getElementById('vfcBooth');
const vfcPart           = document.getElementById('vfcPart');
const vfcSerial         = document.getElementById('vfcSerial');
const vfcLocation       = document.getElementById('vfcLocation');
const vfcDirBtn         = document.getElementById('vfcDirBtn');

// ── TRANSLATIONS ──────────────────────────────────────────────────────────────
const i18n = {
    'en-IN': {
        greeting: 'Namaste! Ready to cast your vote? 🙏',
        title: 'VoteSeva AI',
        card1: 'Find My Booth', card1s: 'EPIC ID or name search',
        card2: 'No Voter ID?', card2s: '12 valid alternatives',
        card3: 'EVM Practice', card3s: 'Try the simulator',
        card4: 'At the Booth', card4s: 'Step-by-step guide',
        placeholder: 'Ask anything about voting...',
        stepTitles: ['What to do now', 'What happens next', 'What to say', 'Important note'],
        stepPrefixes: ['Step 1:', 'Step 2:', 'Step 3:', 'Step 4:']
    },
    'hi-IN': {
        greeting: 'नमस्ते! वोट देने के लिए तैयार हैं? 🙏',
        title: 'वोटसेवा AI',
        card1: 'मेरा बूथ खोजें', card1s: 'EPIC ID या नाम खोज',
        card2: 'वोटर ID नहीं है?', card2s: '12 वैध विकल्प',
        card3: 'EVM अभ्यास', card3s: 'सिम्युलेटर आज़माएं',
        card4: 'बूथ पर हूँ', card4s: 'चरण-दर-चरण मार्गदर्शन',
        placeholder: 'मतदान के बारे में कुछ भी पूछें...',
        stepTitles: ['अभी क्या करें', 'आगे क्या होगा', 'क्या कहें', 'महत्वपूर्ण टिप्पणी'],
        stepPrefixes: ['चरण 1:', 'चरण 2:', 'चरण 3:', 'चरण 4:']
    },
    'te-IN': {
        greeting: 'నమస్కారం! ఓటు వేయడానికి సిద్ధంగా ఉన్నారా? 🙏',
        title: 'ఓట్‌సేవ AI',
        card1: 'నా బూత్ కనుగొను', card1s: 'EPIC ID లేదా పేరు శోధన',
        card2: 'ఓటర్ ID లేదా?', card2s: '12 చెల్లుబాటు ప్రత్యామ్నాయాలు',
        card3: 'EVM అభ్యాసం', card3s: 'సిమ్యులేటర్ ప్రయత్నించండి',
        card4: 'బూత్ వద్ద ఉన్నాను', card4s: 'దశల వారీ మార్గదర్శకత్వం',
        placeholder: 'ఓటింగ్ గురించి ఏదైనా అడగండి...',
        stepTitles: ['ఇప్పుడు ఏమి చేయాలి', 'తర్వాత ఏమి జరుగుతుంది', 'ఏమి చెప్పాలి', 'ముఖ్యమైన గమనిక'],
        stepPrefixes: ['దశ 1:', 'దశ 2:', 'దశ 3:', 'దశ 4:']
    },
    'ta-IN': {
        greeting: 'வணக்கம்! வாக்களிக்க தயாரா? 🙏',
        title: 'வோட்சேவா AI',
        card1: 'என் சாவடி கண்டுபிடி', card1s: 'EPIC ID அல்லது பெயர் தேடல்',
        card2: 'வாக்காளர் ID இல்லையா?', card2s: '12 செல்லுபடியாகும் மாற்றுகள்',
        card3: 'EVM பயிற்சி', card3s: 'சிமுலேட்டரை முயற்சிக்கவும்',
        card4: 'சாவடியில் இருக்கிறேன்', card4s: 'படி படியாக வழிகாட்டல்',
        placeholder: 'வாக்களிப்பு பற்றி எதையும் கேளுங்கள்...',
        stepTitles: ['இப்போது என்ன செய்வது', 'அடுத்து என்ன நடக்கும்', 'என்ன சொல்வது', 'முக்கிய குறிப்பு'],
        stepPrefixes: ['படி 1:', 'படி 2:', 'படி 3:', 'படி 4:']
    },
    'kn-IN': {
        greeting: 'ನಮಸ್ಕಾರ! ಮತ ಚಲಾಯಿಸಲು ಸಿದ್ಧರಾಗಿದ್ದೀರಾ? 🙏',
        title: 'ವೋಟ್‌ಸೇವಾ AI',
        card1: 'ನನ್ನ ಬೂತ್ ಹುಡುಕಿ', card1s: 'EPIC ID ಅಥವಾ ಹೆಸರು ಹುಡುಕಾಟ',
        card2: 'ಮತದಾರ ID ಇಲ್ಲವೇ?', card2s: '12 ಮಾನ್ಯ ಪರ್ಯಾಯಗಳು',
        card3: 'EVM ಅಭ್ಯಾಸ', card3s: 'ಸಿಮ್ಯುಲೇಟರ್ ಪ್ರಯತ್ನಿಸಿ',
        card4: 'ಬೂತ್‌ನಲ್ಲಿದ್ದೇನೆ', card4s: 'ಹಂತ-ಹಂತ ಮಾರ್ಗದರ್ಶನ',
        placeholder: 'ಮತದಾನದ ಬಗ್ಗೆ ಏನಾದರೂ ಕೇಳಿ...',
        stepTitles: ['ಈಗ ಏನು ಮಾಡಬೇಕು', 'ಮುಂದೆ ಏನಾಗುತ್ತದೆ', 'ಏನು ಹೇಳಬೇಕು', 'ಪ್ರಮುಖ ಟಿಪ್ಪಣಿ'],
        stepPrefixes: ['ಹಂತ 1:', 'ಹಂತ 2:', 'ಹಂತ 3:', 'ಹಂತ 4:']
    },
    'mr-IN': {
        greeting: 'नमस्कार! मतदानासाठी तयार आहात का? 🙏',
        title: 'वोटसेवा AI',
        card1: 'माझे बूथ शोधा', card1s: 'EPIC ID किंवा नाव शोध',
        card2: 'मतदार ID नाही?', card2s: '12 वैध पर्याय',
        card3: 'EVM सराव', card3s: 'सिम्युलेटर वापरून पहा',
        card4: 'बूथवर आहे', card4s: 'चरण-दर-चरण मार्गदर्शन',
        placeholder: 'मतदानाबद्दल काहीही विचारा...',
        stepTitles: ['आता काय करावे', 'पुढे काय होईल', 'काय बोलावे', 'महत्त्वाची नोंद'],
        stepPrefixes: ['पायरी 1:', 'पायरी 2:', 'पायरी 3:', 'पायरी 4:']
    }
};

// ── LANGUAGE MANAGEMENT ───────────────────────────────────────────────────────
function applyLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('vsLang', lang);
    const t = i18n[lang] || i18n['en-IN'];

    document.getElementById('heroGreeting').textContent  = t.greeting;
    document.getElementById('heroTitle').textContent     = t.title;
    document.getElementById('card1Label').textContent    = t.card1;
    document.getElementById('card1Sub').textContent      = t.card1s;
    document.getElementById('card2Label').textContent    = t.card2;
    document.getElementById('card2Sub').textContent      = t.card2s;
    document.getElementById('card3Label').textContent    = t.card3;
    document.getElementById('card3Sub').textContent      = t.card3s;
    document.getElementById('card4Label').textContent    = t.card4;
    document.getElementById('card4Sub').textContent      = t.card4s;
    chatInput.placeholder   = t.placeholder;

    // Sync nav select
    const navSel = document.getElementById('langSelectNav');
    if (navSel) navSel.value = lang;

    // Update pills
    document.querySelectorAll('.lang-pill').forEach(p => {
        const active = p.dataset.lang === lang;
        p.classList.toggle('active', active);
        p.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
}

// Language pills
document.querySelectorAll('.lang-pill').forEach(pill => {
    pill.addEventListener('click', () => applyLanguage(pill.dataset.lang));
});

// Nav select
const langSelectNav = document.getElementById('langSelectNav');
if (langSelectNav) {
    langSelectNav.addEventListener('change', e => applyLanguage(e.target.value));
}

// ── AUDIO / TTS ───────────────────────────────────────────────────────────────
function speakText(text) {
    if (!isAudioEnabled) return;
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/\*\*?(.*?)\*\*?/g, '$1').replace(/[#*_~`]/g, '').replace(/<[^>]*>/g, '');
    const utt = new SpeechSynthesisUtterance(clean);
    utt.lang = currentLanguage;
    utt.rate = 0.88;
    window.speechSynthesis.speak(utt);
}

function syncAudioUI() {
    const btn = document.getElementById('audioBtn');
    btn.textContent = isAudioEnabled ? '🔊' : '🔈';
    btn.setAttribute('aria-pressed', isAudioEnabled ? 'true' : 'false');
    btn.classList.toggle('active', isAudioEnabled);

    const accToggle = document.getElementById('audioToggleAcc');
    if (accToggle) {
        accToggle.classList.toggle('on', isAudioEnabled);
        accToggle.setAttribute('aria-checked', isAudioEnabled ? 'true' : 'false');
    }
}

document.getElementById('audioBtn').addEventListener('click', () => {
    isAudioEnabled = !isAudioEnabled;
    localStorage.setItem('vsAudio', isAudioEnabled);
    if (!isAudioEnabled) window.speechSynthesis?.cancel();
    syncAudioUI();
});

// ── JOURNEY TRACKER ──────────────────────────────────────────────────────────
function setJourneyStep(step) {
    currentJourneyStep = step;
    const steps = ['jStep2', 'jStep3', 'jStep4'];
    const lines  = ['jLine2', 'jLine3'];
    steps.forEach((id, i) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.toggle('active', i + 2 === step);
        el.classList.toggle('done',   i + 2 < step);
        el.setAttribute('aria-label', el.getAttribute('aria-label')?.replace(/: .+$/, '') + (i + 2 < step ? ': completed' : i + 2 === step ? ': current step' : ': upcoming'));
    });
    lines.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('done', i + 2 < step);
    });

    const stageMap = {
        2: 'Finding Your Booth…',
        3: 'At the Polling Station',
        4: '✅ Vote Cast!'
    };
    const badge = document.getElementById('stageBadgeText');
    if (badge && stageMap[step]) badge.textContent = stageMap[step];
}

// ── VOTER CARD (left sidebar + right panel) ───────────────────────────────────
function showSidebarVoter(voter) {
    if (!voter) return;

    // Left sidebar mini-card
    if (sidebarVoterCard) {
        sidebarName.textContent   = voter.name || '—';
        sidebarEpic.textContent   = 'EPIC: ' + (voter.epicNumber || '—');
        sidebarBooth.textContent  = '📍 ' + (voter.boothName || '—');
        sidebarSerial.textContent = '#' + (voter.serialNumber || '—');
        sidebarVoterCard.style.display = 'block';
    }

    // Right panel full voter card
    if (voterFoundSection && voterSearchPrompt) {
        vfcName.textContent     = voter.name || '—';
        vfcEpic.textContent     = 'EPIC: ' + (voter.epicNumber || '—');
        vfcBooth.textContent    = voter.boothName || '—';
        vfcPart.textContent     = voter.partNumber || '—';
        vfcSerial.textContent   = voter.serialNumber || '—';
        vfcLocation.textContent = voter.location || '—';
        voterSearchPrompt.style.display = 'none';
        voterFoundSection.style.display = 'block';

        // Wire directions button
        if (vfcDirBtn && voter.boothName) {
            vfcDirBtn.onclick = () => {
                sendMessage('I need directions to my booth');
            };
        }
    }
}

// ── CHAT RENDERING ────────────────────────────────────────────────────────────
/**
 * Formats AI response text into accessible numbered step cards.
 * @param {string} text - Raw response text from Gemini/backend
 * @returns {string} HTML string
 */
function formatResponse(text) {
    const t = i18n[currentLanguage] || i18n['en-IN'];

    // Sanitise markdown-style asterisks and convert URLs to links
    let clean = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:var(--navy);font-weight:600;">$1</a>');

    // Split on step markers (multilingual)
    const stepRx = /Step \d+:|چرண \d+:|चरण \d+:|దశ \d+:|படி \d+:|ಹಂತ \d+:|পায়রি \d+:/gi;
    const parts = clean.split(stepRx).filter(s => s.trim());

    if (parts.length >= 2) {
        const steps = parts.map((s, i) => `
          <div class="step-item">
            <div class="step-num" aria-hidden="true">${i + 1}</div>
            <div>
              <div class="step-title">${t.stepTitles[i] || 'Step ' + (i + 1)}</div>
              <div class="step-text">${s.trim()}</div>
            </div>
          </div>`).join('');
        return `<div class="step-container">${steps}</div>`;
    }

    return `<div class="step-text">${clean.replace(/\n/g, '<br>')}</div>`;
}

/**
 * Appends a message bubble to both the main and desktop panel chat areas.
 * @param {string} text - Message text
 * @param {'user'|'bot'} sender
 */
function addMessage(text, sender) {
    // Show chat, hide landing
    if (!landingPanel.classList.contains('hidden')) {
        landingPanel.classList.add('hidden');
        chatPanel.classList.remove('hidden');
        backBtn.classList.remove('hidden');
    }

    // ── Main (mobile/centre) panel ──
    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper ${sender}`;

    const bubble = document.createElement('div');
    bubble.className = `message ${sender}`;

    if (sender === 'bot') {
        bubble.innerHTML = formatResponse(text);
        const listenBtn = document.createElement('button');
        listenBtn.className = 'listen-btn';
        listenBtn.innerHTML = '🔊';
        listenBtn.setAttribute('aria-label', 'Read this message aloud');
        listenBtn.onclick = () => speakText(text);
        wrapper.appendChild(bubble);
        wrapper.appendChild(listenBtn);
        speakText(text);
    } else {
        bubble.textContent = text;
        wrapper.appendChild(bubble);
    }

    chatPanel.appendChild(wrapper);
    mainScroll.scrollTop = mainScroll.scrollHeight;

    // Share location offer
    if (sender === 'bot' && /\b(location|area|where)\b/i.test(text)) {
        const locBtn = document.createElement('button');
        locBtn.className = 'chip';
        locBtn.textContent = '📍 Share My Location';
        locBtn.style.marginTop = '6px';
        locBtn.onclick = getGeoLocation;
        chatPanel.appendChild(locBtn);
    }
}

function addLoadingBubble() {
    const wrap = document.createElement('div');
    wrap.className = 'message-wrapper bot';
    wrap.id = 'loadingBubble';
    const bubble = document.createElement('div');
    bubble.className = 'message bot';
    bubble.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';
    wrap.appendChild(bubble);
    chatPanel.appendChild(wrap);
    mainScroll.scrollTop = mainScroll.scrollHeight;
}

function removeLoadingBubble() {
    document.getElementById('loadingBubble')?.remove();
}

// ── MAP DISPLAY ───────────────────────────────────────────────────────────────
function showMap(url) {
    if (!url) return;
    const embedUrl = url.includes('output=embed') ? url : url + '&output=embed';
    mapFrame.src = embedUrl;
    mapDirectLink.href = url.replace('&output=embed', '');
    mapContainer.classList.remove('hidden');
    mapContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideMap() {
    mapContainer.classList.add('hidden');
    mapFrame.src = '';
}

// ── GEOLOCATION ───────────────────────────────────────────────────────────────
function getGeoLocation() {
    if (!navigator.geolocation) {
        addMessage('Geolocation is not supported by your browser.', 'bot');
        return;
    }
    addMessage('📍 Detecting your location…', 'bot');
    navigator.geolocation.getCurrentPosition(
        pos => sendMessage(`My coordinates are ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}. Find the nearest polling booth.`),
        ()  => addMessage('Please enable location access in your browser settings.', 'bot')
    );
}

// ── LOCAL DECISION ENGINE ─────────────────────────────────────────────────────
/**
 * Handles simple queries locally to reduce API latency.
 * @param {string} text
 * @returns {string|null} local reply, or null to let backend handle it
 */
function localDecisionEngine(text) {
    const lower = text.toLowerCase();
    if (/\bpractice\b/.test(lower) && /\bvot(e|ing)\b/.test(lower)) {
        openEvmModal();
        return "Opening the EVM Practice Simulator for you! Press the blue VOTE button to try casting a vote.";
    }
    return null;
}

// ── SEND MESSAGE ──────────────────────────────────────────────────────────────
/** @param {string|null} textOverride */
async function sendMessage(textOverride = null) {
    const text = textOverride || chatInput.value.trim();
    if (!text) return;
    chatInput.value = '';

    if (!landingPanel.classList.contains('hidden')) {
        landingPanel.classList.add('hidden');
        chatPanel.classList.remove('hidden');
        backBtn.classList.remove('hidden');
    }

    addMessage(text, 'user');

    // Try local engine first
    const local = localDecisionEngine(text);
    if (local) { setTimeout(() => addMessage(local, 'bot'), 350); return; }

    // Remote API
    addLoadingBubble();
    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, query: text, language: currentLanguage, contextType: 'general' })
        });

        removeLoadingBubble();

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (data.mapLink) {
            showMap(data.mapLink);
        } else if (data.type !== 'booth_info') {
            hideMap();
        }

        if (data.reply) addMessage(data.reply, 'bot');

        // When backend returns booth_info, extract all voter fields from the reply
        if (data.type === 'booth_info') {
            const boothMatch    = data.reply?.match(/polling station is \*\*([^*]+)\*\*/i) || data.reply?.match(/Booth[:\s]+([^\n.]+)/i);
            const serialMatch   = data.reply?.match(/Serial (?:No(?:\.)?|No )?(?:is |\*\*)?(\d+)/i);
            const partMatch     = data.reply?.match(/Part No(?:\.)?(?:\sis\s|\s\*\*)?([^\s,.*\n]+)/i);
            const epicMatch     = data.reply?.match(/EPIC[:\s]+(\w+)/i);
            if (boothMatch) {
                showSidebarVoter({
                    name:         text,
                    boothName:    boothMatch[1].trim(),
                    partNumber:   partMatch?.[1]?.trim(),
                    serialNumber: serialMatch?.[1]?.trim(),
                    epicNumber:   epicMatch?.[1]?.trim(),
                    location:     null
                });
                setJourneyStep(3);
            }
        }

        if (data.stage) setJourneyStep(Math.min(4, data.stage));

    } catch (err) {
        removeLoadingBubble();
        console.error('sendMessage error:', err);
        addMessage('Sorry, I cannot connect right now. Please check your internet and try again.', 'bot');
    }
}

// Global helper used by quick-action chips
window.sendAction = text => {
    chatInput.value = '';
    sendMessage(text);
};

// ── KEYBOARD & BUTTON HANDLERS ────────────────────────────────────────────────
sendBtn.addEventListener('click', () => sendMessage());
chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });

backBtn.addEventListener('click', () => {
    landingPanel.classList.remove('hidden');
    chatPanel.classList.add('hidden');
    backBtn.classList.add('hidden');
    hideMap();
    setJourneyStep(2);
});

// Sidebar nav items
document.querySelectorAll('.sidebar-nav-item[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.sidebar-nav-item').forEach(b => { b.classList.remove('active'); b.removeAttribute('aria-current'); });
        btn.classList.add('active');
        btn.setAttribute('aria-current', 'page');
        const action = btn.dataset.action;
        if (action === 'home') { landingPanel.classList.remove('hidden'); chatPanel.classList.add('hidden'); backBtn.classList.add('hidden'); hideMap(); return; }
        if (action === 'practice') { openEvmModal(); return; }
        if (action === 'sos') { sendMessage('SOS I am lost'); return; }
        sendMessage(action === 'find_booth' ? 'I want to find my polling booth' : action === 'no_voter_id' ? 'I do not have a voter ID' : action === 'at_station' ? 'I am at the polling booth' : action);
    });
});

// Action cards on landing
document.querySelectorAll('.action-card[data-action]').forEach(card => {
    card.addEventListener('click', () => {
        chatPanel.innerHTML = '';
        hideMap();
        const action = card.dataset.action;
        const msgs = { find_booth: 'I want to find my polling booth.', no_voter_id: "I don't have a voter ID. Can I still vote?", at_station: 'I am at the polling booth. What should I do?' };
        sendMessage(msgs[action] || action);
    });
    // Keyboard accessibility
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); } });
});

document.getElementById('practiceCardBtn')?.addEventListener('click', openEvmModal);

// ── VOICE INPUT ───────────────────────────────────────────────────────────────
function setupVoice(inputEl, triggerBtn) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { triggerBtn.title = 'Voice not supported in this browser'; return; }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = e => {
        inputEl.value = e.results[0][0].transcript;
        inputEl.focus();
    };
    rec.onend = () => { triggerBtn.classList.remove('recording'); triggerBtn.setAttribute('aria-pressed', 'false'); };
    rec.onerror = () => { triggerBtn.classList.remove('recording'); };
    triggerBtn.addEventListener('click', () => {
        rec.lang = currentLanguage;
        rec.start();
        triggerBtn.classList.add('recording');
        triggerBtn.setAttribute('aria-pressed', 'true');
    });
}
setupVoice(chatInput, micBtn);

// ── EVM SIMULATOR ─────────────────────────────────────────────────────────────
function openEvmModal() { evmModal.classList.remove('hidden'); document.getElementById('closeEvm').focus(); }

document.getElementById('closeEvm').addEventListener('click', () => evmModal.classList.add('hidden'));
evmModal.addEventListener('click', e => { if (e.target === evmModal) evmModal.classList.add('hidden'); });

document.querySelectorAll('.evm-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        evmScreen.textContent = 'RECORDING VOTE…';
        btn.disabled = true;
        document.querySelectorAll('.evm-btn').forEach(b => b.disabled = true);
        setTimeout(() => {
            evmFeedback.classList.remove('hidden');
            evmScreen.textContent = 'VOTE CAST — THANK YOU';
            try { new Audio('beep.mp3').play(); } catch (_) {}
            setTimeout(() => {
                evmModal.classList.add('hidden');
                evmFeedback.classList.add('hidden');
                evmScreen.textContent = 'BALLOT UNIT — PRESS BLUE BUTTON';
                document.querySelectorAll('.evm-btn').forEach(b => b.disabled = false);
                setJourneyStep(4);
                addMessage('🎉 Practice complete! You now know exactly how to use the EVM. You\'re all set to vote!', 'bot');
            }, 2200);
        }, 1000);
    });
});

// ── ACCESSIBILITY PANEL ───────────────────────────────────────────────────────
document.getElementById('accBtn').addEventListener('click', () => { accModal.classList.remove('hidden'); document.getElementById('closeAcc').focus(); });
document.getElementById('closeAcc').addEventListener('click', () => accModal.classList.add('hidden'));
accModal.addEventListener('click', e => { if (e.target === accModal) accModal.classList.add('hidden'); });

function makeToggle(btnId, bodyClass, storageKey) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    const saved = localStorage.getItem(storageKey) === 'true';
    if (saved) { document.body.classList.add(bodyClass); btn.classList.add('on'); btn.setAttribute('aria-checked', 'true'); }
    btn.addEventListener('click', () => {
        const on = document.body.classList.toggle(bodyClass);
        btn.classList.toggle('on', on);
        btn.setAttribute('aria-checked', on ? 'true' : 'false');
        localStorage.setItem(storageKey, on);
    });
}

makeToggle('hcToggle',   'high-contrast', 'vsHC');
makeToggle('ltToggle',   'large-text',    'vsLT');
makeToggle('dyToggle',   'dyslexic',      'vsDY');

// Dark mode (also linked to theme button in nav)
const darkToggleAcc = document.getElementById('darkToggleAcc');
const themeBtn = document.getElementById('themeBtn');
function syncDark(on) {
    document.body.classList.toggle('dark-mode', on);
    themeBtn.textContent = on ? '☀️' : '🌙';
    themeBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (darkToggleAcc) { darkToggleAcc.classList.toggle('on', on); darkToggleAcc.setAttribute('aria-checked', on ? 'true' : 'false'); }
    localStorage.setItem('vsDark', on);
}
themeBtn.addEventListener('click', () => syncDark(!document.body.classList.contains('dark-mode')));
if (darkToggleAcc) darkToggleAcc.addEventListener('click', () => syncDark(!document.body.classList.contains('dark-mode')));

// Acc panel audio toggle
document.getElementById('audioToggleAcc')?.addEventListener('click', function() {
    isAudioEnabled = !isAudioEnabled;
    localStorage.setItem('vsAudio', isAudioEnabled);
    if (!isAudioEnabled) window.speechSynthesis?.cancel();
    syncAudioUI();
});

// Trap focus in modals (WCAG 2.1 AA)
function trapFocus(modal) {
    const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    modal.addEventListener('keydown', e => {
        if (e.key !== 'Tab') return;
        if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
        else { if (document.activeElement === last) { e.preventDefault(); first.focus(); } }
    });
    modal.addEventListener('keydown', e => { if (e.key === 'Escape') modal.classList.add('hidden'); });
}
trapFocus(evmModal);
trapFocus(accModal);

// ── INITIALISE ────────────────────────────────────────────────────────────────
(function init() {
    applyLanguage(currentLanguage);
    syncAudioUI();
    if (localStorage.getItem('vsDark') === 'true') syncDark(true);
    if (localStorage.getItem('vsHC') === 'true') { document.body.classList.add('high-contrast'); document.getElementById('hcToggle')?.classList.add('on'); }
    if (localStorage.getItem('vsLT') === 'true') { document.body.classList.add('large-text'); document.getElementById('ltToggle')?.classList.add('on'); }
    if (localStorage.getItem('vsDY') === 'true') { document.body.classList.add('dyslexic'); document.getElementById('dyToggle')?.classList.add('on'); }

})();
