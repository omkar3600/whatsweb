import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiTool, ToolContext, ToolResult } from '../tool.interface';

@Injectable()
export class AnalyticsTools {
  constructor(private readonly prisma: PrismaService) {}

  getTools(): AiTool[] {
    return [
      {
        name: 'get_conversation_stats',
        description: 'Get conversation statistics for today, this week, and this month.',
        inputSchema: { type: 'object', properties: {} },
        riskLevel: 'LOW',
        requiresApproval: () => false,
        execute: async (ctx: ToolContext): Promise<ToolResult> => {
          const now = new Date();
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const weekStart = new Date(todayStart); weekStart.setDate(todayStart.getDate() - 7);
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

          const [todayConvs, weekConvs, monthConvs, totalContacts] = await Promise.all([
            this.prisma.conversation.count({ where: { shopId: ctx.shopId, lastMessageAt: { gte: todayStart } } }),
            this.prisma.conversation.count({ where: { shopId: ctx.shopId, lastMessageAt: { gte: weekStart } } }),
            this.prisma.conversation.count({ where: { shopId: ctx.shopId, lastMessageAt: { gte: monthStart } } }),
            this.prisma.contact.count({ where: { shopId: ctx.shopId } }),
          ]);

          return { success: true, data: { today: todayConvs, thisWeek: weekConvs, thisMonth: monthConvs, totalContacts } };
        },
      },
      {
        name: 'get_lead_pipeline_summary',
        description: 'Get count of contacts in each lead pipeline stage.',
        inputSchema: { type: 'object', properties: {} },
        riskLevel: 'LOW',
        requiresApproval: () => false,
        execute: async (ctx: ToolContext): Promise<ToolResult> => {
          const stages = ['NEW', 'INTERESTED', 'QUALIFIED', 'PRODUCT_SELECTED', 'NEGOTIATING', 'PAYMENT_PENDING', 'PURCHASED', 'INACTIVE'];
          const counts: Record<string, number> = {};
          for (const stage of stages) {
            counts[stage] = await this.prisma.aiLeadScore.count({ where: { shopId: ctx.shopId, stage } });
          }
          return { success: true, data: counts };
        },
      },
      {
        name: 'get_campaign_stats',
        description: 'Get performance statistics for a specific campaign.',
        inputSchema: {
          type: 'object',
          properties: { campaignId: { type: 'string', description: 'The campaign ID' } },
          required: ['campaignId'],
        },
        riskLevel: 'LOW',
        requiresApproval: () => false,
        execute: async (ctx: ToolContext, params: { campaignId: string }): Promise<ToolResult> => {
          const campaign = await this.prisma.campaign.findFirst({
            where: { id: params.campaignId, shopId: ctx.shopId }, // shopId guard
          });
          if (!campaign) return { success: false, error: 'Campaign not found' };
          return { success: true, data: { name: campaign.name, status: campaign.status, stats: campaign.stats } };
        },
      },
    ];
  }
}
