import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../common/services/crypto.service';
import { normalizeGroqModel } from '../ai/providers/groq.provider';
import Groq from 'groq-sdk';

@Injectable()
export class ChatbotService {
    private readonly logger = new Logger(ChatbotService.name);

    constructor(
        private prisma: PrismaService,
        private crypto: CryptoService,
    ) {}

    async getConfig(shopId: string) {
        if (!shopId) return null;
        return this.prisma.chatbotConfig.findUnique({ where: { shopId } });
    }

    async upsertConfig(shopId: string, data: {
        isActive?: boolean;
        apiKey?: string;
        model?: string;
        temperature?: number;
        systemPrompt?: string;
        businessInfo?: string;
        agentMode?: boolean;
        autonomyLevel?: number;
        agentName?: string;
        agentPersonality?: string;
        allowedTools?: any;
        followupEnabled?: boolean;
        hotLeadThreshold?: number;
        maxIterations?: number;
    }) {
        return this.prisma.chatbotConfig.upsert({
            where: { shopId },
            update: data,
            create: { shopId, ...data },
        });
    }

    /**
     * Generate an AI reply for an incoming message.
     * Returns the text reply or an error message.
     */
    async generateResponse(shopId: string, contactName: string, userMessage: string, conversationId?: string): Promise<{ text?: string, error?: string }> {
        const config = await this.getConfig(shopId);

        if (!config || !config.isActive) {
            return { error: 'Chatbot is not configured or is inactive.' };
        }

        // Determine API key (decrypted shop key or platform fallback)
        let apiKey = '';
        if (config.apiKey) {
            try {
                apiKey = this.crypto.decrypt(config.apiKey);
            } catch {
                apiKey = config.apiKey;
            }
        }

        if (!apiKey) {
            const sysKey = await this.prisma.systemConfig.findUnique({ where: { key: 'GROQ_API_KEY' } });
            apiKey = sysKey?.value || process.env.GROQ_API_KEY || '';
        }

        if (!apiKey) {
            return { error: 'No Groq API key configured. Please set your API key in Chatbot settings.' };
        }

        try {
            // Configure Groq client with strict 12s timeout and 1 retry
            const groq = new Groq({ apiKey, timeout: 12000, maxRetries: 1 });
            
            const knowledgeSources = await this.prisma.aiKnowledgeSource.findMany({
                where: { shopId, isActive: true },
                take: 5,
            });

            const systemContext = this.buildSystemPrompt(
                config.systemPrompt,
                config.businessInfo,
                contactName,
                knowledgeSources,
                config.allowedTools
            );

            const messages: any[] = [
                { role: 'system', content: systemContext }
            ];

            // --- Chat Context / History (Bounded to 6 recent turns) ---
            if (conversationId) {
                const history = await this.prisma.message.findMany({
                    where: { conversationId },
                    orderBy: { timestamp: 'desc' },
                    take: 6,
                });

                const sortedHistory = history.reverse();

                for (const msg of sortedHistory) {
                    if (msg.content) {
                        const content = msg.content.length > 400 ? msg.content.slice(0, 400) + '...' : msg.content;
                        messages.push({
                            role: msg.direction === 'inbound' ? 'user' : 'assistant',
                            content
                        });
                    }
                }
            }

            // Ensure the latest user message is included as the final user turn
            const lastMsg = messages[messages.length - 1];
            if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== userMessage) {
                const cleanUserMessage = userMessage.length > 1000 ? userMessage.slice(0, 1000) + '...' : userMessage;
                messages.push({ role: 'user', content: cleanUserMessage });
            }
            // ------------------------------

            const primaryModel = normalizeGroqModel(config.model || 'openai/gpt-oss-120b');
            const fallbackModel = 'openai/gpt-oss-20b';
            const emergencyModel = 'groq/compound-mini';

            // Attempt 1: Primary Model
            try {
                const completion = await groq.chat.completions.create({
                    messages,
                    model: primaryModel,
                    temperature: config.temperature ?? 0.7,
                    max_tokens: 1024,
                });

                const replyText = completion.choices[0]?.message?.content?.trim();
                if (replyText) {
                    return { text: replyText };
                }
            } catch (primaryErr: any) {
                this.logger.warn(`[Chatbot] Primary model ${primaryModel} failed (${primaryErr.message}). Retrying with fast fallback model ${fallbackModel}...`);
            }

            // Attempt 2: High-speed Fallback Model (openai/gpt-oss-20b)
            if (primaryModel !== fallbackModel) {
                try {
                    const fallbackCompletion = await groq.chat.completions.create({
                        messages,
                        model: fallbackModel,
                        temperature: config.temperature ?? 0.7,
                        max_tokens: 1024,
                    });

                    const fallbackReply = fallbackCompletion.choices[0]?.message?.content?.trim();
                    if (fallbackReply) {
                        return { text: fallbackReply };
                    }
                } catch (fallbackErr: any) {
                    this.logger.warn(`[Chatbot] Fallback model ${fallbackModel} failed: ${fallbackErr.message}. Retrying with emergency model ${emergencyModel}...`);
                }
            }

            // Attempt 3: Emergency Model (groq/compound-mini)
            if (primaryModel !== emergencyModel) {
                try {
                    const emergencyCompletion = await groq.chat.completions.create({
                        messages,
                        model: emergencyModel,
                        temperature: config.temperature ?? 0.7,
                        max_tokens: 1024,
                    });

                    const emergencyReply = emergencyCompletion.choices[0]?.message?.content?.trim();
                    if (emergencyReply) {
                        return { text: emergencyReply };
                    }
                } catch (emergencyErr: any) {
                    this.logger.error(`[Chatbot] Emergency model ${emergencyModel} also failed: ${emergencyErr.message}`);
                    return { error: emergencyErr.message || 'Groq AI Service Unavailable' };
                }
            }

            return { error: 'Empty response returned from AI.' };
        } catch (err: any) {
            this.logger.error(`[Chatbot] Groq AI generation failed for shop ${shopId}: ${err.message}`);
            return { error: err.message || 'Unknown API Error' };
        }
    }

    private buildSystemPrompt(
        systemPrompt: string | null,
        businessInfo: string | null,
        contactName: string,
        knowledgeSources: any[] = [],
        allowedTools: any = null
    ): string {
        const parts: string[] = [];

        parts.push(`[CORE PERSONA & CHATBOT BEHAVIOR - MANDATORY OVERRIDE]`);
        if (systemPrompt && systemPrompt.trim()) {
            parts.push(systemPrompt.trim().slice(0, 3000));
        } else {
            parts.push('You are a helpful business assistant. Answer customer queries politely and professionally.');
        }

        parts.push(`\n[CURRENT CONVERSATION CONTEXT]`);
        parts.push(`The customer you are speaking to right now is named: ${contactName}.`);

        if (businessInfo && businessInfo.trim()) {
            const truncatedInfo = businessInfo.trim().length > 4000 
                ? businessInfo.trim().slice(0, 4000) + '... (truncated)' 
                : businessInfo.trim();
            parts.push(`\n[DETAILED BUSINESS PROFILE & RULES]`);
            parts.push(truncatedInfo);
        }

        if (allowedTools && Array.isArray(allowedTools.customActions) && allowedTools.customActions.length > 0) {
            parts.push(`\n[CUSTOM ACTIONS & AUTOMATED INTENT RULES]`);
            for (const ca of allowedTools.customActions.slice(0, 10)) {
                if (ca.enabled !== false && ca.name && ca.trigger) {
                    parts.push(`• ACTION NAME: "${ca.name}"`);
                    parts.push(`  WHEN CUSTOMER INTENT MATCHES: ${ca.trigger}`);
                    parts.push(`  RESPONSE / INSTRUCTION TO EXECUTE: ${ca.response}`);
                }
            }
        }

        if (knowledgeSources && knowledgeSources.length > 0) {
            parts.push(`\n[ATTACHED BUSINESS RESOURCES & KNOWLEDGE ARTICLES]`);
            for (const ks of knowledgeSources.slice(0, 3)) {
                parts.push(`--- ${ks.title} (${ks.category || 'General'}) ---`);
                const content = (ks.content || '').slice(0, 1200);
                parts.push(content);
            }
        }

        parts.push(`\n[CRITICAL FINAL OUTPUT INSTRUCTIONS - MUST OBEY]`);
        parts.push(`1. PERSONA & FORMATTING: Strictly adopt the exact tone, language, emojis, line breaks, and paragraph structure specified under [CORE PERSONA & CHATBOT BEHAVIOR - MANDATORY OVERRIDE].`);
        parts.push(`2. LINE BREAKS & PARAGRAPHS: Do NOT write response as one long continuous paragraph if new lines or line spacing were requested. Use clear line breaks (new lines) to separate thoughts into short, readable WhatsApp-style lines.`);
        parts.push(`3. MEDIA & UNKNOWN INFO: If the customer asks for photos, media, or info not in the business profile, state that our team will respond shortly.`);
        parts.push(`4. FACTUAL ACCURACY: Answer strictly using facts inside business profile, custom actions, and knowledge articles. Do NOT invent prices or rules.`);
        parts.push(`5. CUSTOM ACTIONS: When customer intent matches a [CUSTOM ACTION], execute that action's instructions immediately.`);

        return parts.join('\n');
    }

    async toggleAiPause(shopId: string, conversationId: string, paused: boolean) {
        return this.prisma.conversation.updateMany({
            where: { id: conversationId, shopId },
            data: { aiPaused: paused },
        });
    }
}
