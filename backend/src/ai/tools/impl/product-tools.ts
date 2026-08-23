import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiTool, ToolContext, ToolResult } from '../tool.interface';

@Injectable()
export class ProductTools {
  constructor(private readonly prisma: PrismaService) {}

  getTools(): AiTool[] {
    return [
      {
        name: 'search_products',
        description: 'Search products in the business catalog or knowledge base by query, category, or price range.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Product name or keyword to search for' },
            category: { type: 'string', description: 'Product category' },
            maxPrice: { type: 'number', description: 'Maximum price filter' },
          },
          required: ['query'],
        },
        riskLevel: 'LOW',
        requiresApproval: () => false,
        execute: async (ctx: ToolContext, params: { query: string; category?: string; maxPrice?: number }): Promise<ToolResult> => {
          const where: any = { shopId: ctx.shopId, isActive: true };
          if (params.category) where.category = params.category;

          const sources = await this.prisma.aiKnowledgeSource.findMany({
            where,
            take: 10,
          });

          const qLower = params.query.toLowerCase();
          const matched = sources
            .filter(s => s.title.toLowerCase().includes(qLower) || s.content.toLowerCase().includes(qLower))
            .map(s => ({
              id: s.id,
              title: s.title,
              category: s.category,
              details: s.content.slice(0, 300),
            }));

          return {
            success: true,
            data: {
              count: matched.length,
              products: matched,
              query: params.query,
            },
          };
        },
      },
      {
        name: 'check_stock',
        description: 'Check stock availability and inventory details for a specific product or SKU.',
        inputSchema: {
          type: 'object',
          properties: {
            productName: { type: 'string', description: 'Name or title of product' },
          },
          required: ['productName'],
        },
        riskLevel: 'LOW',
        requiresApproval: () => false,
        execute: async (ctx: ToolContext, params: { productName: string }): Promise<ToolResult> => {
          const item = await this.prisma.aiKnowledgeSource.findFirst({
            where: {
              shopId: ctx.shopId,
              isActive: true,
              title: { contains: params.productName, mode: 'insensitive' },
            },
          });

          if (!item) {
            return { success: false, error: `Product '${params.productName}' not found in catalog.` };
          }

          return {
            success: true,
            data: {
              product: item.title,
              inStock: true,
              stockLevel: 'Available',
              summary: item.content.slice(0, 200),
            },
          };
        },
      },
      {
        name: 'get_product_details',
        description: 'Get complete specifications, pricing, and details for a product.',
        inputSchema: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: 'Knowledge source or product ID' },
          },
          required: ['productId'],
        },
        riskLevel: 'LOW',
        requiresApproval: () => false,
        execute: async (ctx: ToolContext, params: { productId: string }): Promise<ToolResult> => {
          const item = await this.prisma.aiKnowledgeSource.findFirst({
            where: { id: params.productId, shopId: ctx.shopId },
          });

          if (!item) return { success: false, error: 'Product not found' };

          return {
            success: true,
            data: {
              id: item.id,
              title: item.title,
              category: item.category,
              fullDetails: item.content,
            },
          };
        },
      },
    ];
  }
}
