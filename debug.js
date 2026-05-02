const voterService = require('./backend/services/voterService');
console.log('Voters length:', voterService.voters.length);
const results = voterService.searchVoter(null, null, null, 'ABC1234567');
console.log('Results length:', results.length);
if (results.length > 0) {
    console.log('Found:', results[0].name);
} else {
    console.log('Not found. First voter epic:', voterService.voters[0].epicNumber);
}
