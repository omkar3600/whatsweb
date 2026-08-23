import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { BusinessAgentService } from './business-agent.service';

@Controller(['ai/business', 'ai/business-agent'])
@UseGuards(JwtAuthGuard)
export class BusinessAgentController {
  constructor(private readonly businessAgent: BusinessAgentService) {}

  @Post('query')
  async query(@Body() body: { question: string }, @Request() req: any) {
    const shopId = req.user.shopId;
    return this.businessAgent.query(shopId, body.question);
  }
}
