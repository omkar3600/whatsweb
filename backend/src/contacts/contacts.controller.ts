import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Query, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ContactsService } from './contacts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { memoryStorage } from 'multer';
import type { Express } from 'express';
import { CreateContactDto, UpdateContactDto, GetContactsQueryDto } from './dto/contacts.dto';

@Controller('contacts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('user')
export class ContactsController {
    constructor(private readonly contactsService: ContactsService) { }

    @Post()
    async createContact(@GetUser() user: any, @Body() body: CreateContactDto) {
        return this.contactsService.createContact(user.shopId, body);
    }

    @Post('import')
    @UseInterceptors(FileInterceptor('file', {
        storage: memoryStorage(),
        limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    }))
    async importContacts(@GetUser() user: any, @UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('No file uploaded');
        return this.contactsService.importFromExcel(user.shopId, file);
    }

    @Post('bulk')
    async importBulkContacts(@GetUser() user: any, @Body() body: { rows: any[] }) {
        if (!body.rows || !Array.isArray(body.rows)) throw new BadRequestException('Invalid payload');
        return this.contactsService.importBulk(user.shopId, body.rows);
    }

    @Get()
    async getContacts(@GetUser() user: any, @Query() query: GetContactsQueryDto) {
        return this.contactsService.getContacts(user.shopId, query);
    }

    @Post('normalize')
    async normalizeContacts(@GetUser() user: any) {
        return this.contactsService.normalizeContacts(user.shopId);
    }

    @Get('tags')
    async getContactTags(@GetUser() user: any) {
        return this.contactsService.getContactTagsWithCount(user.shopId);
    }

    @Post('tags/add')
    async addTagsBulk(@GetUser() user: any, @Body() body: { contactIds?: string[]; phones?: string[]; tags: string[] }) {
        return this.contactsService.addTagsBulk(user.shopId, body);
    }

    @Post('tags/remove')
    async removeTagsBulk(@GetUser() user: any, @Body() body: { contactIds?: string[]; phones?: string[]; tags?: string[]; removeAll?: boolean }) {
        return this.contactsService.removeTagsBulk(user.shopId, body);
    }

    @Get('cities')
    async getContactCities(@GetUser() user: any) {
        return this.contactsService.getContactCities(user.shopId);
    }

    @Get('all-ids')
    async getAllContactIds(@GetUser() user: any, @Query() query: GetContactsQueryDto) {
        return this.contactsService.getAllMatchingIds(user.shopId, query);
    }

    @Get('stats')
    async getContactStats(@GetUser() user: any) {
        return this.contactsService.getContactStats(user.shopId);
    }

    @Get(':id')
    async getContact(@GetUser() user: any, @Param('id') id: string) {
        return this.contactsService.getContact(user.shopId, id);
    }

    @Put(':id')
    async updateContact(@GetUser() user: any, @Param('id') id: string, @Body() body: UpdateContactDto) {
        return this.contactsService.updateContact(user.shopId, id, body);
    }

    @Delete('bulk')
    async deleteBulkContacts(@GetUser() user: any, @Body() body: { ids: string[] }) {
        return this.contactsService.deleteBulk(user.shopId, body.ids);
    }

    @Delete(':id')
    async deleteContact(@GetUser() user: any, @Param('id') id: string) {
        return this.contactsService.deleteContact(user.shopId, id);
    }
}
