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

import { normalizePhone } from '../common/utils/phone-normalizer';

export type MarketingConsentMode = 'OPTED_IN_ONLY' | 'EXCLUDE_OPTED_OUT' | 'ALL';

export interface AudienceFiltersConfig {
    marketingConsent?: MarketingConsentMode;
    excludeOptedOut?: boolean;
    excludeInvalid?: boolean;
    excludeUnsubscribed?: boolean;
    excludeTags?: string[];
}

export interface AudienceOptions {
    targetType?: 'all' | 'tags' | 'contacts' | 'segment' | 'failed';
    targetTags?: string[];
    targetPhones?: string[];
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
    phoneMismatch?: number;
}

export interface AudienceEvaluationResult {
    total: number;
    baseCount: number;
    exclusionsCount: number;
    consentExcludedCount: number;
    locationSegmentExcludedCount: number;
    finalEligibleCount: number;
    eligible: number;
    excluded: number;
    breakdown: AudienceBreakdown;
}

export interface AudienceContactShape {
    id: string;
    name?: string | null;
    phone?: string | null;
    tags?: any;
    city?: string | null;
    conversations?: { lastMessageAt?: Date | string | null }[];
}

/**
 * Safely parses and normalizes contact tags from various formats (string[], JSON string, CSV string).
 * Returns an array of trimmed tag strings.
 */
export function extractContactTags(rawTags: any): string[] {
    if (!rawTags) return [];
    if (Array.isArray(rawTags)) {
        return rawTags
            .map((t) => (typeof t === 'string' ? t.trim() : String(t).trim()))
            .filter((t) => t.length > 0);
    }
    if (typeof rawTags === 'string') {
        const trimmed = rawTags.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    return parsed
                        .map((t) => (typeof t === 'string' ? t.trim() : String(t).trim()))
                        .filter((t) => t.length > 0);
                }
            } catch {
                // fall through to comma-split
            }
        }
        return trimmed
            .split(',')
            .map((t) => t.trim())
            .filter((t) => t.length > 0);
    }
    return [];
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

    // City filter (case-insensitive, trimmed)
    if (targetFilters.city && typeof targetFilters.city === 'string' && targetFilters.city.trim()) {
        const filterCity = targetFilters.city.toLowerCase().trim();
        const contactCity = (c.city || '').toLowerCase().trim();
        if (contactCity !== filterCity) {
            return false;
        }
    }

    // Must-have tags (AND logic — all required tags must be present on contact)
    if (targetFilters.hasTags && Array.isArray(targetFilters.hasTags) && targetFilters.hasTags.length > 0) {
        const contactTagSet = new Set(extractContactTags(c.tags).map((t) => t.toLowerCase()));
        const hasAllRequired = targetFilters.hasTags.every((rt: string) => {
            const required = String(rt).trim().toLowerCase();
            return required.length === 0 || contactTagSet.has(required);
        });
        if (!hasAllRequired) return false;
    }

    // Inactivity period filter
    if (targetFilters.noMessagesInDays && Number(targetFilters.noMessagesInDays) > 0) {
        const daysRequired = Number(targetFilters.noMessagesInDays);
        const convo = c.conversations?.[0];
        if (convo?.lastMessageAt) {
            const daysSinceLastMessage = (Date.now() - new Date(convo.lastMessageAt).getTime()) / (86400 * 1000);
            if (daysSinceLastMessage < daysRequired) return false;
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

    const rawExcludeTags: string[] = [
        ...(Array.isArray(options.excludeTags) ? (options.excludeTags as any) : []),
        ...(Array.isArray(options.audienceFilters?.excludeTags) ? (options.audienceFilters?.excludeTags as any) : []),
        ...(Array.isArray(options.targetFilters?.excludeTags) ? (options.targetFilters?.excludeTags as any) : []),
    ].map((t: string) => String(t).trim()).filter(Boolean);
    const excludeTagsSet = new Set(rawExcludeTags.map((t) => String(t).toLowerCase().trim()).filter(Boolean));

    const targetTagsList = Array.isArray(options.targetTags)
        ? options.targetTags.map((t) => String(t).toLowerCase().trim()).filter(Boolean)
        : [];
    const targetTagsSet = new Set(targetTagsList);

    // Target phones lookup set (contains normalized and raw forms)
    let targetPhoneSet: Set<string> | null = null;
    if (Array.isArray(options.targetPhones) && options.targetPhones.length > 0) {
        targetPhoneSet = new Set();
        for (const p of options.targetPhones) {
            const raw = String(p).trim();
            const norm = normalizePhone(raw);
            if (raw) targetPhoneSet.add(raw.toLowerCase());
            if (norm) {
                targetPhoneSet.add(norm);
                targetPhoneSet.add(`+${norm}`);
            }
        }
    }

    const breakdown: AudienceBreakdown = {
        optedOut: 0,
        notOptedIn: 0,
        invalid: 0,
        unsubscribed: 0,
        excludeTags: 0,
        tagMismatch: 0,
        filterMismatch: 0,
        phoneMismatch: 0,
    };

    let baseCount = 0;
    let exclusionsCount = 0;
    let consentExcludedCount = 0;
    let locationSegmentExcludedCount = 0;
    let eligible = 0;

    for (const c of contacts) {
        const contactTags = extractContactTags(c.tags);
        const contactTagSet = new Set(contactTags.map((t) => t.toLowerCase()));

        // Check 3: Target Tags & Phone base matching
        let matchesBase = true;
        if (targetPhoneSet && targetPhoneSet.size > 0) {
            const cPhone = String(c.phone || '').trim();
            const cNorm = normalizePhone(cPhone);
            const matchesPhone =
                (cPhone && targetPhoneSet.has(cPhone.toLowerCase())) ||
                (cNorm && targetPhoneSet.has(cNorm)) ||
                (cNorm && targetPhoneSet.has(`+${cNorm}`));
            if (!matchesPhone) {
                breakdown.phoneMismatch = (breakdown.phoneMismatch || 0) + 1;
                matchesBase = false;
            }
        } else if (targetTagsSet.size > 0) {
            const matchesTag = Array.from(targetTagsSet).some((t) => contactTagSet.has(t));
            if (!matchesTag) {
                breakdown.tagMismatch++;
                matchesBase = false;
            }
        }

        if (!matchesBase) continue;
        baseCount++;

        // Check 4: Exclusions (excludeTags)
        let isExcludedByTag = false;
        if (excludeTagsSet.size > 0) {
            isExcludedByTag = Array.from(excludeTagsSet).some((t) => contactTagSet.has(t));
            if (isExcludedByTag) {
                breakdown.excludeTags++;
                exclusionsCount++;
                continue;
            }
        }

        // Check 5: Invalid Number
        const isInvalid =
            excludeInvalid &&
            (contactTagSet.has('invalid number') ||
                contactTagSet.has('invalid') ||
                contactTagSet.has('invalid_number'));
        if (isInvalid) {
            breakdown.invalid++;
            consentExcludedCount++;
            continue;
        }

        // Check 6: Unsubscribed
        const isUnsub =
            excludeUnsubscribed &&
            (contactTagSet.has('unsubscribed') ||
                contactTagSet.has('optout') ||
                contactTagSet.has('opt-out') ||
                contactTagSet.has('opted_out'));
        if (isUnsub) {
            breakdown.unsubscribed++;
            consentExcludedCount++;
            continue;
        }

        // Check 7: Location & Segment Filters (City, Must-Have Tags, Inactivity)
        if (options.targetFilters) {
            if (!matchesTargetFilters(c, options.targetFilters)) {
                breakdown.filterMismatch++;
                locationSegmentExcludedCount++;
                continue;
            }
        }

        // Check 8: Marketing Consent (Opted Out / Opted In Only)
        const consent = consentMap.get(c.id);
        if (consent === 'OPTED_OUT') {
            breakdown.optedOut++;
            consentExcludedCount++;
            continue;
        } else if (mode === 'OPTED_IN_ONLY' && consent !== 'OPTED_IN') {
            breakdown.notOptedIn++;
            consentExcludedCount++;
            continue;
        }

        eligible++;
    }

    return {
        total: contacts.length,
        baseCount,
        exclusionsCount,
        consentExcludedCount,
        locationSegmentExcludedCount,
        finalEligibleCount: eligible,
        eligible,
        excluded: contacts.length - eligible,
        breakdown,
    };
}

