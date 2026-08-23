import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessagesService } from '../messages/messages.service';
import { ContactsService } from '../contacts/contacts.service';
import { MediaService } from '../media/media.service';

@Injectable()
export class IntegrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messagesService: MessagesService,
    private readonly contactsService: ContactsService,
    private readonly mediaService: MediaService,
  ) {}

  private async getOrCreateConversation(shopId: string, phone: string) {
    let contact = await this.prisma.contact.findUnique({
      where: { shopId_phone: { shopId, phone } }
    });

    if (!contact) {
      contact = await this.prisma.contact.create({
        data: {
          shopId,
          phone,
          name: 'Unknown via API'
        }
      });
    }

    let conversation = await this.prisma.conversation.findUnique({
      where: { shopId_contactId: { shopId, contactId: contact.id } }
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          shopId,
          contactId: contact.id
        }
      });
    }

    return conversation;
  }

  async sendMessage(shopId: string, phone: string, text: string) {
    try {
      const conversation = await this.getOrCreateConversation(shopId, phone);
      const message = await this.messagesService.sendMessage(shopId, conversation.id, { 
        type: 'text', 
        content: text 
      });
      return { success: true, messageId: message.id, status: 'queued' };
    } catch (e) {
      throw new BadRequestException('Failed to send message: ' + e.message);
    }
  }

  async sendMediaMessage(shopId: string, phone: string, file: Express.Multer.File, caption?: string) {
    try {
      const uploadedMedia = await this.mediaService.uploadFile(shopId, file);
      const conversation = await this.getOrCreateConversation(shopId, phone);
      
      const fileType = file.mimetype.startsWith('image/') ? 'image' : 'document';
      
      const message = await this.messagesService.sendMessage(shopId, conversation.id, {
        type: fileType,
        mediaUrl: uploadedMedia.fileUrl,
        content: caption || undefined
      });
      
      return { success: true, messageId: message.id, status: 'queued', mediaUrl: uploadedMedia.fileUrl };
    } catch (e) {
      throw new BadRequestException('Failed to send media message: ' + e.message);
    }
  }

  async syncContact(shopId: string, data: { name: string, phone: string, email?: string }) {
    const contact = await this.prisma.contact.upsert({
      where: { shopId_phone: { shopId, phone: data.phone } },
      update: { name: data.name },
      create: { shopId, phone: data.phone, name: data.name },
    });
    return { success: true, contactId: contact.id };
  }
}
