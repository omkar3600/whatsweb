import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappService } from '../../whatsapp/whatsapp.service';
import { LlmProviderFactory } from '../providers/llm-provider.factory';
import { ChatGateway } from '../../chat/chat.gateway';

@Injectable()
export class FollowUpService {
  private readonly logger = new Logger(FollowUpService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => WhatsappService))
    private readonly whatsapp: WhatsappService,
    private readonly llmFactory: LlmProviderFactory,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
  ) {}

  async createFollowUp(shopId: string, contactId: string, reason: string, delayMs: number = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const config = await this.prisma.chatbotConfig.findUnique({ where: { shopId } });
      if (!config?.followupEnabled) return;

      // Check if follow-up already pending for this contact
      const existing = await this.prisma.aiFollowUp.findFirst({
        where: { shopId, contactId, status: 'pending' },
      });
      if (existing) return; // Don't double-schedule

      const contact = await this.prisma.contact.findUnique({ where: { id: contactId } });
      if (!contact) return;

      // Generate follow-up message
      const llm = await this.llmFactory.create(config);
      const response = await llm.generateCompletion([
        {
          role: 'system',
          content: `You are a friendly sales follow-up assistant for a WhatsApp business. Generate a brief, natural follow-up message for a customer who showed interest but hasn't responded. Reason: ${reason}. Customer name: ${contact.name}. Keep it short (1-2 sentences), warm, and not pushy.`,
        },
        { role: 'user', content: 'Generate the follow-up message.' },
      ], [], { maxTokens: 100, temperature: 0.7 });

      const message = response.content || `Hi ${contact.name}! Just checking in if you had any questions. We\'re here to help! 😊`;

      const isWindowOpen = await this.whatsapp.check24HourWindow(shopId, contact.phone);

      await this.prisma.aiFollowUp.create({
        data: {
          shopId,
          contactId,
          reason,
          scheduledAt: new Date(Date.now() + delayMs),
          aiMessage: message,
          useTemplate: !isWindowOpen,
          status: 'pending',
        },
      });

      this.logger.log(`[FollowUp] Scheduled follow-up for contact ${contactId} in ${Math.round(delayMs / 60000)}min`);
    } catch (err: any) {
      this.logger.warn(`Follow-up creation failed: ${err.message}`);
    }
  }

  async executeFollowUp(followUpId: string): Promise<void> {
    const followUp = await this.prisma.aiFollowUp.findUnique({
      where: { id: followUpId },
      include: { contact: true },
    });
    if (!followUp || followUp.status !== 'pending') return;

    try {
      const isWindowOpen = await this.whatsapp.check24HourWindow(followUp.shopId, followUp.contact.phone);

      if (!isWindowOpen && !followUp.useTemplate) {
        await this.prisma.aiFollowUp.update({
          where: { id: followUpId },
          data: { status: 'skipped', errorMessage: '24h window closed and no template configured' },
        });
        return;
      }

      await this.whatsapp.sendOutboundMessage(followUp.shopId, followUp.contact.phone, 'text', followUp.aiMessage);

      await this.prisma.aiFollowUp.update({
        where: { id: followUpId },
        data: { status: 'sent', executedAt: new Date() },
      });

      this.logger.log(`[FollowUp] Sent follow-up to ${followUp.contact.phone}`);
    } catch (err: any) {
      await this.prisma.aiFollowUp.update({
        where: { id: followUpId },
        data: { status: 'failed', errorMessage: err.message },
      });
    }
  }
}
