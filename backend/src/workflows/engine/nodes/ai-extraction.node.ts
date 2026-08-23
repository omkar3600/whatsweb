import { Injectable } from '@nestjs/common';
import { INodeExecutor, INodeSchema, ExecutionContext, ExecutionResult } from '../interfaces/node-executor.interface';
import { LlmProviderFactory } from '../../../ai/providers/llm-provider.factory';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AiExtractionExecutor implements INodeExecutor {
  type = 'aiExtraction';
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
    const extractionSchema = nodeData.schema || { category: 'string', budget: 'number' };

    const config = await this.prisma.chatbotConfig.findUnique({ where: { shopId: context.shopId } });
    const llm = await this.llmFactory.create(config || {});

    const prompt = `Extract structured data from the following text based on this schema: ${JSON.stringify(extractionSchema)}.
Text: "${inputText}"
Return ONLY valid JSON matching the schema.`;

    try {
      const response = await llm.generateCompletion([
        { role: 'system', content: 'You are an AI entity extraction engine.' },
        { role: 'user', content: prompt },
      ], [], { temperature: 0.1 });

      const jsonStr = (response.content || '{}').replace(/```json|```/g, '').trim();
      const extracted = JSON.parse(jsonStr);

      context.variables[`extracted_${nodeData.variableName || 'data'}`] = extracted;

      return {
        status: 'continue',
        branch: 'success',
      };
    } catch (e: any) {
      return {
        status: 'continue',
        branch: 'failure',
        error: e.message,
      };
    }
  }
}
