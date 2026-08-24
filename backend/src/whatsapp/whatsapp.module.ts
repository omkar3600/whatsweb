import { Module, forwardRef } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WebhooksController } from './webhooks/webhooks.controller';
import { WhatsappController } from './whatsapp.controller';
import { HttpModule } from '@nestjs/axios';
import { ChatbotModule } from '../chatbot/chatbot.module';
import { ChatModule } from '../chat/chat.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { BullModule } from '@nestjs/bullmq';
import { ConsentModule } from '../consent/consent.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [
    HttpModule,
    ChatbotModule,
    ChatModule,
    MediaModule,
    forwardRef(() => WorkflowsModule),
    BullModule.registerQueue({ name: 'ai-agent-queue' }),
    ConsentModule,
  ],
  providers: [WhatsappService],
  controllers: [WebhooksController, WhatsappController],
  exports: [WhatsappService],
})
export class WhatsappModule { }
