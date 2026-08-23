import { Injectable, Logger } from '@nestjs/common';
import { ExecutionContext, ExecutionResult, INodeExecutor, INodeSchema } from '../interfaces/node-executor.interface';
import { PrismaService } from '../../../prisma/prisma.service';

class CrmActionSchema implements INodeSchema {
  validate(config: any): void {
    if (!config.actionType) {
      throw new Error('actionType is required for CrmActionNode');
    }
  }
  getSchema(): any {
    return {
      type: 'object',
      properties: {
        actionType: { type: 'string', enum: ['addTag', 'removeTag', 'updateStage', 'updateNotes'] },
        tag: { type: 'string' },
        leadStage: { type: 'string' },
        noteText: { type: 'string' },
      },
      required: ['actionType'],
    };
  }
}

@Injectable()
export class CrmActionExecutor implements INodeExecutor {
  type = 'crmAction';
  schema = new CrmActionSchema();
  private readonly logger = new Logger(CrmActionExecutor.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(context: ExecutionContext, nodeData: any): Promise<ExecutionResult> {
    this.logger.log(`[Workflow Node] Executing CrmAction (${nodeData.actionType}) for instance ${context.instanceId}`);

    const contact = await this.prisma.contact.findUnique({ where: { id: context.contactId } });
    if (!contact) return { status: 'error', error: 'Contact not found' };

    const action = nodeData.actionType;

    if (action === 'addTag' && nodeData.tag) {
      const currentTags = Array.isArray(contact.tags) ? (contact.tags as string[]) : [];
      if (!currentTags.includes(nodeData.tag)) {
        await this.prisma.contact.update({
          where: { id: contact.id },
          data: { tags: [...currentTags, nodeData.tag] },
        });
      }
    } else if (action === 'removeTag' && nodeData.tag) {
      const currentTags = Array.isArray(contact.tags) ? (contact.tags as string[]) : [];
      await this.prisma.contact.update({
        where: { id: contact.id },
        data: { tags: currentTags.filter((t) => t !== nodeData.tag) },
      });
    } else if (action === 'updateStage' && nodeData.leadStage) {
      await this.prisma.contact.update({
        where: { id: contact.id },
        data: { aiLeadStage: nodeData.leadStage },
      });
    } else if (action === 'updateNotes' && nodeData.noteText) {
      const updatedNotes = [contact.notes, `[Workflow] ${nodeData.noteText}`].filter(Boolean).join('\n');
      await this.prisma.contact.update({
        where: { id: contact.id },
        data: { notes: updatedNotes },
      });
    }

    return { status: 'continue' };
  }
}
