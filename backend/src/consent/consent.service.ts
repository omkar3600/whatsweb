import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizePhone } from '../common/utils/phone-normalizer';
import {
    detectConsentIntent,
    CONSENT_STATUSES,
    CONSENT_SOURCES,
    ConsentKeywordConfig,
    ConsentDetectionResult,
} from './consent-detector';

const VALID_STATUSES: string[] = [...CONSENT_STATUSES];
const VALID_SOURCES: string[] = [...CONSENT_SOURCES];

interface SetConsentOptions {
    source?: string;
    reason?: string;
    updatedBy?: string;
    messageText?: string;
}

@Injectable()
export class ConsentService {
    private readonly logger = new Logger(ConsentService.name);

    constructor(private prisma: PrismaService) {}

    // ------------------------------------------------------------------
    // Per-business keyword configuration
    // ------------------------------------------------------------------

    /** Load per-business consent keywords (falls back to platform defaults). */
    async getShopConsentConfig(shopId: string): Promise<ConsentKeywordConfig> {
        try {
            const cfg = await this.prisma.shopConsentConfig.findUnique({ where: { shopId } });
            if (!cfg || cfg.enabled === false) return {};
            return {
                optInKeywords: (cfg.optInKeywords as string[]) || [],
                optOutKeywords: (cfg.optOutKeywords as string[]) || [],
            };
        } catch (err) {
            this.logger.warn(`[Consent] Failed to load consent config for shop ${shopId}: ${err?.message}`);
            return {};
        }
    }

    async getConsentConfig(shopId: string) {
        const cfg = await this.prisma.shopConsentConfig.findUnique({ where: { shopId } });
        return {
            enabled: cfg?.enabled ?? true,
            optInKeywords: (cfg?.optInKeywords as string[]) || [],
            optOutKeywords: (cfg?.optOutKeywords as string[]) || [],
        };
    }

    async saveConsentConfig(shopId: string, config: ConsentKeywordConfig & { enabled?: boolean }) {
        return this.prisma.shopConsentConfig.upsert({
            where: { shopId },
            create: {
                shopId,
                optInKeywords: config.optInKeywords || [],
                optOutKeywords: config.optOutKeywords || [],
                enabled: config.enabled ?? true,
            },
            update: {
                optInKeywords: config.optInKeywords ?? undefined,
                optOutKeywords: config.optOutKeywords ?? undefined,
                enabled: config.enabled ?? undefined,
            },
        });
    }

    // ------------------------------------------------------------------
    // Infrastructure-level incoming-message handler (called from webhook)
    // ------------------------------------------------------------------

    /**
     * Detect opt-in/opt-out intent from an inbound text message and persist it.
     * Runs at the messaging infrastructure level — independent of the AI agent,
     * chatbot, automations and workflows. On opt-out, pending campaign messages
     * for the contact are cancelled.
     */
    async processIncomingMessage(
        shopId: string,
        contactId: string,
        messageText: string,
        contactPhone?: string,
    ): Promise<ConsentDetectionResult | null> {
        const config = await this.getShopConsentConfig(shopId);
        const detection = detectConsentIntent(messageText, config);
        if (!detection.intent) return null;

        const status = detection.intent === 'OPT_OUT' ? 'OPTED_OUT' : 'OPTED_IN';
        const reason =
            detection.intent === 'OPT_OUT'
                ? `Customer opted out via keyword "${detection.keyword}"`
                : `Customer opted in via keyword "${detection.keyword}"`;

        await this.setConsent(shopId, contactId, status, {
            source: 'CUSTOMER_REPLY',
            reason,
            messageText: messageText ? messageText.slice(0, 2000) : undefined,
        });

        if (detection.intent === 'OPT_OUT') {
            // Cancel pending marketing messages for this contact (race-condition guard).
            await this.cancelPendingCampaigns(contactId).catch((err) => {
                this.logger.warn(`[Consent] Failed to cancel pending campaigns for ${contactId}: ${err?.message}`);
            });
        }

        this.logger.log(`[Consent] contact=${contactId} ${status} via "${detection.keyword}"`);
        return detection;
    }

    /** Mark any pending CampaignContact rows for this contact as aborted. */
    async cancelPendingCampaigns(contactId: string) {
        return this.prisma.campaignContact.updateMany({
            where: { contactId, status: 'pending' },
            data: { status: 'aborted', failReason: 'contact_opted_out' },
        });
    }

    // ------------------------------------------------------------------
    // Core consent upsert + audit logging
    // ------------------------------------------------------------------

    async setConsent(
        shopId: string,
        contactId: string,
        status: string,
        opts: SetConsentOptions = {},
    ) {
        const validStatus = VALID_STATUSES.includes(status) ? status : 'UNKNOWN';
        const source = opts.source && VALID_SOURCES.includes(opts.source) ? opts.source : 'MANUAL_ACTION';

        const existing = await this.prisma.contactMarketingConsent.findUnique({
            where: { contactId },
            select: { id: true, status: true },
        });
        const fromStatus = existing?.status || null;

        const consent = await this.prisma.contactMarketingConsent.upsert({
            where: { contactId },
            create: {
                shopId,
                contactId,
                status: validStatus,
                source,
                reason: opts.reason,
                updatedBy: opts.updatedBy,
            },
            update: {
                status: validStatus,
                source,
                reason: opts.reason,
                updatedBy: opts.updatedBy,
            },
        });

        // Write audit trail only when the status actually changed (or a new record).
        if (fromStatus !== validStatus) {
            await this.prisma.consentAuditLog.create({
                data: {
                    shopId,
                    contactId,
                    consentId: consent.id,
                    fromStatus,
                    toStatus: validStatus,
                    source,
                    reason: opts.reason,
                    updatedBy: opts.updatedBy,
                    messageText: opts.messageText,
                },
            }).catch((err) => {
                this.logger.warn(`[Consent] Failed to write audit log: ${err?.message}`);
            });
        }

        return consent;
    }

    // ------------------------------------------------------------------
    // Reads
    // ------------------------------------------------------------------

    async getConsent(shopId: string, contactId: string) {
        const consent = await this.prisma.contactMarketingConsent.findUnique({
            where: { contactId },
        });
        if (!consent) {
            return {
                shopId,
                contactId,
                status: 'UNKNOWN',
                source: null,
                reason: null,
                updatedBy: null,
                createdAt: null,
                updatedAt: null,
            };
        }
        return consent;
    }

    async getConsentForShopContact(shopId: string, contactId: string) {
        const contact = await this.prisma.contact.findFirst({
            where: { id: contactId, shopId },
            select: { id: true },
        });
        if (!contact) throw new NotFoundException('Contact not found');
        return this.getConsent(shopId, contactId);
    }

    async updateConsentForShopContact(
        shopId: string,
        contactId: string,
        body: { status: string; reason?: string; source?: string },
        actorId?: string,
    ) {
        const contact = await this.prisma.contact.findFirst({
            where: { id: contactId, shopId },
            select: { id: true },
        });
        if (!contact) throw new NotFoundException('Contact not found');

        const consent = await this.setConsent(shopId, contactId, body.status, {
            source: body.source || 'MANUAL_ACTION',
            reason: body.reason,
            updatedBy: actorId,
        });

        // Manual opt-out also cancels pending campaign messages immediately.
        if (consent.status === 'OPTED_OUT') {
            await this.cancelPendingCampaigns(contactId).catch(() => {});
        }

        return consent;
    }

    /** Look up consent by normalized phone for a shop (used by campaign processor). */
    async getConsentByPhone(shopId: string, phone: string) {
        const normalized = normalizePhone(phone) || phone;
        const contact = await this.prisma.contact.findUnique({
            where: { shopId_phone: { shopId, phone: normalized } },
            select: { id: true },
        });
        if (!contact) return null;
        return this.getConsent(shopId, contact.id);
    }

    // ------------------------------------------------------------------
    // Bulk operations
    // ------------------------------------------------------------------

    async setBulkConsent(
        shopId: string,
        contactIds: string[],
        status: string,
        opts: SetConsentOptions = {},
    ) {
        if (!Array.isArray(contactIds) || contactIds.length === 0) {
            return { updated: 0, message: 'No contacts selected' };
        }

        // Tenant isolation: only update contacts that belong to this shop.
        const contacts = await this.prisma.contact.findMany({
            where: { shopId, id: { in: contactIds } },
            select: { id: true },
        });

        let updated = 0;
        for (const contact of contacts) {
            const consent = await this.setConsent(shopId, contact.id, status, {
                source: opts.source || 'MANUAL_ACTION',
                reason: opts.reason,
                updatedBy: opts.updatedBy,
            });
            if (consent.status === 'OPTED_OUT') {
                await this.cancelPendingCampaigns(contact.id).catch(() => {});
            }
            updated++;
        }

        return { updated, total: contactIds.length, message: `Consent updated for ${updated} contacts` };
    }

    // ------------------------------------------------------------------
    // Campaign support (efficient batch lookups)
    // ------------------------------------------------------------------

    /** Map of contactId → consent status for a set of contacts (missing = no row). */
    async getConsentStatusMap(shopId: string, contactIds: string[]): Promise<Map<string, string>> {
        const map = new Map<string, string>();
        const ids = Array.from(new Set((contactIds || []).filter(Boolean)));
        if (ids.length === 0) return map;

        const consents = await this.prisma.contactMarketingConsent.findMany({
            where: { shopId, contactId: { in: ids } },
            select: { contactId: true, status: true },
        });
        for (const c of consents) map.set(c.contactId, c.status);
        return map;
    }

    /** Map of phone → consent status (missing = UNKNOWN). */
    async getConsentStatusesByPhone(shopId: string, phones: string[]): Promise<Map<string, string>> {
        const map = new Map<string, string>();
        const normalized = Array.from(new Set((phones || []).map((p) => normalizePhone(p) || p)));
        if (normalized.length === 0) return map;

        const contacts = await this.prisma.contact.findMany({
            where: { shopId, phone: { in: normalized } },
            select: { id: true, phone: true },
        });
        const consentMap = await this.getConsentStatusMap(
            shopId,
            contacts.map((c) => c.id),
        );
        for (const c of contacts) {
            map.set(c.phone, consentMap.get(c.id) || 'UNKNOWN');
        }
        return map;
    }

    /** Aggregated consent counts per shop (used by UI filters/stats). */
    async getConsentStats(shopId: string) {
        const [optedIn, optedOut, unknown, pending] = await Promise.all([
            this.prisma.contactMarketingConsent.count({ where: { shopId, status: 'OPTED_IN' } }),
            this.prisma.contactMarketingConsent.count({ where: { shopId, status: 'OPTED_OUT' } }),
            this.prisma.contactMarketingConsent.count({ where: { shopId, status: 'UNKNOWN' } }),
            this.prisma.contactMarketingConsent.count({ where: { shopId, status: 'PENDING' } }),
        ]);
        return { OPTED_IN: optedIn, OPTED_OUT: optedOut, UNKNOWN: unknown, PENDING: pending };
    }
}
