const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../../data/voters.json');

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

    searchVoter(name, relativeName) {
        if (!name) return null;
        
        const lowerName = name.toLowerCase();
        const lowerRelName = relativeName ? relativeName.toLowerCase() : '';

        return this.voters.filter(v => {
            const nameMatch = v.name.toLowerCase().includes(lowerName);
            const relMatch = relativeName ? v.relativeName.toLowerCase().includes(lowerRelName) : true;
            return nameMatch && relMatch;
        });
    }

    getVoterById(id) {
        return this.voters.find(v => v.id === id);
    }
}

module.exports = new VoterService();
