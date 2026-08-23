import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { WhatsappService } from '../../../whatsapp/whatsapp.service';
import { AiTool, ToolContext, ToolResult } from '../tool.interface';

@Injectable()
export class OwnerTools {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => WhatsappService))
    private readonly whatsapp: WhatsappService,
  ) {}

  getTools(): AiTool[] {
    return [
      {
        name: 'notify_owner_hot_lead',
        description: 'Send a real-time notification alert to the business owner about a high-value or urgent lead.',
        inputSchema: {
          type: 'object',
          properties: {
            leadName: { type: 'string', description: 'Name of the high-intent lead' },
            leadPhone: { type: 'string', description: 'Phone number of lead' },
            score: { type: 'number', description: 'Lead score (0-100)' },
            reason: { type: 'string', description: 'Reason why this lead requires owner attention' },
          },
          required: ['leadName', 'reason'],
        },
        riskLevel: 'LOW',
        requiresApproval: () => false,
        execute: async (ctx: ToolContext, params: { leadName: string; leadPhone?: string; score?: number; reason: string }): Promise<ToolResult> => {
          const shop = await this.prisma.shop.findUnique({
            where: { id: ctx.shopId },
            select: { phone: true, shopName: true },
          });

          if (shop?.phone) {
            const alertText = `🚨 *HOT LEAD ALERT* (${shop.shopName})\n\n👤 *Customer:* ${params.leadName}\n📞 *Phone:* ${params.leadPhone || 'N/A'}\n🔥 *Score:* ${params.score || 90}/100\n💡 *Reason:* ${params.reason}`;
            await this.whatsapp.sendOutboundMessage(ctx.shopId, shop.phone, 'text', alertText).catch(() => {});
          }

          return {
            success: true,
            data: {
              alertSent: true,
              message: `Owner notified about hot lead ${params.leadName}`,
            },
          };
        },
      },
      {
        name: 'get_daily_business_briefing',
        description: 'Generate an executive daily briefing summary covering active conversations, hot leads, top customer intents, and campaign performance.',
        inputSchema: { type: 'object', properties: {} },
        riskLevel: 'LOW',
        requiresApproval: () => false,
        execute: async (ctx: ToolContext): Promise<ToolResult> => {
          const now = new Date();
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

          const [
            todayConversations,
            hotLeads,
            totalContacts,
            activeCampaigns,
            pendingApprovals,
          ] = await Promise.all([
            this.prisma.conversation.count({ where: { shopId: ctx.shopId, lastMessageAt: { gte: todayStart } } }),
            this.prisma.aiLeadScore.findMany({
              where: { shopId: ctx.shopId, score: { gte: 75 } },
              take: 5,
              include: { contact: { select: { name: true, phone: true } } },
            }),
            this.prisma.contact.count({ where: { shopId: ctx.shopId } }),
            this.prisma.campaign.count({ where: { shopId: ctx.shopId, status: 'sending' } }),
            this.prisma.aiAction.count({ where: { shopId: ctx.shopId, status: 'pending' } }),
          ]);

          return {
            success: true,
            data: {
              date: todayStart.toLocaleDateString('en-IN'),
              todayConversations,
              totalContacts,
              activeCampaigns,
              pendingApprovals,
              topHotLeads: hotLeads.map(l => ({
                name: l.contact.name,
                phone: l.contact.phone,
                score: l.score,
                stage: l.stage,
                intent: l.intent,
              })),
            },
          };
        },
      },
    ];
  }
}
