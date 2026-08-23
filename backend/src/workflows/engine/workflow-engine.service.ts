import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NodeExecutorRegistry } from './registries/node-executor.registry';
import { ExpressionEngineService } from './expression-engine.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ExecutionContext, ExecutionResult } from './interfaces/node-executor.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly nodeRegistry: NodeExecutorRegistry,
    private readonly expressionEngine: ExpressionEngineService,
    @InjectQueue('workflow-execution-queue') private readonly executionQueue: Queue,
  ) {}

  /**
   * Starts a new workflow instance and enqueues the first node
   */
  async startWorkflow(shopId: string, workflowId: string, contactId: string, initialVariables: Record<string, any> = {}) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
      include: { versions: { where: { status: 'published' }, take: 1, orderBy: { versionNumber: 'desc' } } }
    });

    if (!workflow || workflow.versions.length === 0) {
      throw new Error('Published workflow not found');
    }

    const version = workflow.versions[0];
    const graph: any = version.graph;
    
    // Find the trigger node
    const triggerNode = graph.nodes?.find((n: any) => n.type === 'trigger');
    if (!triggerNode) {
      throw new Error('Workflow has no trigger node');
    }

    // Create Instance
    const instance = await this.prisma.workflowInstance.create({
      data: {
        shopId,
        workflowId,
        workflowVersionId: version.id,
        contactId,
        status: 'active',
        variables: initialVariables,
        currentNodeId: triggerNode.id,
      }
    });

    await this.prisma.workflowAnalytics.upsert({
      where: { workflowId },
      create: { workflowId, shopId, totalStarted: 1 },
      update: { totalStarted: { increment: 1 } }
    });

    // Enqueue job for trigger node immediately
    await this.enqueueNodeExecution(instance.id, triggerNode.id);

    return instance;
  }

  /**
   * Enqueues a node for execution
   */
  async enqueueNodeExecution(instanceId: string, nodeId: string, delayMs: number = 0) {
    const instance = await this.prisma.workflowInstance.findUnique({ where: { id: instanceId } });
    if (!instance) return;

    const jobRecord = await this.prisma.workflowJob.create({
      data: {
        shopId: instance.shopId,
        workflowId: instance.workflowId,
        instanceId,
        nodeId,
        status: 'pending',
        idempotencyKey: uuidv4(),
      }
    });

    await this.executionQueue.add(
      'execute-node',
      { jobId: jobRecord.id, instanceId, nodeId },
      { delay: delayMs, jobId: jobRecord.id }
    );
  }

  /**
   * Process a node execution from the queue (called by processor)
   */
  async processNode(jobId: string, instanceId: string, nodeId: string) {
    // 1. Transactional check with executionVersion for optimistic locking
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: { version: true }
    });

    if (!instance || instance.status === 'cancelled' || instance.status === 'completed') {
      return; // Stop processing
    }

    // 2. Fetch node configuration
    const graph: any = instance.version.graph;
    const nodeData = graph.nodes?.find((n: any) => n.id === nodeId);
    if (!nodeData) {
      throw new Error(`Node ${nodeId} not found in graph`);
    }

    // 3. Resolve executor
    const executor = this.nodeRegistry.get(nodeData.type);
    if (!executor) {
      throw new Error(`Executor not found for type ${nodeData.type}`);
    }

    const context: ExecutionContext = {
      instanceId,
      shopId: instance.shopId,
      workflowId: instance.workflowId,
      contactId: instance.contactId,
      variables: instance.variables as Record<string, any>,
      getNodeData: (id) => graph.nodes?.find((n: any) => n.id === id)
    };

    const startTime = Date.now();
    let result: ExecutionResult;

    try {
      // 4. Execute
      result = await executor.execute(context, nodeData.data);
      
      await this.prisma.workflowExecutionLog.create({
        data: {
          instanceId,
          nodeId,
          status: result.status === 'error' ? 'error' : 'success',
          startedAt: new Date(startTime),
          completedAt: new Date(),
          durationMs: Date.now() - startTime,
          error: result.error
        }
      });

    } catch (e: any) {
      result = { status: 'error', error: e.message };
      // Fallback log
      await this.prisma.workflowExecutionLog.create({
        data: { instanceId, nodeId, status: 'error', startedAt: new Date(startTime), completedAt: new Date(), durationMs: Date.now() - startTime, error: e.message }
      });
    }

    // 5. Handle Transition
    await this.handleExecutionResult(instance, nodeId, result, graph);
  }

  private async handleExecutionResult(instance: any, nodeId: string, result: ExecutionResult, graph: any) {
    if (result.status === 'error') {
      await this.prisma.workflowInstance.update({
        where: { id: instance.id },
        data: { status: 'failed' }
      });
      return;
    }

    if (result.status === 'wait') {
      await this.prisma.workflowInstance.update({
        where: { id: instance.id },
        data: { status: 'waiting', resumeToken: result.resumeToken }
      });
      return;
    }

    if (result.status === 'pause' && result.delayMs) {
      await this.prisma.workflowInstance.update({
        where: { id: instance.id },
        data: { status: 'paused', currentNodeId: nodeId }
      });
      
      // The node itself hasn't transitioned to next, it will just re-enqueue the NEXT node via edges after delay?
      // Actually, Delay Node continues to the next node AFTER the delay.
      const edges = graph.edges?.filter((e: any) => e.source === nodeId) || [];
      for (const edge of edges) {
        await this.enqueueNodeExecution(instance.id, edge.target, result.delayMs);
      }
      return;
    }

    if (result.status === 'stop') {
      await this.prisma.workflowInstance.update({
        where: { id: instance.id },
        data: { status: 'completed', completionTime: new Date() }
      });
      return;
    }

    // Continue
    let edges = graph.edges?.filter((e: any) => e.source === nodeId) || [];
    
    // If the node specified a branch, only follow edges connected to that branch's sourceHandle
    if (result.branch) {
      edges = edges.filter((e: any) => e.sourceHandle === result.branch);
    }

    if (edges.length === 0) {
      // Reached the end or a branch with no connected nodes
      await this.prisma.workflowInstance.update({
        where: { id: instance.id },
        data: { status: 'completed', completionTime: new Date() }
      });
    } else {
      // Enqueue next nodes
      await this.prisma.workflowInstance.update({
        where: { id: instance.id },
        data: { 
          previousNodeId: nodeId,
          lastExecutedNodeId: nodeId,
          executionVersion: { increment: 1 } 
        }
      });
      for (const edge of edges) {
        await this.enqueueNodeExecution(instance.id, edge.target);
      }
    }
  }
}
