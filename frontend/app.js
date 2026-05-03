/**
 * VOTESEVA — INDIA ELECTION ASSISTANT
 * Core Frontend Logic
 */

// Global State
let userLanguage = 'en-IN';
let isAudioEnabled = false;
let isDarkMode = false;
let voterDetails = null;
let currentStage = 1; // 1: Welcome, 2: Found, 3: Guided, 4: Complete
let sessionId = null;

// DOM Elements
const onboardingScreen = document.getElementById('onboardingScreen');
const appShell = document.getElementById('appShell');
const chatPanel = document.getElementById('chatPanel');
const landingPanel = document.getElementById('landingPanel');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const micBtn = document.getElementById('micBtn');
const backBtn = document.getElementById('backBtn');
const mainScroll = document.getElementById('mainScroll');

// Onboarding Elements
const obTabs = document.querySelectorAll('.ob-tab');
const obPanels = document.querySelectorAll('.ob-panel');
const epicInput = document.getElementById('epicInput');
const verifyEpicBtn = document.getElementById('verifyEpicBtn');
const nameInput = document.getElementById('nameInput');
const relativeNameInput = document.getElementById('relativeNameInput');
const verifyNameBtn = document.getElementById('verifyNameBtn');
const continueGuestBtn = document.getElementById('continueGuestBtn');
const obLoading = document.getElementById('obLoading');
const obNotFound = document.getElementById('obNotFound');
const obFound = document.getElementById('obFound');

// Dashboard Elements
const heroGreeting = document.getElementById('heroGreeting');
const heroTitle = document.getElementById('heroTitle');
const vfcSection = document.getElementById('voterFoundSection');
const vfcPrompt = document.getElementById('voterSearchPrompt');
const sidebarVoter = document.getElementById('sidebarVoterCard');
const sidebarGuest = document.getElementById('sidebarGuestBanner');

// Init
window.addEventListener('DOMContentLoaded', () => {
    initAccessibility();
    initEventListeners();
    generateSessionId();
    
    // Check if user already has data in localStorage
    const savedVoter = localStorage.getItem('voterData');
    if (savedVoter) {
        voterDetails = JSON.parse(savedVoter);
        loadVoterInApp(voterDetails);
    }
});

function generateSessionId() {
    sessionId = 'sess_' + Math.random().toString(36).substr(2, 9);
}

// Onboarding / Auth Logic
function initEventListeners() {
    // Tab switching
    obTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            obTabs.forEach(t => t.classList.remove('active'));
            obPanels.forEach(p => p.classList.add('hidden'));
            tab.classList.add('active');
            document.getElementById(`panel-${tab.dataset.tab}`).classList.remove('hidden');
        });
    });

    // Verification
    verifyEpicBtn.addEventListener('click', () => handleVerification('epic'));
    verifyNameBtn.addEventListener('click', () => handleVerification('name'));
    continueGuestBtn.addEventListener('click', () => launchApp(null));
    
    document.getElementById('tryAgainBtn').addEventListener('click', resetOnboarding);
    document.getElementById('guestFromNotFoundBtn').addEventListener('click', () => launchApp(null));
    document.getElementById('enterAppBtn').addEventListener('click', () => launchApp(voterDetails));

    // Dashboard Actions
    document.querySelectorAll('.sidebar-nav-item, .action-card').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action || btn.id;
            handleQuickAction(action);
        });
    });

    // Chat
    sendBtn.addEventListener('click', handleSend);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });

    // Back to home
    backBtn.addEventListener('click', showDashboard);

    // Audio/Mic
    micBtn.addEventListener('click', toggleSpeechRecognition);
}

async function handleVerification(type) {
    const panels = document.querySelectorAll('.ob-panel');
    panels.forEach(p => p.classList.add('hidden'));
    obLoading.classList.remove('hidden');

    const searchData = {};
    if (type === 'epic') searchData.epic = epicInput.value.trim().toUpperCase();
    else {
        searchData.name = nameInput.value.trim();
        searchData.relativeName = relativeNameInput.value.trim();
    }

    try {
        const response = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(searchData)
        });
        
        const data = await response.json();
        obLoading.classList.add('hidden');

        if (data.success) {
            voterDetails = data.voter;
            showFoundVoter(voterDetails);
        } else {
            obNotFound.classList.remove('hidden');
        }
    } catch (error) {
        obLoading.classList.add('hidden');
        alert("Server error. Please try again.");
    }
}

function showFoundVoter(voter) {
    obFound.classList.remove('hidden');
    document.getElementById('obFoundName').innerText = `Welcome, ${voter.name}!`;
    document.getElementById('obVoterPreview').innerHTML = `
        <div class="ob-vp-row"><span>EPIC No.</span><span>${voter.epicNumber}</span></div>
        <div class="ob-vp-row"><span>Booth Name</span><span>${voter.boothName}</span></div>
        <div class="ob-vp-row"><span>Location</span><span>${voter.location}</span></div>
    `;
}

function resetOnboarding() {
    obNotFound.classList.add('hidden');
    document.getElementById(`panel-epic`).classList.remove('hidden');
}

function launchApp(voter) {
    onboardingScreen.style.display = 'none';
    appShell.style.display = 'grid';
    
    if (voter) {
        localStorage.setItem('voterData', JSON.stringify(voter));
        loadVoterInApp(voter);
        updateJourney(2);
        addBotMessage(`Namaste ${voter.name}! I have loaded your details. Your polling station is **${voter.boothName}**. How can I help you reach there?`);
    } else {
        addBotMessage("Namaste! You are in Guest Mode. I can help you with general voting information, practice simulator, or checking valid IDs.");
    }
}

function loadVoterInApp(voter) {
    heroGreeting.innerText = `Welcome back, ${voter.name}! 👋`;
    
    // Update sidebar
    sidebarGuest.style.display = 'none';
    sidebarVoter.style.display = 'block';
    document.getElementById('sidebarName').innerText = voter.name;
    document.getElementById('sidebarEpic').innerText = `EPIC: ${voter.epicNumber}`;
    document.getElementById('sidebarBooth').innerText = `📍 ${voter.boothName}`;
    document.getElementById('sidebarSerial').innerText = `#${voter.serialNumber}`;

    // Update right panel
    vfcPrompt.style.display = 'none';
    vfcSection.style.display = 'block';
    document.getElementById('vfcName').innerText = voter.name;
    document.getElementById('vfcEpic').innerText = `EPIC: ${voter.epicNumber}`;
    document.getElementById('vfcBooth').innerText = voter.boothName;
    document.getElementById('vfcPart').innerText = voter.partNumber;
    document.getElementById('vfcSerial').innerText = voter.serialNumber;
    document.getElementById('vfcLocation').innerText = voter.location;
}

// Chat Logic
async function handleSend() {
    const text = chatInput.value.trim();
    if (!text) return;

    addUserMessage(text);
    chatInput.value = '';
    
    // Show loading
    const loadingId = addLoadingIndicator();
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: text,
                sessionId: sessionId,
                language: userLanguage,
                voterDetails: voterDetails // Send context
            })
        });
        
        const data = await response.json();
        removeLoadingIndicator(loadingId);
        
        if (data.reply) {
            addBotMessage(data.reply);
            if (data.mapLink) showMap(data.mapLink);
            if (data.stage) updateJourney(data.stage);
        }
    } catch (error) {
        removeLoadingIndicator(loadingId);
        addBotMessage("I'm having trouble connecting to my brain. Please try again in a moment.");
    }
}

function addUserMessage(text) {
    if (landingPanel.style.display !== 'none') showChat();
    const wrapper = document.createElement('div');
    wrapper.className = 'message-wrapper user';
    wrapper.innerHTML = `<div class="message user">${text}</div>`;
    chatPanel.appendChild(wrapper);
    scrollToBottom();
}

function addBotMessage(text) {
    if (landingPanel.style.display !== 'none') showChat();
    const wrapper = document.createElement('div');
    wrapper.className = 'message-wrapper bot';
    
    // Parse markdown-like bold
    const formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    wrapper.innerHTML = `
        <div class="message bot">
            <div class="msg-text">${formatted}</div>
            <button class="listen-btn" onclick="speakText(this)" aria-label="Listen to message">🔊</button>
        </div>
    `;
    chatPanel.appendChild(wrapper);
    scrollToBottom();
    
    if (isAudioEnabled) speak(text);
}

function addLoadingIndicator() {
    const id = 'load_' + Date.now();
    const wrapper = document.createElement('div');
    wrapper.className = 'message-wrapper bot';
    wrapper.id = id;
    wrapper.innerHTML = `
        <div class="message bot">
            <div class="loading-dots"><span></span><span></span><span></span></div>
        </div>
    `;
    chatPanel.appendChild(wrapper);
    scrollToBottom();
    return id;
}

function removeLoadingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function showChat() {
    landingPanel.classList.add('hidden');
    chatPanel.classList.remove('hidden');
    backBtn.classList.remove('hidden');
}

function showDashboard() {
    chatPanel.classList.add('hidden');
    landingPanel.classList.remove('hidden');
    backBtn.classList.add('hidden');
    document.getElementById('mapContainer').classList.add('hidden');
}

function showMap(url) {
    const container = document.getElementById('mapContainer');
    const frame = document.getElementById('mapFrame');
    const link = document.getElementById('mapDirectLink');
    
    container.classList.remove('hidden');
    frame.src = url;
    link.href = url;
    scrollToBottom();
}

function scrollToBottom() {
    mainScroll.scrollTop = mainScroll.scrollHeight;
}

// Journey Management
function updateJourney(stage) {
    currentStage = stage;
    for (let i = 1; i <= 4; i++) {
        const step = document.getElementById(`jStep${i}`);
        const line = document.getElementById(`jLine${i}`);
        
        step.classList.remove('active', 'done');
        if (line) line.classList.remove('done');
        
        if (i < stage) {
            step.classList.add('done');
            if (line) line.classList.add('done');
        } else if (i === stage) {
            step.classList.add('active');
        }
    }
}

// Accessibility & UI
function initAccessibility() {
    const accBtn = document.getElementById('accBtn');
    const accModal = document.getElementById('accModal');
    const closeAcc = document.getElementById('closeAcc');
    
    accBtn.addEventListener('click', () => accModal.classList.remove('hidden'));
    closeAcc.addEventListener('click', () => accModal.classList.add('hidden'));

    // Toggles
    document.getElementById('hcToggle').addEventListener('click', function() {
        this.classList.toggle('on');
        document.body.classList.toggle('high-contrast');
    });
    document.getElementById('ltToggle').addEventListener('click', function() {
        this.classList.toggle('on');
        document.body.classList.toggle('large-text');
    });
    document.getElementById('dyToggle').addEventListener('click', function() {
        this.classList.toggle('on');
        document.body.classList.toggle('dyslexic');
    });
    
    // Theme
    document.getElementById('themeBtn').addEventListener('click', () => {
        isDarkMode = !isDarkMode;
        document.body.classList.toggle('dark-mode');
        document.getElementById('themeBtn').innerText = isDarkMode ? '☀️' : '🌙';
    });

    // Audio
    document.getElementById('audioBtn').addEventListener('click', () => {
        isAudioEnabled = !isAudioEnabled;
        document.getElementById('audioBtn').classList.toggle('active');
        document.getElementById('audioBtn').innerText = isAudioEnabled ? '🔊' : '🔈';
    });
}

// Speech Functions
function toggleSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window)) {
        alert("Speech recognition is not supported in this browser.");
        return;
    }

    const recognition = new webkitSpeechRecognition();
    recognition.lang = userLanguage;
    
    recognition.onstart = () => {
        micBtn.classList.add('recording');
        chatInput.placeholder = "Listening...";
    };
    
    recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        chatInput.value = text;
        handleSend();
    };
    
    recognition.onend = () => {
        micBtn.classList.remove('recording');
        chatInput.placeholder = "Ask anything about voting...";
    };
    
    recognition.start();
}

function speak(text) {
    if (!isAudioEnabled) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = userLanguage;
    window.speechSynthesis.speak(utterance);
}

function speakText(btn) {
    const text = btn.previousElementSibling.innerText;
    speak(text);
}

// Quick Actions Helper
function sendAction(text) {
    chatInput.value = text;
    handleSend();
}

function handleQuickAction(action) {
    switch(action) {
        case 'find_booth':
        case 'findBoothCard':
            sendAction("Help me find my booth");
            break;
        case 'no_voter_id':
        case 'noIdCard':
            sendAction("What if I don't have a voter ID?");
            break;
        case 'practice':
        case 'practiceCardBtn':
            document.getElementById('evmModal').classList.remove('hidden');
            break;
        case 'at_the_booth':
        case 'atBoothCard':
            sendAction("Guide me through the process at the booth");
            break;
        case 'sos':
            sendAction("SOS! I am lost and need help reaching my booth.");
            break;
        case 'fact_check':
            sendAction("How do I verify election news?");
            break;
    }
}

// EVM Simulator Logic
const evmModal = document.getElementById('evmModal');
const closeEvm = document.getElementById('closeEvm');
const evmBtns = document.querySelectorAll('.evm-btn');
const evmFeedback = document.getElementById('evmFeedback');

closeEvm.addEventListener('click', () => {
    evmModal.classList.add('hidden');
    evmFeedback.classList.add('hidden');
});

evmBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById('evmScreen').innerText = "VOTE RECORDED";
        evmFeedback.classList.remove('hidden');
        // Play beep sound if possible
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz
        oscillator.connect(audioCtx.destination);
        oscillator.start();
        setTimeout(() => oscillator.stop(), 500);
    });
});
