import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { CryptoService } from '../common/services/crypto.service';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class TemplatesService {
    private readonly logger = new Logger(TemplatesService.name);
    private readonly graphApiBase = `https://graph.facebook.com/${process.env.META_API_VERSION || 'v18.0'}`;

    constructor(
        private prisma: PrismaService,
        private httpService: HttpService,
        private cryptoService: CryptoService,
    ) { }

    private async getCredentials(shopId: string) {
        const account = await this.prisma.whatsAppBusinessAccount.findFirst({
            where: { shopId, status: 'active' },
        });

        if (!account) {
            throw new BadRequestException('WhatsApp credentials not found. Please configure them in Settings or connect via Embedded Signup.');
        }

        return {
            accessToken: this.cryptoService.decrypt(account.accessToken),
            businessAccountId: account.wabaId || account.businessAccountId,
        };
    }

    async createTemplate(shopId: string, data: any) {
        const { templateName, category, language, components } = data;
        const creds = await this.getCredentials(shopId);

        // Pre-flight validation for examples
        const bodyComponent = components.find((c: any) => c.type === 'BODY');
        if (bodyComponent && bodyComponent.text) {
            // Match {{1}}, {{2}}, etc. (but only unique numbers to count variables)
            const varMatches = bodyComponent.text.match(/{{\d+}}/g);
            if (varMatches && varMatches.length > 0) {
                const uniqueVars = new Set(varMatches).size;
                if (!bodyComponent.example || !bodyComponent.example.body_text || !bodyComponent.example.body_text[0] || bodyComponent.example.body_text[0].length !== uniqueVars) {
                    throw new BadRequestException(`Missing or incomplete sample values for variables. Expected ${uniqueVars} samples.`);
                }
            }
        }

        this.logger.log(`Submitting template "${templateName}" to Meta for shop ${shopId}`);

        const url = `${this.graphApiBase}/${creds.businessAccountId}/message_templates`;

        try {
            const metaPayload = { name: templateName, category, language, components };
            this.logger.log(`[Template] Sending to Meta: ${JSON.stringify(metaPayload)}`);
            const metaResponse = await firstValueFrom(
                this.httpService.post(url, metaPayload, {
                    headers: {
                        Authorization: `Bearer ${creds.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                })
            );

            this.logger.log(`Meta response for "${templateName}":`, metaResponse.data);

            return await this.prisma.template.create({
                data: {
                    shopId,
                    templateName,
                    category,
                    language,
                    components,
                    status: 'pending',
                },
            });
        } catch (error) {
            const errorData = error.response?.data?.error;
            const errorMsg = errorData?.message || error.message;
            this.logger.error(`[Template Meta Error] Shop ${shopId}, Template "${templateName}": ${JSON.stringify(errorData || error.message)}`);
            throw new BadRequestException(`Meta API Error: ${errorMsg}`);
        }
    }

    async syncTemplates(shopId: string) {
        const creds = await this.getCredentials(shopId);

        const url = `${this.graphApiBase}/${creds.businessAccountId}/message_templates`;

        try {
            const response = await firstValueFrom(
                this.httpService.get(url, {
                    headers: { Authorization: `Bearer ${creds.accessToken}` }
                })
            );

            const metaTemplates = response.data.data;
            let updated = 0;
            let imported = 0;

            for (const mt of metaTemplates) {
                const existing = await this.prisma.template.findFirst({
                    where: {
                        shopId,
                        templateName: mt.name,
                        language: mt.language
                    }
                });

                if (existing) {
                    await this.prisma.template.update({
                        where: { id: existing.id },
                        data: { status: mt.status.toLowerCase() }
                    });
                    updated++;
                } else {
                    await this.prisma.template.create({
                        data: {
                            shopId,
                            templateName: mt.name,
                            category: mt.category,
                            language: mt.language,
                            components: mt.components,
                            status: mt.status.toLowerCase()
                        }
                    });
                    imported++;
                }
            }

            return { message: 'Templates synced successfully', updated, imported };
        } catch (error) {
            const errorMsg = error.response?.data?.error?.message || error.message;
            this.logger.error('Failed to sync templates from Meta:', errorMsg);
            throw new BadRequestException(`Sync failed: ${errorMsg}`);
        }
    }

    async getTemplates(shopId: string, page?: number, limit?: number) {
        const take = limit || 50;
        const pageNum = page && page > 0 ? page : 1;
        const skip = (pageNum - 1) * take;

        const [data, total] = await Promise.all([
            this.prisma.template.findMany({
                where: { shopId },
                orderBy: { createdAt: 'desc' },
                take,
                skip,
            }),
            this.prisma.template.count({ where: { shopId } })
        ]);

        return {
            data,
            total,
            page: pageNum,
            totalPages: Math.ceil(total / take),
            hasMore: pageNum * take < total,
        };
    }

    async deleteTemplate(shopId: string, id: string) {
        const template = await this.prisma.template.findFirst({
            where: { id, shopId }
        });

        if (!template) {
            throw new NotFoundException('Template not found');
        }

        const activeCampaign = await this.prisma.campaign.findFirst({
            where: { templateId: id, status: { in: ['processing', 'scheduled'] } }
        });
        if (activeCampaign) {
            throw new BadRequestException(`Cannot delete template because campaign "${activeCampaign.name}" is currently ${activeCampaign.status}. Please abort the campaign first.`);
        }

        // Delete from Meta
        try {
            const creds = await this.getCredentials(shopId);
            const url = `${this.graphApiBase}/${creds.businessAccountId}/message_templates`;
            await firstValueFrom(
                this.httpService.delete(url, {
                    params: { name: template.templateName },
                    headers: { Authorization: `Bearer ${creds.accessToken}` }
                })
            );
            this.logger.log(`Deleted template "${template.templateName}" from Meta for shop ${shopId}`);
        } catch (error) {
            const errorMsg = error.response?.data?.error?.message || error.message;
            this.logger.warn(`Failed to delete template "${template.templateName}" from Meta: ${errorMsg}`);
        }

        // Delete locally
        try {
            const deletedCampaigns = await this.prisma.campaign.deleteMany({ where: { templateId: id } });
            if (deletedCampaigns.count > 0) {
                this.logger.log(`Deleted ${deletedCampaigns.count} campaign(s) linked to template ${id}`);
            }
            await this.prisma.template.delete({ where: { id } });
            return { message: 'Template deleted' };
        } catch (error) {
            this.logger.error(`Failed to delete template ${id} locally: ${error.message}`);
            throw new BadRequestException('Failed to delete template from local database');
        }
    }

    async uploadTemplateMedia(shopId: string, file: any) {
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
            
            return { handle: uploadRes.data.h };
        } catch (error: any) {
            const errorMsg = error.response?.data?.error?.message || error.message;
            this.logger.error(`Failed to upload template media sample: ${errorMsg}`);
            throw new BadRequestException(`Media upload failed: ${errorMsg}`);
        }
    }

    async uploadTemplateMediaFromUrl(shopId: string, fileUrl: string) {
        const creds = await this.getCredentials(shopId);
        try {
            // Download the file into memory
            const fileResp = await firstValueFrom(
                this.httpService.get(fileUrl, { responseType: 'arraybuffer' })
            );
            const buffer = Buffer.from(fileResp.data);
            const size = buffer.length;
            const mimetype = fileResp.headers['content-type'] || 'application/octet-stream';

            // Step 1: Create resumable upload session
            const sessionRes = await firstValueFrom(
                this.httpService.post(`${this.graphApiBase}/app/uploads?file_length=${size}&file_type=${mimetype}`, {}, {
                    headers: { Authorization: `Bearer ${creds.accessToken}` }
                })
            );
            const sessionId = sessionRes.data.id;

            // Step 2: Upload file bytes
            const uploadRes = await firstValueFrom(
                this.httpService.post(`${this.graphApiBase}/${sessionId}`, buffer, {
                    headers: {
                        'Authorization': `OAuth ${creds.accessToken}`,
                        'file_offset': '0',
                        'Content-Type': 'application/octet-stream'
                    }
                })
            );
            
            return { handle: uploadRes.data.h };
        } catch (error: any) {
            const errorMsg = error.response?.data?.error?.message || error.message;
            this.logger.error(`Failed to upload template media sample from URL: ${errorMsg}`);
            throw new BadRequestException(`Media upload failed: ${errorMsg}`);
        }
    }
}
