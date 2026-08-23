export interface LlmMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  name?: string;
}

export interface LlmToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>; // JSON Schema object
}

export interface LlmToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface LlmResponse {
  content: string | null;
  toolCalls: LlmToolCall[];
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error';
  usage?: { promptTokens: number; completionTokens: number };
}

export interface LlmProvider {
  generateCompletion(
    messages: LlmMessage[],
    tools?: LlmToolDefinition[],
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<LlmResponse>;
}
