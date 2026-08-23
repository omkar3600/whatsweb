import { Injectable, Logger } from '@nestjs/common';
import { ITriggerExecutor } from '../interfaces/trigger-executor.interface';
import { WorkflowEngineService } from '../workflow-engine.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class IncomingMessageTrigger implements ITriggerExecutor {
  type = 'incomingMessage';
  private readonly logger = new Logger(IncomingMessageTrigger.name);

  constructor(
    private readonly engine: WorkflowEngineService,
    private readonly prisma: PrismaService,
  ) {}

  async evaluate(payload: any): Promise<void> {
    const { shopId, contactId, messageText, messageType } = payload;
    
    // Find all published workflows that have an incoming message trigger
    const workflows = await this.prisma.workflow.findMany({
      where: { shopId, status: 'published' },
      include: { versions: { where: { status: 'published' }, take: 1, orderBy: { versionNumber: 'desc' } } }
    });

    for (const workflow of workflows) {
      if (!workflow.versions.length) continue;
      
      const graph: any = workflow.versions[0].graph;
      const triggerNodes = graph.nodes?.filter((n: any) => n.type === 'trigger') || [];
      
      for (const trigger of triggerNodes) {
        if (trigger.data?.triggerType === 'incomingMessage') {
          // Check conditions (e.g., keyword match)
          const keywords = trigger.data?.keywords;
          let match = false;

          if (!keywords) {
            match = true; // No keyword condition, always trigger
          } else if (messageType === 'text') {
            const keywordList = keywords.split(',').map((k: string) => k.trim().toLowerCase());
            match = keywordList.some((kw: string) => messageText?.toLowerCase().includes(kw));
          }

          if (match) {
            this.logger.log(`[Workflow] Trigger matched! Starting workflow ${workflow.id} for contact ${contactId}`);
            // Start workflow asynchronously
            this.engine.startWorkflow(shopId, workflow.id, contactId, {
              contact: { id: contactId },
              message: { text: messageText, type: messageType }
            }).catch(e => this.logger.error(`Failed to start workflow: ${e.message}`));
          }
        }
      }
    }
  }
}
