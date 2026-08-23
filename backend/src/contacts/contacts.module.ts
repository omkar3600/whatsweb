import { Module } from '@nestjs/common';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';

@Module({
  imports: [],
  controllers: [ContactsController],
  providers: [ContactsService],
  exports: [ContactsService]
})
export class ContactsModule {}
