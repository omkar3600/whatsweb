import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiTool, ToolContext, ToolResult } from '../tool.interface';

@Injectable()
export class KnowledgeTools {
  constructor(private readonly prisma: PrismaService) {}

  getTools(): AiTool[] {
    return [
      {
        name: 'search_knowledge',
        description: 'Search the business knowledge base for relevant information about products, policies, FAQs, pricing, or general business details.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The search query' },
            category: { type: 'string', enum: ['general', 'faq', 'policy', 'product', 'pricing'], description: 'Optional category filter' },
          },
          required: ['query'],
        },
        riskLevel: 'LOW',
        requiresApproval: () => false,
        execute: async (ctx: ToolContext, params: { query: string; category?: string }): Promise<ToolResult> => {
          const where: any = { shopId: ctx.shopId, isActive: true };
          if (params.category) where.category = params.category;

          const sources = await this.prisma.aiKnowledgeSource.findMany({ where, take: 5 });
          // Simple keyword relevance scoring
          const words = params.query.toLowerCase().split(/\s+/);
          const scored = sources.map(s => ({
            ...s,
            relevance: words.filter(w => (s.title + s.content).toLowerCase().includes(w)).length,
          })).sort((a, b) => b.relevance - a.relevance);

          return {
            success: true,
            data: scored.slice(0, 3).map(s => ({ title: s.title, content: s.content.slice(0, 500), category: s.category })),
          };
        },
      },
      {
        name: 'get_business_info',
        description: 'Get basic business information: name, contact, operating hours from business info.',
        inputSchema: { type: 'object', properties: {} },
        riskLevel: 'LOW',
        requiresApproval: () => false,
        execute: async (ctx: ToolContext): Promise<ToolResult> => {
          const config = await this.prisma.chatbotConfig.findUnique({ where: { shopId: ctx.shopId } });
          return { success: true, data: { businessInfo: config?.businessInfo || 'No business info configured.' } };
        },
      },
    ];
  }
}
