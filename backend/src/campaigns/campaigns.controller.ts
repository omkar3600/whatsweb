import { Controller, Get, Post, Body, UseGuards, Param, Delete, Query } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('user')
export class CampaignsController {
    constructor(private readonly campaignsService: CampaignsService) { }

    @Post()
    async createCampaign(@GetUser() user: any, @Body() body: any) {
        return this.campaignsService.createCampaign(user.shopId, body);
    }

    @Post('estimate-audience')
    async estimateAudience(@GetUser() user: any, @Body() body: any) {
        return this.campaignsService.estimateAudience(user.shopId, body);
    }

    @Get()
    async getCampaigns(
        @GetUser() user: any,
        @Query('page') page?: string,
        @Query('limit') limit?: string
    ) {
        return this.campaignsService.getCampaigns(
            user.shopId,
            page ? parseInt(page, 10) : undefined,
            limit ? parseInt(limit, 10) : undefined
        );
    }

    @Get(':id/analytics')
    async getCampaignAnalytics(@GetUser() user: any, @Param('id') id: string) {
        return this.campaignsService.getCampaignAnalytics(user.shopId, id);
    }

    @Get(':id/audience-preview')
    async getAudiencePreview(@GetUser() user: any, @Param('id') id: string) {
        return this.campaignsService.getAudiencePreview(user.shopId, id);
    }

    @Post(':id/contacts/add-tags')
    async addTagsToContacts(@GetUser() user: any, @Param('id') id: string, @Body() body: any) {
        return this.campaignsService.addTagsToContacts(user.shopId, id, body);
    }

    @Post(':id/contacts/remove-tags')
    async removeTagsFromContacts(@GetUser() user: any, @Param('id') id: string, @Body() body: any) {
        return this.campaignsService.removeTagsFromContacts(user.shopId, id, body);
    }

    @Post(':id/resend-failed')
    async resendFailed(@GetUser() user: any, @Param('id') id: string, @Body() body: any) {
        return this.campaignsService.resendFailed(user.shopId, id, body?.phones);
    }

    @Post(':id/abort')
    async abortCampaign(@GetUser() user: any, @Param('id') id: string) {
        return this.campaignsService.abortCampaign(user.shopId, id);
    }

    @Post(':id/retarget')
    async launchRetarget(@GetUser() user: any, @Param('id') id: string, @Body() body: any) {
        return this.campaignsService.launchRetarget(user.shopId, id, body);
    }

    @Delete(':id')
    async deleteCampaign(@GetUser() user: any, @Param('id') id: string) {
        return this.campaignsService.deleteCampaign(user.shopId, id);
    }

    @Post(':id/restore')
    async restoreCampaign(@GetUser() user: any, @Param('id') id: string) {
        return this.campaignsService.restoreCampaign(user.shopId, id);
    }
}
