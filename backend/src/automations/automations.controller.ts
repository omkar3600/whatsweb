import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AutomationsService } from './automations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('automations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('user')
export class AutomationsController {
    constructor(private readonly automationsService: AutomationsService) { }

    @Post()
    async createAutomation(@GetUser() user: any, @Body() body: any) {
        return this.automationsService.createAutomation(user.shopId, body);
    }

    @Get()
    async getAutomations(@GetUser() user: any) {
        return this.automationsService.getAutomations(user.shopId);
    }

    @Put(':id')
    async updateAutomation(@GetUser() user: any, @Param('id') id: string, @Body() body: any) {
        return this.automationsService.updateAutomation(user.shopId, id, body);
    }

    @Delete(':id')
    async deleteAutomation(@GetUser() user: any, @Param('id') id: string) {
        return this.automationsService.deleteAutomation(user.shopId, id);
    }
}
