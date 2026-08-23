import { Logger } from '@nestjs/common';
import Groq from 'groq-sdk';
import { LlmMessage, LlmProvider, LlmResponse, LlmToolDefinition } from './llm-provider.interface';

export function normalizeGroqModel(model?: string | null): string {
  if (!model) return 'openai/gpt-oss-120b';
  const m = model.trim();
  if (
    m === 'llama-3.1-8b-instant' ||
    m === 'llama-3-8b-8192' ||
    m === 'llama-guard-3-8b' ||
    m.includes('8b')
  ) {
    return 'openai/gpt-oss-20b';
  }
  if (
    m === 'llama-3.3-70b-versatile' ||
    m === 'llama-3.3-70b-specdec' ||
    m === 'llama-3.2-11b-vision-preview' ||
    m === 'llama-3.2-90b-vision-preview' ||
    m.includes('70b') ||
    m.includes('gemini') ||
    m.includes('llama')
  ) {
    return 'openai/gpt-oss-120b';
  }
  return m;
}

export class GroqProvider implements LlmProvider {
  private readonly logger = new Logger(GroqProvider.name);

  constructor(private readonly apiKey: string, private readonly model: string) {}

  async generateCompletion(
    messages: LlmMessage[],
    tools?: LlmToolDefinition[],
    options: { temperature?: number; maxTokens?: number } = {}
  ): Promise<LlmResponse> {
    const client = new Groq({ apiKey: this.apiKey, timeout: 15000, maxRetries: 1 });

    const groqMessages: any[] = messages.map(m => ({
      role: m.role,
      content: m.content,
      ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
      ...(m.name ? { name: m.name } : {}),
    }));

    const groqTools = tools?.map(t => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    const attemptModel = async (targetModel: string): Promise<LlmResponse | null> => {
      try {
        const response = await client.chat.completions.create({
          model: targetModel,
          messages: groqMessages,
          tools: groqTools?.length ? groqTools : undefined,
          tool_choice: groqTools?.length ? 'auto' : undefined,
          temperature: options.temperature ?? 0.4,
          max_tokens: options.maxTokens ?? 1024,
        });

        const choice = response.choices[0];
        const msg = choice.message;

        const toolCalls = (msg.tool_calls || []).map((tc: any) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments || '{}'),
        }));

        return {
          content: msg.content || null,
          toolCalls,
          finishReason: choice.finish_reason === 'tool_calls' ? 'tool_calls' : 'stop',
          usage: {
            promptTokens: response.usage?.prompt_tokens || 0,
            completionTokens: response.usage?.completion_tokens || 0,
          },
        };
      } catch (err: any) {
        this.logger.warn(`Groq completion error for model ${targetModel}: ${err.message}`);
        return null;
      }
    };

    const effectiveModel = normalizeGroqModel(this.model);
    const fallbackModel = 'openai/gpt-oss-20b';
    const emergencyModel = 'groq/compound-mini';

    // 1. Try configured / normalized model
    const primaryResult = await attemptModel(effectiveModel);
    if (primaryResult) return primaryResult;

    // 2. Fallback to fast model if primary fails
    if (effectiveModel !== fallbackModel) {
      this.logger.log(`[GroqProvider] Retrying completion with fallback model ${fallbackModel}`);
      const fallbackResult = await attemptModel(fallbackModel);
      if (fallbackResult) return fallbackResult;
    }

    // 3. Fallback to emergency compound model
    if (effectiveModel !== emergencyModel) {
      this.logger.log(`[GroqProvider] Retrying completion with emergency model ${emergencyModel}`);
      const emergencyResult = await attemptModel(emergencyModel);
      if (emergencyResult) return emergencyResult;
    }

    return { content: null, toolCalls: [], finishReason: 'error' };
  }
}
