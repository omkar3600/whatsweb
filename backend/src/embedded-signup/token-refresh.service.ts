import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { CryptoService } from '../common/services/crypto.service';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class TokenRefreshService {
    private readonly logger = new Logger(TokenRefreshService.name);
    private readonly graphApiBase = `https://graph.facebook.com/${process.env.META_API_VERSION || 'v18.0'}`;

    constructor(
        private prisma: PrismaService,
        private httpService: HttpService,
        private cryptoService: CryptoService,
    ) { }

    /**
     * Runs daily at 2:00 AM UTC.
     * Finds tokens expiring within 7 days and attempts to refresh them.
     */
    @Cron('0 2 * * *')
    async handleTokenRefresh() {
        this.logger.log('Starting scheduled token refresh check...');

        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        const expiringAccounts = await this.prisma.whatsAppBusinessAccount.findMany({
            where: {
                status: 'active',
                tokenExpiry: {
                    lte: sevenDaysFromNow,
                    gt: new Date(), // Not yet expired
                },
            },
            include: { shop: true },
        });

        this.logger.log(`Found ${expiringAccounts.length} accounts with tokens expiring within 7 days`);

        for (const account of expiringAccounts) {
            try {
                await this.refreshToken(account);
                this.logger.log(`Successfully refreshed token for WABA ${account.wabaId || account.businessAccountId} (shop: ${account.shop.shopName})`);
            } catch (error) {
                this.logger.error(`Failed to refresh token for WABA ${account.wabaId || account.businessAccountId}: ${error.message}`);
            }
        }

        // Also check for already expired tokens and mark them
        const expiredAccounts = await this.prisma.whatsAppBusinessAccount.findMany({
            where: {
                status: 'active',
                tokenExpiry: { lte: new Date() },
            },
        });

        for (const account of expiredAccounts) {
            await this.prisma.whatsAppBusinessAccount.update({
                where: { id: account.id },
                data: { status: 'token_expired' },
            });
            this.logger.warn(`Marked WABA ${account.wabaId || account.businessAccountId} as token_expired`);
        }

        this.logger.log('Token refresh check completed');
    }

    /**
     * Attempts to exchange a current token for a fresh long-lived token.
     */
    private async refreshToken(account: any): Promise<void> {
        const appId = process.env.META_APP_ID;
        const appSecret = process.env.META_APP_SECRET;

        if (!appId || !appSecret) {
            throw new Error('META_APP_ID and META_APP_SECRET are required for token refresh');
        }

        // Decrypt current token
        const currentToken = this.cryptoService.decrypt(account.accessToken);

        // Exchange for a new long-lived token
        const url = `${this.graphApiBase}/oauth/access_token`;
        const response = await firstValueFrom(
            this.httpService.get(url, {
                params: {
                    grant_type: 'fb_exchange_token',
                    client_id: appId,
                    client_secret: appSecret,
                    fb_exchange_token: currentToken,
                },
            }),
        );

        if (!response.data?.access_token) {
            throw new Error('Token refresh returned no access token');
        }

        const newToken = response.data.access_token;
        const encryptedToken = this.cryptoService.encrypt(newToken);

        // Get new expiry via debug_token
        let tokenExpiry: Date | null = null;
        try {
            const debugResp = await firstValueFrom(
                this.httpService.get(`${this.graphApiBase}/debug_token`, {
                    params: {
                        input_token: newToken,
                        access_token: `${appId}|${appSecret}`,
                    },
                }),
            );
            if (debugResp.data?.data?.expires_at) {
                tokenExpiry = new Date(debugResp.data.data.expires_at * 1000);
            }
        } catch (e) {
            this.logger.warn('Could not debug new token for expiry info');
        }

        // Update the record
        await this.prisma.whatsAppBusinessAccount.update({
            where: { id: account.id },
            data: {
                accessToken: encryptedToken,
                tokenExpiry: tokenExpiry,
                status: 'active',
            },
        });
    }

    /**
     * Periodic health check — runs every 6 hours.
     * Updates phone number quality ratings and messaging limits.
     */
    @Cron('0 */6 * * *')
    async handleHealthCheck() {
        this.logger.log('Starting periodic health check...');

        const activeAccounts = await this.prisma.whatsAppBusinessAccount.findMany({
            where: { status: 'active' },
            include: { phoneNumbers: true },
        });

        for (const account of activeAccounts) {
            try {
                const token = this.cryptoService.decrypt(account.accessToken);
                const wabaId = account.wabaId || account.businessAccountId;

                // Fetch latest phone number data
                const response = await firstValueFrom(
                    this.httpService.get(`${this.graphApiBase}/${wabaId}/phone_numbers`, {
                        params: {
                            access_token: token,
                            fields: 'id,display_phone_number,verified_name,quality_rating,messaging_limit_tier',
                        },
                    }),
                );

                const phoneNumbers = response.data?.data || [];
                for (const pn of phoneNumbers) {
                    await this.prisma.whatsAppPhoneNumber.updateMany({
                        where: { phoneNumberId: String(pn.id) },
                        data: {
                            qualityRating: pn.quality_rating,
                            messagingLimit: pn.messaging_limit_tier,
                            verifiedName: pn.verified_name,
                            displayPhoneNumber: pn.display_phone_number,
                        },
                    });
                }
            } catch (error) {
                this.logger.warn(`Health check failed for WABA ${account.wabaId}: ${error.message}`);
                // If it's an auth error, the token might be invalid
                if (error?.response?.status === 401 || error?.response?.data?.error?.code === 190) {
                    await this.prisma.whatsAppBusinessAccount.update({
                        where: { id: account.id },
                        data: { status: 'token_expired' },
                    });
                    this.logger.warn(`Marked WABA ${account.wabaId} as token_expired due to auth failure`);
                }
            }
        }

        this.logger.log('Health check completed');
    }
}
