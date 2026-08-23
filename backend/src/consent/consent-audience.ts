/**
 * Shared audience evaluation for campaign filtering and audience preview.
 *
 * Rules:
 *  - OPTED_OUT contacts are ALWAYS excluded.
 *  - UNKNOWN/PENDING handling is configurable via marketingConsent mode:
 *      OPTED_IN_ONLY     → only OPTED_IN contacts are eligible
 *      EXCLUDE_OPTED_OUT (default) → OPTED_IN, PENDING and UNKNOWN are eligible
 *  - Contacts tagged "Invalid Number" are excluded from eligible counts.
 */

export type MarketingConsentMode = 'OPTED_IN_ONLY' | 'EXCLUDE_OPTED_OUT' | 'ALL';

export interface AudienceFiltersConfig {
    marketingConsent?: MarketingConsentMode;
    excludeOptedOut?: boolean;
    excludeInvalid?: boolean;
    excludeUnsubscribed?: boolean;
    excludeTags?: string[];
}

export interface AudienceOptions {
    targetTags?: string[];
    targetFilters?: any;
    audienceFilters?: AudienceFiltersConfig;
    excludeUnsubscribed?: boolean;
    excludeTags?: string[];
}

export interface AudienceBreakdown {
    optedOut: number;
    notOptedIn: number;
    invalid: number;
    unsubscribed: number;
    excludeTags: number;
    tagMismatch: number;
    filterMismatch: number;
}

export interface AudienceEvaluationResult {
    total: number;
    eligible: number;
    excluded: number;
    breakdown: AudienceBreakdown;
}

export interface AudienceContactShape {
    id: string;
    tags?: any;
    city?: string | null;
    conversations?: { lastMessageAt?: Date | string | null }[];
}

export function resolveMarketingMode(config?: AudienceFiltersConfig): MarketingConsentMode {
    if (config?.marketingConsent) return config.marketingConsent;
    // Default: OPTED_OUT excluded, UNKNOWN allowed.
    return 'EXCLUDE_OPTED_OUT';
}

/** Whether a single consent status is allowed given the mode. OPTED_OUT always fails. */
export function isConsentAllowed(status: string | undefined | null, mode: MarketingConsentMode): boolean {
    if (status === 'OPTED_OUT') return false;
    if (mode === 'OPTED_IN_ONLY' && status !== 'OPTED_IN') return false;
    return true;
}

export function matchesTargetFilters(c: AudienceContactShape, targetFilters: any): boolean {
    if (!targetFilters) return true;
    if (targetFilters.city && (!c.city || c.city.toLowerCase().trim() !== targetFilters.city.toLowerCase().trim())) {
        return false;
    }
    if (targetFilters.hasTags && targetFilters.hasTags.length > 0) {
        const tags = (c.tags as string[]) || [];
        if (!targetFilters.hasTags.some((t: string) => tags.includes(t))) return false;
    }
    if (targetFilters.noMessagesInDays) {
        const convo = c.conversations?.[0];
        if (convo?.lastMessageAt) {
            const days = (Date.now() - new Date(convo.lastMessageAt).getTime()) / (86400 * 1000);
            if (days < targetFilters.noMessagesInDays) return false;
        }
    }
    return true;
}

/**
 * Evaluate a list of shop contacts against campaign audience options.
 * @param consentMap Map of contactId → consent status (missing = no record = UNKNOWN).
 */
export function evaluateAudience(
    contacts: AudienceContactShape[],
    consentMap: Map<string, string>,
    options: AudienceOptions = {},
): AudienceEvaluationResult {
    const mode = resolveMarketingMode(options.audienceFilters);
    const excludeUnsubscribed =
        options.excludeUnsubscribed ?? options.audienceFilters?.excludeUnsubscribed ?? false;
    const excludeInvalid = options.audienceFilters?.excludeInvalid ?? true;

    const rawExcludeTags = options.excludeTags ?? options.audienceFilters?.excludeTags ?? [];
    const excludeTagsSet = new Set(rawExcludeTags.map(t => String(t).toLowerCase().trim()).filter(Boolean));

    const breakdown: AudienceBreakdown = {
        optedOut: 0,
        notOptedIn: 0,
        invalid: 0,
        unsubscribed: 0,
        excludeTags: 0,
        tagMismatch: 0,
        filterMismatch: 0,
    };
    let eligible = 0;

    for (const c of contacts) {
        const tags = (c.tags as string[]) || [];
        let excluded = false;

        if (excludeInvalid && tags.includes('Invalid Number')) {
            breakdown.invalid++;
            excluded = true;
        }

        if (!excluded && excludeUnsubscribed && tags.includes('unsubscribed')) {
            breakdown.unsubscribed++;
            excluded = true;
        }

        if (!excluded && excludeTagsSet.size > 0) {
            if (Array.isArray(tags) && tags.some(t => typeof t === 'string' && excludeTagsSet.has(t.toLowerCase().trim()))) {
                breakdown.excludeTags++;
                excluded = true;
            }
        }

        if (!excluded && options.targetTags && options.targetTags.length > 0) {
            if (!options.targetTags.some((t) => tags.includes(t))) {
                breakdown.tagMismatch++;
                excluded = true;
            }
        }

        if (!excluded && options.targetFilters) {
            if (!matchesTargetFilters(c, options.targetFilters)) {
                breakdown.filterMismatch++;
                excluded = true;
            }
        }

        if (!excluded) {
            const consent = consentMap.get(c.id);
            if (consent === 'OPTED_OUT') {
                breakdown.optedOut++;
                excluded = true;
            } else if (mode === 'OPTED_IN_ONLY' && consent !== 'OPTED_IN') {
                breakdown.notOptedIn++;
                excluded = true;
            }
        }

        if (!excluded) eligible++;
    }

    return {
        total: contacts.length,
        eligible,
        excluded: contacts.length - eligible,
        breakdown,
    };
}
