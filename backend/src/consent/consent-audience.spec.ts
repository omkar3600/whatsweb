import {
    evaluateAudience,
    isConsentAllowed,
    resolveMarketingMode,
} from './consent-audience';

describe('consent audience evaluation', () => {
    const contacts = [
        { id: 'in', tags: [] },
        { id: 'out', tags: [] },
        { id: 'unknown', tags: [] },
        { id: 'invalid', tags: ['Invalid Number'] },
        { id: 'unsubscribed', tags: ['unsubscribed'] },
    ];

    it('always excludes opted-out contacts', () => {
        expect(isConsentAllowed('OPTED_OUT', 'ALL')).toBe(false);
        expect(isConsentAllowed('OPTED_OUT', 'EXCLUDE_OPTED_OUT')).toBe(false);
        expect(isConsentAllowed('OPTED_OUT', 'OPTED_IN_ONLY')).toBe(false);
    });

    it('requires explicit opt-in in OPTED_IN_ONLY mode', () => {
        expect(isConsentAllowed('OPTED_IN', 'OPTED_IN_ONLY')).toBe(true);
        expect(isConsentAllowed('PENDING', 'OPTED_IN_ONLY')).toBe(false);
        expect(isConsentAllowed(undefined, 'OPTED_IN_ONLY')).toBe(false);
    });

    it('defaults to excluding opted-out contacts while allowing unknown contacts', () => {
        expect(resolveMarketingMode()).toBe('EXCLUDE_OPTED_OUT');
        const result = evaluateAudience(contacts, new Map([
            ['in', 'OPTED_IN'],
            ['out', 'OPTED_OUT'],
        ]));

        expect(result.total).toBe(5);
        expect(result.eligible).toBe(3);
        expect(result.excluded).toBe(2);
        expect(result.breakdown.optedOut).toBe(1);
        expect(result.breakdown.invalid).toBe(1);
    });

    it('excludes unknown, invalid, and unsubscribed contacts in a strict audience', () => {
        const result = evaluateAudience(contacts, new Map([
            ['in', 'OPTED_IN'],
            ['out', 'OPTED_OUT'],
        ]), {
            excludeUnsubscribed: true,
            audienceFilters: {
                marketingConsent: 'OPTED_IN_ONLY',
                excludeInvalid: true,
            },
        });

        expect(result.eligible).toBe(1);
        expect(result.excluded).toBe(4);
        expect(result.breakdown.optedOut).toBe(1);
        expect(result.breakdown.notOptedIn).toBe(1);
        expect(result.breakdown.invalid).toBe(1);
        expect(result.breakdown.unsubscribed).toBe(1);
    });

    it('applies tag and city filters before counting consent exclusions', () => {
        const result = evaluateAudience([
            { id: 'a', tags: ['vip'], city: 'Pune' },
            { id: 'b', tags: ['other'], city: 'Pune' },
            { id: 'c', tags: ['vip'], city: 'Delhi' },
        ], new Map([['a', 'OPTED_IN']]), {
            targetTags: ['vip'],
            targetFilters: { city: 'Pune' },
            audienceFilters: { marketingConsent: 'OPTED_IN_ONLY' },
        });

        expect(result.total).toBe(3);
        expect(result.eligible).toBe(1);
        expect(result.breakdown.tagMismatch).toBe(1);
        expect(result.breakdown.filterMismatch).toBe(1);
    });
});
