import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ExecutionContext, ExecutionResult, INodeExecutor, INodeSchema } from '../interfaces/node-executor.interface';
import { WhatsappService } from '../../../whatsapp/whatsapp.service';
import { PrismaService } from '../../../prisma/prisma.service';

class AskQuestionSchema implements INodeSchema {
  validate(config: any): void {
    if (!config.questionText) {
      throw new Error('questionText is required for AskQuestionNode');
    }
  }
  getSchema(): any {
    return {
      type: 'object',
      properties: {
        questionText: { type: 'string' },
        validationType: { type: 'string', enum: ['text', 'email', 'phone', 'number', 'regex'] },
        regexPattern: { type: 'string' },
        outputVariable: { type: 'string' },
        invalidMessageText: { type: 'string' },
      },
      required: ['questionText'],
    };
  }
}

@Injectable()
export class AskQuestionExecutor implements INodeExecutor {
  type = 'askQuestion';
  schema = new AskQuestionSchema();
  private readonly logger = new Logger(AskQuestionExecutor.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => WhatsappService))
    private readonly whatsappService: WhatsappService,
  ) {}

  private validateAnswer(val: string, type: string, pattern?: string): boolean {
    if (!val) return false;
    const trimmed = val.trim();
    if (type === 'email') {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    } else if (type === 'phone') {
      return /^\+?[1-9]\d{7,14}$/.test(trimmed.replace(/[\s-]/g, ''));
    } else if (type === 'number') {
      return !isNaN(Number(trimmed));
    } else if (type === 'regex' && pattern) {
      try {
        return new RegExp(pattern).test(trimmed);
      } catch {
        return true;
      }
    }
    return true; // text mode
  }

  async execute(context: ExecutionContext, nodeData: any): Promise<ExecutionResult> {
    this.logger.log(`[Workflow Node] Executing AskQuestion for instance ${context.instanceId}`);

    const contact = await this.prisma.contact.findUnique({ where: { id: context.contactId } });
    if (!contact) return { status: 'error', error: 'Contact not found' };

    const varName = nodeData.outputVariable || 'userAnswer';

    // If customer already replied, validate reply
    if (context.variables.lastMessageText) {
      const replyText = context.variables.lastMessageText;
      const isValid = this.validateAnswer(replyText, nodeData.validationType || 'text', nodeData.regexPattern);

      if (isValid) {
        this.logger.log(`[Workflow Node] Answer validated for ${contact.phone}: ${replyText}`);
        context.variables[varName] = replyText;
        return { status: 'continue' };
      } else {
        const invalidMsg = nodeData.invalidMessageText || 'Invalid format. Please try again:';
        this.logger.log(`[Workflow Node] Answer validation failed for ${contact.phone}. Retrying...`);
        await this.whatsappService.sendOutboundMessage(context.shopId, contact.phone, 'text', invalidMsg);
        return { status: 'wait', resumeToken: `askQuestion_${context.instanceId}` };
      }
    }

    // First time reaching node: send question text and pause for reply
    const questionText = nodeData.questionText || 'Please provide your response:';
    await this.whatsappService.sendOutboundMessage(context.shopId, contact.phone, 'text', questionText);
    return { status: 'wait', resumeToken: `askQuestion_${context.instanceId}` };
  }
}
