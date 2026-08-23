import { Controller, Get, Put, Body, UseGuards, Res } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { BypassShopStatus } from '../auth/decorators/bypass-shop-status.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
@BypassShopStatus()
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get('me')
    @BypassShopStatus()
    async getMe(@GetUser() user: any, @Res({ passthrough: true }) res: any) {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        return this.usersService.getProfile(user.id);
    }

    @Put('me')
    async updateProfile(@GetUser() user: any, @Body() body: any) {
        return this.usersService.updateProfile(user.id, body);
    }

    @Put('me/password')
    async changePassword(@GetUser() user: any, @Body() body: any) {
        return this.usersService.changePassword(user.id, body);
    }
}
