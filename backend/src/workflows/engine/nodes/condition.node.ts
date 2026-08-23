import { Injectable, Logger } from '@nestjs/common';
import { ExecutionContext, ExecutionResult, INodeExecutor, INodeSchema } from '../interfaces/node-executor.interface';
import { ExpressionEngineService } from '../expression-engine.service';

class ConditionSchema implements INodeSchema {
  validate(config: any): void {
    if (!config.expression) {
      throw new Error('expression is required for condition node');
    }
  }
  getSchema(): any {
    return {
      type: 'object',
      properties: {
        expression: { type: 'string' }
      },
      required: ['expression']
    };
  }
}

@Injectable()
export class ConditionExecutor implements INodeExecutor {
  type = 'condition';
  schema = new ConditionSchema();
  private readonly logger = new Logger(ConditionExecutor.name);

  constructor(
    private readonly expressionEngine: ExpressionEngineService
  ) {}

  async execute(context: ExecutionContext, nodeData: any): Promise<ExecutionResult> {
    this.logger.debug(`Executing Condition for instance ${context.instanceId}`);
    
    try {
      // Evaluate the condition expression
      const isTrue = await this.expressionEngine.evaluateCondition(nodeData.expression, {
        contact: context.variables.contact,
        workflow: context.variables.workflow,
        system: { now: new Date().toISOString() }
      });

      this.logger.log(`[Workflow] Condition "${nodeData.expression}" evaluated to ${isTrue}`);
      
      return { 
        status: 'continue',
        branch: isTrue ? 'true' : 'false'
      };
    } catch (error: any) {
      this.logger.error(`Failed to evaluate condition: ${error.message}`);
      return { status: 'error', error: error.message };
    }
  }
}
