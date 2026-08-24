import { Injectable, Logger, Inject, forwardRef, BadRequestException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { CryptoService } from '../common/services/crypto.service';
import { SystemConfigService } from '../admin/system-config.service';
import { normalizePhone } from '../common/utils/phone-normalizer';
import { firstValueFrom } from 'rxjs';
import { createHmac } from 'crypto';
import { ChatGateway } from '../chat/chat.gateway';
import { ChatbotService } from '../chatbot/chatbot.service';
import { WorkflowEngineService } from '../workflows/engine/workflow-engine.service';
import { TriggerRegistry } from '../workflows/engine/registries/trigger.registry';
import { ConsentService } from '../consent/consent.service';
import { MediaService } from '../media/media.service';

import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

interface WhatsAppCredentials {
    shopId: string;
    phoneNumberId: string;
    accessToken: string; // Decrypted
    businessAccountId: string;
    wabaId: string;
}

@Injectable()
export class WhatsappService {
    private readonly logger = new Logger(WhatsappService.name);
    // NOTE: graphApiBase is now dynamic — use getGraphApiBase() instead of this field
    // for calls that should respect runtime META_API_VERSION changes.
    private readonly graphApiBase = `https://graph.facebook.com/${process.env.META_API_VERSION || 'v18.0'}`;
    private credentialsCache = new Map<string, { creds: WhatsAppCredentials; expiresAt: number }>();
    private automationsCache = new Map<string, { automations: any[]; expiresAt: number }>();

    constructor(
        private prisma: PrismaService,
        private httpService: HttpService,
        private cryptoService: CryptoService,
        private systemConfigService: SystemConfigService,
        private chatGateway: ChatGateway,
        private chatbotService: ChatbotService,
        @Inject(forwardRef(() => WorkflowEngineService))
        private workflowEngineService: WorkflowEngineService,
        @Inject(forwardRef(() => TriggerRegistry))
        private triggerRegistry: TriggerRegistry,
        @InjectQueue('ai-agent-queue')
        private aiQueue: Queue,
        private consentService: ConsentService,
        @Optional()
        private mediaService?: MediaService,
    ) { }

    /** Invalidate cached credentials when credentials are updated */
    clearCredentialsCache(shopId?: string) {
        if (shopId) {
            this.credentialsCache.delete(shopId);
        } else {
            this.credentialsCache.clear();
        }
    }

    /** Invalidate cached automations */
    clearAutomationsCache(shopId?: string) {
        if (shopId) {
            this.automationsCache.delete(shopId);
        } else {
            this.automationsCache.clear();
        }
    }

    /** Returns the Graph API base URL, respecting DB override of META_API_VERSION. */
    private async getGraphApiBase(): Promise<string> {
        const version = await this.systemConfigService.get('META_API_VERSION', process.env.META_API_VERSION || 'v18.0');
        return `https://graph.facebook.com/${version}`;
    }

    /**
     * Get decrypted credentials for a shop (cached for 2 minutes).
     * Tries the new WhatsAppBusinessAccount model first,
     * falls back to legacy WhatsAppCredential-style env vars for backward compat.
     */
    async getCredentials(shopId: string): Promise<WhatsAppCredentials> {
        const cached = this.credentialsCache.get(shopId);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.creds;
        }

        // Try new multi-tenant model first
        const account = await this.prisma.whatsAppBusinessAccount.findFirst({
            where: { shopId, status: 'active' },
            include: {
                phoneNumbers: {
                    where: { status: 'active', isDefault: true },
                    take: 1,
                },
            },
        });

        if (account) {
            const defaultPhone = account.phoneNumbers[0];
            if (!defaultPhone) {
                // Account exists but no active default phone — try any active phone
                const anyPhone = await this.prisma.whatsAppPhoneNumber.findFirst({
                    where: { wabaAccountId: account.id, status: 'active' },
                });
                if (!anyPhone) {
                    throw new Error(`No active phone numbers found for shop ${shopId}`);
                }
                const creds: WhatsAppCredentials = {
                    shopId,
                    phoneNumberId: anyPhone.phoneNumberId,
                    accessToken: this.cryptoService.decrypt(account.accessToken),
                    businessAccountId: account.businessAccountId,
                    wabaId: account.wabaId || account.businessAccountId,
                };
                this.credentialsCache.set(shopId, { creds, expiresAt: Date.now() + 2 * 60 * 1000 });
                return creds;
            }

            const creds: WhatsAppCredentials = {
                shopId,
                phoneNumberId: defaultPhone.phoneNumberId,
                accessToken: this.cryptoService.decrypt(account.accessToken),
                businessAccountId: account.businessAccountId,
                wabaId: account.wabaId || account.businessAccountId,
            };
            this.credentialsCache.set(shopId, { creds, expiresAt: Date.now() + 2 * 60 * 1000 });
            return creds;
        }

        throw new Error(`WhatsApp credentials not found for shop ${shopId}`);
    }

    /**
     * Get credentials by phone number ID — used for webhook routing.
     */
    async getCredentialsByPhoneNumberId(phoneNumberId: string): Promise<WhatsAppCredentials | null> {
        const phone = await this.prisma.whatsAppPhoneNumber.findUnique({
            where: { phoneNumberId },
            include: { wabaAccount: true },
        });

        if (!phone || phone.status !== 'active' || phone.wabaAccount.status !== 'active') {
            return null;
        }

        return {
            shopId: phone.shopId,
            phoneNumberId: phone.phoneNumberId,
            accessToken: this.cryptoService.decrypt(phone.wabaAccount.accessToken),
            businessAccountId: phone.wabaAccount.businessAccountId,
            wabaId: phone.wabaAccount.wabaId || phone.wabaAccount.businessAccountId,
        };
    }

    /**
     * Look up shopId from a WABA ID (businessAccountId or wabaId).
     */
    async getShopByWabaId(wabaId: string): Promise<string | null> {
        const account = await this.prisma.whatsAppBusinessAccount.findFirst({
            where: {
                OR: [
                    { businessAccountId: wabaId },
                    { wabaId: wabaId },
                ],
                status: 'active',
            },
        });
        return account?.shopId || null;
    }

    async verifyWebhook(mode: string, token: string, challenge: string) {
        if (mode !== 'subscribe') return null;

        const WEBHOOK_VERIFY_TOKEN = await this.systemConfigService.get('WEBHOOK_VERIFY_TOKEN', process.env.WEBHOOK_VERIFY_TOKEN);
        if (WEBHOOK_VERIFY_TOKEN && token === WEBHOOK_VERIFY_TOKEN) {
            this.logger.log('Webhook verified successfully.');
            return challenge;
        }

        // Check per-shop tokens
        const account = await this.prisma.whatsAppBusinessAccount.findFirst({
            where: { webhookVerifyToken: token },
        });
        if (account) {
            this.logger.log(`Webhook verified for shop ${account.shopId}`);
            return challenge;
        }

        return null;
    }

    async processWebhookEvent(body: any) {
        if (body.object === 'whatsapp_business_account') {
            for (const entry of body.entry) {
                const wabaId = entry.id;

                for (const change of entry.changes || []) {
                    const value = change.value;
                    const phoneNumberId = value?.metadata?.phone_number_id;

                    // Look up shop via WABA ID or Phone Number ID fallback
                    let shopId = await this.getShopByWabaId(wabaId);
                    if (!shopId && phoneNumberId) {
                        const creds = await this.getCredentialsByPhoneNumberId(phoneNumberId);
                        shopId = creds?.shopId || null;
                    }

                    if (!shopId) {
                        this.logger.warn(`Received webhook for unknown WABA ID: ${wabaId} / Phone ID: ${phoneNumberId}`);
                        await this.logWebhookAudit(null, phoneNumberId, 'unknown_waba', null, body, 'failed', `Unknown WABA/Phone ID: ${wabaId}/${phoneNumberId}`);
                        continue;
                    }

                    try {
                        if (value.messages) {
                            await this.handleIncomingMessage(shopId, phoneNumberId, value.contacts[0], value.messages[0]);
                            await this.logWebhookAudit(shopId, phoneNumberId, 'message', value.messages[0]?.id, value, 'processed');
                        }

                        if (value.statuses) {
                            await this.handleMessageStatus(shopId, value.statuses[0]);
                            await this.logWebhookAudit(shopId, phoneNumberId, 'status', value.statuses[0]?.id, value, 'processed');
                        }

                        if (change.field === 'message_template_status_update') {
                            await this.handleTemplateStatusUpdate(shopId, value);
                            await this.logWebhookAudit(shopId, phoneNumberId, 'template_status', null, value, 'processed');
                        }

                        if (change.field === 'phone_number_name_update') {
                            await this.handlePhoneNumberNameUpdate(shopId, wabaId, value);
                            await this.logWebhookAudit(shopId, null, 'account_update', null, value, 'processed');
                        }
                    } catch (error) {
                        this.logger.error(`Error processing webhook for shop ${shopId}: ${error.message}`);
                        await this.logWebhookAudit(shopId, phoneNumberId, 'error', null, value, 'failed', error.message);

                        // Store in dead letter for retry
                        await this.prisma.deadLetterEvent.create({
                            data: {
                                sourceType: 'webhook',
                                originalPayload: value,
                                errorMessage: error.message,
                                status: 'pending',
                            },
                        });
                    }
                }
            }
        }
    }

    private async handlePhoneNumberNameUpdate(shopId: string, wabaAccountId: string, value: any) {
        const { display_phone_number, decision, requested_verified_name, rejection_reason } = value;
        this.logger.log(`[Webhook] Name update for ${display_phone_number}: ${decision}`);

        // Note: Meta passes display_phone_number, which may not have the + sign.
        const phone = await this.prisma.whatsAppPhoneNumber.findFirst({
            where: { shopId, displayPhoneNumber: display_phone_number }
        });

        if (!phone) {
             this.logger.warn(`Could not find phone number ${display_phone_number} to update name.`);
             return;
        }

        if (decision === 'APPROVED') {
            await this.prisma.whatsAppPhoneNumber.update({
                where: { id: phone.id },
                data: {
                    nameStatus: 'APPROVED',
                    verifiedName: requested_verified_name
                }
            });

            // Re-register the phone number to apply the change
            try {
                const creds = await this.getCredentialsByPhoneNumberId(phone.phoneNumberId);
                if (creds) {
                    await firstValueFrom(
                        this.httpService.post(`${this.graphApiBase}/${phone.phoneNumberId}/register`, {
                            messaging_product: 'whatsapp',
                            pin: require('crypto').randomInt(100000, 999999).toString()
                        }, {
                            headers: { Authorization: `Bearer ${creds.accessToken}` }
                        })
                    );
                    this.logger.log(`Successfully re-registered phone ${phone.phoneNumberId} with new name.`);
                }
            } catch (err: any) {
                this.logger.error(`Failed to auto-register phone after name approval: ${err.message}`);
            }
        } else if (decision === 'REJECTED') {
            await this.prisma.whatsAppPhoneNumber.update({
                where: { id: phone.id },
                data: {
                    nameStatus: 'REJECTED'
                }
            });
            this.logger.warn(`Name change rejected: ${rejection_reason}`);
        }
    }

    private async handleTemplateStatusUpdate(shopId: string, value: any) {
        const { event, message_template_id, message_template_name, message_template_language, reason } = value;
        this.logger.log(`[Webhook] Template status update for shop ${shopId}: ${message_template_name} -> ${event}`);

        let status = 'pending';
        if (event === 'APPROVED') status = 'approved';
        else if (event === 'REJECTED') status = 'rejected';
        else if (event === 'PENDING') status = 'pending';

        await this.prisma.template.updateMany({
            where: {
                shopId,
                templateName: message_template_name,
                language: message_template_language
            },
            data: { status }
        });
    }

    private async handleMessageStatus(shopId: string, statusData: any) {
        const { id: messageId, status, recipient_id: recipientPhone } = statusData;

        let failReason = null;
        if (status === 'failed' && statusData.errors && statusData.errors.length > 0) {
            failReason = statusData.errors[0].title || statusData.errors[0].message || 'Unknown error';
        }

        let message: any = null;
        try {
            message = await this.prisma.message.update({
                where: { id: messageId },
                data: { status },
            });
            if (message) {
                this.chatGateway.notifyMessageStatus(shopId, {
                    conversationId: message.conversationId,
                    messageId: messageId,
                    status: status,
                });
            }
        } catch (e) {
            this.logger.warn(`Status update failed for message ${messageId}. It might not exist.`);
        }

        if (['delivered', 'read', 'sent', 'replied', 'failed'].includes(status)) {
            try {
                const statusRank: Record<string, number> = { failed: -1, pending: 0, sent: 1, delivered: 2, read: 3, clicked: 4, replied: 5 };
                const incomingRank = statusRank[status] ?? 0;

                // 1. Primary lookup: by wamid
                let existing = await this.prisma.campaignContact.findFirst({
                    where: { wamid: messageId },
                });

                // 2. Fallback lookup: by recipient phone number within last 48 hours
                if (!existing && recipientPhone) {
                    const cleanPhone = normalizePhone(recipientPhone);
                    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

                    existing = await this.prisma.campaignContact.findFirst({
                        where: {
                            OR: [
                                { phone: cleanPhone },
                                { phone: `+${cleanPhone}` },
                            ],
                            sentAt: { gte: fortyEightHoursAgo },
                            campaign: { shopId },
                        },
                        orderBy: { sentAt: 'desc' },
                    });
                }

                if (existing) {
                    const existingRank = statusRank[existing.status] ?? 0;
                    const shouldUpdate = status === 'failed' ? (existingRank < 3) : (incomingRank > existingRank);
                    if (shouldUpdate) {
                        await this.prisma.campaignContact.update({
                            where: { id: existing.id },
                            data: { 
                                status,
                                ...(failReason ? { failReason } : {}),
                                ...(existing.wamid ? {} : { wamid: messageId }),
                            },
                        });
                        this.logger.log(`[Campaign] Updated CampaignContact wamid:${messageId} phone:${recipientPhone} → ${status}`);

                        if (status === 'failed' && failReason) {
                            const camp = await this.prisma.campaign.findUnique({
                                where: { id: existing.campaignId },
                                select: { failureHistory: true }
                            });
                            const history = (camp?.failureHistory as any[]) || [];
                            if (!history.some(h => h.phone === existing.phone)) {
                                history.push({
                                    phone: existing.phone,
                                    name: existing.name,
                                    reason: failReason,
                                    timestamp: new Date()
                                });
                                await this.prisma.campaign.update({
                                    where: { id: existing.campaignId },
                                    data: { failureHistory: history }
                                });
                            }
                        }

                        // Sync Campaign.stats JSON so DB queries (such as Dashboard Overview) stay up-to-date
                        // Efficient GROUP BY aggregation instead of full-table scan
                        const statusGroups = await this.prisma.campaignContact.groupBy({
                            by: ['status'],
                            where: { campaignId: existing.campaignId },
                            _count: { status: true },
                        });
                        const countMap: Record<string, number> = {};
                        let totalCount = 0;
                        for (const g of statusGroups) {
                            countMap[g.status] = g._count.status;
                            totalCount += g._count.status;
                        }
                        const sent = (countMap['sent'] || 0) + (countMap['delivered'] || 0) + (countMap['read'] || 0) + (countMap['replied'] || 0) + (countMap['clicked'] || 0);
                        const delivered = (countMap['delivered'] || 0) + (countMap['read'] || 0) + (countMap['replied'] || 0) + (countMap['clicked'] || 0);
                        const read = (countMap['read'] || 0) + (countMap['replied'] || 0) + (countMap['clicked'] || 0);
                        const replied = countMap['replied'] || 0;
                        const clicked = countMap['clicked'] || 0;
                        const failed = countMap['failed'] || 0;
                        const pending = countMap['pending'] || 0;

                        const camp = await this.prisma.campaign.findUnique({
                            where: { id: existing.campaignId },
                            select: { stats: true }
                        });
                        const currentMeta = (camp?.stats as any) || {};
                        await this.prisma.campaign.update({
                            where: { id: existing.campaignId },
                            data: {
                                stats: {
                                    ...currentMeta,
                                    total: totalCount,
                                    pending,
                                    sent,
                                    delivered,
                                    read,
                                    clicked,
                                    replied,
                                    failed,
                                }
                            }
                        });

                        // Emit WebSocket event so frontend updates campaign view live
                        this.chatGateway.server.to(shopId).emit('campaignContactUpdated', {
                            campaignId: existing.campaignId,
                            contactId: existing.id,
                            phone: existing.phone,
                            status: status,
                        });
                    }
                }
            } catch (e) {
                this.logger.warn(`Failed to update CampaignContact for wamid ${messageId}: ${e}`);
            }
        }
    }

    private async handleIncomingMessage(shopId: string, phoneNumberId: string | undefined, contactData: any, messageData: any) {
        // 1. Upsert Contact
        const contact = await this.prisma.contact.upsert({
            where: {
                shopId_phone: { shopId, phone: contactData.wa_id },
            },
            update: {
                name: contactData.profile.name,
            },
            create: {
                shopId,
                phone: contactData.wa_id,
                name: contactData.profile.name,
            },
        });

        // 2. Upsert Conversation
        const conversation = await this.prisma.conversation.upsert({
            where: {
                shopId_contactId: { shopId, contactId: contact.id },
            },
            update: {
                lastMessageAt: new Date(),
                lastContactMessageAt: new Date(),
                unreadCount: { increment: 1 },
                phoneNumberId: phoneNumberId || undefined,
            },
            create: {
                shopId,
                contactId: contact.id,
                phoneNumberId: phoneNumberId || undefined,
                lastMessageAt: new Date(),
                lastContactMessageAt: new Date(),
                unreadCount: 1,
            },
        });

        // 3. Extract content and media URL based on message type
        let content = '';
        let mediaUrl: string | undefined;
        const msgType = messageData.type;

        if (msgType === 'text') {
            content = messageData.text?.body || '';
        } else if (['image', 'video', 'audio', 'document', 'sticker'].includes(msgType)) {
            const mediaObj = messageData[msgType];
            content = mediaObj?.caption || mediaObj?.filename || '';
            if (mediaObj?.id) {
                try {
                    const creds = await this.getCredentials(shopId);
                    const metaResp = await firstValueFrom(
                        this.httpService.get(
                            `${this.graphApiBase}/${mediaObj.id}`,
                            { headers: { Authorization: `Bearer ${creds.accessToken}` } }
                        )
                    );
                    const mediaDlUrl: string = metaResp.data.url;
                    const fileResp = await firstValueFrom(
                        this.httpService.get(mediaDlUrl, {
                            headers: { Authorization: `Bearer ${creds.accessToken}` },
                            responseType: 'arraybuffer',
                        })
                    );
                    const ext = mediaObj.mime_type ? '.' + mediaObj.mime_type.split('/')[1].split(';')[0] : '';
                    const fileName = `${mediaObj.id}${ext}`;
                    const mimeType = mediaObj.mime_type || 'application/octet-stream';
                    const fileBuffer = Buffer.from(fileResp.data);

                    // Prefer Cloudflare R2 via MediaService (0 egress cost)
                    if (this.mediaService && (process.env.R2_ACCESS_KEY_ID || process.env.R2_BUCKET_NAME)) {
                        try {
                            mediaUrl = await this.mediaService.uploadBuffer(shopId, fileBuffer, mimeType, fileName);
                        } catch (r2Err: any) {
                            this.logger.warn(`[Media] R2 upload failed, falling back to Supabase: ${r2Err?.message}`);
                        }
                    }

                    // Fallback to Supabase Storage if R2 is not configured or failed
                    if (!mediaUrl) {
                        const dbUrlMatch = (process.env.DATABASE_URL || '').match(/postgres\.([a-z]+):/);
                        const projectRef = process.env.SUPABASE_PROJECT_REF || (dbUrlMatch ? dbUrlMatch[1] : '');
                        const supabaseUrl = process.env.SUPABASE_URL || `https://${projectRef}.supabase.co`;
                        const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';
                        const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'media';
                        const storageFileName = `incoming/${shopId}/${mediaObj.id}${ext}`;

                        await firstValueFrom(
                            this.httpService.post(
                                `${supabaseUrl}/storage/v1/object/${bucket}/${storageFileName}`,
                                fileBuffer,
                                {
                                    headers: {
                                        Authorization: `Bearer ${supabaseKey}`,
                                        apikey: supabaseKey,
                                        'Content-Type': mimeType,
                                        'x-upsert': 'true',
                                    },
                                    maxBodyLength: 50 * 1024 * 1024,
                                    maxContentLength: 50 * 1024 * 1024,
                                }
                            )
                        );
                        mediaUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${storageFileName}`;
                    }
                } catch (mediaErr: any) {
                    this.logger.error(`[Media] Failed to download media ${mediaObj?.id}: ${mediaErr?.message}`);
                    mediaUrl = undefined;
                }
            }
        } else if (msgType === 'location') {
            const loc = messageData.location;
            content = `📍 Location: ${loc?.name || ''} ${loc?.address || ''} (${loc?.latitude}, ${loc?.longitude})`;
        } else if (msgType === 'button') {
            content = messageData.button?.text || '';
        } else if (msgType === 'interactive') {
            const ia = messageData.interactive;
            if (ia?.button_reply) content = ia.button_reply.title;
            else if (ia?.list_reply) content = ia.list_reply.title;
            else content = JSON.stringify(ia);
        } else {
            content = JSON.stringify(messageData);
        }

        // --- Marketing Consent Engine (AI-independent) ---
        // Runs BEFORE workflow/automation/AI logic so opt-in/opt-out is detected at the
        // messaging infrastructure level — even when the AI agent or chatbot is disabled,
        // the AI provider is unavailable, or the reply arrives outside an active campaign.
        // On opt-out, pending campaign messages for this contact are cancelled immediately.
        if (msgType === 'text' && content) {
            this.consentService
                .processIncomingMessage(shopId, contact.id, content, contact.phone)
                .catch((err) => {
                    this.logger.error(`[Consent] Failed to process incoming consent for ${contact.phone}: ${err?.message}`);
                });
        }

        const existingMsg = await this.prisma.message.findUnique({
            where: { id: messageData.id }
        });

        if (existingMsg) {
            this.logger.log(`[Webhook] Duplicate message received: ${messageData.id}. Skipping.`);
            return;
        }

        const savedMsg = await this.prisma.message.create({
            data: {
                id: messageData.id,
                shopId,
                conversationId: conversation.id,
                phoneNumberId: phoneNumberId || undefined,
                direction: 'inbound',
                type: msgType,
                content,
                mediaUrl,
                status: 'delivered',
                timestamp: new Date(parseInt(messageData.timestamp) * 1000),
            },
        });

        // Notify frontend via Socket.io
        this.chatGateway.notifyNewMessage(shopId, {
            ...savedMsg,
            conversationId: conversation.id,
            contact: {
                name: contact.name,
                phone: contact.phone,
            },
        });

        // --- Workflow Automation Engine ---
        let workflowFired = false;
        
        // 1. Resume any Waiting nodes
        const waitingInstances = await this.prisma.workflowInstance.findMany({
            where: { shopId, contactId: contact.id, status: 'waiting' }
        });

        for (const instance of waitingInstances) {
            // Update instance status to active
            await this.prisma.workflowInstance.update({
                where: { id: instance.id },
                data: { status: 'active', resumeToken: null }
            });
            // Enqueue the current node again (or the next node)
            // WaitReplyExecutor just pauses. Re-enqueuing the node will re-execute it?
            // Actually, if a node returned 'wait', resuming means moving to the next edges.
            // Let's just manually transition it to the next nodes by fetching the graph.
            const version = await this.prisma.workflowVersion.findUnique({ where: { id: instance.workflowVersionId } });
            if (version) {
               const graph: any = version.graph;
               const edges = graph.edges?.filter((e: any) => e.source === instance.currentNodeId) || [];
               await this.prisma.workflowInstance.update({
                 where: { id: instance.id },
                 data: { previousNodeId: instance.currentNodeId, lastExecutedNodeId: instance.currentNodeId, executionVersion: { increment: 1 } }
               });
               for (const edge of edges) {
                 await this.workflowEngineService.enqueueNodeExecution(instance.id, edge.target);
               }
               workflowFired = true;
               this.logger.log(`[Workflow] Resumed waiting instance ${instance.id} for contact ${contact.phone}`);
            }
        }

        // 2. Evaluate incoming message triggers
        if (messageData.type === 'text' && !workflowFired) {
            try {
                const trigger = this.triggerRegistry.get('incomingMessage');
                if (trigger && trigger.evaluate) {
                    await trigger.evaluate({
                        shopId,
                        contactId: contact.id,
                        messageText: messageData.text.body,
                        messageType: 'text'
                    });
                    // Note: We don't strictly set workflowFired=true here because evaluation is async and might not match
                    // For simplicity, we just evaluate it alongside the legacy automations below.
                }
            } catch (e) {
                this.logger.error(`[Workflow] Failed to evaluate triggers: ${e.message}`);
            }
        }


        // --- Smart Automations (Legacy) ---
        let automationFired = false;
        if (messageData.type === 'text') {
            const incomingText = messageData.text.body.trim().toLowerCase();


            // --- Campaign Reply Tracking ---
            try {
                // Find the most recent CampaignContact for this phone within the last 48 hours
                const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
                const normPhone = normalizePhone(contact.phone);
                const recentCampaignContact = await this.prisma.campaignContact.findFirst({
                    where: {
                        OR: [
                            { phone: contact.phone },
                            { phone: normPhone },
                            { phone: `+${normPhone}` },
                        ],
                        sentAt: { gte: fortyEightHoursAgo },
                        campaign: { shopId }
                    },
                    orderBy: { sentAt: 'desc' }
                });

                if (recentCampaignContact) {
                    const statusRank: Record<string, number> = { failed: -1, pending: 0, sent: 1, delivered: 2, read: 3, clicked: 4, replied: 5 };
                    const isClick = ['button', 'interactive'].includes(messageData.type);
                    const incomingStatus = isClick ? 'clicked' : 'replied';
                    const incomingRank = statusRank[incomingStatus];
                    const existingRank = statusRank[recentCampaignContact.status] ?? 0;
                    
                    if (incomingRank > existingRank) {
                        await this.prisma.campaignContact.update({
                            where: { id: recentCampaignContact.id },
                            data: { status: incomingStatus }
                        });
                        this.logger.log(`[Campaign] Contact ${contact.phone} ${incomingStatus} to campaign ${recentCampaignContact.campaignId}`);
                    }
                }
            } catch (err) {
                this.logger.warn(`Failed to update campaign tracking for ${contact.phone}: ${err}`);
            }

            let automations = this.automationsCache.get(shopId)?.automations;
            if (!automations || this.automationsCache.get(shopId)!.expiresAt <= Date.now()) {
                automations = await this.prisma.automation.findMany({
                    where: { shopId, isActive: true }
                });
                this.automationsCache.set(shopId, { automations, expiresAt: Date.now() + 60 * 1000 });
            }
            this.logger.log(`[Automation] ${automations.length} active automation(s). Incoming: "${incomingText}"`);

            for (const auto of automations) {
                const keywordString = auto.triggerKeyword?.toLowerCase().trim();
                if (!keywordString) continue;
                
                const keywords = keywordString.split(',').map((k: string) => k.trim()).filter(Boolean);
                const isMatch = keywords.some((kw: string) => {
                    if (kw === incomingText) return true;
                    if (kw.length <= 3) return incomingText === kw;
                    try {
                        const escaped = kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                        const regex = new RegExp(`(?:^|\\s|\\b)${escaped}(?:$|\\s|\\b)`, 'i');
                        return regex.test(incomingText);
                    } catch {
                        return incomingText === kw;
                    }
                });

                if (isMatch) {
                    this.logger.log(`[Automation] MATCH! Keyword="${keywordString}" → sending reply to ${contactData.wa_id}`);
                    try {
                        const metaRes = await this.sendOutboundMessage(shopId, contactData.wa_id, 'text', auto.replyText);
                        const wamid = metaRes?.messages?.[0]?.id;
                        this.logger.log(`[Automation] Reply sent successfully to ${contactData.wa_id}`);

                        const savedAutoMsg = await this.prisma.message.create({
                            data: {
                                id: wamid || undefined,
                                shopId,
                                conversationId: conversation.id,
                                phoneNumberId: phoneNumberId || undefined,
                                direction: 'outbound',
                                type: 'text',
                                content: auto.replyText,
                                status: 'sent',
                            },
                        });
                        this.chatGateway.notifyNewMessage(shopId, {
                            ...savedAutoMsg,
                            contact: { name: contact.name, phone: contact.phone }
                        });

                        await this.prisma.conversation.update({
                            where: { id: conversation.id },
                            data: { lastMessageAt: new Date() },
                        });

                        automationFired = true;
                    } catch (sendErr: unknown) {
                        const axiosErr = sendErr as any;
                        const detail = axiosErr?.response?.data
                            ? JSON.stringify(axiosErr.response.data)
                            : sendErr instanceof Error ? sendErr.message : String(sendErr);
                        this.logger.error(`[Automation] FAILED to send reply: ${detail}`);
                    }
                    break;
                }
            }
        }

        // --- AI Agent Auto-Reply ---
        if (!automationFired && !workflowFired && messageData.type === 'text') {
            const conv = await this.prisma.conversation.findUnique({
                where: { id: conversation.id },
                select: { aiPaused: true },
            });
            if (!conv?.aiPaused) {
                // Execute AI response asynchronously so Webhook returns 200 OK immediately
                (async () => {
                    try {
                        const res = await this.chatbotService.generateResponse(
                            shopId,
                            contact.name || 'Customer',
                            messageData.text.body,
                            conversation.id
                        );

                        if (res.text && res.text.trim()) {
                            this.logger.log(`[AI Agent] Generated reply for ${contactData.wa_id}: "${res.text.slice(0, 60)}..."`);
                            const metaRes = await this.sendOutboundMessage(shopId, contactData.wa_id, 'text', res.text);
                            const wamid = metaRes?.messages?.[0]?.id;

                            const savedAiMsg = await this.prisma.message.create({
                                data: {
                                    id: wamid || undefined,
                                    shopId,
                                    conversationId: conversation.id,
                                    phoneNumberId: phoneNumberId || undefined,
                                    direction: 'outbound',
                                    type: 'text',
                                    content: res.text,
                                    status: 'sent',
                                },
                            });

                            this.chatGateway.notifyNewMessage(shopId, {
                                ...savedAiMsg,
                                contact: { name: contact.name, phone: contact.phone },
                            });

                            await this.prisma.conversation.update({
                                where: { id: conversation.id },
                                data: { lastMessageAt: new Date() },
                            });
                        } else if (res.error) {
                            this.logger.warn(`[AI Agent] Could not generate reply for ${contactData.wa_id}: ${res.error}`);
                        }
                    } catch (aiErr: any) {
                        this.logger.error(`[AI Agent] Error in AI reply processing: ${aiErr.message}`);
                    }
                })();
            } else {
                this.logger.log(`[AI Agent] AI paused for conversation ${conversation.id} — skipping.`);
            }
        }
    }


    async markMessageAsRead(shopId: string, messageId: string) {
        const creds = await this.getCredentials(shopId);
        const payload = {
            messaging_product: 'whatsapp',
            status: 'read',
            message_id: messageId
        };
        try {
            await firstValueFrom(
                this.httpService.post(`${this.graphApiBase}/${creds.phoneNumberId}/messages`, payload, {
                    headers: { Authorization: `Bearer ${creds.accessToken}`, 'Content-Type': 'application/json' }
                })
            );
        } catch (error: any) {
            this.logger.error(`Failed to mark message as read: ${messageId}`, error.response?.data || error.message);
        }
    }

    /**
     * Check if a contact is within the 24-hour customer service window.
     */
    async check24HourWindow(shopId: string, toPhone: string): Promise<boolean> {
        const clean = normalizePhone(toPhone);
        const contact = await this.prisma.contact.findFirst({
            where: { shopId, OR: [{ phone: clean }, { phone: `+${clean}` }] }
        });
        if (!contact) return true; // New contact, window not restricted yet

        const conversation = await this.prisma.conversation.findUnique({
            where: { shopId_contactId: { shopId, contactId: contact.id } }
        });

        if (!conversation || !conversation.lastContactMessageAt) {
            return false; // Contact has never messaged us inbound -> 24h window closed
        }

        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return conversation.lastContactMessageAt >= twentyFourHoursAgo;
    }

    private async getAppSecretProof(accessToken: string): Promise<string | undefined> {
        const appSecret = await this.systemConfigService.get('META_APP_SECRET', process.env.META_APP_SECRET);
        if (!appSecret || appSecret.includes('your_meta_app_secret') || appSecret.trim() === '') return undefined;
        return createHmac('sha256', appSecret.trim()).update(accessToken).digest('hex');
    }

    async sendOutboundMessage(shopId: string, toPhone: string, type: string, content: any, mediaUrl?: string) {
        const creds = await this.getCredentials(shopId);
        const cleanPhone = normalizePhone(toPhone);

        const payload: any = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanPhone,
            type: type,
        };

        if (type === 'text') {
            payload.text = { preview_url: false, body: content };
        } else if (['image', 'document', 'video', 'audio'].includes(type) && mediaUrl) {
            payload[type] = { link: mediaUrl };
        } else if (type === 'interactive') {
            const config = content.config || {};
            const rawButtons = config.buttons || [];
            // Meta limits: max 3 buttons, max title length 20 chars
            const sanitizedButtons = rawButtons.slice(0, 3).map((btn: any, idx: number) => {
                const titleStr = (btn.text || btn.title || 'Click').trim();
                return {
                    type: 'reply',
                    reply: {
                        id: btn.id || `btn-${idx}`,
                        title: titleStr.length > 20 ? titleStr.slice(0, 20) : titleStr
                    }
                };
            });
            payload.type = 'interactive';
            payload.interactive = {
                type: 'button',
                body: { text: content.text || content.body || '' },
                action: { buttons: sanitizedButtons }
            };
            if (config.header) {
                payload.interactive.header = { type: 'text', text: config.header };
            }
            if (config.footer) {
                payload.interactive.footer = { text: config.footer };
            }
            if (config.mediaType && (config.imageUrl || config.videoUrl)) {
                payload.interactive.header = {
                    type: config.mediaType.toLowerCase() === 'image' ? 'image' : 'video',
                    [config.mediaType.toLowerCase() === 'image' ? 'image' : 'video']: {
                        link: config.imageUrl || config.videoUrl
                    }
                };
            }
        } else if (type === 'template') {
            const templateName = typeof content === 'string' ? content : content.name;
            const templateLanguage = (typeof content !== 'string' && content.language) ? content.language : 'en_US';
            payload.template = {
                name: templateName,
                language: { code: templateLanguage }
            };
            const components: any[] = [];
            if (typeof content !== 'string' && Array.isArray(content.components)) {
                for (const comp of content.components) {
                    if (!comp || !comp.type) continue;
                    const compType = String(comp.type).toLowerCase();
                    const sanitizedComp: any = { type: compType };

                    if (comp.sub_type) {
                        sanitizedComp.sub_type = String(comp.sub_type).toLowerCase();
                    }
                    if (comp.index !== undefined && comp.index !== null) {
                        sanitizedComp.index = String(comp.index);
                    }
                    if (Array.isArray(comp.parameters)) {
                        sanitizedComp.parameters = comp.parameters.map((p: any) => {
                            const pType = p.type ? String(p.type).toLowerCase() : 'text';
                            if (pType === 'text') {
                                return { ...p, type: 'text', text: p.text && String(p.text).trim() !== '' ? String(p.text).trim() : ' ' };
                            }
                            return p;
                        });
                    }
                    // Include component if it has parameters or valid button/header attributes
                    if (sanitizedComp.parameters && sanitizedComp.parameters.length > 0) {
                        components.push(sanitizedComp);
                    }
                }
            }

            // Auto-inject media header component if mediaUrl is provided and header component is not already in components
            const hasHeader = components.some(c => c.type === 'header');
            if (!hasHeader && mediaUrl) {
                let headerType = 'image';
                const lowerUrl = mediaUrl.toLowerCase();
                if (lowerUrl.includes('.mp4') || lowerUrl.includes('.mov') || lowerUrl.includes('.avi') || lowerUrl.includes('/video/')) {
                    headerType = 'video';
                } else if (lowerUrl.includes('.pdf') || lowerUrl.includes('.doc') || lowerUrl.includes('.docx') || lowerUrl.includes('/document/')) {
                    headerType = 'document';
                }
                components.unshift({
                    type: 'header',
                    parameters: [
                        {
                            type: headerType,
                            [headerType]: { link: mediaUrl }
                        }
                    ]
                });
            }

            if (components.length > 0) {
                payload.template.components = components;
            }
        }

        const url = `${this.graphApiBase}/${creds.phoneNumberId}/messages`;
        const proof = await this.getAppSecretProof(creds.accessToken);

        const maxRetries = 3;
        let attempt = 0;
        let lastError: any = null;

        while (attempt < maxRetries) {
            try {
                const response = await firstValueFrom(
                    this.httpService.post(url, payload, {
                        headers: {
                            Authorization: `Bearer ${creds.accessToken}`,
                            'Content-Type': 'application/json',
                        },
                        params: proof ? { appsecret_proof: proof } : {},
                    })
                );
                return response.data;
            } catch (error: unknown) {
                lastError = error;
                const axiosErr = error as any;
                const statusCode = axiosErr?.response?.status;
                const errorCode = axiosErr?.response?.data?.error?.code;

                const isRateLimit = statusCode === 429 || [131048, 130429, 131056].includes(errorCode);
                const isTransientServerErr = statusCode >= 500 && statusCode <= 504;

                attempt++;
                if ((isRateLimit || isTransientServerErr) && attempt < maxRetries) {
                    const delayMs = Math.pow(2, attempt) * 1000; // 2s, 4s
                    this.logger.warn(`[WhatsApp API] Rate limit or transient error (${errorCode || statusCode}). Retrying attempt ${attempt}/${maxRetries} in ${delayMs}ms...`);
                    await new Promise(res => setTimeout(res, delayMs));
                    continue;
                }

                const detail = axiosErr?.response?.data || (error instanceof Error ? error.message : String(error));
                this.logger.error('Error sending WhatsApp message', detail);
                throw error;
            }
        }
        throw lastError;
    }

    async processDeadLetterQueue(): Promise<{ processed: number; resolved: number }> {
        const pendingEvents = await this.prisma.deadLetterEvent.findMany({
            where: { status: 'pending', retryCount: { lt: 3 } },
            take: 50
        });

        let resolvedCount = 0;
        for (const event of pendingEvents) {
            try {
                await this.processWebhookEvent(event.originalPayload);
                await this.prisma.deadLetterEvent.update({
                    where: { id: event.id },
                    data: { status: 'resolved', resolvedAt: new Date() }
                });
                resolvedCount++;
            } catch (e: any) {
                await this.prisma.deadLetterEvent.update({
                    where: { id: event.id },
                    data: {
                        retryCount: { increment: 1 },
                        lastAttemptAt: new Date(),
                        errorMessage: e.message || 'Retry failed'
                    }
                });
            }
        }
        return { processed: pendingEvents.length, resolved: resolvedCount };
    }

    // ─── Audit Logging ─────────────────────────────────────────────────────

    private async logWebhookAudit(
        shopId: string | null,
        phoneNumberId: string | null,
        eventType: string,
        waMessageId: string | null,
        payload: any,
        processingStatus: string,
        errorMessage?: string,
    ): Promise<void> {
        try {
            await this.prisma.webhookAuditLog.create({
                data: {
                    shopId,
                    phoneNumberId,
                    eventType,
                    waMessageId,
                    payload,
                    processingStatus,
                    errorMessage,
                },
            });
        } catch (e) {
            this.logger.error(`Failed to log webhook audit: ${e.message}`);
        }
    }

    // --- Business Profile Settings ---

    async getBusinessProfile(shopId: string) {
        try {
            const creds = await this.getCredentials(shopId);
            const response = await firstValueFrom(
                this.httpService.get(`${this.graphApiBase}/${creds.phoneNumberId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical`, {
                    headers: { Authorization: `Bearer ${creds.accessToken}` }
                })
            );

            // Get the internal phone details for Name Tracking
            const phoneDetails = await this.prisma.whatsAppPhoneNumber.findUnique({
                where: { phoneNumberId: creds.phoneNumberId }
            });

            return {
                ...(response.data.data?.[0] || {}),
                phoneDetails: {
                    nameStatus: phoneDetails?.nameStatus || 'NONE',
                    pendingName: phoneDetails?.pendingName || null,
                    verifiedName: phoneDetails?.verifiedName || null
                }
            };
        } catch (error: any) {
            const metaMsg = error.response?.data?.error?.message || error.message || 'Failed to fetch business profile';
            this.logger.error(`Failed to fetch business profile for shop ${shopId}: ${metaMsg}`);
            throw new BadRequestException(`WhatsApp Profile Error: ${metaMsg}`);
        }
    }

    async updateBusinessProfile(shopId: string, data: any) {
        const creds = await this.getCredentials(shopId);
        try {
            const payload: any = {
                messaging_product: 'whatsapp',
            };

            // Meta only accepts 'about' not 'description'
            if (data.about !== undefined && data.about !== '') payload.about = data.about;
            else if (data.description !== undefined && data.description !== '') payload.about = data.description;

            if (data.address !== undefined && data.address !== '') payload.address = data.address;
            if (data.email !== undefined && data.email !== '') payload.email = data.email;
            // Only send websites if non-empty array
            if (Array.isArray(data.websites) && data.websites.length > 0) payload.websites = data.websites;
            if (data.vertical !== undefined && data.vertical !== '') payload.vertical = data.vertical;

            const response = await firstValueFrom(
                this.httpService.post(`${this.graphApiBase}/${creds.phoneNumberId}/whatsapp_business_profile`, payload, {
                    headers: { Authorization: `Bearer ${creds.accessToken}` }
                })
            );
            return response.data;
        } catch (error: any) {
            const metaMsg: string = error.response?.data?.error?.message || error.message || 'Failed to update profile';
            this.logger.error(`Failed to update business profile: ${metaMsg}`);
            const { HttpException, HttpStatus } = require('@nestjs/common');
            throw new HttpException(metaMsg, HttpStatus.BAD_REQUEST);
        }
    }

    async uploadProfilePicture(shopId: string, file: any) {
        const creds = await this.getCredentials(shopId);
        try {
            // Step 1: Create resumable upload session
            const sessionRes = await firstValueFrom(
                this.httpService.post(`${this.graphApiBase}/app/uploads?file_length=${file.size}&file_type=${file.mimetype}`, {}, {
                    headers: { Authorization: `Bearer ${creds.accessToken}` }
                })
            );
            const sessionId = sessionRes.data.id;

            // Step 2: Upload file bytes
            const uploadRes = await firstValueFrom(
                this.httpService.post(`${this.graphApiBase}/${sessionId}`, file.buffer, {
                    headers: {
                        'Authorization': `OAuth ${creds.accessToken}`,
                        'file_offset': '0',
                        'Content-Type': 'application/octet-stream'
                    }
                })
            );
            const handle = uploadRes.data.h;

            // Step 3: Update Profile
            const profileRes = await firstValueFrom(
                this.httpService.post(`${this.graphApiBase}/${creds.phoneNumberId}/whatsapp_business_profile`, {
                    messaging_product: 'whatsapp',
                    profile_picture_handle: handle
                }, {
                    headers: { Authorization: `Bearer ${creds.accessToken}` }
                })
            );
            return profileRes.data;
        } catch (error: any) {
            this.logger.error(`Failed to upload profile picture: ${error.response?.data?.error?.message || error.message}`);
            throw new Error(error.response?.data?.error?.message || 'Failed to upload profile picture');
        }
    }

    async updateDisplayName(shopId: string, newName: string) {
        const creds = await this.getCredentials(shopId);
        try {
            const response = await firstValueFrom(
                this.httpService.post(`${this.graphApiBase}/${creds.phoneNumberId}`, {
                    new_display_name: newName
                }, {
                    headers: { Authorization: `Bearer ${creds.accessToken}` }
                })
            );

            // Update database to track the pending state
            await this.prisma.whatsAppPhoneNumber.update({
                where: { phoneNumberId: creds.phoneNumberId },
                data: {
                    nameStatus: 'PENDING',
                    pendingName: newName
                }
            });

            return response.data;
        } catch (error: any) {
            this.logger.error(`Failed to update display name: ${error.response?.data?.error?.message || error.message}`);
            throw new Error(error.response?.data?.error?.message || 'Failed to request display name change');
        }
    }

    async registerActiveNumber(shopId: string, customPin?: string) {
        const creds = await this.getCredentials(shopId);
        const url = `${this.graphApiBase}/${creds.phoneNumberId}/register`;
        const pin = customPin || require('crypto').randomInt(100000, 999999).toString();

        try {
            const response = await firstValueFrom(
                this.httpService.post(url, {
                    messaging_product: 'whatsapp',
                    pin: pin
                }, {
                    headers: {
                        Authorization: `Bearer ${creds.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                })
            );

            await this.prisma.whatsAppPhoneNumber.update({
                where: { phoneNumberId: creds.phoneNumberId },
                data: { status: 'active' }
            });

            return { success: true, message: 'Phone number registered successfully', data: response.data };
        } catch (error: any) {
            const detail = error.response?.data || error.message;
            this.logger.error(`Manual registration failed for phone ${creds.phoneNumberId}:`, JSON.stringify(detail));
            throw new BadRequestException(`Meta registration failed: ${JSON.stringify(detail)}`);
        }
    }
}
