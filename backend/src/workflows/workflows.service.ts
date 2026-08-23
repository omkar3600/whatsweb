import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { WorkflowPublishingService } from './engine/workflow-publishing.service';

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publishingService: WorkflowPublishingService
  ) {}

  async listWorkflows(shopId: string) {
    return this.prisma.workflow.findMany({
      where: { shopId },
      include: {
        _count: {
          select: { instances: { where: { status: 'active' } } }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async getWorkflow(shopId: string, id: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id, shopId },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1
        }
      }
    });
    
    if (!workflow) throw new NotFoundException('Workflow not found');
    return workflow;
  }

  async getWorkflowVersions(shopId: string, id: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id, shopId },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
        }
      }
    });
    if (!workflow) throw new NotFoundException('Workflow not found');
    return workflow.versions;
  }

  async createWorkflow(shopId: string, name: string) {
    return this.prisma.workflow.create({
      data: {
        shopId,
        name,
        status: 'draft',
        versions: {
          create: {
            versionNumber: 1,
            status: 'draft',
            graph: { nodes: [], edges: [] }
          }
        }
      },
      include: {
        versions: true
      }
    });
  }

  async updateWorkflowGraph(shopId: string, id: string, graph: any) {
    const workflow = await this.getWorkflow(shopId, id);
    let latestVersion = workflow.versions[0];
    
    // If published, we should ideally create a new version.
    // For simplicity right now, we will update the existing draft version,
    // or create a new draft if the latest is published.
    
    if (latestVersion.status === 'published') {
      latestVersion = await this.prisma.workflowVersion.create({
        data: {
          workflowId: workflow.id,
          versionNumber: latestVersion.versionNumber + 1,
          status: 'draft',
          graph: graph,
        }
      });
      // Set workflow back to draft
      await this.prisma.workflow.update({
        where: { id: workflow.id },
        data: { status: 'draft' }
      });
    } else {
      latestVersion = await this.prisma.workflowVersion.update({
        where: { id: latestVersion.id },
        data: { graph }
      });
    }
    return latestVersion;
  }

  async publishWorkflow(shopId: string, id: string) {
    const workflow = await this.getWorkflow(shopId, id);
    const latestVersion = workflow.versions[0];

    if (!latestVersion || latestVersion.status === 'published') {
      return workflow;
    }

    // Run enterprise validations
    this.publishingService.validateGraph(latestVersion.graph);

    // Mark version as published
    await this.prisma.workflowVersion.update({
      where: { id: latestVersion.id },
      data: { status: 'published' }
    });

    // Mark workflow as published
    return this.prisma.workflow.update({
      where: { id },
      data: { status: 'published' }
    });
  }

  async deleteWorkflow(shopId: string, id: string) {
    // Delete instances first
    await this.prisma.workflowInstance.deleteMany({ where: { workflowId: id, shopId } });
    await this.prisma.workflowVersion.deleteMany({ where: { workflowId: id } });
    return this.prisma.workflow.delete({ where: { id, shopId } });
  }
}
