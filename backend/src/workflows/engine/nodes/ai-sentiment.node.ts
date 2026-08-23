import { Injectable } from '@nestjs/common';
import { INodeExecutor, INodeSchema, ExecutionContext, ExecutionResult } from '../interfaces/node-executor.interface';
import { LlmProviderFactory } from '../../../ai/providers/llm-provider.factory';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AiSentimentExecutor implements INodeExecutor {
  type = 'aiSentiment';
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

    const config = await this.prisma.chatbotConfig.findUnique({ where: { shopId: context.shopId } });
    const llm = await this.llmFactory.create(config || {});

    const prompt = `Analyze customer sentiment from the text. Choose EXACTLY ONE category from: ["positive", "neutral", "negative", "angry", "urgent"].
Text: "${inputText}"
Category:`;

    try {
      const response = await llm.generateCompletion([
        { role: 'system', content: 'You are a sentiment classification engine.' },
        { role: 'user', content: prompt },
      ], [], { temperature: 0.1 });

      const category = (response.content || 'neutral').toLowerCase().trim();
      const validCategories = ['positive', 'neutral', 'negative', 'angry', 'urgent'];
      const finalSentiment = validCategories.find(c => category.includes(c)) || 'neutral';

      context.variables.lastSentiment = finalSentiment;

      return {
        status: 'continue',
        branch: finalSentiment,
      };
    } catch (e: any) {
      return {
        status: 'continue',
        branch: 'neutral',
      };
    }
  }
}
