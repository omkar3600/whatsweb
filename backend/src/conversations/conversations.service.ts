import { Injectable, NotFoundException, forwardRef, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatGateway } from '../chat/chat.gateway';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class ConversationsService {
    constructor(
        private prisma: PrismaService,
        private chatGateway: ChatGateway,
        @Inject(forwardRef(() => WhatsappService)) private whatsappService: WhatsappService,
    ) { }

    async getConversations(shopId: string, page?: number, limit?: number, search?: string) {
        if (!shopId) return { data: [], total: 0, page: 1, totalPages: 0, hasMore: false };

        const trimmedSearch = search ? search.trim() : '';
        const searchFilter = trimmedSearch
            ? {
                OR: [
                    { contact: { name: { contains: trimmedSearch, mode: 'insensitive' as const } } },
                    { contact: { phone: { contains: trimmedSearch } } },
                ],
            }
            : {};

        const where: any = { shopId, ...searchFilter };
        const take = limit || 100;
        const pageNum = page && page > 0 ? page : 1;
        const skip = (pageNum - 1) * take;

        const [data, total] = await Promise.all([
            this.prisma.conversation.findMany({
                where,
                include: { contact: true },
                orderBy: { lastMessageAt: 'desc' },
                take,
                skip,
            }),
            this.prisma.conversation.count({ where }),
        ]);

        const totalPages = Math.ceil(total / take);
        const hasMore = pageNum * take < total;

        return {
            data,
            total,
            page: pageNum,
            totalPages,
            hasMore,
        };
    }

    async getConversation(shopId: string, id: string) {
        const convo = await this.prisma.conversation.findFirst({
            where: { id, shopId },
            include: { contact: true },
        });
        if (!convo) throw new NotFoundException('Conversation not found');
        return convo;
    }

    async findOrCreate(shopId: string, contactId: string) {
        let convo = await this.prisma.conversation.findFirst({
            where: { shopId, contactId },
            include: { contact: true },
        });

        if (!convo) {
            convo = await this.prisma.conversation.create({
                data: {
                    shopId,
                    contactId,
                    lastMessageAt: new Date(),
                },
                include: { contact: true },
            });
        }

        return convo;
    }

    async markAsRead(shopId: string, id: string) {
        await this.getConversation(shopId, id);
        const updated = await this.prisma.conversation.update({
            where: { id },
            data: { unreadCount: 0 },
        });
        this.chatGateway.notifyRead(shopId, id);

        const unreadMessages = await this.prisma.message.findMany({
            where: { conversationId: id, direction: 'inbound', status: { not: 'read' } }
        });

        if (unreadMessages.length > 0) {
            await this.prisma.message.updateMany({
                where: { id: { in: unreadMessages.map(m => m.id) } },
                data: { status: 'read' }
            });

            for (const msg of unreadMessages) {
                if (msg.id.startsWith('wamid.')) {
                    await this.whatsappService.markMessageAsRead(shopId, msg.id);
                }
            }
        }

        return updated;
    }
}
