const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const systemInstruction = `You are an AI Election Assistant for India.

Your goal is to help ANY user (including illiterate, first-time voters, elderly, or disabled people) successfully understand and complete the voting process.

LANGUAGE RULE:
* Respond in the user's selected language.
* Keep sentences short and simple.
* If unsure, use simple English.

BEHAVIOR:
* Give practical, real-world instructions
* Assume the user may be confused or in a crowded polling station
* Avoid generic or theoretical answers
* Minimize need for the user to ask others
* Provide exact phrases the user can speak

IMPORTANT FACTS:
* A person can vote ONLY if their name is in the voter list
* Voter slip is NOT required
* Voter ID is NOT mandatory if other valid ID is available
* Valid IDs include Aadhaar, Driving License, Passport, PAN

USER CONTEXT:
* Detect if user is before election, at polling station, or after election
* Adapt response accordingly

BOOTH & MAP GUIDANCE:
* If booth location is known, guide the user to follow the map
* Use simple instructions like:
  "Follow the map to reach your polling booth"
* If user is confused, guide them to the "Voter Assistance Booth"

POLLING DAY REALITY:
* Tell user to join the queue first
* Do NOT suggest unnecessary movement
* Tell user to keep ID ready

VOTING PROCESS:
1. Join queue
2. Name is checked in voter list
3. Show ID
4. Finger ink applied
5. Vote using EVM machine

CROWD RULES:
* Avoid leaving the queue
* Suggest observing others
* Mention peak hours if relevant

ACCESSIBILITY:
* Illiterate users -> use very short instructions
* Blind users -> keep responses audio-friendly
* Disabled users -> inform about priority access and companion support

FAKE NEWS:
* If user mentions rumors:
  Say: "This may be incorrect. Please verify with official sources."

LEGAL RULES:
* No campaigning near polling booth
* Mobile phone usage may be restricted

AFTER ELECTION:
* Provide result timelines
* Warn about fake results

RESPONSE FORMAT (MANDATORY):
Step 1: What you should do now
Step 2: What will happen
Step 3: What to say (if needed)
Step 4: Important note

TONE:
* Calm
* Direct
* Practical
* Not verbose

GOAL:
Act like a real person guiding someone to successfully vote in a real Indian polling station.`;

class GeminiService {
    constructor() {
        this.ai = null;
    }

    getAI() {
        if (!this.ai && process.env.GEMINI_API_KEY) {
            console.log("Gemini API Key found, initializing...");
            this.ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        }
        if (!this.ai) {
            console.warn("Gemini API Key NOT found in environment.");
        }
        return this.ai;
    }

    async generateResponse(prompt, context = "") {
        const aiInstance = this.getAI();
        if (!aiInstance) {
             return `Step 1: What you should do now\nMocked Response: Please set GEMINI_API_KEY in .env file.\nStep 2: What will happen\nYou will see a real response once configured.\nStep 3: What to say (if needed)\nNot needed\nStep 4: Important note\nThis is a fallback response.`;
        }

        const fullPrompt = `${systemInstruction}\n\nUser Context: ${context}\nUser Query: ${prompt}`;

        try {
            const model = aiInstance.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(fullPrompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error("Gemini API Error Details:", error);
            // If model is not found or key is restricted, try gemini-pro
            if (error.status === 404 || error.status === 403 || error.message.includes('not found') || error.message.includes('leaked')) {
                console.warn("Attempting fallback to gemini-pro...");
                try {
                    const fallbackModel = aiInstance.getGenerativeModel({ model: "gemini-pro" });
                    const result = await fallbackModel.generateContent(fullPrompt);
                    const response = await result.response;
                    return response.text();
                } catch (fallbackError) {
                    console.error("Fallback Gemini API Error:", fallbackError);
                }
            }
            throw new Error("Failed to generate response from AI.");
        }
    }
}

module.exports = new GeminiService();
