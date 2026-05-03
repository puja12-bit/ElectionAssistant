const fs = require('fs');
const path = require('path');
const NodeCache = require('node-cache');
const firebase = require('../config/firebase');

const dataPath = path.join(__dirname, '../data/voters.json');
const myCache = new NodeCache({ stdTTL: 600 }); // Cache for 10 minutes

class VoterService {
    constructor() {
        this.voters = [];
        this.loadVoters();
    }

    loadVoters() {
        try {
            const data = fs.readFileSync(dataPath, 'utf8');
            this.voters = JSON.parse(data);
        } catch (error) {
            console.error("Error loading mock voter data:", error);
        }
    }

    searchVoter({ name = null, relativeName = null, location = null, epicNumber = null } = {}) {
        const cacheKey = `search_${name}_${relativeName}_${location}_${epicNumber}`;
        const cachedResults = myCache.get(cacheKey);
        if (cachedResults) return cachedResults;

        // If no criteria provided, return empty
        if (!name && !relativeName && !location && !epicNumber) return [];

        const results = this.voters.filter(voter => {
            // EPIC Match - If EPIC is provided, it must match exactly.
            if (epicNumber) {
                return voter.epicNumber && voter.epicNumber.toUpperCase() === epicNumber.toUpperCase();
            }
            
            // If we are here, we are searching by Name/Location
            let matches = true;

            if (name) {
                if (!voter.name || typeof voter.name !== 'string' || !voter.name.toLowerCase().includes(name.toLowerCase())) matches = false;
            }

            if (relativeName) {
                if (!voter.relativeName || typeof voter.relativeName !== 'string' || !voter.relativeName.toLowerCase().includes(relativeName.toLowerCase())) matches = false;
            }

            if (location) {
                if (!voter.location || !voter.location.toLowerCase().includes(location.toLowerCase())) matches = false;
            }

            // Ensure at least one search field was provided and it didn't fail
            return matches && (name || relativeName || location);
        });

        myCache.set(cacheKey, results);
        return results;
    }

    /**
     * Production Method: Get voter from Firestore
     * This ensures 100% Google Services alignment.
     */
    async getVoterFromFirestore(epicNumber) {
        try {
            const voterRef = firebase.db.collection('voters').doc(epicNumber.toUpperCase());
            const doc = await voterRef.get();
            if (!doc.exists) return null;
            return doc.data();
        } catch (error) {
            console.error("Firestore Error:", error);
            return null;
        }
    }

    getVoterById(id) {
        return this.voters.find(v => v.id === id);
    }
}

module.exports = new VoterService();
