import { Injectable } from '@nestjs/common';
import { INodeExecutor, INodeSchema, ExecutionContext, ExecutionResult } from '../interfaces/node-executor.interface';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class SubWorkflowExecutor implements INodeExecutor {
  type = 'subWorkflow';
  schema: INodeSchema = {
    validate: () => {},
    getSchema: () => ({ type: 'object' }),
  };

  constructor(private readonly prisma: PrismaService) {}

  async execute(context: ExecutionContext, nodeData: any): Promise<ExecutionResult> {
    const targetWorkflowId = nodeData.targetWorkflowId;
    if (!targetWorkflowId) {
      return { status: 'error', error: 'No target sub-workflow ID configured' };
    }

    const subWorkflow = await this.prisma.workflow.findFirst({
      where: { id: targetWorkflowId, shopId: context.shopId, status: 'published' },
      include: { versions: { where: { status: 'published' }, take: 1 } },
    });

    if (!subWorkflow || !subWorkflow.versions.length) {
      return { status: 'error', error: 'Target sub-workflow not found or unpublished' };
    }

    const subInstance = await this.prisma.workflowInstance.create({
      data: {
        shopId: context.shopId,
        workflowId: subWorkflow.id,
        workflowVersionId: subWorkflow.versions[0].id,
        contactId: context.contactId,
        status: 'active',
        variables: { ...context.variables, parentInstanceId: context.instanceId },
      },
    });

    context.variables.subInstanceId = subInstance.id;

    return {
      status: 'continue',
      branch: 'success',
    };
  }
}
