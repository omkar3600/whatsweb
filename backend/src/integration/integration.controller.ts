import { Controller, Post, Body, UseGuards, Req, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { ApiKeyGuard } from './guards/api-key.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@UseGuards(ApiKeyGuard)
@Controller('api/v1/integration')
export class IntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}

  @Post('messages/send')
  async sendMessage(@Req() req: any, @Body() body: { phone: string, text: string }) {
    const shop = req.shop;
    return this.integrationService.sendMessage(shop.id, body.phone, body.text);
  }

  @Post('messages/send-media')
  @UseInterceptors(FileInterceptor('file'))
  async sendMediaMessage(
    @Req() req: any, 
    @Body() body: { phone: string, caption?: string }, 
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    const shop = req.shop;
    return this.integrationService.sendMediaMessage(shop.id, body.phone, file, body.caption);
  }

  @Post('contacts/sync')
  async syncContact(@Req() req: any, @Body() body: { name: string, phone: string, email?: string }) {
    const shop = req.shop;
    return this.integrationService.syncContact(shop.id, body);
  }
}
