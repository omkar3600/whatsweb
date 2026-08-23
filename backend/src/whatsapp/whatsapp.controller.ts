import { Controller, Get, Put, Post, Body, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { WhatsappService } from './whatsapp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('whatsapp/profile')
@UseGuards(JwtAuthGuard)
export class WhatsappController {
    constructor(private readonly whatsappService: WhatsappService) { }

    @Get()
    async getProfile(@Request() req) {
        return this.whatsappService.getBusinessProfile(req.user.shopId);
    }

    @Put()
    async updateProfile(@Request() req, @Body() data: any) {
        return this.whatsappService.updateBusinessProfile(req.user.shopId, data);
    }

    @Post('picture')
    @UseInterceptors(FileInterceptor('file'))
    async uploadPicture(@Request() req, @UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('No file uploaded');
        return this.whatsappService.uploadProfilePicture(req.user.shopId, file);
    }

    @Post('name')
    async updateName(@Request() req, @Body('name') newName: string) {
        if (!newName) throw new BadRequestException('Name is required');
        return this.whatsappService.updateDisplayName(req.user.shopId, newName);
    }

    @Post('register')
    async registerNumber(@Request() req, @Body('pin') pin?: string) {
        return this.whatsappService.registerActiveNumber(req.user.shopId, pin);
    }
}
