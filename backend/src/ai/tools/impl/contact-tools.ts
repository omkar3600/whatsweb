import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiTool, ToolContext, ToolResult } from '../tool.interface';

@Injectable()
export class ContactTools {
  constructor(private readonly prisma: PrismaService) {}

  getTools(): AiTool[] {
    return [
      {
        name: 'get_contact_profile',
        description: 'Get detailed profile of the current customer: name, phone, tags, notes, city, AI segment, lead stage, and memory.',
        inputSchema: { type: 'object', properties: {} },
        riskLevel: 'LOW',
        requiresApproval: () => false,
        execute: async (ctx: ToolContext): Promise<ToolResult> => {
          if (!ctx.contactId) return { success: false, error: 'No contact in context' };
          const contact = await this.prisma.contact.findUnique({
            where: { id: ctx.contactId },
            include: { aiMemory: true, aiLeadScore: true },
          });
          if (!contact) return { success: false, error: 'Contact not found' };
          return {
            success: true,
            data: {
              name: contact.name,
              phone: contact.phone,
              tags: contact.tags,
              city: contact.city,
              notes: contact.notes,
              segment: contact.aiSegment,
              leadStage: contact.aiLeadStage,
              memory: contact.aiMemory ? {
                preferences: contact.aiMemory.preferences,
                purchaseHistory: contact.aiMemory.purchaseHistory,
              } : null,
              leadScore: contact.aiLeadScore?.score || null,
            },
          };
        },
      },
      {
        name: 'update_contact_notes',
        description: 'Append a note to the current customer\'s contact record.',
        inputSchema: {
          type: 'object',
          properties: { note: { type: 'string', description: 'The note to append' } },
          required: ['note'],
        },
        riskLevel: 'LOW',
        requiresApproval: () => false,
        execute: async (ctx: ToolContext, params: { note: string }): Promise<ToolResult> => {
          if (!ctx.contactId) return { success: false, error: 'No contact in context' };
          const existing = await this.prisma.contact.findUnique({ where: { id: ctx.contactId } });
          const newNotes = [existing?.notes, `[AI ${new Date().toLocaleDateString()}] ${params.note}`].filter(Boolean).join('\n');
          await this.prisma.contact.update({ where: { id: ctx.contactId }, data: { notes: newNotes } });
          return { success: true, data: { message: 'Note added' } };
        },
      },
      {
        name: 'search_contacts',
        description: 'Search contacts by tags, segment, or lead stage. Returns up to 10 matching contacts.',
        inputSchema: {
          type: 'object',
          properties: {
            tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags' },
            segment: { type: 'string', description: 'Filter by AI segment' },
            leadStage: { type: 'string', description: 'Filter by lead stage (NEW, INTERESTED, QUALIFIED, etc.)' },
          },
        },
        riskLevel: 'LOW',
        requiresApproval: () => false,
        execute: async (ctx: ToolContext, params: { tags?: string[]; segment?: string; leadStage?: string }): Promise<ToolResult> => {
          const where: any = { shopId: ctx.shopId };
          if (params.segment) where.aiSegment = params.segment;
          if (params.leadStage) where.aiLeadStage = params.leadStage;
          const contacts = await this.prisma.contact.findMany({ where, take: 10 });
          let filtered = contacts;
          if (params.tags?.length) {
            filtered = contacts.filter(c => {
              const tags = (c.tags as string[]) || [];
              return params.tags!.some(t => tags.includes(t));
            });
          }
          return { success: true, data: { count: filtered.length, contacts: filtered.map(c => ({ id: c.id, name: c.name, phone: c.phone, tags: c.tags })) } };
        },
      },
    ];
  }
}
