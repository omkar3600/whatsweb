import { Controller, Post, Get, Delete, Param, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { Express } from 'express';
import { memoryStorage } from 'multer';

@Controller('media')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('user', 'admin')
export class MediaController {
    constructor(private readonly mediaService: MediaService) { }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file', {
        storage: memoryStorage(),
        limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
    }))
    async uploadFile(@GetUser() user: any, @UploadedFile() file: Express.Multer.File) {
        return this.mediaService.uploadFile(user.shopId, file);
    }

    @Get()
    async getMediaFiles(@GetUser() user: any) {
        return this.mediaService.getMediaFiles(user.shopId);
    }

    @Delete(':id')
    async deleteMediaFile(@GetUser() user: any, @Param('id') id: string) {
        return this.mediaService.deleteMediaFile(user.shopId, id);
    }
}
