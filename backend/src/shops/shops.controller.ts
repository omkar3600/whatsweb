import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ShopsService } from './shops.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('shops')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('user', 'admin') // shop owners, but admins can access too theoretically if we pass shopId
export class ShopsController {
    constructor(private readonly shopsService: ShopsService) { }

    @Get('me')
    async getMyShop(@GetUser() user: any) {
        return this.shopsService.getShopOverview(user.shopId);
    }

    @Put('me')
    async updateMyShop(@GetUser() user: any, @Body() body: any) {
        return this.shopsService.updateShopDetails(user.shopId, body);
    }

    @Get('credentials')
    async getWhatsAppCredentials(@GetUser() user: any) {
        return this.shopsService.getWhatsAppCredentials(user.shopId);
    }

    @Put('credentials')
    async updateWhatsAppCredentials(@GetUser() user: any, @Body() body: any) {
        return this.shopsService.updateWhatsAppCredentials(user.shopId, body);
    }
}
