import { Controller, Get, Post, Query, Body, HttpCode, HttpStatus, Logger, Req, UseGuards } from '@nestjs/common';
import { WhatsappService } from '../whatsapp.service';
import { SkipThrottle } from '@nestjs/throttler';
import { WebhookSignatureGuard } from '../../common/guards/webhook-signature.guard';

@SkipThrottle()
@Controller(['webhooks/whatsapp', 'api/webhooks/whatsapp'])
export class WebhooksController {
    private readonly logger = new Logger(WebhooksController.name);

    constructor(private readonly whatsappService: WhatsappService) { }

    /**
     * Meta webhook verification endpoint.
     * Called by Meta when setting up the webhook URL.
     */
    @Get()
    verifyWebhook(
        @Query('hub.mode') mode: string,
        @Query('hub.verify_token') token: string,
        @Query('hub.challenge') challenge: string,
    ) {
        this.logger.log('Webhook verification request received');
        return this.whatsappService.verifyWebhook(mode, token, challenge);
    }

    /**
     * Main webhook event handler.
     * Receives events from ALL tenants via a single endpoint.
     * Always responds 200 OK immediately (Meta requirement).
     * Signature verification via WebhookSignatureGuard.
     */
    @Post()
    @HttpCode(HttpStatus.OK)
    @UseGuards(WebhookSignatureGuard)
    async handleWebhook(
        @Body() body: any,
        @Req() req: any,
    ) {
        this.logger.log('Webhook event received');
        this.logger.debug(`Webhook body: ${JSON.stringify(body)}`);

        // Process asynchronously — don't block the response to Meta
        this.whatsappService.processWebhookEvent(body).catch(error => {
            this.logger.error(`Error processing webhook: ${error.message}`);
        });

        return { status: 'ok' };
    }
}
