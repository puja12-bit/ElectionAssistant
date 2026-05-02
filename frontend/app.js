import { decisionEngine } from './decisionEngine.js';

const landingState = document.getElementById('landingState');
const chatArea = document.getElementById('chatArea');
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const micBtn = document.getElementById('micBtn');
const backBtn = document.getElementById('backBtn');

// EVM Modal
const practiceBtn = document.getElementById('practiceBtn');
const evmModal = document.getElementById('evmModal');
const closeEvm = document.getElementById('closeEvm');
const evmBtns = document.querySelectorAll('.evm-btn');
const evmFeedback = document.getElementById('evmFeedback');
const beepSound = document.getElementById('beepSound');

// Map container
const mapContainer = document.getElementById('mapContainer');
const mapFrame = document.getElementById('mapFrame');

// State
let sessionId = 'session_' + Math.random().toString(36).substr(2, 9);
let stage = 1; // Dual voting stage: 1 = MLA, 2 = MP

// --- Setup Voice (Web Speech API) ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-IN'; // Indian English
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        userInput.value = transcript;
        sendMessage();
    };

    recognition.onend = () => {
        micBtn.classList.remove('recording');
    };
} else {
    console.warn("Speech recognition not supported in this browser.");
    micBtn.style.display = 'none';
}

function speakText(text) {
    if ('speechSynthesis' in window) {
        // Strip out HTML tags for speaking
        const cleanText = text.replace(/<[^>]*>?/gm, '');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'en-IN';
        utterance.rate = 0.9; // Slightly slower for clarity
        window.speechSynthesis.speak(utterance);
    }
}

// Format the 4 steps as nice UI cards
function formatSteps(text) {
    if (!text.includes("Step")) return text;
    
    const steps = text.split("Step").slice(1);
    
    return steps.map(step => {
        const parts = step.split(":");
        if (parts.length < 2) return '';
        const title = parts[0].trim();
        const content = parts.slice(1).join(":").trim();
        return `
            <div class="step-card">
                <b>Step ${title}</b>
                <p>${content}</p>
            </div>
        `;
    }).join("");
}

// --- Navigation Logic ---
backBtn.addEventListener('click', () => {
    chatArea.classList.add('hidden');
    mapContainer.classList.add('hidden');
    document.querySelector('.quick-actions').classList.add('hidden');
    landingState.classList.remove('hidden');
    backBtn.classList.add('hidden');
});

// --- Chat Logic ---
function addMessage(text, sender, isFormatted = false) {
    if (landingState && !landingState.classList.contains('hidden')) {
        landingState.classList.add('hidden');
        chatArea.classList.remove('hidden');
        document.querySelector('.quick-actions').classList.remove('hidden');
        backBtn.classList.remove('hidden');
    }

    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender);
    
    if (sender === 'bot') {
        if (isFormatted) {
            msgDiv.innerHTML = text;
        } else {
            // Check if it looks like the 4-step format
            if (text.includes("Step 1:")) {
                msgDiv.innerHTML = formatSteps(text);
            } else {
                msgDiv.innerHTML = text.replace(/\n/g, '<br>');
            }
        }
        speakText(text);
    } else {
        msgDiv.innerHTML = `<b>You:</b> ${text}`;
    }
    
    chatMessages.appendChild(msgDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
}

// Setup Quick Action Buttons
window.quick = function(msg) {
    sendMessage(msg);
}

async function sendMessage(textOverride = null) {
    const text = textOverride || userInput.value.trim();
    if (!text) return;

    addMessage(text, 'user');
    userInput.value = '';

    // 1. Try Local Decision Engine first
    const localDecision = decisionEngine(text);
    if (localDecision) {
        if (typeof localDecision === 'string') {
            addMessage(localDecision, 'bot');
        } else if (localDecision.reply) {
            addMessage(localDecision.reply, 'bot');
            if (localDecision.map) {
                mapContainer.classList.remove('hidden');
                mapFrame.src = `https://www.google.com/maps?q=${localDecision.map.lat},${localDecision.map.lng}&output=embed`;
            }
        }
        return; // Fast return
    }

    // 2. Fallback to Gemini Backend
    try {
        const response = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId,
                query: text,
                contextType: 'general'
            })
        });

        const data = await response.json();
        
        if (data.reply) {
            addMessage(data.reply, 'bot');
        }
    } catch (error) {
        console.error('Error:', error);
        addMessage("Sorry, I am having trouble connecting to the server.", 'bot');
    }
}

// --- Event Listeners ---
sendBtn.addEventListener('click', () => sendMessage());
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

micBtn.addEventListener('click', () => {
    if (recognition) {
        micBtn.classList.add('recording');
        recognition.start();
    }
});

// Action Cards Click (Landing)
document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => {
        const action = card.dataset.action;
        let initialMsg = "";
        if (action === 'find_booth') initialMsg = "where to vote";
        else if (action === 'no_voter_id') initialMsg = "no voter id";
        else if (action === 'at_station') initialMsg = "i am at booth";
        
        sendMessage(initialMsg);
    });
});

// --- EVM Simulator (Dual Voting & VVPAT) ---
practiceBtn.addEventListener('click', () => {
    stage = 1;
    evmModal.classList.remove('hidden');
    evmFeedback.classList.add('hidden');
    document.getElementById('evmTitle').innerText = "EVM Simulator - Stage 1 (MLA)";
});

closeEvm.addEventListener('click', () => {
    evmModal.classList.add('hidden');
});

function showVVPAT(candidateInfo) {
    const slip = document.createElement("div");
    slip.className = "vvpat-slip";
    slip.innerText = `You voted for:\n${candidateInfo}`;
    document.body.appendChild(slip);

    setTimeout(() => {
        slip.remove();
    }, 3000);
}

evmBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const candidateName = e.target.parentElement.querySelector('.candidate-info').innerText;
        
        // Play beep sound
        try {
            new Audio("beep.mp3").play().catch(e => console.log("Audio block", e));
        } catch(e) {}
        
        if (stage === 1) {
            showVVPAT("MLA: " + candidateName);
            stage = 2;
            evmFeedback.innerHTML = `<span class="light-indicator">🔴</span><p>Beep! MLA Vote Cast. Now vote for MP.</p>`;
            evmFeedback.classList.remove('hidden');
            document.getElementById('evmTitle').innerText = "EVM Simulator - Stage 2 (MP)";
            
            setTimeout(() => { evmFeedback.classList.add('hidden'); }, 2000);
        } else {
            showVVPAT("MP: " + candidateName);
            evmFeedback.innerHTML = `<span class="light-indicator">🔴</span><p>Beep! MP Vote Cast. Voting Complete.</p>`;
            evmFeedback.classList.remove('hidden');
            
            setTimeout(() => {
                evmModal.classList.add('hidden');
                alert("Voting complete! Thank you for practicing.");
            }, 3000);
        }
    });
});
