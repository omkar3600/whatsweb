import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { WorkflowEngineService } from '../workflow-engine.service';

@Processor('workflow-execution-queue', { concurrency: 5 })
export class WorkflowQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(WorkflowQueueProcessor.name);

  constructor(private readonly workflowEngine: WorkflowEngineService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { jobId, instanceId, nodeId } = job.data;
    this.logger.debug(`Processing workflow job: ${jobId}, instance: ${instanceId}, node: ${nodeId}`);

    try {
      await this.workflowEngine.processNode(jobId, instanceId, nodeId);
    } catch (error: any) {
      this.logger.error(`Failed to process job ${job.id}: ${error.message}`, error.stack);
      throw error; // This will trigger BullMQ retries and eventually DLQ
    }
  }
}
