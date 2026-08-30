import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { normalizePhone } from '../common/utils/phone-normalizer';
import { ConsentService } from '../consent/consent.service';
import { evaluateAudience, resolveMarketingMode } from '../consent/consent-audience';

@Injectable()
export class CampaignsService {
    constructor(
        private prisma: PrismaService,
        @InjectQueue('campaigns') private campaignsQueue: Queue,
        private consentService: ConsentService,
    ) { }

    async createCampaign(shopId: string, data: any) {
        const {
            name,
            templateId,
            targetTags,
            targetPhones,
            targetFilters,
            audienceFilters,
            scheduledAt,
            templateParams,
            headerMediaUrl,
            sendDelay,
            excludeUnsubscribed,
            excludeTags,
            sendNow
        } = data;

        const resolvedExcludeTags: string[] = Array.isArray(excludeTags)
            ? excludeTags.map((t: string) => String(t).trim()).filter(Boolean)
            : (Array.isArray(audienceFilters?.excludeTags)
                ? audienceFilters.excludeTags.map((t: string) => String(t).trim()).filter(Boolean)
                : (Array.isArray(targetFilters?.excludeTags) ? targetFilters.excludeTags.map((t: string) => String(t).trim()).filter(Boolean) : []));

        // Validate: if not sending now, scheduled time must be in the future
        let resolvedScheduledAt: Date;
        let queueDelay: number;

        if (sendNow) {
            // Instant launch — no time needed, fire immediately
            resolvedScheduledAt = new Date();
            queueDelay = 0;
        } else {
            if (!scheduledAt) {
                throw new Error('scheduledAt is required for scheduled campaigns');
            }
            resolvedScheduledAt = new Date(scheduledAt);
            const msUntilSend = resolvedScheduledAt.getTime() - Date.now();
            if (msUntilSend < 30_000) {
                // Reject if less than 30 seconds in the future
                throw new Error('Scheduled time must be at least 30 seconds in the future');
            }
            queueDelay = msUntilSend;
        }

        const campaign = await this.prisma.campaign.create({
            data: {
                shopId,
                name,
                templateId,
                targetTags: targetTags || [],
                targetPhones: targetPhones || [],
                targetFilters: targetFilters
                    ? { ...targetFilters, excludeTags: resolvedExcludeTags }
                    : (resolvedExcludeTags.length > 0 ? { excludeTags: resolvedExcludeTags } : null),
                audienceFilters: {
                    ...(audienceFilters || {}),
                    excludeTags: resolvedExcludeTags,
                },
                templateParams: templateParams || {},
                headerMediaUrl: headerMediaUrl || null,
                scheduledAt: resolvedScheduledAt,
                status: 'scheduled',
                stats: {
                    sendDelay: sendDelay ?? 300,
                    excludeUnsubscribed: excludeUnsubscribed ?? false,
                    excludeTags: resolvedExcludeTags,
                } as any,
            },
        });

        // Fire-and-forget: do NOT await — prevents HTTP request from hanging if Redis is slow
        this.campaignsQueue.add('processCampaign', { campaignId: campaign.id }, { delay: queueDelay })
            .catch((err) => {
                console.error(`[Campaign] Failed to enqueue campaign ${campaign.id}:`, err?.message || err);
                this.prisma.campaign.update({
                    where: { id: campaign.id },
                    data: { status: 'failed', failureHistory: [{ reason: 'Queue connection failed: ' + (err?.message || 'Redis unavailable'), timestamp: new Date() }] as any }
                }).catch(() => {});
            });

        return campaign;
    }

    async getCampaigns(shopId: string, page?: number, limit?: number) {
        const take = limit || 50;
        const pageNum = page && page > 0 ? page : 1;
        const skip = (pageNum - 1) * take;

        const [campaigns, total] = await Promise.all([
            this.prisma.campaign.findMany({
                where: { shopId },
                include: { template: true },
                orderBy: { createdAt: 'desc' },
                take,
                skip,
            }),
            this.prisma.campaign.count({ where: { shopId } })
        ]);

        if (campaigns.length === 0) return { data: [], total: 0, page: pageNum, totalPages: 0, hasMore: false };

        // Single GROUP BY query to count contacts per (campaignId, status) — much faster than
        // loading all contact rows and iterating in JS.
        const campaignIds = campaigns.map(c => c.id);
        const statusGroups = await this.prisma.campaignContact.groupBy({
            by: ['campaignId', 'status'],
            where: { campaignId: { in: campaignIds } },
            _count: { status: true },
        });

        // Build a per-campaign status-count map
        type StatusMap = Record<string, number>;
        const countMap = new Map<string, StatusMap>();
        for (const group of statusGroups) {
            if (!countMap.has(group.campaignId)) countMap.set(group.campaignId, {});
            countMap.get(group.campaignId)![group.status] = group._count.status;
        }

        const data = campaigns.map(c => {
            const configMeta = (c.stats as any) || {};
            const sc: StatusMap = countMap.get(c.id) || {};

            const sentCount      = sc['sent']      || 0;
            const deliveredCount = (sc['delivered'] || 0) + (sc['read'] || 0) + (sc['replied'] || 0) + (sc['clicked'] || 0);
            const readCount      = (sc['read']      || 0) + (sc['replied'] || 0) + (sc['clicked'] || 0);
            const repliedCount   = sc['replied']   || 0;
            const clickedCount   = sc['clicked']   || 0;
            const failedCount    = sc['failed']    || 0;
            const pendingCount   = sc['pending']   || 0;
            const dispatchedCount = sentCount + deliveredCount;
            const totalCount = Object.values(sc).reduce((a, b) => a + b, 0);

            return {
                ...c,
                stats: {
                    sendDelay: configMeta.sendDelay,
                    excludeUnsubscribed: configMeta.excludeUnsubscribed,
                    marketingConsent: (c.audienceFilters as any)?.marketingConsent || null,
                    excludeOptedOut: (c.audienceFilters as any)?.excludeOptedOut ?? false,
                    total: totalCount,
                    dispatched: dispatchedCount,
                    sent: sentCount,
                    delivered: deliveredCount,
                    read: readCount,
                    replied: repliedCount,
                    clicked: clickedCount,
                    failed: failedCount,
                    pending: pendingCount,
                },
            };
        });

        return {
            data,
            total,
            page: pageNum,
            totalPages: Math.ceil(total / take),
            hasMore: pageNum * take < total,
        };
    }

    /**
     * Live audience estimation for drafting / creating campaigns.
     * Takes real-time filter criteria and evaluates accurately across all contacts in the database.
     */
    async estimateAudience(shopId: string, criteria: any = {}) {
        const {
            targetType,
            targetTags,
            targetPhones,
            targetFilters,
            audienceFilters,
            excludeUnsubscribed,
            excludeTags,
        } = criteria;

        const resolvedExcludeTags: string[] = [
            ...(Array.isArray(excludeTags) ? excludeTags : []),
            ...(Array.isArray(audienceFilters?.excludeTags) ? audienceFilters.excludeTags : []),
            ...(Array.isArray(targetFilters?.excludeTags) ? targetFilters.excludeTags : []),
        ].map((t: string) => String(t).trim()).filter(Boolean);

        const includeConversations = Boolean(targetFilters?.noMessagesInDays);
        const contacts = await this.prisma.contact.findMany({
            where: { shopId },
            select: {
                id: true,
                name: true,
                phone: true,
                tags: true,
                city: true,
                ...(includeConversations ? {
                    conversations: { take: 1, orderBy: { lastMessageAt: 'desc' }, select: { lastMessageAt: true } }
                } : {})
            },
        }) as any[];

        const consentMap = await this.consentService.getConsentStatusMap(
            shopId,
            contacts.map((c) => c.id),
        );

        const result = evaluateAudience(contacts, consentMap, {
            targetType,
            targetTags: Array.isArray(targetTags) ? targetTags : undefined,
            targetPhones: Array.isArray(targetPhones) ? targetPhones : undefined,
            targetFilters: targetFilters || undefined,
            audienceFilters: audienceFilters || undefined,
            excludeUnsubscribed: excludeUnsubscribed ?? audienceFilters?.excludeUnsubscribed ?? false,
            excludeTags: resolvedExcludeTags,
        });

        return {
            mode: resolveMarketingMode(audienceFilters),
            ...result,
        };
    }

    /**
     * Compute the audience for a campaign WITHOUT sending anything: total contacts,
     * eligible after consent/audience filtering, excluded count, and a per-reason
     * breakdown. Used by the UI audience builder (GET /campaigns/:id/audience-preview).
     */
    async getAudiencePreview(shopId: string, campaignId: string) {
        const campaign = await this.prisma.campaign.findFirst({
            where: { id: campaignId, shopId },
        });
        if (!campaign) throw new NotFoundException('Campaign not found');

        const includeConversations = Boolean((campaign.targetFilters as any)?.noMessagesInDays);
        const contacts = await this.prisma.contact.findMany({
            where: { shopId },
            select: {
                id: true,
                name: true,
                phone: true,
                tags: true,
                city: true,
                ...(includeConversations ? {
                    conversations: { take: 1, orderBy: { lastMessageAt: 'desc' }, select: { lastMessageAt: true } }
                } : {})
            },
        }) as any[];

        const consentMap = await this.consentService.getConsentStatusMap(
            shopId,
            contacts.map((c) => c.id),
        );

        const result = evaluateAudience(contacts, consentMap, {
            targetTags: campaign.targetTags as string[],
            targetPhones: campaign.targetPhones as string[],
            targetFilters: campaign.targetFilters as any,
            audienceFilters: campaign.audienceFilters as any,
            excludeUnsubscribed: ((campaign.stats as any)?.excludeUnsubscribed) ?? false,
            excludeTags: ((campaign.stats as any)?.excludeTags)
                || ((campaign.audienceFilters as any)?.excludeTags)
                || ((campaign.targetFilters as any)?.excludeTags)
                || [],
        });

        return {
            campaignId,
            mode: resolveMarketingMode(campaign.audienceFilters as any),
            ...result,
        };
    }

    async deleteCampaign(shopId: string, campaignId: string) {
        // Only allow deleting scheduled campaigns
        const campaign = await this.prisma.campaign.findFirst({
            where: { id: campaignId, shopId }
        });

        if (!campaign) throw new NotFoundException('Campaign not found');
        if (campaign.status === 'processing') {
            throw new Error('Cannot delete a processing campaign. Abort it first.');
        }

        // Remove any delayed scheduled job from BullMQ queue
        try {
            const delayedJobs = await this.campaignsQueue.getDelayed();
            for (const job of delayedJobs) {
                if (job.data?.campaignId === campaignId) {
                    await job.remove().catch(() => {});
                }
            }
        } catch (err) {
            // Ignore queue retrieval error if Redis is unavailable
        }

        // Soft delete: mark deletedAt as now
        return this.prisma.campaign.update({
            where: { id: campaignId },
            data: { deletedAt: new Date() }
        });
    }

    async restoreCampaign(shopId: string, campaignId: string) {
        const campaign = await this.prisma.campaign.findFirst({
            where: { id: campaignId, shopId }
        });

        if (!campaign) throw new NotFoundException('Campaign not found');

        return this.prisma.campaign.update({
            where: { id: campaignId },
            data: { deletedAt: null }
        });
    }

    async abortCampaign(shopId: string, campaignId: string) {
        const campaign = await this.prisma.campaign.findFirst({
            where: { id: campaignId, shopId }
        });

        if (!campaign) throw new NotFoundException('Campaign not found');
        if (campaign.status !== 'processing') {
            throw new Error('Can only abort processing campaigns');
        }

        // Mark remaining pending contacts as aborted
        await this.prisma.campaignContact.updateMany({
            where: { campaignId, status: 'pending' },
            data: { status: 'aborted' }
        });

        return this.prisma.campaign.update({
            where: { id: campaignId },
            data: { status: 'aborted' }
        });
    }

    async launchRetarget(shopId: string, campaignId: string, body: { name: string; templateId: string; phones: string[] }) {
        const { name, templateId, phones } = body;

        // Verify original campaign belongs to shop
        const original = await this.prisma.campaign.findFirst({
            where: { id: campaignId, shopId }
        });
        if (!original) throw new NotFoundException('Original campaign not found');

        const campaign = await this.prisma.campaign.create({
            data: {
                shopId,
                name,
                templateId,
                targetPhones: phones,
                scheduledAt: new Date(),
                status: 'processing', // Start immediately
                templateParams: original.templateParams as any,
                headerMediaUrl: original.headerMediaUrl,
            },
        });

        await this.campaignsQueue.add('processCampaign', { campaignId: campaign.id });

        return campaign;
    }

    async getCampaignAnalytics(shopId: string, campaignId: string, limitQuery?: string | number) {
        let limit: number | null = 50; // default to 50 rate limit
        if (limitQuery !== undefined && limitQuery !== null) {
            const str = String(limitQuery).trim().toLowerCase();
            if (str === 'all' || str === '0' || str === 'unlimited' || str === '-1') {
                limit = null;
            } else {
                const parsed = str.endsWith('k')
                    ? parseFloat(str.replace('k', '')) * 1000
                    : parseInt(str, 10);
                if (!isNaN(parsed) && parsed > 0) {
                    limit = Math.floor(parsed);
                }
            }
        }

        const campaign = await this.prisma.campaign.findFirst({
            where: { id: campaignId, shopId },
            include: {
                template: true,
                contacts: {
                    include: {
                        contact: {
                            select: { tags: true }
                        }
                    },
                    orderBy: { sentAt: 'desc' },
                },
            },
        });

        if (!campaign) throw new NotFoundException('Campaign not found');

        const allContactsMap = new Map<string, any>();

        // 1. Add all CampaignContact entries (normalized key to prevent duplicate format entries)
        for (const c of campaign.contacts) {
            const key = normalizePhone(c.phone) || c.phone;
            allContactsMap.set(key, {
                ...c,
                tags: (c.contact?.tags as string[]) || [],
            });
        }

        // 2. Also merge any failures recorded in campaign.failureHistory
        const failHist = (campaign.failureHistory as any[]) || [];
        for (const fh of failHist) {
            if (fh.phone) {
                const key = normalizePhone(fh.phone) || fh.phone;
                if (!allContactsMap.has(key)) {
                    allContactsMap.set(key, {
                        id: `fh-${key}`,
                        campaignId,
                        contactId: null,
                        phone: fh.phone,
                        name: fh.name || fh.phone,
                        status: 'failed',
                        failReason: fh.reason || 'Failed to send',
                        sentAt: fh.timestamp || campaign.createdAt,
                        updatedAt: fh.timestamp || campaign.createdAt,
                    });
                }
            }
        }

        // 3. If campaign has targetPhones that haven't been created as CampaignContact yet (e.g. scheduled)
        const targetPhones = (campaign.targetPhones as string[]) || [];
        if (targetPhones.length > 0) {
            for (const phone of targetPhones) {
                const key = normalizePhone(phone) || phone;
                if (!allContactsMap.has(key)) {
                    allContactsMap.set(key, {
                        id: `target-${key}`,
                        campaignId,
                        contactId: null,
                        phone,
                        name: phone,
                        status: 'pending',
                        failReason: null,
                        sentAt: null,
                        updatedAt: campaign.createdAt,
                    });
                }
            }
        }

        const allContactsList = Array.from(allContactsMap.values());

        const byStatus = {
            all: allContactsList,
            pending: allContactsList.filter(c => {
                const s = (c.status || '').toLowerCase();
                return s === 'pending' || s === 'scheduled' || s === 'queued' || (!['sent', 'delivered', 'read', 'replied', 'clicked', 'failed'].includes(s));
            }),
            dispatched: allContactsList.filter(c => ['sent', 'delivered', 'read', 'replied', 'clicked'].includes((c.status || '').toLowerCase())),
            sent: allContactsList.filter(c => (c.status || '').toLowerCase() === 'sent'),
            delivered: allContactsList.filter(c => ['delivered', 'read', 'replied', 'clicked'].includes((c.status || '').toLowerCase())),
            read: allContactsList.filter(c => ['read', 'replied', 'clicked'].includes((c.status || '').toLowerCase())),
            replied: allContactsList.filter(c => (c.status || '').toLowerCase() === 'replied'),
            clicked: allContactsList.filter(c => (c.status || '').toLowerCase() === 'clicked'),
            failed: allContactsList.filter(c => (c.status || '').toLowerCase() === 'failed'),
            unread: allContactsList.filter(c => ['sent', 'delivered'].includes((c.status || '').toLowerCase())),
            // Contacts skipped due to marketing opt-out consent check
            skipped: allContactsList.filter(c => (c.status || '').toLowerCase() === 'aborted' && c.failReason === 'contact_opted_out'),
        };

        const stats = {
            total: allContactsList.length,
            pending: byStatus.pending.length,
            dispatched: byStatus.dispatched.length,
            sent: byStatus.sent.length,
            delivered: byStatus.delivered.length,
            read: byStatus.read.length,
            replied: byStatus.replied.length,
            clicked: byStatus.clicked.length,
            failed: byStatus.failed.length,
            unread: byStatus.unread.length,
            skipped: byStatus.skipped.length,
        };

        const contacts = {
            all: limit !== null ? byStatus.all.slice(0, limit) : byStatus.all,
            pending: limit !== null ? byStatus.pending.slice(0, limit) : byStatus.pending,
            dispatched: limit !== null ? byStatus.dispatched.slice(0, limit) : byStatus.dispatched,
            sent: limit !== null ? byStatus.sent.slice(0, limit) : byStatus.sent,
            delivered: limit !== null ? byStatus.delivered.slice(0, limit) : byStatus.delivered,
            read: limit !== null ? byStatus.read.slice(0, limit) : byStatus.read,
            replied: limit !== null ? byStatus.replied.slice(0, limit) : byStatus.replied,
            clicked: limit !== null ? byStatus.clicked.slice(0, limit) : byStatus.clicked,
            failed: limit !== null ? byStatus.failed.slice(0, limit) : byStatus.failed,
            unread: limit !== null ? byStatus.unread.slice(0, limit) : byStatus.unread,
            skipped: limit !== null ? byStatus.skipped.slice(0, limit) : byStatus.skipped,
        };

        return {
            campaign,
            stats,
            contacts,
            limit: limit ?? 'all',
        };
    }

    async addTagsToContacts(shopId: string, campaignId: string, body: { phones: string[]; tags: string[] }) {
        const { phones, tags } = body;

        // Verify campaign belongs to shop
        const campaign = await this.prisma.campaign.findFirst({ where: { id: campaignId, shopId } });
        if (!campaign) throw new NotFoundException('Campaign not found');

        // Find all contacts matching phones in a single query
        const contacts = await this.prisma.contact.findMany({
            where: { shopId, phone: { in: phones } },
            select: { id: true, tags: true }
        });

        const results: any[] = [];
        for (const contact of contacts) {
            const existingTags = (contact.tags as string[]) || [];
            const mergedTags = Array.from(new Set([...existingTags, ...tags]));

            const updated = await this.prisma.contact.update({
                where: { id: contact.id },
                data: { tags: mergedTags },
            });
            results.push(updated);
        }

        return { updated: results.length, message: `Tags added to ${results.length} contacts` };
    }

    async removeTagsFromContacts(shopId: string, campaignId: string, body: { phones: string[]; tags?: string[]; removeAll?: boolean }) {
        const { phones, tags, removeAll } = body;

        // Verify campaign belongs to shop
        const campaign = await this.prisma.campaign.findFirst({ where: { id: campaignId, shopId } });
        if (!campaign) throw new NotFoundException('Campaign not found');

        const tagsToRemove = Array.isArray(tags)
            ? tags.map(t => String(t).trim().toLowerCase()).filter(Boolean)
            : [];

        // Find all contacts matching phones in a single query
        const contacts = await this.prisma.contact.findMany({
            where: { shopId, phone: { in: phones } },
            select: { id: true, tags: true }
        });

        const results: any[] = [];
        const removeSet = new Set(tagsToRemove);
        for (const contact of contacts) {
            const existingTags = (contact.tags as string[]) || [];
            let updatedTags: string[] = [];
            if (!removeAll) {
                if (tagsToRemove.length > 0) {
                    updatedTags = existingTags.filter(t => !removeSet.has(String(t).trim().toLowerCase()));
                } else {
                    updatedTags = existingTags;
                }
            }

            const updated = await this.prisma.contact.update({
                where: { id: contact.id },
                data: { tags: updatedTags },
            });
            results.push(updated);
        }

        return { updated: results.length, message: `Tags removed from ${results.length} contacts` };
    }

    async resendFailed(shopId: string, campaignId: string, customPhones?: string[]) {
        const original = await this.prisma.campaign.findFirst({
            where: { id: campaignId, shopId },
            include: { template: true, contacts: { where: { status: 'failed' } } }
        });

        if (!original) {
            throw new NotFoundException('Campaign not found');
        }

        let phonesList: string[] = [];
        if (customPhones && Array.isArray(customPhones) && customPhones.length > 0) {
            phonesList = Array.from(new Set(customPhones.map(p => normalizePhone(p) || p)));
        } else {
            const failedPhones = new Set<string>();
            original.contacts.forEach(c => failedPhones.add(c.phone));
            const failHist = (original.failureHistory as any[]) || [];
            failHist.forEach(f => { if (f.phone) failedPhones.add(f.phone); });
            phonesList = Array.from(failedPhones);
        }

        if (phonesList.length === 0) return { message: 'No contacts selected to resend' };

        const retryCampaign = await this.prisma.campaign.create({
            data: {
                shopId,
                name: `Resend: ${original.name}`,
                templateId: original.templateId,
                status: 'processing',
                scheduledAt: new Date(),
                templateParams: original.templateParams as any,
                headerMediaUrl: original.headerMediaUrl,
                targetPhones: phonesList
            }
        });

        await this.campaignsQueue.add('processCampaign', {
            campaignId: retryCampaign.id
        });

        return retryCampaign;
    }
}
