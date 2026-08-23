import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../common/services/crypto.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminService {
    constructor(
        private prisma: PrismaService,
        private cryptoService: CryptoService,
    ) { }

    async createShop(data: any) {
        const { username, password, shopName, phone, ownerName, expiryDate } = data;

        const salt = await bcrypt.genSalt();
        const passwordHash = await bcrypt.hash(password, salt);

        const user = await this.prisma.user.create({
            data: {
                username,
                passwordHash,
                role: 'user',
            },
        });

        const shop = await this.prisma.shop.create({
            data: {
                ownerId: user.id,
                shopName,
                phone,
            },
        });

        const subscription = await this.prisma.subscription.create({
            data: {
                shopId: shop.id,
                startDate: new Date(),
                expiryDate: new Date(expiryDate),
                status: 'active',
            },
        });

        return { message: 'Shop and subscription created successfully', shop, subscription };
    }

    async getShops() {
        return this.prisma.shop.findMany({
            include: {
                owner: { select: { id: true, username: true } },
                subscription: true,
                whatsappAccounts: {
                    include: { phoneNumbers: true },
                },
            },
        });
    }

    async updateShop(shopId: string, data: any) {
        const { username, password, shopName, phone } = data;

        const shop = await this.prisma.shop.findUnique({
            where: { id: shopId },
            include: { owner: true }
        });

        if (!shop) throw new NotFoundException('Shop not found');

        let passwordHash: string | undefined = undefined;
        if (password) {
            const salt = await bcrypt.genSalt();
            passwordHash = await bcrypt.hash(password, salt);
        }

        return this.prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: shop.ownerId },
                data: {
                    username: username || undefined,
                    passwordHash: passwordHash
                }
            });

            return tx.shop.update({
                where: { id: shopId },
                data: {
                    shopName: shopName || undefined,
                    phone: phone || undefined,
                },
                include: {
                    owner: { select: { id: true, username: true } },
                    subscription: true
                }
            });
        });
    }

    async updateSubscription(shopId: string, data: any) {
        const { expiryDate, status } = data;
        const expiry = expiryDate ? new Date(expiryDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        return this.prisma.subscription.upsert({
            where: { shopId },
            create: {
                shopId,
                startDate: new Date(),
                expiryDate: expiry,
                status: status || 'active',
            },
            update: {
                expiryDate: expiryDate ? new Date(expiryDate) : undefined,
                status: status,
            },
        });
    }

    async toggleShopStatus(shopId: string, status: string) {
        return this.prisma.shop.update({
            where: { id: shopId },
            data: { status },
        });
    }

    async deleteShop(shopId: string) {
        return this.prisma.$transaction(async (prisma) => {
            // 1. Delete chatbot configurations
            await prisma.chatbotConfig.deleteMany({ where: { shopId } });

            // 2. Delete flows (this will cascade delete flow sessions, analytics, and versions)
            await prisma.flow.deleteMany({ where: { shopId } });


            // 4. Delete campaigns (this will cascade delete campaign contacts)
            await prisma.campaign.deleteMany({ where: { shopId } });

            // 5. Delete templates (safe to delete now that sequence steps and campaigns are gone)
            await prisma.template.deleteMany({ where: { shopId } });

            // 6. Delete messages first (since conversations reference messages)
            await prisma.message.deleteMany({ where: { shopId } });

            // 7. Delete conversations (since messages are gone)
            await prisma.conversation.deleteMany({ where: { shopId } });

            // 8. Delete contacts (since conversations, flow sessions, and sequence subscribers are gone)
            await prisma.contact.deleteMany({ where: { shopId } });

            // 9. Delete other shop level entities
            await prisma.mediaFile.deleteMany({ where: { shopId } });
            await prisma.automation.deleteMany({ where: { shopId } });
            await prisma.onboardingEvent.deleteMany({ where: { shopId } });
            await prisma.whatsAppPhoneNumber.deleteMany({ where: { shopId } });
            await prisma.whatsAppBusinessAccount.deleteMany({ where: { shopId } });
            await prisma.subscription.deleteMany({ where: { shopId } });

            // 10. Delete the shop itself
            const shop = await prisma.shop.delete({ where: { id: shopId } });

            // 11. Delete the user (owner of the shop)
            await prisma.user.delete({ where: { id: shop.ownerId } });

            return { message: 'Shop and all related data deleted completely' };
        });
    }

    async getDemoRequests() {
        return this.prisma.demoRequest.findMany({
            orderBy: { createdAt: 'desc' }
        });
    }

    async resolveDemoRequest(requestId: string) {
        const request = await this.prisma.demoRequest.findUnique({
            where: { id: requestId }
        });

        if (!request) throw new NotFoundException('Demo request not found');
        if (request.status !== 'pending') throw new Error('Request already processed');

        await this.prisma.demoRequest.update({
            where: { id: requestId },
            data: { status: 'resolved' }
        });

        return { message: 'Demo request marked as resolved.' };
    }

    async rejectDemoRequest(requestId: string) {
        const request = await this.prisma.demoRequest.findUnique({
            where: { id: requestId }
        });

        if (!request) throw new NotFoundException('Demo request not found');

        return this.prisma.demoRequest.update({
            where: { id: requestId },
            data: { status: 'rejected' }
        });
    }

    async getStats() {
        const [totalShops, activeShops, disabledShops, expiredSubscriptions, connectedWabas, totalPhoneNumbers] = await Promise.all([
            this.prisma.shop.count(),
            this.prisma.shop.count({ where: { status: 'active' } }),
            this.prisma.shop.count({ where: { status: 'disabled' } }),
            this.prisma.subscription.count({
                where: {
                    expiryDate: { lt: new Date() },
                    status: 'active'
                }
            }),
            this.prisma.whatsAppBusinessAccount.count({ where: { status: 'active' } }),
            this.prisma.whatsAppPhoneNumber.count({ where: { status: 'active' } }),
        ]);

        return {
            totalShops,
            activeShops,
            disabledShops,
            expiredSubscriptions,
            connectedWabas,
            totalPhoneNumbers,
        };
    }

    // ─── New Multi-Tenant Admin Methods ────────────────────────────────────

    /**
     * Returns all shops with their WABA connection status and token health.
     */
    async getTenantConnections() {
        const shops = await this.prisma.shop.findMany({
            include: {
                owner: { select: { id: true, username: true } },
                subscription: true,
                whatsappAccounts: {
                    include: { phoneNumbers: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return shops.map(shop => {
            const accounts = shop.whatsappAccounts.map(account => {
                let tokenHealth = 'valid';
                if (account.tokenExpiry) {
                    const daysLeft = (account.tokenExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
                    if (daysLeft <= 0) tokenHealth = 'expired';
                    else if (daysLeft <= 7) tokenHealth = 'expiring_soon';
                }

                return {
                    id: account.id,
                    wabaId: account.wabaId || account.businessAccountId,
                    businessName: account.businessName,
                    status: account.status,
                    tokenHealth,
                    tokenExpiry: account.tokenExpiry,
                    onboardingSource: account.onboardingSource,
                    phoneNumbers: account.phoneNumbers.map(pn => ({
                        phoneNumberId: pn.phoneNumberId,
                        displayPhoneNumber: pn.displayPhoneNumber,
                        verifiedName: pn.verifiedName,
                        qualityRating: pn.qualityRating,
                        messagingLimit: pn.messagingLimit,
                        status: pn.status,
                    })),
                };
            });

            return {
                shopId: shop.id,
                shopName: shop.shopName,
                owner: shop.owner,
                status: shop.status,
                subscription: shop.subscription,
                isConnected: accounts.some(a => a.status === 'active'),
                accounts,
            };
        });
    }

    /**
     * Get webhook audit failures for a specific shop or all shops.
     */
    async getWebhookFailures(shopId?: string) {
        const where: any = { processingStatus: { in: ['failed', 'dead_letter'] } };
        if (shopId) where.shopId = shopId;

        return this.prisma.webhookAuditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
    }

    /**
     * Get dead letter events for retry.
     */
    async getDeadLetterEvents(status?: string) {
        const where: any = {};
        if (status) where.status = status;

        return this.prisma.deadLetterEvent.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
    }

    /**
     * Get token health across all tenants.
     */
    async getTokenHealth() {
        const accounts = await this.prisma.whatsAppBusinessAccount.findMany({
            where: { status: { in: ['active', 'token_expired'] } },
            include: {
                shop: { select: { shopName: true } },
            },
        });

        return accounts.map(account => {
            let tokenHealth = 'valid';
            if (account.tokenExpiry) {
                const daysLeft = (account.tokenExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
                if (daysLeft <= 0) tokenHealth = 'expired';
                else if (daysLeft <= 7) tokenHealth = 'expiring_soon';
            }

            return {
                shopName: account.shop.shopName,
                wabaId: account.wabaId || account.businessAccountId,
                businessName: account.businessName,
                status: account.status,
                tokenHealth,
                tokenExpiry: account.tokenExpiry,
            };
        });
    }

    /**
     * Suspend a shop's WhatsApp access.
     */
    async suspendShop(shopId: string) {
        await this.prisma.whatsAppBusinessAccount.updateMany({
            where: { shopId },
            data: { status: 'suspended' },
        });

        await this.prisma.whatsAppPhoneNumber.updateMany({
            where: { shopId },
            data: { status: 'inactive' },
        });

        return { message: 'Shop WhatsApp access suspended' };
    }

    /**
     * Get onboarding status for a specific shop.
     */
    async getOnboardingStatus(shopId: string) {
        const events = await this.prisma.onboardingEvent.findMany({
            where: { shopId },
            orderBy: { createdAt: 'desc' },
        });

        const latestEvent = events[0];
        let status = 'not_started';
        if (latestEvent) {
            if (latestEvent.eventType === 'completed') status = 'connected';
            else if (latestEvent.eventType === 'failed') status = 'failed';
            else if (latestEvent.eventType === 'disconnected') status = 'disconnected';
            else status = 'in_progress';
        }

        return { status, events };
    }

    /**
     * Manually set WhatsApp credentials for a shop (admin fallback).
     */
    async setWhatsAppCredentials(shopId: string, data: any) {
        const { businessAccountId, phoneNumberId, accessToken } = data;
        const encryptedToken = this.cryptoService.encrypt(accessToken);

        let existingAccount = await this.prisma.whatsAppBusinessAccount.findFirst({
            where: { shopId },
        });

        let account: any;
        if (existingAccount) {
            account = await this.prisma.whatsAppBusinessAccount.update({
                where: { id: existingAccount.id },
                data: {
                    businessAccountId,
                    accessToken: encryptedToken,
                    status: 'active',
                    onboardingSource: 'manual',
                },
            });
        } else {
            account = await this.prisma.whatsAppBusinessAccount.create({
                data: {
                    shopId,
                    businessAccountId,
                    accessToken: encryptedToken,
                    status: 'active',
                    onboardingSource: 'manual',
                },
            });
        }

        if (phoneNumberId) {
            await this.prisma.whatsAppPhoneNumber.upsert({
                where: { phoneNumberId },
                create: {
                    shopId,
                    wabaAccountId: account.id,
                    phoneNumberId,
                    isDefault: true,
                    status: 'active',
                },
                update: {
                    shopId,
                    wabaAccountId: account.id,
                    status: 'active',
                    isDefault: true,
                },
            });
        }

        return { message: 'WhatsApp credentials set successfully', account };
    }
}
