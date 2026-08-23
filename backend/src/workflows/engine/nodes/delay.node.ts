import { Injectable, Logger } from '@nestjs/common';
import { ExecutionContext, ExecutionResult, INodeExecutor, INodeSchema } from '../interfaces/node-executor.interface';

class DelaySchema implements INodeSchema {
  validate(config: any): void {
    if (!config.delayValue || !config.delayUnit) {
      throw new Error('delayValue and delayUnit are required');
    }
  }
  getSchema(): any {
    return {
      type: 'object',
      properties: {
        delayValue: { type: 'number' },
        delayUnit: { type: 'string', enum: ['seconds', 'minutes', 'hours', 'days'] }
      },
      required: ['delayValue', 'delayUnit']
    };
  }
}

@Injectable()
export class DelayExecutor implements INodeExecutor {
  type = 'delay';
  schema = new DelaySchema();
  private readonly logger = new Logger(DelayExecutor.name);

  async execute(context: ExecutionContext, nodeData: any): Promise<ExecutionResult> {
    this.logger.debug(`Executing Delay for instance ${context.instanceId}`);
    
    let delayMs = 0;
    const value = nodeData.delayValue || 0;
    
    switch(nodeData.delayUnit) {
      case 'seconds': delayMs = value * 1000; break;
      case 'minutes': delayMs = value * 60 * 1000; break;
      case 'hours': delayMs = value * 60 * 60 * 1000; break;
      case 'days': delayMs = value * 24 * 60 * 60 * 1000; break;
    }

    this.logger.log(`Pausing workflow instance ${context.instanceId} for ${delayMs}ms`);
    return { status: 'pause', delayMs };
  }
}
