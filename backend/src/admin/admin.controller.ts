import { Controller, Post, Get, Put, Body, Param, UseGuards, Delete, Query, Request } from '@nestjs/common';
import { AdminService } from './admin.service';
import { SystemConfigService } from './system-config.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
    constructor(
        private readonly adminService: AdminService,
        private readonly systemConfigService: SystemConfigService,
    ) { }

    @Post('shops')
    async createShop(@Body() body: any) {
        return this.adminService.createShop(body);
    }

    @Get('shops')
    async getShops() {
        return this.adminService.getShops();
    }

    @Put('shops/:shopId/subscription')
    async updateSubscription(@Param('shopId') shopId: string, @Body() body: any) {
        return this.adminService.updateSubscription(shopId, body);
    }

    @Put('shops/:shopId')
    async updateShop(@Param('shopId') shopId: string, @Body() body: any) {
        return this.adminService.updateShop(shopId, body);
    }

    @Put('shops/:shopId/status')
    async toggleShopStatus(@Param('shopId') shopId: string, @Body() body: any) {
        return this.adminService.toggleShopStatus(shopId, body.status);
    }

    @Delete('shops/:shopId')
    async deleteShop(@Param('shopId') shopId: string) {
        return this.adminService.deleteShop(shopId);
    }

    @Get('stats')
    async getStats() {
        return this.adminService.getStats();
    }

    @Get('demo-requests')
    async getDemoRequests() {
        return this.adminService.getDemoRequests();
    }

    @Post('demo-requests/:id/resolve')
    async resolveRequest(@Param('id') id: string) {
        return this.adminService.resolveDemoRequest(id);
    }

    @Post('demo-requests/:id/reject')
    async rejectRequest(@Param('id') id: string) {
        return this.adminService.rejectDemoRequest(id);
    }

    // ─── New Multi-Tenant Admin Endpoints ────────────────────────────────

    @Get('tenant-connections')
    async getTenantConnections() {
        return this.adminService.getTenantConnections();
    }

    @Get('webhook-failures')
    async getWebhookFailures(@Query('shopId') shopId?: string) {
        return this.adminService.getWebhookFailures(shopId);
    }

    @Get('dead-letter-events')
    async getDeadLetterEvents(@Query('status') status?: string) {
        return this.adminService.getDeadLetterEvents(status);
    }

    @Get('token-health')
    async getTokenHealth() {
        return this.adminService.getTokenHealth();
    }

    @Post('shops/:shopId/suspend')
    async suspendShop(@Param('shopId') shopId: string) {
        return this.adminService.suspendShop(shopId);
    }

    @Get('shops/:shopId/onboarding-status')
    async getOnboardingStatus(@Param('shopId') shopId: string) {
        return this.adminService.getOnboardingStatus(shopId);
    }

    @Post('shops/:shopId/whatsapp-credentials')
    async setWhatsAppCredentials(@Param('shopId') shopId: string, @Body() body: any) {
        return this.adminService.setWhatsAppCredentials(shopId, body);
    }

    // ─── Platform Config Endpoints ───────────────────────────────────────

    /** Returns all platform config keys (secrets are masked). */
    @Get('platform-config')
    async getPlatformConfig() {
        return this.systemConfigService.getAll();
    }

    /** Upsert a platform config key. */
    @Put('platform-config/:key')
    async setPlatformConfig(
        @Param('key') key: string,
        @Body() body: { value: string; isSecret?: boolean },
        @Request() req: any,
    ) {
        await this.systemConfigService.set(key, body.value, body.isSecret ?? false, req.user?.id);
        return { message: `Config key "${key}" updated successfully` };
    }

    /** Delete a platform config key (reverts to env var). */
    @Delete('platform-config/:key')
    async deletePlatformConfig(@Param('key') key: string) {
        await this.systemConfigService.delete(key);
        return { message: `Config key "${key}" removed (will fall back to env var)` };
    }
}
