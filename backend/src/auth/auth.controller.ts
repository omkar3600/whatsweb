import { Controller, Post, Body, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { BypassShopStatus } from './decorators/bypass-shop-status.decorator';
import { RegisterInterestDto, RegisterShopDto, LoginDto } from './dto/auth.dto';

@Controller('auth')
@BypassShopStatus()
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('demo')
    async submitDemoRequest(@Body() body: any) {
        return this.authService.submitDemoRequest(body);
    }

    @Post('login')
    async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
        const result = await this.authService.login(body);
        res.cookie('token', result.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        return result;
    }

    @Post('logout')
    async logout(@Res({ passthrough: true }) res: Response) {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        });
        return { message: 'Logged out successfully' };
    }
}
