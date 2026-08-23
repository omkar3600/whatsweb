import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiTool, ToolContext, ToolResult } from '../tool.interface';

@Injectable()
export class ConversationTools {
  constructor(private readonly prisma: PrismaService) {}

  getTools(): AiTool[] {
    return [
      {
        name: 'get_conversation_history',
        description: 'Get recent message history for the current conversation. Returns the last N messages.',
        inputSchema: {
          type: 'object',
          properties: { limit: { type: 'number', description: 'Number of messages to return (default 10, max 30)' } },
        },
        riskLevel: 'LOW',
        requiresApproval: () => false,
        execute: async (ctx: ToolContext, params: { limit?: number }): Promise<ToolResult> => {
          if (!ctx.conversationId) return { success: false, error: 'No conversation in context' };
          const limit = Math.min(params.limit || 10, 30);
          const messages = await this.prisma.message.findMany({
            where: { conversationId: ctx.conversationId },
            orderBy: { timestamp: 'desc' },
            take: limit,
          });
          return { success: true, data: { messages: messages.reverse().map(m => ({ direction: m.direction, content: m.content, type: m.type, timestamp: m.timestamp })) } };
        },
      },
      {
        name: 'get_conversation_summary',
        description: 'Get the AI-generated summary of the conversation history to understand what has been discussed.',
        inputSchema: { type: 'object', properties: {} },
        riskLevel: 'LOW',
        requiresApproval: () => false,
        execute: async (ctx: ToolContext): Promise<ToolResult> => {
          if (!ctx.conversationId) return { success: false, error: 'No conversation in context' };
          const summary = await this.prisma.aiConversationSummary.findFirst({
            where: { conversationId: ctx.conversationId },
            orderBy: { createdAt: 'desc' },
          });
          return { success: true, data: { summary: summary?.summary || 'No summary available yet.' } };
        },
      },
    ];
  }
}
