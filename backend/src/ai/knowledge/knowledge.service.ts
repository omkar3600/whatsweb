import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class KnowledgeService {
  constructor(private readonly prisma: PrismaService) {}

  async list(shopId: string) {
    return this.prisma.aiKnowledgeSource.findMany({ where: { shopId }, orderBy: { createdAt: 'desc' } });
  }

  async create(shopId: string, data: { title: string; content: string; category?: string }) {
    return this.prisma.aiKnowledgeSource.create({ data: { shopId, ...data, category: data.category || 'general' } });
  }

  async update(id: string, shopId: string, data: { title?: string; content?: string; category?: string; isActive?: boolean }) {
    const src = await this.prisma.aiKnowledgeSource.findFirst({ where: { id, shopId } });
    if (!src) throw new NotFoundException('Knowledge source not found');
    return this.prisma.aiKnowledgeSource.update({ where: { id }, data });
  }

  async delete(id: string, shopId: string) {
    const src = await this.prisma.aiKnowledgeSource.findFirst({ where: { id, shopId } });
    if (!src) throw new NotFoundException('Knowledge source not found');
    await this.prisma.aiKnowledgeSource.delete({ where: { id } });
    return { success: true };
  }
}
