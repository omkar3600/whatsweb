import {
    detectConsentIntent,
    normalizeConsentText,
} from './consent-detector';

describe('consent detector', () => {
    it('normalizes punctuation, casing, and whitespace', () => {
        expect(normalizeConsentText('  YES!!!  I\'m interested. ')).toBe("yes i'm interested");
    });

    it('detects opt-in keywords without an AI dependency', () => {
        const result = detectConsentIntent('Yes, please send me the offers!');

        expect(result.intent).toBe('OPT_IN');
        expect(result.keyword).toBe('yes');
        expect(result.matchedKeywords).toContain('yes');
    });

    it('detects opt-out keywords and gives them precedence', () => {
        const result = detectConsentIntent('Yes, but stop sending offers');

        expect(result.intent).toBe('OPT_OUT');
        expect(result.keyword).toBe('stop');
    });

    it('uses business-specific keyword configuration', () => {
        expect(detectConsentIntent('Absolutely', {
            optInKeywords: ['absolutely'],
            optOutKeywords: ['cancel'],
        }).intent).toBe('OPT_IN');
        expect(detectConsentIntent('cancel', {
            optInKeywords: ['absolutely'],
            optOutKeywords: ['cancel'],
        }).intent).toBe('OPT_OUT');
        expect(detectConsentIntent('yes', {
            optInKeywords: ['absolutely'],
            optOutKeywords: ['cancel'],
        }).intent).toBeNull();
    });

    it('does not match a keyword inside another word', () => {
        expect(detectConsentIntent('postpone this').intent).toBeNull();
    });
});
