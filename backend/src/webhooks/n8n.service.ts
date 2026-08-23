import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class N8nWebhookService {
  private readonly logger = new Logger(N8nWebhookService.name);
  private readonly n8nWebhookUrl: string;

  constructor(private configService: ConfigService) {
    this.ntfyUrl = this.configService.get<string>('N8N_WEBHOOK_URL') || '';
  }

  private ntfyUrl: string;

  /**
   * Dispatch structured event payload to n8n / Zapier webhook endpoint
   */
  async dispatchN8nEvent(eventType: string, data: any): Promise<boolean> {
    const targetUrl = this.configService.get<string>('N8N_WEBHOOK_URL');
    if (!targetUrl) {
      this.logger.debug(`[n8n] N8N_WEBHOOK_URL is not set. Skipping event dispatch for '${eventType}'.`);
      return false;
    }

    const payload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data,
    };

    try {
      await axios.post(targetUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
      });
      this.logger.log(`[n8n] Successfully dispatched '${eventType}' event to n8n workflow.`);
      return true;
    } catch (err: any) {
      this.logger.warn(`[n8n] Failed to dispatch '${eventType}' event to n8n: ${err.message}`);
      return false;
    }
  }
}
