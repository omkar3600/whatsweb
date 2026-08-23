import { Injectable, Logger } from '@nestjs/common';
import { ExecutionContext, ExecutionResult, INodeExecutor, INodeSchema } from '../interfaces/node-executor.interface';

class ForEachSchema implements INodeSchema {
  validate(config: any): void {}
  getSchema(): any {
    return {
      type: 'object',
      properties: {
        arrayVariable: { type: 'string' },
        maxIterations: { type: 'number', default: 100 },
        itemVariable: { type: 'string', default: 'currentItem' },
      },
    };
  }
}

@Injectable()
export class ForEachExecutor implements INodeExecutor {
  type = 'forEach';
  schema = new ForEachSchema();
  private readonly logger = new Logger(ForEachExecutor.name);

  async execute(context: ExecutionContext, nodeData: any): Promise<ExecutionResult> {
    this.logger.log(`[Workflow Node] Executing ForEach for instance ${context.instanceId}`);

    const arrName = nodeData.arrayVariable || 'items';
    const targetArr = context.variables[arrName];

    if (!Array.isArray(targetArr) || targetArr.length === 0) {
      this.logger.log(`[ForEach Node] Array "${arrName}" is empty or not an array. Exiting loop.`);
      return { status: 'continue', branch: 'completed' };
    }

    const maxLimit = Math.min(nodeData.maxIterations || 100, 500);
    const currentIndex = (context.variables._loopIndex || 0);

    if (currentIndex >= targetArr.length || currentIndex >= maxLimit) {
      this.logger.log(`[ForEach Node] Loop finished at index ${currentIndex}.`);
      delete context.variables._loopIndex;
      return { status: 'continue', branch: 'completed' };
    }

    const itemVar = nodeData.itemVariable || 'currentItem';
    context.variables[itemVar] = targetArr[currentIndex];
    context.variables._loopIndex = currentIndex + 1;

    this.logger.log(`[ForEach Node] Iteration ${currentIndex + 1}/${targetArr.length}: item = ${JSON.stringify(targetArr[currentIndex])}`);
    return { status: 'continue', branch: 'loop' };
  }
}
