import { Controller, Get, Put, Patch, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('chatbot')
export class ChatbotController {
    constructor(private readonly chatbotService: ChatbotService) {}

    @Get('config')
    async getConfig(@Req() req: any) {
        const shopId = req.user.shopId;
        const config = await this.chatbotService.getConfig(shopId);
        if (!config) return {
            isActive: false,
            model: 'openai/gpt-oss-120b',
            temperature: 0.7,
            systemPrompt: '',
            businessInfo: '',
            apiKey: '',
            agentMode: false,
            autonomyLevel: 2,
            agentName: 'AI Assistant',
            agentPersonality: '',
            allowedTools: [],
            followupEnabled: false,
            hotLeadThreshold: 70,
            maxIterations: 8,
        };

        // Mask the API key — only expose last 4 chars
        return {
            ...config,
            apiKey: config.apiKey ? `****${config.apiKey.slice(-4)}` : '',
        };
    }

    @Put('config')
    async updateConfig(@Req() req: any, @Body() body: {
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
        allowedTools?: string[];
        followupEnabled?: boolean;
        hotLeadThreshold?: number;
        maxIterations?: number;
    }) {
        const shopId = req.user.shopId;
        // If API key is masked (starts with ****), don't overwrite the saved one
        const data = { ...body };
        if (data.apiKey) {
            data.apiKey = data.apiKey.trim();
        }
        if (data.apiKey?.startsWith('****')) {
            delete data.apiKey;
        }
        return this.chatbotService.upsertConfig(shopId, data);
    }

    @Patch('conversations/:conversationId/pause')
    async togglePause(
        @Req() req: any,
        @Param('conversationId') conversationId: string,
        @Body('paused') paused: boolean,
    ) {
        const shopId = req.user.shopId;
        await this.chatbotService.toggleAiPause(shopId, conversationId, paused);
        return { success: true, conversationId, aiPaused: paused };
    }

    @Post('test')
    async testConnection(@Req() req: any, @Body('message') message?: string) {
        const shopId = req.user.shopId;
        const config = await this.chatbotService.getConfig(shopId);
        if (!config) return { success: false, message: 'Chatbot configuration not found.' };

        const userMessage = message?.trim() || 'Hello! Please introduce yourself in one sentence.';
        const reply = await this.chatbotService.generateResponse(shopId, 'Test User', userMessage);
        if (reply.text) return { success: true, reply: reply.text };
        return { success: false, message: `AI Error: ${reply.error}` };
    }
}
