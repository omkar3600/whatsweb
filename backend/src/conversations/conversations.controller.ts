import { Controller, Get, Post, Param, Put, Query, UseGuards } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('conversations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('user')
export class ConversationsController {
    constructor(private readonly conversationsService: ConversationsService) { }

    @Get()
    async getConversations(
        @GetUser() user: any,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
    ) {
        return this.conversationsService.getConversations(
            user.shopId,
            page ? parseInt(page, 10) : undefined,
            limit ? parseInt(limit, 10) : undefined,
            search,
        );
    }

    @Get(':id')
    async getConversation(@GetUser() user: any, @Param('id') id: string) {
        return this.conversationsService.getConversation(user.shopId, id);
    }

    @Post('contact/:contactId')
    async findOrCreate(@GetUser() user: any, @Param('contactId') contactId: string) {
        return this.conversationsService.findOrCreate(user.shopId, contactId);
    }

    @Put(':id/read')
    async markAsRead(@GetUser() user: any, @Param('id') id: string) {
        return this.conversationsService.markAsRead(user.shopId, id);
    }
}
