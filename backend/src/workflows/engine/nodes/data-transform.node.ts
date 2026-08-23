import { Injectable, Logger } from '@nestjs/common';
import { ExecutionContext, ExecutionResult, INodeExecutor, INodeSchema } from '../interfaces/node-executor.interface';
import { ExpressionEngineService } from '../expression-engine.service';

class DataTransformSchema implements INodeSchema {
  validate(config: any): void {}
  getSchema(): any {
    return {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['extract', 'format', 'merge', 'pick'] },
        sourceExpression: { type: 'string' },
        outputVariable: { type: 'string' },
      },
    };
  }
}

@Injectable()
export class DataTransformExecutor implements INodeExecutor {
  type = 'dataTransform';
  schema = new DataTransformSchema();
  private readonly logger = new Logger(DataTransformExecutor.name);

  constructor(private readonly expressionEngine: ExpressionEngineService) {}

  async execute(context: ExecutionContext, nodeData: any): Promise<ExecutionResult> {
    this.logger.log(`[Workflow Node] Executing DataTransform for instance ${context.instanceId}`);

    const expr = nodeData.sourceExpression || '';
    const varName = nodeData.outputVariable || 'transformedData';

    try {
      const evalCtx = {
        contact: context.variables.contact || {},
        variables: context.variables,
        workflow: context.variables.workflow || {},
      };

      const result = await this.expressionEngine.evaluateCondition(expr, evalCtx);
      context.variables[varName] = result;
      return { status: 'continue' };
    } catch (e: any) {
      this.logger.error(`[DataTransform Error] ${e.message}`);
      return { status: 'error', error: e.message };
    }
  }
}
