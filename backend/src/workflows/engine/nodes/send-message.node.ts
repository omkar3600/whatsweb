import { Injectable, Logger } from '@nestjs/common';
import { ExecutionContext, ExecutionResult, INodeExecutor, INodeSchema } from '../interfaces/node-executor.interface';
import { WhatsappService } from '../../../whatsapp/whatsapp.service';
import { ExpressionEngineService } from '../expression-engine.service';

class SendMessageSchema implements INodeSchema {
  validate(config: any): void {
    if (!config.messageType) {
      throw new Error('messageType is required');
    }
  }
  getSchema(): any {
    return {
      type: 'object',
      properties: {
        messageType: { type: 'string', enum: ['text', 'template'] },
        text: { type: 'string' },
        templateName: { type: 'string' }
      },
      required: ['messageType']
    };
  }
}

@Injectable()
export class SendMessageExecutor implements INodeExecutor {
  type = 'sendMessage';
  schema = new SendMessageSchema();
  private readonly logger = new Logger(SendMessageExecutor.name);

  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly expressionEngine: ExpressionEngineService
  ) {}

  async execute(context: ExecutionContext, nodeData: any): Promise<ExecutionResult> {
    this.logger.debug(`Executing SendMessage for instance ${context.instanceId}`);
    
    // Evaluate variables in the text
    let messageContent = nodeData.text || '';
    if (messageContent) {
      messageContent = await this.expressionEngine.evaluateString(messageContent, {
        contact: context.variables.contact,
        workflow: context.variables.workflow,
        system: { now: new Date().toISOString() }
      });
    }

    try {
      const contactData = await this.whatsappService['prisma'].contact.findUnique({
        where: { id: context.contactId }
      });
      if (!contactData) throw new Error('Contact not found');

      if (nodeData.messageType === 'text') {
        this.logger.log(`[Workflow] Sending TEXT to Contact ${context.contactId} (${contactData.phone})`);
        await this.whatsappService.sendOutboundMessage(context.shopId, contactData.phone, 'text', messageContent);
      } else if (nodeData.messageType === 'template') {
        this.logger.log(`[Workflow] Sending TEMPLATE ${nodeData.templateName} to Contact ${context.contactId} (${contactData.phone})`);
        await this.whatsappService.sendOutboundMessage(context.shopId, contactData.phone, 'template', {
          name: nodeData.templateName,
          language: 'en_US'
        });
      }
      
      return { status: 'continue' };
    } catch (error: any) {
      this.logger.error(`Failed to send message: ${error.message}`);
      return { status: 'error', error: error.message };
    }
  }
}
