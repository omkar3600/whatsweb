import { Injectable, Logger } from '@nestjs/common';
import { ExecutionContext, ExecutionResult, INodeExecutor, INodeSchema } from '../interfaces/node-executor.interface';
import { PrismaService } from '../../../prisma/prisma.service';

class ApprovalSchema implements INodeSchema {
  validate(config: any): void {}
  getSchema(): any {
    return {
      type: 'object',
      properties: {
        actionDescription: { type: 'string' },
        riskLevel: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
      },
    };
  }
}

@Injectable()
export class ApprovalExecutor implements INodeExecutor {
  type = 'approvalNode';
  schema = new ApprovalSchema();
  private readonly logger = new Logger(ApprovalExecutor.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(context: ExecutionContext, nodeData: any): Promise<ExecutionResult> {
    this.logger.log(`[Workflow Node] Executing ApprovalNode for instance ${context.instanceId}`);

    // Create AI Approval Record in DB
    const approval = await this.prisma.aiAction.create({
      data: {
        shopId: context.shopId,
        contactId: context.contactId,
        toolName: nodeData.actionDescription || 'Workflow Action',
        toolInput: nodeData,
        riskLevel: nodeData.riskLevel || 'MEDIUM',
        rationale: 'Workflow requested owner approval before proceeding.',
        status: 'PENDING',
      },
    });

    this.logger.log(`[Approval Node] Created approval request ID: ${approval.id}. Pausing workflow instance.`);
    return { status: 'wait', resumeToken: `approval_${approval.id}` };
  }
}
