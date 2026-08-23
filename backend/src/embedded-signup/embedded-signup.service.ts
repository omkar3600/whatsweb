import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { CryptoService } from '../common/services/crypto.service';
import { firstValueFrom } from 'rxjs';
import { createHmac } from 'crypto';

@Injectable()
export class EmbeddedSignupService {
    private readonly logger = new Logger(EmbeddedSignupService.name);
    private readonly graphApiBase = `https://graph.facebook.com/${process.env.META_API_VERSION || 'v18.0'}`;

    constructor(
        private prisma: PrismaService,
        private httpService: HttpService,
        private cryptoService: CryptoService,
    ) { }

    /**
     * Returns the Meta App configuration for the frontend Embedded Signup popup.
     */
    getConfig() {
        const appId = process.env.META_APP_ID;
        const configId = process.env.META_CONFIG_ID;

        if (!appId || !configId) {
            throw new BadRequestException('Meta Embedded Signup is not configured. Set META_APP_ID and META_CONFIG_ID.');
        }

        return {
            appId,
            configId,
            scopes: 'whatsapp_business_management,whatsapp_business_messaging',
        };
    }

    /**
     * Main OAuth flow: exchange code → get token → fetch WABA details → store everything.
     */
    async processCallback(userId: string, code: string, sessionInfo?: Record<string, any>, redirectUri?: string) {
        const shop = await this.prisma.shop.findUnique({ where: { ownerId: userId } });
        if (!shop) throw new NotFoundException('Shop not found');

        // Log: signup started
        await this.logOnboardingEvent(shop.id, 'signup_started', { sessionInfo });

        try {
            // Step 1: Exchange authorization code for access token
            const tokenData = await this.exchangeCodeForToken(code, redirectUri);
            await this.logOnboardingEvent(shop.id, 'token_exchanged', {
                tokenType: tokenData.token_type,
            });

            const accessToken = tokenData.access_token;

            // Step 2: Debug token to get expiry info
            let tokenExpiry: Date | null = null;
            try {
                const debugData = await this.debugToken(accessToken);
                if (debugData?.data?.expires_at) {
                    tokenExpiry = new Date(debugData.data.expires_at * 1000);
                }
            } catch (e) {
                this.logger.warn('Failed to debug token for expiry info — continuing without expiry date');
            }

            // Step 3: Extract WABA ID and phone number ID from session info or API
            let wabaId: string | undefined;
            let phoneNumberId: string | undefined;

            if (sessionInfo?.waba_id) {
                wabaId = String(sessionInfo.waba_id);
                phoneNumberId = sessionInfo.phone_number_id ? String(sessionInfo.phone_number_id) : undefined;
                this.logger.log(`Got WABA ID ${wabaId} and phone ${phoneNumberId} from session info`);
            }

            // If no session info, try to discover via the debug_token response
            if (!wabaId) {
                const debugData = await this.debugToken(accessToken);
                const granularScopes = debugData?.data?.granular_scopes || [];
                for (const scope of granularScopes) {
                    if (scope.scope === 'whatsapp_business_management' && scope.target_ids?.length > 0) {
                        wabaId = String(scope.target_ids[0]);
                        break;
                    }
                }
            }

            if (!wabaId) {
                // Last resort: try fetching owned WABAs
                const wabaData = await this.fetchOwnedWabas(accessToken);
                if (wabaData?.length > 0) {
                    wabaId = String(wabaData[0].id);
                }
            }

            if (!wabaId) {
                await this.logOnboardingEvent(shop.id, 'failed', { error: 'Could not determine WABA ID' });
                throw new BadRequestException('Could not determine your WhatsApp Business Account ID. Please try again.');
            }

            await this.logOnboardingEvent(shop.id, 'waba_retrieved', { wabaId });

            // Step 4: Get WABA details
            let businessName: string | undefined;
            let businessId: string | undefined;
            try {
                const wabaDetails = await this.fetchWabaDetails(wabaId, accessToken);
                businessName = wabaDetails?.name;
                businessId = wabaDetails?.business?.id || wabaDetails?.owner_business_info?.id;
            } catch (e) {
                this.logger.warn(`Failed to fetch WABA details: ${e.message}`);
            }

            // Step 5: Get phone numbers for this WABA
            const phoneNumbers = await this.fetchPhoneNumbers(wabaId, accessToken);
            await this.logOnboardingEvent(shop.id, 'phone_retrieved', {
                count: phoneNumbers.length,
                numbers: phoneNumbers.map(p => p.display_phone_number),
            });

            // Step 6: Encrypt and store
            const encryptedToken = this.cryptoService.encrypt(accessToken);

            // Find existing account to get the UUID id for the upsert
            const existingAccount = await this.prisma.whatsAppBusinessAccount.findFirst({
                where: { wabaId: wabaId, shopId: shop.id }
            });

            let wabaAccount;
            if (existingAccount) {
                wabaAccount = await this.prisma.whatsAppBusinessAccount.update({
                    where: { id: existingAccount.id },
                    data: {
                        accessToken: encryptedToken,
                        tokenExpiry: tokenExpiry,
                        status: 'active',
                        businessName: businessName,
                    },
                });
            } else {
                wabaAccount = await this.prisma.whatsAppBusinessAccount.create({
                    data: {
                        shopId: shop.id,
                        businessAccountId: businessId || wabaId,
                        wabaId: wabaId,
                        businessName: businessName,
                        accessToken: encryptedToken,
                        tokenType: 'long_lived',
                        tokenExpiry: tokenExpiry,
                        status: 'active',
                        onboardingSource: 'embedded_signup',
                    },
                });
            }

            // Upsert phone numbers
            for (const phone of phoneNumbers) {
                await this.prisma.whatsAppPhoneNumber.upsert({
                    where: { phoneNumberId: String(phone.id) },
                    create: {
                        shopId: shop.id,
                        wabaAccountId: wabaAccount.id,
                        phoneNumberId: String(phone.id),
                        displayPhoneNumber: phone.display_phone_number,
                        verifiedName: phone.verified_name,
                        qualityRating: phone.quality_rating,
                        messagingLimit: phone.messaging_limit_tier,
                        status: 'active',
                        isDefault: phoneNumbers.indexOf(phone) === 0,
                    },
                    update: {
                        wabaAccountId: wabaAccount.id,
                        isDefault: phoneNumbers.indexOf(phone) === 0,
                        displayPhoneNumber: phone.display_phone_number,
                        verifiedName: phone.verified_name,
                        qualityRating: phone.quality_rating,
                        messagingLimit: phone.messaging_limit_tier,
                        status: 'active',
                    },
                });
            }

            // Step 7: Subscribe WABA to webhooks
            try {
                await this.subscribeToWebhooks(wabaId, accessToken, businessId);
                await this.logOnboardingEvent(shop.id, 'webhook_subscribed', { wabaId });
            } catch (e) {
                this.logger.error(`Failed to subscribe to webhooks: ${e.message}`);
                // Don't fail the entire flow for this — admin can do it manually
            }

            // Step 8: Register phone number for messaging (if not already)
            if (phoneNumberId || phoneNumbers[0]?.id) {
                const pnId = phoneNumberId || String(phoneNumbers[0].id);
                try {
                    await this.registerPhoneNumber(pnId, accessToken);
                } catch (e) {
                    this.logger.warn(`Phone number registration returned: ${e.message} — may already be registered`);
                }
            }

            // Log: completed
            await this.logOnboardingEvent(shop.id, 'completed', {
                wabaId,
                phoneNumbers: phoneNumbers.map(p => p.display_phone_number),
                businessName,
            });

            return {
                success: true,
                message: 'WhatsApp Business Account connected successfully',
                wabaAccount: {
                    id: wabaAccount.id,
                    businessName: businessName,
                    wabaId: wabaId,
                    status: 'active',
                },
                phoneNumbers: phoneNumbers.map(p => ({
                    phoneNumberId: String(p.id),
                    displayPhoneNumber: p.display_phone_number,
                    verifiedName: p.verified_name,
                    qualityRating: p.quality_rating,
                })),
            };
        } catch (error: any) {
            const metaApiError = error.response?.data || error.message;
            this.logger.error(`Embedded signup failed for shop ${shop.id}:`, JSON.stringify(metaApiError));
            
            await this.logOnboardingEvent(shop.id, 'failed', {
                error: metaApiError,
                stack: error.stack,
            });

            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            throw new BadRequestException(`Failed to connect WhatsApp. Meta API Error: ${JSON.stringify(metaApiError)}`);
        }
    }

    /**
     * Returns connection status for all WABAs belonging to this user's shop.
     */
    async getConnectionStatus(userId: string) {
        const shop = await this.prisma.shop.findUnique({ where: { ownerId: userId } });
        if (!shop) throw new NotFoundException('Shop not found');

        const accounts = await this.prisma.whatsAppBusinessAccount.findMany({
            where: { shopId: shop.id },
            include: { phoneNumbers: true },
            orderBy: { createdAt: 'desc' },
        });

        const result = accounts.map(account => {
            // Determine token health
            let tokenHealth = 'valid';
            if (account.tokenExpiry) {
                const now = new Date();
                const daysUntilExpiry = (account.tokenExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
                if (daysUntilExpiry <= 0) {
                    tokenHealth = 'expired';
                } else if (daysUntilExpiry <= 7) {
                    tokenHealth = 'expiring_soon';
                }
            }

            return {
                id: account.id,
                wabaId: account.wabaId || account.businessAccountId,
                businessName: account.businessName,
                status: account.status,
                tokenHealth,
                tokenExpiry: account.tokenExpiry,
                onboardingSource: account.onboardingSource,
                createdAt: account.createdAt,
                phoneNumbers: account.phoneNumbers.map(pn => ({
                    id: pn.id,
                    phoneNumberId: pn.phoneNumberId,
                    displayPhoneNumber: pn.displayPhoneNumber,
                    verifiedName: pn.verifiedName,
                    qualityRating: pn.qualityRating,
                    messagingLimit: pn.messagingLimit,
                    status: pn.status,
                    isDefault: pn.isDefault,
                })),
            };
        });

        return {
            shopId: shop.id,
            isConnected: result.some(a => a.status === 'active'),
            accounts: result,
        };
    }

    /**
     * Soft-disconnects a WABA (sets status to 'disconnected').
     */
    async disconnectWaba(userId: string, wabaAccountId: string) {
        const shop = await this.prisma.shop.findUnique({ where: { ownerId: userId } });
        if (!shop) throw new NotFoundException('Shop not found');

        const account = await this.prisma.whatsAppBusinessAccount.findFirst({
            where: { id: wabaAccountId, shopId: shop.id },
        });
        if (!account) throw new NotFoundException('WhatsApp Business Account not found');

        await this.prisma.whatsAppBusinessAccount.update({
            where: { id: wabaAccountId },
            data: { status: 'disconnected' },
        });

        // Also deactivate associated phone numbers
        await this.prisma.whatsAppPhoneNumber.updateMany({
            where: { wabaAccountId },
            data: { status: 'inactive' },
        });

        await this.logOnboardingEvent(shop.id, 'disconnected', { wabaAccountId });

        return { success: true, message: 'WhatsApp Business Account disconnected' };
    }

    /**
     * Re-initiates OAuth for an existing WABA, updating the token.
     */
    async reconnectWaba(userId: string, wabaAccountId: string, code: string, redirectUri?: string) {
        const shop = await this.prisma.shop.findUnique({ where: { ownerId: userId } });
        if (!shop) throw new NotFoundException('Shop not found');

        const account = await this.prisma.whatsAppBusinessAccount.findFirst({
            where: { id: wabaAccountId, shopId: shop.id },
        });
        if (!account) throw new NotFoundException('WhatsApp Business Account not found');

        // Exchange new code for token
        const tokenData = await this.exchangeCodeForToken(code, redirectUri);
        const encryptedToken = this.cryptoService.encrypt(tokenData.access_token);

        // Debug token for expiry
        let tokenExpiry: Date | null = null;
        try {
            const debugData = await this.debugToken(tokenData.access_token);
            if (debugData?.data?.expires_at) {
                tokenExpiry = new Date(debugData.data.expires_at * 1000);
            }
        } catch (e) {
            this.logger.warn('Failed to debug token for expiry');
        }

        // Update the account
        await this.prisma.whatsAppBusinessAccount.update({
            where: { id: wabaAccountId },
            data: {
                accessToken: encryptedToken,
                tokenExpiry,
                status: 'active',
            },
        });

        // Reactivate phone numbers
        await this.prisma.whatsAppPhoneNumber.updateMany({
            where: { wabaAccountId },
            data: { status: 'active' },
        });

        // Re-subscribe to webhooks
        const wabaId = account.wabaId || account.businessAccountId;
        try {
            await this.subscribeToWebhooks(wabaId, tokenData.access_token);
        } catch (e) {
            this.logger.warn(`Failed to re-subscribe to webhooks: ${e.message}`);
        }

        await this.logOnboardingEvent(shop.id, 'reconnected', { wabaAccountId });

        return { success: true, message: 'WhatsApp Business Account reconnected successfully' };
    }

    async syncWebhooks(userId: string, wabaAccountId: string) {
        const shop = await this.prisma.shop.findUnique({ where: { ownerId: userId } });
        if (!shop) throw new NotFoundException('Shop not found');

        const account = await this.prisma.whatsAppBusinessAccount.findFirst({
            where: {
                OR: [
                    { id: wabaAccountId },
                    { wabaId: wabaAccountId },
                    { businessAccountId: wabaAccountId },
                ],
                shopId: shop.id,
            },
            include: { phoneNumbers: true },
        });
        if (!account) throw new NotFoundException('WhatsApp Business Account not found');

        const accessToken = this.cryptoService.decrypt(account.accessToken);
        const wabaId = account.wabaId || account.businessAccountId;

        try {
            await this.subscribeToWebhooks(wabaId, accessToken, account.businessAccountId);
            
            // Also ensure all linked phone numbers are registered with Meta Cloud API
            for (const phone of account.phoneNumbers || []) {
                try {
                    await this.registerPhoneNumber(phone.phoneNumberId, accessToken);
                } catch (pe: any) {
                    this.logger.warn(`Phone registration for ${phone.phoneNumberId} returned: ${pe.message}`);
                }
            }

            await this.logOnboardingEvent(shop.id, 'webhook_resubscribed', { wabaId });
            return { success: true, message: `Successfully subscribed WABA ${wabaId} and registered phone numbers with Meta` };
        } catch (err: any) {
            const metaError = err.response?.data?.error?.message || err.message || 'Failed to subscribe to Meta webhooks';
            this.logger.error(`Failed to subscribe WABA ${wabaId} to webhooks: ${metaError}`);
            throw new BadRequestException(`Meta API Error: ${metaError}`);
        }
    }

    // ─── Private Helper Methods ────────────────────────────────────────────

    private async exchangeCodeForToken(code: string, redirectUri?: string): Promise<any> {
        const appId = process.env.META_APP_ID;
        const appSecret = process.env.META_APP_SECRET;

        if (!appId || !appSecret) {
            throw new BadRequestException('META_APP_ID and META_APP_SECRET must be configured');
        }

        const url = `${this.graphApiBase}/oauth/access_token`;
        const response = await firstValueFrom(
            this.httpService.get(url, {
                params: {
                    client_id: appId,
                    client_secret: appSecret,
                    code: code,
                    redirect_uri: redirectUri || '',
                },
            }),
        );

        if (!response.data?.access_token) {
            throw new BadRequestException('Failed to exchange code for access token');
        }

        this.logger.log('Successfully exchanged authorization code for access token');
        return response.data;
    }

    private async debugToken(accessToken: string): Promise<any> {
        const appId = process.env.META_APP_ID;
        const appSecret = process.env.META_APP_SECRET;
        const url = `${this.graphApiBase}/debug_token`;

        const response = await firstValueFrom(
            this.httpService.get(url, {
                params: {
                    input_token: accessToken,
                    access_token: `${appId}|${appSecret}`,
                },
            }),
        );

        return response.data;
    }

    private getAppSecretProof(accessToken: string): string | undefined {
        const appSecret = process.env.META_APP_SECRET;
        if (!appSecret) return undefined;
        return createHmac('sha256', appSecret).update(accessToken).digest('hex');
    }

    private async fetchOwnedWabas(accessToken: string): Promise<any[]> {
        try {
            const proof = this.getAppSecretProof(accessToken);
            // Try getting business info first
            const meResp = await firstValueFrom(
                this.httpService.get(`${this.graphApiBase}/me`, {
                    params: { access_token: accessToken, appsecret_proof: proof, fields: 'id,name' },
                }),
            );

            // Then get owned WABAs via the business
            const businessId = meResp.data.id;
            const wabaResp = await firstValueFrom(
                this.httpService.get(`${this.graphApiBase}/${businessId}/owned_whatsapp_business_accounts`, {
                    params: { access_token: accessToken, appsecret_proof: proof },
                }),
            );

            return wabaResp.data?.data || [];
        } catch (e) {
            this.logger.warn(`Failed to fetch owned WABAs: ${e.message}`);
            return [];
        }
    }

    private async fetchWabaDetails(wabaId: string, accessToken: string): Promise<any> {
        const proof = this.getAppSecretProof(accessToken);
        const response = await firstValueFrom(
            this.httpService.get(`${this.graphApiBase}/${wabaId}`, {
                params: {
                    access_token: accessToken,
                    appsecret_proof: proof,
                    fields: 'id,name,currency,timezone_id,business,owner_business_info,message_template_namespace',
                },
            }),
        );
        return response.data;
    }

    private async fetchPhoneNumbers(wabaId: string, accessToken: string): Promise<any[]> {
        const proof = this.getAppSecretProof(accessToken);
        const response = await firstValueFrom(
            this.httpService.get(`${this.graphApiBase}/${wabaId}/phone_numbers`, {
                params: {
                    access_token: accessToken,
                    appsecret_proof: proof,
                    fields: 'id,display_phone_number,verified_name,quality_rating,messaging_limit_tier,code_verification_status',
                },
            }),
        );
        return response.data?.data || [];
    }

    private async subscribeToWebhooks(wabaId: string, accessToken: string, altId?: string): Promise<void> {
        const proof = this.getAppSecretProof(accessToken);
        const candidateIds = Array.from(new Set([wabaId, altId].filter(Boolean))) as string[];

        let lastError: any = null;
        for (const targetId of candidateIds) {
            try {
                await firstValueFrom(
                    this.httpService.post(
                        `${this.graphApiBase}/${targetId}/subscribed_apps`,
                        null,
                        {
                            params: { access_token: accessToken, appsecret_proof: proof },
                        },
                    ),
                );
                this.logger.log(`Successfully subscribed target ID ${targetId} to webhooks`);
                return;
            } catch (err: any) {
                lastError = err;
                this.logger.warn(`Failed to subscribe target ID ${targetId} to webhooks: ${err.response?.data?.error?.message || err.message}`);
            }
        }

        if (lastError) {
            throw lastError;
        }
    }

    private async registerPhoneNumber(phoneNumberId: string, accessToken: string): Promise<void> {
        const proof = this.getAppSecretProof(accessToken);
        await firstValueFrom(
            this.httpService.post(
                `${this.graphApiBase}/${phoneNumberId}/register`,
                { messaging_product: 'whatsapp', pin: require('crypto').randomInt(100000, 999999).toString() },
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    params: { appsecret_proof: proof },
                },
            ),
        );
        this.logger.log(`Registered phone number ${phoneNumberId} for messaging`);
    }

    private async logOnboardingEvent(shopId: string, eventType: string, metadata?: any): Promise<void> {
        try {
            await this.prisma.onboardingEvent.create({
                data: { shopId, eventType, metadata },
            });
        } catch (e) {
            this.logger.error(`Failed to log onboarding event: ${e.message}`);
        }
    }

    async getOnboardingLogs(userId: string) {
        const shop = await this.prisma.shop.findUnique({ where: { ownerId: userId } });
        if (!shop) throw new NotFoundException('Shop not found');
        return this.prisma.onboardingEvent.findMany({
            where: { shopId: shop.id },
            orderBy: { createdAt: 'desc' },
            take: 20
        });
    }
}
