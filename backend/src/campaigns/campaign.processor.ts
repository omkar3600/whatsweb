import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { ConsentService } from '../consent/consent.service';
import {
    isConsentAllowed,
    resolveMarketingMode,
    MarketingConsentMode,
    extractContactTags,
    matchesTargetFilters,
} from '../consent/consent-audience';
import { normalizePhone } from '../common/utils/phone-normalizer';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Resolve body text: substitute {{1}}, {{2}} etc with actual parameter values */
function resolveBodyText(bodyTemplate: string, components: any[]): string {
    const bodyComp = components?.find((c: any) => c.type?.toLowerCase() === 'body');
    if (!bodyComp?.parameters?.length) return bodyTemplate;
    let resolved = bodyTemplate;
    bodyComp.parameters.forEach((param: any, idx: number) => {
        resolved = resolved.replace(`{{${idx + 1}}}`, param.text || '');
    });
    return resolved;
}

@Processor('campaigns', { concurrency: 5 })
export class CampaignProcessor extends WorkerHost {
    constructor(
        private prisma: PrismaService,
        private whatsappService: WhatsappService,
        private consentService: ConsentService
    ) {
        super();
    }

    async process(job: Job<any>) {
        const { campaignId } = job.data;
        const campaign = await this.prisma.campaign.findUnique({
            where: { id: campaignId },
            include: { template: true }
        });

        // Guard: campaign must exist, have a valid template, and be in a processable state
        if (!campaign || !campaign.template) return;
        if (campaign.status !== 'scheduled' && campaign.status !== 'processing') return;

        // Pre-resolve the body template text for this campaign
        const templateComponents = campaign.templateParams as any[];
        const rawBodyText = campaign.template.components
            ? (campaign.template.components as any[]).find((c: any) => c.type === 'BODY')?.text || campaign.template.templateName
            : campaign.template.templateName;
        const resolvedBody = resolveBodyText(rawBodyText, templateComponents || []);

        // Header media URL from the components array (if any)
        const headerComp = templateComponents?.find((c: any) => c.type?.toLowerCase() === 'header');
        const headerImageUrl: string | null = headerComp?.parameters?.[0]?.image?.link
            || headerComp?.parameters?.[0]?.video?.link
            || campaign.headerMediaUrl
            || null;

        await this.prisma.campaign.update({
            where: { id: campaignId },
            data: { status: 'processing' }
        });

        // Filter definitions
        const targetPhones = campaign.targetPhones as string[] | null;
        const targetTags = campaign.targetTags as string[] | null;
        const targetFilters = campaign.targetFilters as any;
        const campaignMeta = (campaign.stats as any) || {};
        const excludeUnsubscribed = campaignMeta.excludeUnsubscribed ?? false;
        const sendDelay: number = campaignMeta.sendDelay ?? 50;
        const audienceFilters = campaign.audienceFilters as any;
        const marketingMode: MarketingConsentMode = resolveMarketingMode(audienceFilters);

        const rawExcludeTags: string[] = [
            ...(Array.isArray(campaignMeta.excludeTags) ? campaignMeta.excludeTags : []),
            ...(Array.isArray(audienceFilters?.excludeTags) ? audienceFilters.excludeTags : []),
            ...(Array.isArray((campaign.targetFilters as any)?.excludeTags) ? (campaign.targetFilters as any).excludeTags : []),
        ].map((t: string) => String(t).trim()).filter(Boolean);
        const excludeTagsSet = new Set(rawExcludeTags.map((t: string) => String(t).toLowerCase().trim()).filter(Boolean));

        const failureHistory: { phone: string; name: string; reason: string; timestamp: Date }[] = [];
        let aborted = false;

        // Step 1: Pre-populate CampaignContact entries if none exist yet for this campaign
        const existingCount = await this.prisma.campaignContact.count({ where: { campaignId } });
        if (existingCount === 0) {
            let targetList: { phone: string; name: string; contactId?: string | null }[] = [];

            if (targetPhones && targetPhones.length > 0) {
                const rawPhones = targetPhones.map(p => String(p).trim()).filter(Boolean);
                const normalizedTargetPhones = rawPhones.map(p => normalizePhone(p)).filter(Boolean);
                const allQueryPhones = Array.from(new Set([
                    ...rawPhones,
                    ...normalizedTargetPhones,
                    ...normalizedTargetPhones.map(p => `+${p}`)
                ]));

                const contacts = await this.prisma.contact.findMany({
                    where: {
                        shopId: campaign.shopId,
                        phone: { in: allQueryPhones }
                    },
                    select: { id: true, name: true, phone: true, tags: true }
                });
                const contactMap = new Map<string, any>();
                for (const c of contacts) {
                    const cPhone = String(c.phone || '').trim();
                    const normKey = normalizePhone(cPhone);
                    if (cPhone) contactMap.set(cPhone.toLowerCase(), c);
                    if (normKey) {
                        contactMap.set(normKey, c);
                        contactMap.set(`+${normKey}`, c);
                    }
                }

                const seenPhones = new Set<string>();
                for (const phone of rawPhones) {
                    const norm = normalizePhone(phone);
                    const dedupeKey = norm || phone;
                    if (seenPhones.has(dedupeKey)) continue;
                    seenPhones.add(dedupeKey);

                    const matched = contactMap.get(phone.toLowerCase()) || (norm ? contactMap.get(norm) : null);
                    targetList.push({
                        phone,
                        name: matched?.name || phone,
                        contactId: matched?.id || null
                    });
                }

                // Apply excludeTags filtering if target contacts have excluded tags
                if (excludeTagsSet.size > 0) {
                    targetList = targetList.filter(t => {
                        const norm = normalizePhone(t.phone);
                        const matched = contactMap.get(t.phone.toLowerCase()) || (norm ? contactMap.get(norm) : null);
                        if (!matched) return true;
                        const contactTags = extractContactTags(matched.tags).map(tg => tg.toLowerCase());
                        const hasExcludedTag = contactTags.some((tag: string) => excludeTagsSet.has(tag));
                        return !hasExcludedTag;
                    });
                }

                // Apply marketing consent filtering to the explicit phone list.
                const phoneTargetContactIds = targetList.map(t => t.contactId).filter(Boolean);
                const phoneConsentMap = await this.consentService.getConsentStatusMap(
                    campaign.shopId,
                    phoneTargetContactIds as string[]
                );
                targetList = targetList.filter(t => {
                    if (!t.contactId) {
                        // Unknown number (no stored contact) — no consent record on file.
                        return marketingMode !== 'OPTED_IN_ONLY';
                    }
                    return isConsentAllowed(phoneConsentMap.get(t.contactId), marketingMode);
                });
            } else {
                const baseWhere: any = { shopId: campaign.shopId };
                if (targetFilters?.city && typeof targetFilters.city === 'string' && targetFilters.city.trim()) {
                    baseWhere.city = { equals: targetFilters.city.trim(), mode: 'insensitive' };
                }

                const includeConversations = Boolean(targetFilters?.noMessagesInDays);
                const contacts = await this.prisma.contact.findMany({
                    where: baseWhere,
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        tags: true,
                        city: true,
                        ...(includeConversations ? {
                            conversations: {
                                take: 1,
                                orderBy: { lastMessageAt: 'desc' },
                                select: { lastMessageAt: true }
                            }
                        } : {})
                    }
                });

                let filtered = contacts as any[];
                if (targetTags && targetTags.length > 0) {
                    const targetTagSet = new Set(targetTags.map(t => String(t).trim().toLowerCase()).filter(Boolean));
                    filtered = filtered.filter(c => {
                        const tags = extractContactTags(c.tags).map(t => t.toLowerCase());
                        return tags.some(t => targetTagSet.has(t));
                    });
                }

                if (targetFilters) {
                    filtered = filtered.filter(c => matchesTargetFilters(c, targetFilters));
                }

                if (excludeUnsubscribed) {
                    filtered = filtered.filter(c => {
                        const tags = extractContactTags(c.tags).map(t => t.toLowerCase());
                        return !tags.includes('unsubscribed') && !tags.includes('optout') && !tags.includes('opt-out') && !tags.includes('opted_out');
                    });
                }

                // Exclude tags filtering (case-insensitive)
                if (excludeTagsSet.size > 0) {
                    filtered = filtered.filter(c => {
                        const tags = extractContactTags(c.tags).map(t => t.toLowerCase());
                        if (tags.length === 0) return true;
                        const hasExcludedTag = tags.some((tag: string) => excludeTagsSet.has(tag));
                        return !hasExcludedTag;
                    });
                }

                // Marketing consent filtering (AI-independent). OPTED_OUT is always excluded;
                // UNKNOWN/PENDING handling depends on the campaign's marketingConsent mode.
                // Contacts tagged "Invalid Number" are also excluded from sends.
                const filteredContactIds = filtered.map(c => c.id);
                const consentMap = await this.consentService.getConsentStatusMap(campaign.shopId, filteredContactIds);
                filtered = filtered.filter(c => {
                    const tags = extractContactTags(c.tags).map(t => t.toLowerCase());
                    if (tags.includes('invalid number') || tags.includes('invalid') || tags.includes('invalid_number')) return false;
                    return isConsentAllowed(consentMap.get(c.id), marketingMode);
                });

                targetList = filtered.map(c => ({ phone: c.phone, name: c.name, contactId: c.id }));
            }

            if (targetList.length > 0) {
                await this.prisma.campaignContact.createMany({
                    data: targetList.map(item => ({
                        campaignId,
                        contactId: item.contactId || null,
                        phone: item.phone,
                        name: item.name,
                        status: 'pending',
                    })),
                    skipDuplicates: true
                });
            }
        }

        // Step 2: Batch process pending CampaignContacts
        let hasMore = true;
        while (hasMore) {
            const currentCampaign = await this.prisma.campaign.findUnique({
                where: { id: campaignId },
                select: { status: true }
            });
            if (currentCampaign?.status === 'aborted') {
                aborted = true;
                break;
            }

            const pendingBatch = await this.prisma.campaignContact.findMany({
                where: { campaignId, status: 'pending' },
                take: 100,
                orderBy: { id: 'asc' }
            });

            if (pendingBatch.length === 0) {
                hasMore = false;
                break;
            }

            // Determine batch concurrency based on sendDelay setting
            // sendDelay = 0 (Instant Rate): batch chunk size 10, 0ms delay (Max Speed)
            // sendDelay <= 100 (Fastest / Turbo): batch chunk size 5, 100ms delay
            // sendDelay >= 300 (Good Rate / Standard): batch chunk size 1 (sequential), sendDelay ms delay
            let chunkSize = 1;
            if (sendDelay === 0) {
                chunkSize = 10;
            } else if (sendDelay <= 100) {
                chunkSize = 5;
            }

            // Pre-fetch consent + contact data ONCE for the entire 100-item batch instead of querying per chunk
            const batchContactIds = Array.from(new Set(pendingBatch.map(item => item.contactId).filter(Boolean))) as string[];
            const [batchConsentRows, batchExistingContacts] = batchContactIds.length > 0
                ? await Promise.all([
                    this.prisma.contactMarketingConsent.findMany({
                        where: { shopId: campaign.shopId, contactId: { in: batchContactIds } },
                        select: { contactId: true, status: true },
                    }),
                    this.prisma.contact.findMany({
                        where: { shopId: campaign.shopId, id: { in: batchContactIds } },
                        select: { id: true, tags: true },
                    }),
                ])
                : [[], []];
            const batchConsentMap = new Map(batchConsentRows.map(r => [r.contactId, r.status]));
            const batchContactMapById = new Map(batchExistingContacts.map(c => [c.id, c]));

            for (let i = 0; i < pendingBatch.length; i += chunkSize) {
                const chunk = pendingBatch.slice(i, i + chunkSize);

                const skipEntries: { id: string; reason: string }[] = [];
                const sendableChunk = chunk.filter(item => {
                    let skip = false;
                    let skipReason = 'contact_opted_out';
                    if (item.contactId) {
                        const contact = batchContactMapById.get(item.contactId);
                        if (!contact) {
                            skip = true; // contact deleted while campaign running
                            skipReason = 'contact_deleted';
                        } else if (!isConsentAllowed(batchConsentMap.get(item.contactId), marketingMode)) {
                            skip = true; // opted out after the campaign started
                            skipReason = 'contact_opted_out';
                        } else if (excludeTagsSet.size > 0 && Array.isArray(contact.tags)) {
                            const hasExcludedTag = (contact.tags as any[]).some((t: any) =>
                                typeof t === 'string' && excludeTagsSet.has(t.toLowerCase().trim())
                            );
                            if (hasExcludedTag) {
                                skip = true;
                                skipReason = 'excluded_tag';
                            }
                        }
                    } else if (marketingMode === 'OPTED_IN_ONLY') {
                        skip = true; // no consent record on file
                        skipReason = 'not_opted_in';
                    }
                    if (skip) skipEntries.push({ id: item.id, reason: skipReason });
                    return !skip;
                });

                if (skipEntries.length > 0) {
                    const reasonGroups = new Map<string, string[]>();
                    for (const entry of skipEntries) {
                        if (!reasonGroups.has(entry.reason)) reasonGroups.set(entry.reason, []);
                        reasonGroups.get(entry.reason)!.push(entry.id);
                    }
                    for (const [reason, ids] of reasonGroups.entries()) {
                        await this.prisma.campaignContact.updateMany({
                            where: { id: { in: ids } },
                            data: { status: 'aborted', failReason: reason },
                        });
                    }
                }

                await Promise.all(
                    sendableChunk.map(async (item) => {
                        try {
                            const templateParamsObj = campaign.templateParams as any;
                            const templateContent =
                                templateParamsObj && Array.isArray(templateParamsObj) && templateParamsObj.length > 0
                                    ? { name: campaign.template.templateName, language: campaign.template.language, components: templateParamsObj }
                                    : { name: campaign.template.templateName, language: campaign.template.language };

                            const headerMediaUrl = campaign.headerMediaUrl ?? undefined;

                            const result = await this.whatsappService.sendOutboundMessage(
                                campaign.shopId,
                                item.phone,
                                'template',
                                templateContent,
                                headerMediaUrl
                            );

                            const wamid: string | undefined = result?.messages?.[0]?.id;

                            await this.prisma.campaignContact.update({
                                where: { id: item.id },
                                data: { status: 'sent', failReason: null, wamid: wamid ?? null }
                            });

                            // Save message record if contactId exists
                            if (item.contactId) {
                                try {
                                    const conversation = await this.prisma.conversation.upsert({
                                        where: { shopId_contactId: { shopId: campaign.shopId, contactId: item.contactId } },
                                        create: { shopId: campaign.shopId, contactId: item.contactId, lastMessageAt: new Date() },
                                        update: { lastMessageAt: new Date() },
                                    });
                                    await this.prisma.message.create({
                                        data: {
                                            id: wamid || undefined,
                                            shopId: campaign.shopId,
                                            conversationId: conversation.id,
                                            direction: 'outbound',
                                            type: 'template',
                                            content: resolvedBody,
                                            mediaUrl: headerImageUrl,
                                            status: 'sent',
                                            templateData: {
                                                templateName: campaign.template.templateName,
                                                campaignName: campaign.name,
                                                campaignId,
                                                wamid: wamid ?? null,
                                                components: campaign.template.components,
                                            } as any,
                                        },
                                    });
                                } catch (msgErr) {
                                    console.error(`[Campaign] Failed to save message record for ${item.phone}:`, msgErr);
                                }
                            }
                        } catch (e: unknown) {
                            const axiosErr = e as any;
                            const metaError = axiosErr?.response?.data?.error?.message;
                            const reason = metaError || (e instanceof Error ? e.message : typeof e === 'string' ? e : 'Unknown error');

                            failureHistory.push({ phone: item.phone, name: item.name, reason, timestamp: new Date() });

                            await this.prisma.campaignContact.update({
                                where: { id: item.id },
                                data: { status: 'failed', failReason: reason }
                            });
                        }
                    })
                );

                if (sendDelay > 0 && i + chunkSize < pendingBatch.length) {
                    await sleep(sendDelay);
                }
            }
        }

        const finalContacts = await this.prisma.campaignContact.findMany({
            where: { campaignId },
            select: { status: true }
        });
        let finalSent = 0, finalDelivered = 0, finalRead = 0, finalClicked = 0, finalReplied = 0, finalFailed = 0, finalPending = 0;
        for (const fc of finalContacts) {
            const s = fc.status;
            if (['sent', 'delivered', 'read', 'replied', 'clicked'].includes(s)) finalSent++;
            if (['delivered', 'read', 'replied', 'clicked'].includes(s)) finalDelivered++;
            if (['read', 'replied', 'clicked'].includes(s)) finalRead++;
            if (s === 'replied') finalReplied++;
            if (s === 'clicked') finalClicked++;
            if (s === 'failed') finalFailed++;
            if (s === 'pending') finalPending++;
        }

        await this.prisma.campaign.update({
            where: { id: campaignId },
            data: {
                status: aborted ? 'aborted' : 'completed',
                stats: {
                    ...campaignMeta,
                    total: finalContacts.length,
                    pending: finalPending,
                    sent: finalSent,
                    delivered: finalDelivered,
                    read: finalRead,
                    clicked: finalClicked,
                    replied: finalReplied,
                    failed: finalFailed,
                },
                failureHistory: failureHistory
            }
        });
    }
}
