import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LlmProviderFactory } from '../providers/llm-provider.factory';
import { ToolRegistry } from '../tools/registry/tool.registry';
import { ToolContext } from '../tools/tool.interface';
import { LlmMessage } from '../providers/llm-provider.interface';

@Injectable()
export class BusinessAgentService {
  private readonly logger = new Logger(BusinessAgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llmFactory: LlmProviderFactory,
    private readonly toolRegistry: ToolRegistry,
  ) {}

  async query(shopId: string, question: string): Promise<{ answer: string; data?: any }> {
    const config = await this.prisma.chatbotConfig.findUnique({ where: { shopId } });
    if (!config?.isActive) {
      return { answer: 'AI is not configured for your business. Please enable it in Chatbot settings.' };
    }

    const llm = await this.llmFactory.create(config);

    // Full business owner tool suite
    const businessToolNames = [
      'get_daily_business_briefing',
      'get_conversation_stats',
      'get_lead_pipeline_summary',
      'get_campaign_stats',
      'get_campaigns',
      'create_campaign_draft',
      'get_hot_leads',
      'notify_owner_hot_lead',
      'search_contacts',
      'search_products',
      'check_stock',
      'get_active_workflows',
      'get_business_info',
    ];
    const tools = businessToolNames.map(n => this.toolRegistry.get(n)).filter(Boolean) as any[];
    const toolDefs = tools.map(t => ({ name: t.name, description: t.description, parameters: t.inputSchema }));

    const toolCtx: ToolContext = { shopId };

    const messages: LlmMessage[] = [
      {
        role: 'system',
        content: `You are an executive AI Business Operating Agent for a WhatsApp business owner.
Answer questions accurately using available tools. Highlight critical metrics, hot leads, campaign status, and inventory alerts clearly.
Today's date: ${new Date().toLocaleDateString('en-IN')}.`,
      },
      { role: 'user', content: question },
    ];

    for (let i = 0; i < 6; i++) {
      const response = await llm.generateCompletion(messages, toolDefs, { temperature: 0.2 });

      if (!response.toolCalls.length || response.finishReason === 'stop') {
        return { answer: response.content || 'No data available.' };
      }

      messages.push({ role: 'assistant', content: response.content || '' } as any);

      for (const tc of response.toolCalls) {
        const tool = tools.find(t => t.name === tc.name);
        if (!tool) continue;
        const result = await tool.execute(toolCtx, tc.arguments);
        messages.push({ role: 'tool', content: JSON.stringify(result.data || result), tool_call_id: tc.id, name: tc.name });
      }
    }

    return { answer: 'I was unable to retrieve the complete information at this time.' };
  }
}
