import { Controller, Post, Get, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  createApiKey(@GetUser() user: any, @Body() body: { name: string, scopes?: string[] }) {
    return this.apiKeysService.createApiKey(user.shopId, body.name, body.scopes || []);
  }

  @Get()
  listApiKeys(@GetUser() user: any) {
    return this.apiKeysService.listApiKeys(user.shopId);
  }

  @Delete(':id')
  revokeApiKey(@GetUser() user: any, @Param('id') id: string) {
    return this.apiKeysService.revokeApiKey(user.shopId, id);
  }
}
