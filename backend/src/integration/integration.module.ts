import { Module } from '@nestjs/common';
import { IntegrationController } from './integration.controller';
import { IntegrationService } from './integration.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MessagesModule } from '../messages/messages.module';
import { ContactsModule } from '../contacts/contacts.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [PrismaModule, MessagesModule, ContactsModule, MediaModule],
  controllers: [IntegrationController],
  providers: [IntegrationService]
})
export class IntegrationModule {}
