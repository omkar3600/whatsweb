import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class NtfyService {
  private readonly logger = new Logger(NtfyService.name);
  private readonly ntfyUrl: string;
  private readonly defaultTopic: string;

  constructor(private configService: ConfigService) {
    this.ntfyUrl = this.configService.get<string>('NTFY_URL') || 'https://ntfy.sh';
    this.defaultTopic = this.configService.get<string>('NTFY_TOPIC') || 'whatshub-alerts';
  }

  /**
   * Publish push notification to ntfy.sh topic
   */
  async sendAlert(options: {
    topic?: string;
    title: string;
    message: string;
    priority?: 1 | 2 | 3 | 4 | 5; // 1 = min, 3 = default, 5 = max
    tags?: string[];
    actionUrl?: string;
  }): Promise<boolean> {
    const topic = options.topic || this.defaultTopic;
    const targetUrl = `${this.ntfyUrl.replace(/\/$/, '')}/${topic}`;

    try {
      await axios.post(
        targetUrl,
        options.message,
        {
          headers: {
            Title: options.title,
            Priority: String(options.priority || 3),
            Tags: (options.tags || ['message', 'bell']).join(','),
            ...(options.actionUrl ? { Click: options.actionUrl } : {}),
          },
          timeout: 5000,
        }
      );
      this.logger.log(`[ntfy] Published push alert to topic '${topic}': ${options.title}`);
      return true;
    } catch (err: any) {
      this.logger.warn(`[ntfy] Failed to send alert to '${topic}': ${err.message}`);
      return false;
    }
  }

  /**
   * Quick alert helper for High Risk AI Pending Approvals
   */
  async notifyPendingAiAction(action: { id: string; toolName: string; riskLevel: string; rationale: string; shopId: string }) {
    return this.sendAlert({
      title: `⚠️ AI Approval Required [${action.riskLevel}]`,
      message: `Tool '${action.toolName}' requested execution. ${action.rationale.slice(0, 100)}`,
      priority: action.riskLevel === 'CRITICAL' || action.riskLevel === 'HIGH' ? 5 : 3,
      tags: ['warning', 'robot', 'shield'],
      actionUrl: `https://whatshub-frontend2.vercel.app/ai-agent/actions`,
    });
  }

  /**
   * Quick alert helper for Broadcast Campaign Completion
   */
  async notifyCampaignCompleted(campaign: { id: string; name: string; totalSent: number; totalFailed: number }) {
    return this.sendAlert({
      title: `🚀 Broadcast Campaign Finished`,
      message: `'${campaign.name}' completed. Sent: ${campaign.totalSent}, Failed: ${campaign.totalFailed}`,
      priority: 3,
      tags: ['tada', 'megaphone'],
      actionUrl: `https://whatshub-frontend2.vercel.app/campaigns/${campaign.id}`,
    });
  }
}
