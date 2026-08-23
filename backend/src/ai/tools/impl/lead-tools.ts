import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiTool, ToolContext, ToolResult } from '../tool.interface';

@Injectable()
export class LeadTools {
  constructor(private readonly prisma: PrismaService) {}

  getTools(): AiTool[] {
    return [
      {
        name: 'get_lead_score',
        description: 'Get the AI-computed lead score (0-100) and pipeline stage for the current customer.',
        inputSchema: { type: 'object', properties: {} },
        riskLevel: 'LOW',
        requiresApproval: () => false,
        execute: async (ctx: ToolContext): Promise<ToolResult> => {
          if (!ctx.contactId) return { success: false, error: 'No contact in context' };
          const score = await this.prisma.aiLeadScore.findUnique({ where: { contactId: ctx.contactId } });
          return { success: true, data: score || { score: 0, stage: 'NEW', intent: null } };
        },
      },
      {
        name: 'update_lead_stage',
        description: 'Update the pipeline stage for the current customer.',
        inputSchema: {
          type: 'object',
          properties: {
            stage: { type: 'string', enum: ['NEW', 'INTERESTED', 'QUALIFIED', 'PRODUCT_SELECTED', 'NEGOTIATING', 'PAYMENT_PENDING', 'PURCHASED', 'INACTIVE'] },
            reason: { type: 'string', description: 'Reason for stage change' },
          },
          required: ['stage'],
        },
        riskLevel: 'LOW',
        requiresApproval: () => false,
        execute: async (ctx: ToolContext, params: { stage: string; reason?: string }): Promise<ToolResult> => {
          if (!ctx.contactId) return { success: false, error: 'No contact in context' };
          await this.prisma.contact.update({ where: { id: ctx.contactId }, data: { aiLeadStage: params.stage } });
          await this.prisma.aiLeadScore.upsert({
            where: { contactId: ctx.contactId },
            create: { shopId: ctx.shopId, contactId: ctx.contactId, stage: params.stage },
            update: { stage: params.stage },
          });
          return { success: true, data: { stage: params.stage } };
        },
      },
      {
        name: 'get_hot_leads',
        description: 'Get top high-intent leads across the business (score >= threshold).',
        inputSchema: {
          type: 'object',
          properties: { threshold: { type: 'number', description: 'Minimum score (default 70)' }, limit: { type: 'number', description: 'Max results (default 10)' } },
        },
        riskLevel: 'LOW',
        requiresApproval: () => false,
        execute: async (ctx: ToolContext, params: { threshold?: number; limit?: number }): Promise<ToolResult> => {
          const leads = await this.prisma.aiLeadScore.findMany({
            where: { shopId: ctx.shopId, score: { gte: params.threshold || 70 } },
            orderBy: { score: 'desc' },
            take: params.limit || 10,
            include: { contact: { select: { name: true, phone: true } } },
          });
          return { success: true, data: { count: leads.length, leads: leads.map(l => ({ name: l.contact.name, phone: l.contact.phone, score: l.score, stage: l.stage, intent: l.intent })) } };
        },
      },
    ];
  }
}
