/**
 * Deterministic, AI-independent keyword detection for marketing consent.
 *
 * No LLMs, no external services — pure string matching on configurable keywords.
 * Opt-out keywords are checked BEFORE opt-in keywords (safety-first: "stop" wins
 * over "yes").
 */

export const CONSENT_STATUSES = ['OPTED_IN', 'OPTED_OUT', 'PENDING', 'UNKNOWN'] as const;
export type ConsentStatus = typeof CONSENT_STATUSES[number];

export const CONSENT_SOURCES = [
    'CUSTOMER_REPLY',
    'MANUAL_ACTION',
    'IMPORT',
    'CAMPAIGN_LINK',
    'ADMIN',
    'API',
] as const;
export type ConsentSource = typeof CONSENT_SOURCES[number];

export const DEFAULT_OPT_IN_KEYWORDS = [
    'yes',
    'start',
    'unstop',
    'subscribe',
    'i want offers',
    'interested',
    'opt in',
    'sign me up',
    'go ahead',
];

export const DEFAULT_OPT_OUT_KEYWORDS = [
    'stop',
    'unsubscribe',
    'remove me',
    'no offers',
    "don't message",
    'opt out',
    'do not message',
    'remove',
];

export interface ConsentKeywordConfig {
    optInKeywords?: string[];
    optOutKeywords?: string[];
}

export type ConsentIntent = 'OPT_IN' | 'OPT_OUT' | null;

export interface ConsentDetectionResult {
    intent: ConsentIntent;
    keyword?: string;
    matchedKeywords: string[];
}

/** Lowercase, collapse whitespace, keep letters/numbers/apostrophes only. */
export function normalizeConsentText(text: string): string {
    return String(text || '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}'\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchKeyword(text: string, keyword: string): boolean {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return false;

    const words = kw.split(/\s+/);
    if (words.length > 1) {
        // Phrase match — substring containment ("i want offers", "remove me").
        return text.includes(kw);
    }

    // Single word — word-boundary match so "stop" does not match "postop".
    const escaped = escapeRegex(words[0]);
    return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`, 'u').test(text);
}

export function detectConsentIntent(
    text: string,
    config?: ConsentKeywordConfig,
): ConsentDetectionResult {
    const normalized = normalizeConsentText(text);
    if (!normalized) return { intent: null, matchedKeywords: [] };

    const optOutKeywords =
        config?.optOutKeywords && config.optOutKeywords.length > 0
            ? config.optOutKeywords
            : DEFAULT_OPT_OUT_KEYWORDS;
    const optInKeywords =
        config?.optInKeywords && config.optInKeywords.length > 0
            ? config.optInKeywords
            : DEFAULT_OPT_IN_KEYWORDS;

    // Opt-out takes precedence over opt-in.
    const matchedOptOut = optOutKeywords.filter((k) => matchKeyword(normalized, k));
    if (matchedOptOut.length > 0) {
        return { intent: 'OPT_OUT', keyword: matchedOptOut[0], matchedKeywords: matchedOptOut };
    }

    const matchedOptIn = optInKeywords.filter((k) => matchKeyword(normalized, k));
    if (matchedOptIn.length > 0) {
        return { intent: 'OPT_IN', keyword: matchedOptIn[0], matchedKeywords: matchedOptIn };
    }

    return { intent: null, matchedKeywords: [] };
}
