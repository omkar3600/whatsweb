import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../common/services/crypto.service';

@Injectable()
export class ShopsService {
    private readonly logger = new Logger(ShopsService.name);
    constructor(
        private prisma: PrismaService,
        private cryptoService: CryptoService,
    ) { }

    async getShopOverview(shopId: string) {
        this.logger.log(`Fetching overview for shopId: ${shopId}`);
        if (!shopId) {
            throw new BadRequestException('Shop ID is required');
        }
        const shop = await this.prisma.shop.findUnique({
            where: { id: shopId },
            include: {
                subscription: true,
                whatsappAccounts: {
                    include: { phoneNumbers: true },
                },
            },
        });

        if (!shop) throw new NotFoundException('Shop not found');

        const messageCount = await this.prisma.message.count({ where: { shopId } });
        const contactCount = await this.prisma.contact.count({ where: { shopId } });
        const templateCount = await this.prisma.template.count({ where: { shopId } });

        // Calculate Contact Growth (Last 30 days vs Previous 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const newContacts = await this.prisma.contact.count({
            where: { shopId, createdAt: { gte: thirtyDaysAgo } }
        });
        const oldContacts = await this.prisma.contact.count({
            where: { shopId, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } }
        });
        const contactGrowth = oldContacts === 0 ? (newContacts > 0 ? 100 : 0) : Math.round(((newContacts - oldContacts) / oldContacts) * 100);

        // Fetch Recent Campaigns
        const recentCampaigns = await this.prisma.campaign.findMany({
            where: { shopId },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: { id: true, name: true, status: true, stats: true, createdAt: true }
        });

        // Global Campaign Funnel
        let globalSent = 0, globalDelivered = 0, globalRead = 0, globalFailed = 0;
        const allCampaignContacts = await this.prisma.campaignContact.findMany({
            where: { campaign: { shopId } },
            select: { status: true }
        });
        
        for (const c of allCampaignContacts) {
            const s = c.status;
            if (['sent', 'delivered', 'read', 'replied', 'clicked'].includes(s)) globalSent++;
            if (['delivered', 'read', 'replied', 'clicked'].includes(s)) globalDelivered++;
            if (['read', 'replied', 'clicked'].includes(s)) globalRead++;
            if (s === 'failed') globalFailed++;
        }

        // Message Volume Chart (Last 7 Days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const recentMessages = await this.prisma.message.findMany({
            where: { shopId, createdAt: { gte: sevenDaysAgo } },
            select: { createdAt: true, direction: true }
        });

        // Group by day (YYYY-MM-DD)
        const volumeMap = new Map<string, { date: string; inbound: number; outbound: number }>();
        // Initialize last 7 days to 0
        for (let i = 0; i < 7; i++) {
            const d = new Date(sevenDaysAgo);
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const shortDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            volumeMap.set(dateStr, { date: shortDate, inbound: 0, outbound: 0 });
        }

        recentMessages.forEach(m => {
            const dateStr = m.createdAt.toISOString().split('T')[0];
            const entry = volumeMap.get(dateStr);
            if (entry) {
                if (m.direction === 'inbound') entry.inbound++;
                else entry.outbound++;
            }
        });

        const messageVolume = Array.from(volumeMap.values());

        return {
            shop,
            stats: {
                totalMessages: messageCount,
                totalContacts: contactCount,
                totalTemplates: templateCount,
                contactGrowth,
                newContacts
            },
            campaignFunnel: {
                sent: globalSent,
                delivered: globalDelivered,
                read: globalRead,
                failed: globalFailed
            },
            recentCampaigns,
            messageVolume
        };
    }

    async updateShopDetails(shopId: string, data: any) {
        if (!shopId) {
            throw new BadRequestException('Shop ID is required');
        }
        const { shopName, phone } = data;
        return this.prisma.shop.update({
            where: { id: shopId },
            data: { shopName, phone },
        });
    }

    async getWhatsAppCredentials(shopId: string) {
        if (!shopId) {
            this.logger.warn('getWhatsAppCredentials called without shopId');
            return null;
        }
        // Return from the new multi-tenant model
        const account = await this.prisma.whatsAppBusinessAccount.findFirst({
            where: { shopId, status: 'active' },
            include: { phoneNumbers: true },
        });

        if (!account) return null;

        return {
            id: account.id,
            businessAccountId: account.businessAccountId,
            wabaId: account.wabaId,
            businessName: account.businessName,
            phoneNumberId: account.phoneNumbers.find(p => p.isDefault)?.phoneNumberId || account.phoneNumbers[0]?.phoneNumberId,
            status: account.status,
            tokenType: account.tokenType,
            tokenExpiry: account.tokenExpiry,
            onboardingSource: account.onboardingSource,
            phoneNumbers: account.phoneNumbers,
        };
    }

    async updateWhatsAppCredentials(shopId: string, data: any) {
        if (!shopId) {
            throw new BadRequestException('Shop ID is required');
        }
        const { businessAccountId, phoneNumberId, accessToken } = data;

        // Encrypt the token before storing
        const encryptedToken = this.cryptoService.encrypt(accessToken);

        // Upsert into the new model
        const account = await this.prisma.whatsAppBusinessAccount.upsert({
            where: {
                id: await this.getExistingAccountId(shopId) || 'new-record',
            },
            create: {
                shopId,
                businessAccountId,
                accessToken: encryptedToken,
                status: 'active',
                onboardingSource: 'manual',
            },
            update: {
                businessAccountId,
                accessToken: encryptedToken,
            },
        });

        // Upsert the phone number
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
                    wabaAccountId: account.id,
                    isDefault: true,
                    status: 'active',
                },
            });
        }

        return account;
    }

    private async getExistingAccountId(shopId: string): Promise<string | null> {
        if (!shopId) return null;
        const existing = await this.prisma.whatsAppBusinessAccount.findFirst({
            where: { shopId },
        });
        return existing?.id || null;
    }
}
