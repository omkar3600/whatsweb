import { Injectable, Logger } from '@nestjs/common';
import { ExecutionContext, ExecutionResult, INodeExecutor, INodeSchema } from '../interfaces/node-executor.interface';
import { v4 as uuidv4 } from 'uuid';

class WaitReplySchema implements INodeSchema {
  validate(config: any): void {
    // No specific required fields
  }
  getSchema(): any {
    return {
      type: 'object',
      properties: {
        timeoutMinutes: { type: 'number' }
      }
    };
  }
}

@Injectable()
export class WaitReplyExecutor implements INodeExecutor {
  type = 'waitReply';
  schema = new WaitReplySchema();
  private readonly logger = new Logger(WaitReplyExecutor.name);

  async execute(context: ExecutionContext, nodeData: any): Promise<ExecutionResult> {
    this.logger.debug(`Executing WaitReply for instance ${context.instanceId}`);
    
    // Generate a unique resume token that the webhook can look up
    const resumeToken = uuidv4();
    
    this.logger.log(`[Workflow] Instance paused, waiting for reply with token: ${resumeToken}`);

    return { 
      status: 'wait',
      resumeToken 
    };
  }
}
