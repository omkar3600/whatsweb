import { Controller, Get, Param, Post, Body, Delete, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('messages')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('user')
export class MessagesController {
    constructor(private readonly messagesService: MessagesService) { }

    @Get('conversation/:conversationId')
    async getMessages(@GetUser() user: any, @Param('conversationId') conversationId: string) {
        return this.messagesService.getMessages(user.shopId, conversationId);
    }

    @Post('conversation/:conversationId')
    async sendMessage(@GetUser() user: any, @Param('conversationId') conversationId: string, @Body() body: any) {
        return this.messagesService.sendMessage(user.shopId, conversationId, body);
    }

    @Delete('conversation/:conversationId/all')
    async clearConversationMessages(@GetUser() user: any, @Param('conversationId') conversationId: string) {
        return this.messagesService.clearConversationMessages(user.shopId, conversationId);
    }

    @Delete(':messageId')
    async deleteMessage(@GetUser() user: any, @Param('messageId') messageId: string) {
        return this.messagesService.deleteMessage(user.shopId, messageId);
    }
}
