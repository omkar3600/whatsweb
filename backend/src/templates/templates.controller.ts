import { Controller, Get, Post, Delete, Param, Body, UseGuards, UseInterceptors, UploadedFile, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TemplatesService } from './templates.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { PRE_APPROVED_TEMPLATES } from './templates.library';

@Controller('templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('user')
export class TemplatesController {
    constructor(private readonly templatesService: TemplatesService) { }

    @Post()
    async createTemplate(@GetUser() user: any, @Body() body: any) {
        return this.templatesService.createTemplate(user.shopId, body);
    }

    @Get()
    async getTemplates(
        @GetUser() user: any,
        @Query('page') page?: string,
        @Query('limit') limit?: string
    ) {
        return this.templatesService.getTemplates(
            user.shopId,
            page ? parseInt(page, 10) : undefined,
            limit ? parseInt(limit, 10) : undefined
        );
    }

    @Get('library')
    async getLibrary() {
        return PRE_APPROVED_TEMPLATES;
    }

    @Delete(':id')
    async deleteTemplate(@GetUser() user: any, @Param('id') id: string) {
        return this.templatesService.deleteTemplate(user.shopId, id);
    }

    @Post('sync')
    async syncTemplates(@GetUser() user: any) {
        return this.templatesService.syncTemplates(user.shopId);
    }

    @Post('upload-media')
    @UseInterceptors(FileInterceptor('file'))
    async uploadTemplateMedia(@GetUser() user: any, @UploadedFile() file: Express.Multer.File) {
        return this.templatesService.uploadTemplateMedia(user.shopId, file);
    }

    @Post('upload-media-url')
    async uploadTemplateMediaUrl(@GetUser() user: any, @Body() body: { fileUrl: string }) {
        return this.templatesService.uploadTemplateMediaFromUrl(user.shopId, body.fileUrl);
    }
}
