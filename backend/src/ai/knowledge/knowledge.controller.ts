import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { KnowledgeService } from './knowledge.service';

@Controller('ai/knowledge')
@UseGuards(JwtAuthGuard)
export class KnowledgeController {
  constructor(private readonly knowledge: KnowledgeService) {}

  @Get()
  list(@Request() req: any) { return this.knowledge.list(req.user.shopId); }

  @Post()
  create(@Body() body: { title: string; content: string; category?: string }, @Request() req: any) {
    return this.knowledge.create(req.user.shopId, body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.knowledge.update(id, req.user.shopId, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: any) {
    return this.knowledge.delete(id, req.user.shopId);
  }
}
