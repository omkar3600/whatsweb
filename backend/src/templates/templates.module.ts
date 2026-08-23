import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';

@Module({
  imports: [HttpModule],
  controllers: [TemplatesController],
  providers: [TemplatesService]
})
export class TemplatesModule { }
