import { Injectable, Logger } from '@nestjs/common';
import { ExecutionContext, ExecutionResult, INodeExecutor, INodeSchema } from '../interfaces/node-executor.interface';

class AbTestSplitterSchema implements INodeSchema {
  validate(config: any): void {}
  getSchema(): any {
    return {
      type: 'object',
      properties: {
        splitPercentage: { type: 'number', default: 50 },
      },
    };
  }
}

@Injectable()
export class AbTestSplitterExecutor implements INodeExecutor {
  type = 'abTestSplitter';
  schema = new AbTestSplitterSchema();
  private readonly logger = new Logger(AbTestSplitterExecutor.name);

  async execute(context: ExecutionContext, nodeData: any): Promise<ExecutionResult> {
    const percentage = typeof nodeData.splitPercentage === 'number' ? nodeData.splitPercentage : 50;
    const randomVal = Math.random() * 100;
    const chosenBranch = randomVal < percentage ? 'pathA' : 'pathB';

    this.logger.log(`[Workflow A/B Splitter] Instance ${context.instanceId} random ${randomVal.toFixed(1)}% -> ${chosenBranch}`);
    context.variables.abChoice = chosenBranch;
    return { status: 'continue', branch: chosenBranch };
  }
}
