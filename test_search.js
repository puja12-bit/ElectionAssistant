const service = require('./backend/services/voterService');
const query = 'I am Ravi Kumar';
const nameMatch = query.match(/(?:i am|my name is|i'm)\s+([a-zA-Z\s]+)/i);
const searchName = nameMatch ? nameMatch[1].trim() : null;
console.log(`Query: ${query}`);
console.log(`Search Name: "${searchName}"`);
const results = service.searchVoter({ name: searchName });
console.log(`Results: ${JSON.stringify(results)}`);
