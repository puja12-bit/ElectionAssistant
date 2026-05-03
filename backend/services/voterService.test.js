const voterService = require('./voterService');

describe('VoterService', () => {
    test('should load voters from json', () => {
        expect(voterService.voters.length).toBeGreaterThan(0);
    });

    test('should find voter by EPIC number', () => {
        const results = voterService.searchVoter({ epicNumber: 'ABC1234567' });
        expect(results.length).toBe(1);
        expect(results[0].name).toBe('Ravi Kumar');
    });

    test('should filter by location', () => {
        const results = voterService.searchVoter({ name: 'Ravi', location: 'Guntur' });
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].location).toContain('Guntur');
    });

    test('should return empty for non-existent voter', () => {
        const results = voterService.searchVoter({ name: 'NonExistentUser' });
        expect(results.length).toBe(0);
    });
});
