import { Injectable, Logger } from '@nestjs/common';
import { ExecutionContext, ExecutionResult, INodeExecutor, INodeSchema } from '../interfaces/node-executor.interface';
import { PrismaService } from '../../../prisma/prisma.service';

class TeamHandoffSchema implements INodeSchema {
  validate(config: any): void {}
  getSchema(): any {
    return {
      type: 'object',
      properties: {
        teamName: { type: 'string' },
        reason: { type: 'string' },
        pauseAi: { type: 'boolean', default: true },
      },
    };
  }
}

@Injectable()
export class TeamHandoffExecutor implements INodeExecutor {
  type = 'teamHandoff';
  schema = new TeamHandoffSchema();
  private readonly logger = new Logger(TeamHandoffExecutor.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(context: ExecutionContext, nodeData: any): Promise<ExecutionResult> {
    this.logger.log(`[Workflow Node] Executing TeamHandoff for contact ${context.contactId}`);

    if (context.contactId) {
      const conversation = await this.prisma.conversation.findFirst({
        where: { contactId: context.contactId, shopId: context.shopId },
        orderBy: { updatedAt: 'desc' },
      });

      if (conversation) {
        await this.prisma.conversation.update({
          where: { id: conversation.id },
          data: { aiPaused: nodeData.pauseAi !== false },
        });
      }

      const note = `[Escalation to ${nodeData.teamName || 'Support'}] Reason: ${nodeData.reason || 'Requested by workflow'}`;
      const contact = await this.prisma.contact.findUnique({ where: { id: context.contactId } });
      const updatedNotes = [contact?.notes, note].filter(Boolean).join('\n');
      await this.prisma.contact.update({
        where: { id: context.contactId },
        data: { notes: updatedNotes },
      });
    }

    this.logger.log(`[TeamHandoff Node] Chat escalated to team: ${nodeData.teamName || 'General Support'}`);
    return { status: 'continue' };
  }
}
