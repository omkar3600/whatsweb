import { Injectable } from '@nestjs/common';
import { INodeExecutor, INodeSchema, ExecutionContext, ExecutionResult } from '../interfaces/node-executor.interface';
import { LlmProviderFactory } from '../../../ai/providers/llm-provider.factory';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AiDecisionExecutor implements INodeExecutor {
  type = 'aiDecision';
  schema: INodeSchema = {
    validate: () => {},
    getSchema: () => ({ type: 'object' }),
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly llmFactory: LlmProviderFactory,
  ) {}

  async execute(context: ExecutionContext, nodeData: any): Promise<ExecutionResult> {
    const inputText = nodeData.text || context.variables.lastMessageText || '';
    const allowedChoices = nodeData.choices || ['DISCOUNT', 'NO_DISCOUNT', 'HUMAN', 'FOLLOW_UP'];

    const config = await this.prisma.chatbotConfig.findUnique({ where: { shopId: context.shopId } });
    const llm = await this.llmFactory.create(config || {});

    const prompt = `Evaluate the customer situation and select EXACTLY ONE choice from: ${JSON.stringify(allowedChoices)}.
Context/Text: "${inputText}"
Return JSON: { "decision": "CHOICE", "confidence": 0.95 }`;

    try {
      const response = await llm.generateCompletion([
        { role: 'system', content: 'You are an AI decision engine.' },
        { role: 'user', content: prompt },
      ], [], { temperature: 0.1 });

      const jsonStr = (response.content || '{}').replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(jsonStr);

      const decision = allowedChoices.includes(parsed.decision) ? parsed.decision : allowedChoices[0];

      context.variables.lastDecision = decision;
      context.variables.decisionConfidence = parsed.confidence || 0.9;

      return {
        status: 'continue',
        branch: decision.toLowerCase(),
      };
    } catch (e: any) {
      return {
        status: 'continue',
        branch: allowedChoices[0].toLowerCase(),
      };
    }
  }
}
