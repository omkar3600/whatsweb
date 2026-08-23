import { Module, forwardRef } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [forwardRef(() => WhatsappModule)],
  controllers: [ConversationsController],
  providers: [ConversationsService]
})
export class ConversationsModule {}
