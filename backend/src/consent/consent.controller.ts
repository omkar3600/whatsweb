import { Controller, Get, Patch, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ConsentService } from './consent.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UpdateConsentDto, BulkConsentUpdateDto, SaveConsentConfigDto } from './dto/consent.dto';

@Controller('contacts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('user')
export class ConsentController {
    constructor(private readonly consentService: ConsentService) {}

    @Get(':id/consent')
    async getConsent(@GetUser() user: any, @Param('id') id: string) {
        return this.consentService.getConsentForShopContact(user.shopId, id);
    }

    @Patch(':id/consent')
    async updateConsent(@GetUser() user: any, @Param('id') id: string, @Body() body: UpdateConsentDto) {
        return this.consentService.updateConsentForShopContact(user.shopId, id, body, user.id);
    }

    @Post('bulk-consent-update')
    async bulkConsentUpdate(@GetUser() user: any, @Body() body: BulkConsentUpdateDto) {
        return this.consentService.setBulkConsent(user.shopId, body.contactIds, body.status, {
            source: body.source || 'MANUAL_ACTION',
            reason: body.reason,
            updatedBy: user.id,
        });
    }

    @Get('consent/stats')
    async getConsentStats(@GetUser() user: any) {
        return this.consentService.getConsentStats(user.shopId);
    }

    @Get('consent/config')
    async getConsentConfig(@GetUser() user: any) {
        return this.consentService.getConsentConfig(user.shopId);
    }

    @Post('consent/config')
    async saveConsentConfig(@GetUser() user: any, @Body() body: SaveConsentConfigDto) {
        return this.consentService.saveConsentConfig(user.shopId, body);
    }
}
