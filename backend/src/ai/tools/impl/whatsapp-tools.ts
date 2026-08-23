import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { WhatsappService } from '../../../whatsapp/whatsapp.service';
import { AiTool, ToolContext, ToolResult } from '../tool.interface';

@Injectable()
export class WhatsAppTools {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => WhatsappService))
    private readonly whatsapp: WhatsappService,
  ) {}

  private async getContactPhone(contactId: string): Promise<string | null> {
    const c = await this.prisma.contact.findUnique({ where: { id: contactId } });
    return c?.phone || null;
  }

  getTools(): AiTool[] {
    return [
      {
        name: 'send_text_message',
        description: 'Send a plain text WhatsApp message to the current customer.',
        inputSchema: {
          type: 'object',
          properties: { message: { type: 'string', description: 'The text message to send' } },
          required: ['message'],
        },
        riskLevel: 'LOW',
        requiresApproval: (autonomyLevel) => autonomyLevel < 3,
        execute: async (ctx: ToolContext, params: { message: string }): Promise<ToolResult> => {
          const phone = ctx.contactId ? await this.getContactPhone(ctx.contactId) : null;
          if (!phone) return { success: false, error: 'No phone for contact' };
          await this.whatsapp.sendOutboundMessage(ctx.shopId, phone, 'text', params.message);
          return { success: true, data: { sent: true } };
        },
      },
      {
        name: 'send_interactive_buttons',
        description: 'Send an interactive WhatsApp message with up to 3 reply buttons.',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'string', description: 'Main message body text' },
            buttons: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, text: { type: 'string' } } }, maxItems: 3, description: 'Reply buttons (max 3)' },
          },
          required: ['body', 'buttons'],
        },
        riskLevel: 'LOW',
        requiresApproval: (autonomyLevel) => autonomyLevel < 3,
        execute: async (ctx: ToolContext, params: { body: string; buttons: { id: string; text: string }[] }): Promise<ToolResult> => {
          const phone = ctx.contactId ? await this.getContactPhone(ctx.contactId) : null;
          if (!phone) return { success: false, error: 'No phone for contact' };
          await this.whatsapp.sendOutboundMessage(ctx.shopId, phone, 'interactive', {
            text: params.body,
            config: { buttons: params.buttons.map(b => ({ id: b.id, text: b.text })) },
          });
          return { success: true, data: { sent: true } };
        },
      },
    ];
  }
}
