import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiTool, ToolContext, ToolResult } from '../tool.interface';

@Injectable()
export class WorkflowTools {
  constructor(private readonly prisma: PrismaService) {}

  getTools(): AiTool[] {
    return [
      {
        name: 'trigger_workflow',
        description: 'Programmatically trigger a published visual workflow for a contact.',
        inputSchema: {
          type: 'object',
          properties: {
            workflowId: { type: 'string', description: 'ID of the published workflow' },
            triggerVariables: { type: 'object', description: 'Key-value parameters for workflow execution' },
          },
          required: ['workflowId'],
        },
        riskLevel: 'MEDIUM',
        requiresApproval: (autonomyLevel) => autonomyLevel < 2,
        execute: async (ctx: ToolContext, params: { workflowId: string; triggerVariables?: Record<string, any> }): Promise<ToolResult> => {
          const workflow = await this.prisma.workflow.findFirst({
            where: { id: params.workflowId, shopId: ctx.shopId, status: 'published' },
            include: { versions: { where: { status: 'published' }, take: 1 } },
          });

          if (!workflow) {
            return { success: false, error: 'Published workflow not found or inactive.' };
          }

          if (!ctx.contactId) {
            return { success: false, error: 'No target contact in context to run workflow for.' };
          }

          const publishedVersion = workflow.versions[0];
          if (!publishedVersion) {
            return { success: false, error: 'No published version available for this workflow.' };
          }

          const instance = await this.prisma.workflowInstance.create({
            data: {
              shopId: ctx.shopId,
              workflowId: workflow.id,
              workflowVersionId: publishedVersion.id,
              contactId: ctx.contactId,
              status: 'active',
              variables: params.triggerVariables || {},
            },
          });

          return {
            success: true,
            data: {
              instanceId: instance.id,
              workflowName: workflow.name,
              status: 'STARTED',
              message: `Workflow '${workflow.name}' triggered successfully for contact.`,
            },
          };
        },
      },
      {
        name: 'get_active_workflows',
        description: 'List active and published visual workflows available in the system.',
        inputSchema: { type: 'object', properties: {} },
        riskLevel: 'LOW',
        requiresApproval: () => false,
        execute: async (ctx: ToolContext): Promise<ToolResult> => {
          const workflows = await this.prisma.workflow.findMany({
            where: { shopId: ctx.shopId, status: 'published' },
            select: {
              id: true,
              name: true,
              description: true,
              status: true,
              updatedAt: true,
            },
          });

          return {
            success: true,
            data: {
              count: workflows.length,
              workflows,
            },
          };
        },
      },
    ];
  }
}
