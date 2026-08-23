import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AutomationsService {
    constructor(private prisma: PrismaService) { }

    async createAutomation(shopId: string, data: any) {
        const { type, triggerKeyword, replyText, isActive } = data;
        return this.prisma.automation.create({
            data: {
                shopId,
                type,
                triggerKeyword,
                replyText,
                isActive: isActive !== undefined ? isActive : true,
            },
        });
    }

    async getAutomations(shopId: string) {
        return this.prisma.automation.findMany({
            where: { shopId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async updateAutomation(shopId: string, id: string, data: any) {
        // First verify ownership, then update by id alone (Prisma requires unique key in where for update)
        const existing = await this.prisma.automation.findFirst({ where: { id, shopId } });
        if (!existing) throw new NotFoundException('Automation not found');
        return this.prisma.automation.update({
            where: { id },
            data,
        });
    }

    async deleteAutomation(shopId: string, id: string) {
        const existing = await this.prisma.automation.findFirst({ where: { id, shopId } });
        if (!existing) throw new NotFoundException('Automation not found');
        await this.prisma.automation.delete({ where: { id } });
        return { message: 'Automation deleted' };
    }
}
