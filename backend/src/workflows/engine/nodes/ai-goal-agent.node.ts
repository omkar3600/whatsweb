import { Injectable } from '@nestjs/common';
import { INodeExecutor, INodeSchema, ExecutionContext, ExecutionResult } from '../interfaces/node-executor.interface';
import { BusinessAgentService } from '../../../ai/business/business-agent.service';

@Injectable()
export class AiGoalAgentExecutor implements INodeExecutor {
  type = 'aiGoalAgent';
  schema: INodeSchema = {
    validate: () => {},
    getSchema: () => ({ type: 'object' }),
  };

  constructor(private readonly businessAgent: BusinessAgentService) {}

  async execute(context: ExecutionContext, nodeData: any): Promise<ExecutionResult> {
    const goalDescription = nodeData.goal || 'Qualify lead and recommend relevant products.';

    const result = await this.businessAgent.query(
      context.shopId,
      `Goal: ${goalDescription}`
    );

    context.variables.goalStatus = 'COMPLETED';
    context.variables.aiGoalReply = result.answer;

    return {
      status: 'continue',
      branch: 'success',
    };
  }
}
