import { decisionEngine } from './decisionEngine.js';

const landingState = document.getElementById('landingState');
const chatArea = document.getElementById('chatArea');
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const micBtn = document.getElementById('micBtn');
const backBtn = document.getElementById('backBtn');
const languageSelect = document.getElementById('languageSelect');
const audioToggle = document.getElementById('audioToggle');

// State
let sessionId = localStorage.getItem('voteSevaSessionId') || ('session_' + Math.random().toString(36).substr(2, 9));
localStorage.setItem('voteSevaSessionId', sessionId);

let isAudioEnabled = false;
let currentLanguage = 'en-IN';
let currentStage = 1;

const progressTracker = document.getElementById('progressTracker');
const progressText = document.getElementById('progressText');
const progressBar = document.getElementById('progressBar');

function updateStage(stage) {
    currentStage = stage;
    progressTracker.classList.remove('hidden');
    const stages = {
        1: { text: "Stage 1: Getting Started", width: "15%" },
        2: { text: "Stage 2: Checking Eligibility", width: "30%" },
        3: { text: "Stage 3: Finding Details", width: "50%" },
        4: { text: "Stage 4: Locating Booth", width: "70%" },
        5: { text: "Stage 5: At Polling Station", width: "90%" },
        6: { text: "Stage 6: Vote Completed", width: "100%" }
    };
    const s = stages[stage] || stages[1];
    progressText.innerText = s.text;
    progressBar.style.width = s.width;
}

// --- Audio Management ---
audioToggle.addEventListener('click', () => {
    isAudioEnabled = !isAudioEnabled;
    audioToggle.classList.toggle('active', isAudioEnabled);
    audioToggle.innerText = isAudioEnabled ? '🔊' : '🔈';
    if (!isAudioEnabled) window.speechSynthesis.cancel();
});

function speakText(text, lang = currentLanguage) {
    if (!isAudioEnabled) return;
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Stop current
        const cleanText = text.replace(/[*#]/g, '').replace(/<[^>]*>?/gm, '');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = lang;
        utterance.rate = 0.85;
        window.speechSynthesis.speak(utterance);
    }
}

// --- Language Management ---
languageSelect.addEventListener('change', (e) => {
    currentLanguage = e.target.value;
    updateUILanguage();
});

function updateUILanguage() {
    const texts = {
        'en-IN': { hero: 'VoteSeva', subtitle: "India's Smart Election Assistant", cards: ['Find My Booth', 'No Voter ID?', 'At the Booth', 'Practice Vote'] },
        'hi-IN': { hero: 'वोटसेवा', subtitle: "भारत का स्मार्ट चुनाव सहायक", cards: ['मेरा बूथ खोजें', 'वोटर आईडी नहीं है?', 'बूथ पर हूँ', 'वोट का अभ्यास'] },
        'te-IN': { hero: 'ఓట్‌సేవ', subtitle: "భారతదేశపు స్మార్ట్ ఎన్నికల సహాయకుడు", cards: ['నా బూత్ కనుగొను', 'ఓటర్ ఐడి లేదా?', 'బూత్ వద్ద ఉన్నాను', 'ఓటు సాధన'] },
        'ta-IN': { hero: 'வோட்சேवा', subtitle: "இந்தியாவின் ஸ்மார்ட் தேர்தல் உதவியாளர்", cards: ['எனது சாவடியைக் கண்டுபிடி', 'வாக்காளர் அடையாள அட்டை இல்லையா?', 'சாவடியில் இருக்கிறேன்', 'வாக்கு பயிற்சி'] },
        'mr-IN': { hero: 'वोटसेवा', subtitle: "भारताचे स्मार्ट निवडणूक साहाय्यक", cards: ['माझे मतदान केंद्र शोधा', 'मतदार ओळखपत्र नाही?', 'मी मतदान केंद्रावर आहे', 'मतदान सराव'] }
    };
    const t = texts[currentLanguage] || texts['en-IN'];
    document.querySelector('.landing-hero h1').innerText = t.hero;
    document.querySelector('.landing-hero p').innerText = t.subtitle;
    
    // Translate Cards
    const cardTitles = document.querySelectorAll('.action-card h3');
    t.cards.forEach((txt, i) => {
        if (cardTitles[i]) cardTitles[i].innerText = txt;
    });
}

// --- Format Output ---
function formatResponse(text) {
    // 1. Remove markdown bolding ** 
    let clean = text.replace(/\*\*(.*?)\*\*/g, '$1');
    clean = clean.replace(/\*(.*?)\*/g, '$1');

    const stepTitles = {
        'en-IN': ['Step 1: What to do now', 'Step 2: What happens next', 'Step 3: What to say', 'Step 4: Important note'],
        'hi-IN': ['चरण 1: अब क्या करें', 'चरण 2: आगे क्या होगा', 'चरण 3: क्या कहें', 'चरण 4: महत्वपूर्ण नोट'],
        'te-IN': ['దశ 1: ఇప్పుడు ఏమి చేయాలి', 'దశ 2: తరువాత ఏమి జరుగుతుంది', 'దశ 3: ఏమి చెప్పాలి', 'దశ 4: ముఖ్యమైన గమనిక'],
        'ta-IN': ['படி 1: இப்போது என்ன செய்வது', 'படி 2: அடுத்து என்ன நடக்கும்', 'படி 3: என்ன சொல்வது', 'படி 4: முக்கிய குறிப்பு'],
        'kn-IN': ['ಹಂತ 1: ಈಗ ಏನು ಮಾಡಬೇಕು', 'ಹಂತ 2: ಮುಂದೆ ಏನಾಗುತ್ತದೆ', 'ಹಂತ 3: ಏನು ಹೇಳಬೇಕು', 'ಹಂತ 4: ಪ್ರಮುಖ ಟಿಪ್ಪಣಿ'],
        'mr-IN': ['पायरी 1: आता काय करावे', 'पायरी 2: पुढे काय होईल', 'पायरी 3: काय बोलावे', 'पायरी 4: महत्वाची टीप']
    };

    const currentTitles = stepTitles[currentLanguage] || stepTitles['en-IN'];
    
    // Convert URLs to clickable links
    const formattedText = text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color:var(--primary-blue); font-weight:600;">$1</a>');
    
    const steps = formattedText.split(/Step \d+:|चरण \d+:|దశ \d+:|படி \d+:|ಹಂತ \d+:|ಪಾಯರಿ \d+:/i).filter(s => s.trim());
    
    if (steps.length >= 2) {
        return `<div class="step-container">` + 
            steps.map((s, i) => `
                <div class="step-item">
                    <b>${currentTitles[i] || 'Step ' + (i+1)}</b>
                    ${s.trim()}
                </div>
            `).join('') + `</div>`;
    } else {
        return formattedText.replace(/\n/g, '<br>');
    }
}

// --- Chat Logic ---
function addMessage(text, sender) {
    if (!landingState.classList.contains('hidden')) {
        landingState.classList.add('hidden');
        chatArea.classList.remove('hidden');
        backBtn.classList.remove('hidden');
    }

    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender);
    
    if (sender === 'bot') {
        const formatted = formatResponse(text);
        msgDiv.innerHTML = formatted;
        
        // Add individual listen button
        const listenBtn = document.createElement('button');
        listenBtn.className = 'listen-btn';
        listenBtn.innerHTML = '🔊';
        listenBtn.onclick = () => speakText(text);
        msgDiv.appendChild(listenBtn);

        speakText(text);
    } else {
        msgDiv.innerText = text;
    }
    
    chatMessages.appendChild(msgDiv);
    
    // Add Share Location button if AI asks for it
    if (sender === 'bot' && (text.toLowerCase().includes('location') || text.toLowerCase().includes('area'))) {
        const locBtn = document.createElement('button');
        locBtn.className = 'quick-btn';
        locBtn.style.marginTop = '10px';
        locBtn.innerHTML = '📍 Share My Location';
        locBtn.onclick = () => getGeoLocation();
        chatMessages.appendChild(locBtn);
    }

    const mainView = document.getElementById('mainView');
    mainView.scrollTop = mainView.scrollHeight;
}

function getGeoLocation() {
    if (!navigator.geolocation) {
        addMessage("Geolocation is not supported by your browser.", 'bot');
        return;
    }
    
    addMessage("Searching for your coordinates...", 'bot');
    navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        sendMessage(`My coordinates are ${latitude}, ${longitude}. Please find the nearest booth.`);
    }, () => {
        addMessage("Please enable location access in your browser settings.", 'bot');
    });
}

async function sendMessage(textOverride = null) {
    const text = textOverride || userInput.value.trim();
    if (!text) return;

    addMessage(text, 'user');
    userInput.value = '';

    // 1. Try Local Decision Engine first
    const localDecision = decisionEngine(text);
    if (localDecision) {
        setTimeout(() => {
            const reply = typeof localDecision === 'string' ? localDecision : localDecision.reply;
            addMessage(reply, 'bot');
            if (localDecision.map) {
                document.getElementById('mapContainer').classList.remove('hidden');
                document.getElementById('mapFrame').src = `https://www.google.com/maps?q=${localDecision.map.lat},${localDecision.map.lng}&output=embed`;
            }
        }, 500);
        return;
    }

    // 2. Fallback to Gemini Backend
    try {
        const loadingMsg = document.createElement('div');
        loadingMsg.className = 'message bot loading-status';
        loadingMsg.innerHTML = '<i>🔍 Searching ECI Database...</i>';
        chatMessages.appendChild(loadingMsg);

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId,
                query: text,
                language: currentLanguage,
                contextType: 'general'
            })
        });

        chatMessages.removeChild(loadingMsg);
        const data = await response.json();
        if (data.reply) addMessage(data.reply, 'bot');
    } catch (error) {
        addMessage("Sorry, I cannot connect. Please check your internet.", 'bot');
    }
}

// --- Voice Input ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = currentLanguage;
    
    recognition.onresult = (e) => {
        userInput.value = e.results[0][0].transcript;
        sendMessage();
    };

    micBtn.onclick = () => {
        recognition.lang = currentLanguage;
        recognition.start();
        micBtn.classList.add('recording');
    };
    recognition.onend = () => micBtn.classList.remove('recording');
}

// --- Listeners ---
sendBtn.addEventListener('click', () => sendMessage());
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
    }
});
backBtn.onclick = () => {
    landingState.classList.remove('hidden');
    chatArea.classList.add('hidden');
    backBtn.classList.add('hidden');
    progressTracker.classList.add('hidden');
    document.getElementById('mapContainer').classList.add('hidden');
};

document.querySelectorAll('.action-card').forEach(card => {
    card.onclick = () => {
        // Clear previous conversation for a fresh start
        chatMessages.innerHTML = '';
        document.getElementById('mapContainer').classList.add('hidden');
        
        const action = card.dataset.action;
        if (action === 'find_booth') {
            updateStage(3);
            sendMessage("I want to find my polling booth.");
        } else if (action === 'no_voter_id') {
            updateStage(2);
            sendMessage("I don't have a voter ID. Can I still vote?");
        } else if (action === 'at_station') {
            updateStage(5);
            sendMessage("I am at the polling booth. What should I do?");
        }
    };
});

// EVM Simulator
const practiceBtn = document.getElementById('practiceBtn');
const evmModal = document.getElementById('evmModal');
const closeEvm = document.getElementById('closeEvm');
const evmBtns = document.querySelectorAll('.evm-btn');

practiceBtn.onclick = () => evmModal.classList.remove('hidden');
closeEvm.onclick = () => evmModal.classList.add('hidden');
evmBtns.forEach(btn => {
    btn.onclick = () => {
        document.getElementById('evmFeedback').classList.remove('hidden');
        new Audio("https://www.soundjay.com/buttons/beep-01a.mp3").play().catch(()=>{});
        setTimeout(() => {
            evmFeedback.classList.add('hidden');
            evmModal.classList.add('hidden');
            updateStage(6);
            addMessage("Practice complete! You now know how to use the EVM. Great job!", 'bot');
        }, 2000);
    };
});
