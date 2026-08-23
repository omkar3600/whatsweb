import { Module, forwardRef } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [forwardRef(() => WhatsappModule)],
  providers: [MessagesService],
  controllers: [MessagesController],
  exports: [MessagesService]
})
export class MessagesModule { }
