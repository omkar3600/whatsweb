import { Injectable } from '@nestjs/common';
import { SystemConfigService } from '../../admin/system-config.service';
import { CryptoService } from '../../common/services/crypto.service';
import { LlmProvider } from './llm-provider.interface';
import { GroqProvider, normalizeGroqModel } from './groq.provider';

@Injectable()
export class LlmProviderFactory {
  constructor(
    private readonly systemConfig: SystemConfigService,
    private readonly crypto: CryptoService,
  ) {}

  async create(chatbotConfig: {
    apiKey?: string | null;
    model?: string | null;
    provider?: string;
  }): Promise<LlmProvider> {
    const provider = chatbotConfig.provider || 'groq';
    const model = normalizeGroqModel(chatbotConfig.model || 'openai/gpt-oss-120b');

    let apiKey: string;
    if (chatbotConfig.apiKey) {
      // Per-shop key (encrypted)
      try {
        apiKey = this.crypto.decrypt(chatbotConfig.apiKey);
      } catch {
        apiKey = chatbotConfig.apiKey; // fallback if not encrypted
      }
    } else {
      // Platform-level fallback from SystemConfig or env
      apiKey = await this.systemConfig.get('GROQ_API_KEY', process.env.GROQ_API_KEY) || '';
    }

    if (!apiKey) throw new Error('No LLM API key configured. Set GROQ_API_KEY in system settings.');

    if (provider === 'groq') {
      return new GroqProvider(apiKey, model);
    }
    throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}
