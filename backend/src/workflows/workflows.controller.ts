import { Controller, Post, Body, Param, Get, Put, Delete, Query, BadRequestException } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { WorkflowEngineService } from './engine/workflow-engine.service';
import { WorkflowLinterService } from './engine/workflow-linter.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('workflows')
export class WorkflowsController {
  constructor(
    private readonly engineService: WorkflowEngineService,
    private readonly prisma: PrismaService,
    private readonly workflowsService: WorkflowsService,
    private readonly linterService: WorkflowLinterService,
  ) {}

  @Get()
  async listWorkflows(@Query('shopId') shopId: string) {
    if (!shopId) throw new BadRequestException('shopId is required');
    return this.workflowsService.listWorkflows(shopId);
  }

  @Get(':id/versions')
  async getWorkflowVersions(@Param('id') id: string, @Query('shopId') shopId: string) {
    if (!shopId) throw new BadRequestException('shopId is required');
    return this.workflowsService.getWorkflowVersions(shopId, id);
  }

  @Get(':id')
  async getWorkflow(@Param('id') id: string, @Query('shopId') shopId: string) {
    if (!shopId) throw new BadRequestException('shopId is required');
    return this.workflowsService.getWorkflow(shopId, id);
  }

  @Post()
  async createWorkflow(@Body() body: { shopId: string; name: string }) {
    if (!body.shopId || !body.name) {
      throw new BadRequestException('shopId and name are required');
    }
    try {
      return await this.workflowsService.createWorkflow(body.shopId, body.name);
    } catch (error) {
      console.error('Failed to create workflow:', error);
      throw new BadRequestException(error.message || 'Failed to create workflow');
    }
  }

  @Post(':id/versions')
  async createWorkflowVersion(
    @Param('id') id: string,
    @Query('shopId') queryShopId: string,
    @Body() body: { shopId?: string; graph: any }
  ) {
    const shopId = body?.shopId || queryShopId;
    if (!shopId || !body?.graph) throw new BadRequestException('shopId and graph are required');
    return this.workflowsService.updateWorkflowGraph(shopId, id, body.graph);
  }

  @Put([':id/version', ':id/versions'])
  async updateWorkflowGraph(
    @Param('id') id: string,
    @Query('shopId') queryShopId: string,
    @Body() body: { shopId?: string; graph: any }
  ) {
    const shopId = body?.shopId || queryShopId;
    if (!shopId || !body?.graph) throw new BadRequestException('shopId and graph are required');
    return this.workflowsService.updateWorkflowGraph(shopId, id, body.graph);
  }

  @Post(':id/publish')
  async publishWorkflow(@Param('id') id: string, @Body() body: { shopId: string }) {
    if (!body.shopId) throw new BadRequestException('shopId is required');
    return this.workflowsService.publishWorkflow(body.shopId, id);
  }

  @Delete(':id')
  async deleteWorkflow(@Param('id') id: string, @Query('shopId') shopId: string) {
    if (!shopId) throw new BadRequestException('shopId is required');
    return this.workflowsService.deleteWorkflow(shopId, id);
  }

  @Post('ai/lint')
  async lintWorkflow(@Body() body: { graph: any }) {
    if (!body.graph) throw new BadRequestException('graph is required');
    return { issues: this.linterService.lintGraph(body.graph) };
  }

  @Post(':id/test-trigger')
  async triggerTestWorkflow(
    @Param('id') id: string,
    @Body() body: { shopId: string, contactId: string }
  ) {
    const instance = await this.engineService.startWorkflow(
      body.shopId,
      id,
      body.contactId,
      { source: 'manual-api-test' }
    );
    return { success: true, instanceId: instance.id };
  }
}
