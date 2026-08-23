import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { Request } from 'express';

@Injectable()
export class WebhookSignatureGuard implements CanActivate {
    private readonly logger = new Logger(WebhookSignatureGuard.name);

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request>();
        const signature = request.headers['x-hub-signature-256'] as string;

        const appSecret = process.env.META_APP_SECRET;
        if (!appSecret) {
            this.logger.warn('META_APP_SECRET not configured — skipping webhook signature verification');
            return true; // Allow if not configured (dev mode)
        }

        if (!signature) {
            this.logger.warn('Missing x-hub-signature-256 header on webhook request');
            throw new UnauthorizedException('Missing webhook signature');
        }

        const rawBody = (request as any).rawBody;
        if (!rawBody) {
            this.logger.warn('Raw body not available for signature verification');
            throw new UnauthorizedException('Cannot verify webhook signature — raw body missing');
        }

        const expectedSignature = 'sha256=' + createHmac('sha256', appSecret)
            .update(rawBody)
            .digest('hex');

        const sigBuffer = Buffer.from(signature);
        const expectedBuffer = Buffer.from(expectedSignature);

        if (sigBuffer.length !== expectedBuffer.length) {
            this.logger.warn('Webhook signature length mismatch');
            throw new UnauthorizedException('Invalid webhook signature');
        }

        if (!timingSafeEqual(sigBuffer, expectedBuffer)) {
            this.logger.warn('Webhook signature verification failed');
            throw new UnauthorizedException('Invalid webhook signature');
        }

        return true;
    }
}
