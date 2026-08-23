import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CampaignsService } from '../../../campaigns/campaigns.service';
import { AiTool, ToolContext, ToolResult } from '../tool.interface';

@Injectable()
export class CampaignTools {
  constructor(
    private readonly prisma: PrismaService,
    private readonly campaigns: CampaignsService,
  ) {}

  getTools(): AiTool[] {
    return [
      {
        name: 'get_campaigns',
        description: 'Get list of recent campaigns and their performance stats.',
        inputSchema: { type: 'object', properties: { limit: { type: 'number', description: 'Number of campaigns to return (default 5)' } } },
        riskLevel: 'LOW',
        requiresApproval: () => false,
        execute: async (ctx: ToolContext, params: { limit?: number }): Promise<ToolResult> => {
          const campaigns = await this.prisma.campaign.findMany({
            where: { shopId: ctx.shopId },
            orderBy: { createdAt: 'desc' },
            take: params.limit || 5,
            include: { template: { select: { templateName: true } } },
          });
          return { success: true, data: campaigns.map(c => ({ id: c.id, name: c.name, status: c.status, stats: c.stats, template: c.template?.templateName })) };
        },
      },
      {
        name: 'create_campaign_draft',
        description: 'Create a draft campaign (does NOT send). Returns the campaign ID for review. Always prefer this over send_campaign unless user explicitly requests immediate send.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Campaign name' },
            templateId: { type: 'string', description: 'Template ID to use' },
            targetTags: { type: 'array', items: { type: 'string' }, description: 'Tags to target' },
          },
          required: ['name', 'templateId'],
        },
        riskLevel: 'MEDIUM',
        requiresApproval: (autonomyLevel) => autonomyLevel < 3,
        execute: async (ctx: ToolContext, params: { name: string; templateId: string; targetTags?: string[] }): Promise<ToolResult> => {
          const campaign = await this.prisma.campaign.create({
            data: {
              shopId: ctx.shopId,
              name: params.name,
              templateId: params.templateId,
              targetTags: params.targetTags || [],
              scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // draft = 24h from now
              status: 'scheduled',
              stats: {} as any,
            },
          });
          return { success: true, data: { campaignId: campaign.id, name: campaign.name, status: 'draft_created', message: 'Campaign draft created. Please review and launch from the Campaigns page.' } };
        },
      },
    ];
  }
}
