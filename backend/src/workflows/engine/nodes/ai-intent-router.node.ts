import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ExecutionContext, ExecutionResult, INodeExecutor, INodeSchema } from '../interfaces/node-executor.interface';
import { LlmProviderFactory } from '../../../ai/providers/llm-provider.factory';
import { PrismaService } from '../../../prisma/prisma.service';

class AiIntentRouterSchema implements INodeSchema {
  validate(config: any): void {}
  getSchema(): any {
    return {
      type: 'object',
      properties: {
        intents: { type: 'array', items: { type: 'string' } },
        fallbackBranch: { type: 'string' },
      },
    };
  }
}

@Injectable()
export class AiIntentRouterExecutor implements INodeExecutor {
  type = 'aiIntentRouter';
  schema = new AiIntentRouterSchema();
  private readonly logger = new Logger(AiIntentRouterExecutor.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => LlmProviderFactory))
    private readonly llmFactory: LlmProviderFactory,
  ) {}

  async execute(context: ExecutionContext, nodeData: any): Promise<ExecutionResult> {
    this.logger.log(`[Workflow Node] Executing AI Intent Router for instance ${context.instanceId}`);

    const userMessage = context.variables.lastMessageText || 'Hello';
    const intentList: string[] = nodeData.intents || ['sales', 'support', 'billing', 'general'];

    try {
      const config = await this.prisma.chatbotConfig.findUnique({ where: { shopId: context.shopId } });
      const llm = await this.llmFactory.create(config || {});

      const systemPrompt = `You are an intent classification system for a business.
Analyze the customer's message and classify it into EXACTLY ONE of the following intent categories:
${intentList.map((i) => `- ${i}`).join('\n')}

Respond ONLY with the category name string. Nothing else.`;

      const response = await llm.generateCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ]);

      const classified = (response.content || '').trim().toLowerCase();
      const match = intentList.find((i) => i.toLowerCase() === classified) || nodeData.fallbackBranch || 'general';

      this.logger.log(`[Workflow Intent Router] Classified message "${userMessage}" as intent: ${match}`);
      context.variables.detectedIntent = match;
      return { status: 'continue', branch: match };
    } catch (error: any) {
      this.logger.error(`[Workflow Intent Router Error] ${error.message}`);
      return { status: 'continue', branch: nodeData.fallbackBranch || 'general' };
    }
  }
}
