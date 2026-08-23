import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiTool, ToolContext, ToolResult } from '../tool.interface';

@Injectable()
export class HandoffTool {
  constructor(private readonly prisma: PrismaService) {}

  getTools(): AiTool[] {
    return [
      {
        name: 'escalate_to_human',
        description: 'Hand off the conversation to a human agent. Use when: customer is frustrated, request is too complex, customer explicitly asks for human, or you cannot resolve the issue. This pauses AI responses.',
        inputSchema: {
          type: 'object',
          properties: {
            reason: { type: 'string', description: 'Brief reason for escalation' },
            summary: { type: 'string', description: 'Summary of what was discussed and what the customer needs' },
          },
          required: ['reason'],
        },
        riskLevel: 'LOW',
        requiresApproval: () => false,
        execute: async (ctx: ToolContext, params: { reason: string; summary?: string }): Promise<ToolResult> => {
          if (!ctx.conversationId) return { success: false, error: 'No conversation in context' };
          await this.prisma.conversation.update({
            where: { id: ctx.conversationId },
            data: { aiPaused: true },
          });
          // Add a note to contact
          if (ctx.contactId) {
            const contact = await this.prisma.contact.findUnique({ where: { id: ctx.contactId } });
            const escalationNote = `[AI Escalation ${new Date().toLocaleDateString()}] Reason: ${params.reason}${params.summary ? `. Summary: ${params.summary}` : ''}`;
            const notes = [contact?.notes, escalationNote].filter(Boolean).join('\n');
            await this.prisma.contact.update({ where: { id: ctx.contactId }, data: { notes } });
          }
          return { success: true, data: { paused: true, reason: params.reason } };
        },
      },
    ];
  }
}
