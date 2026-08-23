import { Injectable, Logger } from '@nestjs/common';
import { ExecutionContext, ExecutionResult, INodeExecutor, INodeSchema } from '../interfaces/node-executor.interface';
import { WhatsappService } from '../../../whatsapp/whatsapp.service';
import { PrismaService } from '../../../prisma/prisma.service';

class ForwardToOwnerSchema implements INodeSchema {
  validate(config: any): void {
    if (!config.ownerPhone) {
      throw new Error('ownerPhone is required');
    }
  }
  getSchema(): any {
    return {
      type: 'object',
      properties: {
        ownerPhone: { type: 'string' },
        customNote: { type: 'string' },
        forwardType: { type: 'string', enum: ['full_message', 'summary_alert'] },
      },
      required: ['ownerPhone'],
    };
  }
}

@Injectable()
export class ForwardToOwnerExecutor implements INodeExecutor {
  type = 'forwardToOwner';
  schema = new ForwardToOwnerSchema();
  private readonly logger = new Logger(ForwardToOwnerExecutor.name);

  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(context: ExecutionContext, nodeData: any): Promise<ExecutionResult> {
    this.logger.log(`[Workflow Node] Executing ForwardToOwner for contact ${context.contactId}`);
    const ownerPhone = (nodeData.ownerPhone || '').trim();
    if (!ownerPhone) {
      return { status: 'error', error: 'Owner phone number is missing' };
    }

    try {
      const contact = await this.prisma.contact.findUnique({
        where: { id: context.contactId },
      });

      let lastMsgContent = context.variables?.incomingMessage || '';
      if (!lastMsgContent && context.contactId) {
        const conversation = await this.prisma.conversation.findFirst({
          where: { contactId: context.contactId, shopId: context.shopId },
        });
        if (conversation) {
          const lastMsg = await this.prisma.message.findFirst({
            where: { conversationId: conversation.id },
            orderBy: { timestamp: 'desc' },
          });
          if (lastMsg) lastMsgContent = lastMsg.content || '';
        }
      }

      const alertText = [
        `🚨 *FORWARD TO OWNER ALERT*`,
        `---------------------------------`,
        `👤 *Customer*: ${contact?.name || 'Customer'} (${contact?.phone || 'Unknown'})`,
        `💬 *Message*: ${lastMsgContent || 'New customer message received'}`,
        nodeData.customNote ? `📝 *Note*: ${nodeData.customNote}` : '',
        `⏰ *Time*: ${new Date().toLocaleTimeString('en-IN')}`,
      ].filter(Boolean).join('\n');

      await this.whatsappService.sendOutboundMessage(context.shopId, ownerPhone, 'text', alertText);
      this.logger.log(`[ForwardToOwner Node] Alert sent to owner phone ${ownerPhone}`);

      return { status: 'continue' };
    } catch (error: any) {
      this.logger.error(`ForwardToOwner execution failed: ${error.message}`);
      return { status: 'error', error: error.message };
    }
  }
}
