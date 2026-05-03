const voterService = require('./voterService');

describe('VoterService — Unit Tests', () => {

    describe('Data Loading', () => {
        test('loads voters from JSON file successfully', () => {
            expect(Array.isArray(voterService.voters)).toBe(true);
            expect(voterService.voters.length).toBeGreaterThan(0);
        });

        test('each voter has required fields', () => {
            voterService.voters.forEach(voter => {
                expect(voter).toHaveProperty('name');
                expect(voter).toHaveProperty('epicNumber');
                expect(voter).toHaveProperty('boothName');
            });
        });
    });

    describe('searchVoter — EPIC number', () => {
        test('finds voter by valid EPIC number (case-insensitive)', () => {
            const results = voterService.searchVoter({ epicNumber: 'ABC1234567' });
            expect(results.length).toBeGreaterThanOrEqual(1);
            expect(results[0].epicNumber.toUpperCase()).toBe('ABC1234567');
        });

        test('returns empty array for non-existent EPIC', () => {
            const results = voterService.searchVoter({ epicNumber: 'ZZZ9999999' });
            expect(results).toEqual([]);
        });

        test('EPIC search is case-insensitive', () => {
            const upper = voterService.searchVoter({ epicNumber: 'ABC1234567' });
            const lower = voterService.searchVoter({ epicNumber: 'abc1234567' });
            expect(upper.length).toBe(lower.length);
        });
    });

    describe('searchVoter — by name', () => {
        test('finds voter by partial name match', () => {
            const results = voterService.searchVoter({ name: 'Ravi' });
            expect(results.length).toBeGreaterThan(0);
            results.forEach(v => expect(v.name.toLowerCase()).toContain('ravi'));
        });

        test('finds voter by full name', () => {
            const results = voterService.searchVoter({ name: 'Ravi Kumar' });
            expect(results.length).toBeGreaterThan(0);
        });

        test('returns empty array for name not in database', () => {
            const results = voterService.searchVoter({ name: 'NonExistentXYZ12345' });
            expect(results).toEqual([]);
        });

        test('name search is case-insensitive', () => {
            const upper = voterService.searchVoter({ name: 'RAVI' });
            const lower = voterService.searchVoter({ name: 'ravi' });
            expect(upper.length).toBe(lower.length);
        });
    });

    describe('searchVoter — by location', () => {
        test('finds voters in Guntur', () => {
            const results = voterService.searchVoter({ name: 'Ravi', location: 'Guntur' });
            expect(results.length).toBeGreaterThan(0);
            results.forEach(v => expect(v.location.toLowerCase()).toContain('guntur'));
        });
    });

    describe('searchVoter — no criteria', () => {
        test('returns empty array when no search criteria provided', () => {
            const results = voterService.searchVoter({});
            expect(results).toEqual([]);
        });

        test('returns empty array when called with undefined', () => {
            const results = voterService.searchVoter();
            expect(results).toEqual([]);
        });
    });

    describe('getVoterById', () => {
        test('returns correct voter when ID exists', () => {
            const firstVoter = voterService.voters[0];
            if (firstVoter.id) {
                const found = voterService.getVoterById(firstVoter.id);
                expect(found).toEqual(firstVoter);
            }
        });

        test('returns undefined for non-existent ID', () => {
            const result = voterService.getVoterById('nonexistent_id_99999');
            expect(result).toBeUndefined();
        });
    });

    describe('Caching', () => {
        test('returns same results on repeated identical searches (cache hit)', () => {
            const first  = voterService.searchVoter({ name: 'Ravi' });
            const second = voterService.searchVoter({ name: 'Ravi' });
            expect(first).toEqual(second);
        });
    });
});
