import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { INodeExecutor, INodeSchema, ExecutionContext, ExecutionResult } from '../interfaces/node-executor.interface';
import { WhatsappService } from '../../../whatsapp/whatsapp.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class WhatsAppCatalogExecutor implements INodeExecutor {
  type = 'whatsappCatalog';
  schema: INodeSchema = {
    validate: () => {},
    getSchema: () => ({ type: 'object' }),
  };

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => WhatsappService))
    private readonly whatsapp: WhatsappService,
  ) {}

  private async getPhone(contactId: string): Promise<string | null> {
    const c = await this.prisma.contact.findUnique({ where: { id: contactId } });
    return c?.phone || null;
  }

  async execute(context: ExecutionContext, nodeData: any): Promise<ExecutionResult> {
    const phone = await this.getPhone(context.contactId);
    if (!phone) return { status: 'error', error: 'Contact phone missing' };

    const productTitle = nodeData.productTitle || 'Product Catalog Item';

    await this.whatsapp.sendOutboundMessage(context.shopId, phone, 'text', `🛍️ *${productTitle}*\n${nodeData.description || 'View details in catalog.'}`);

    return {
      status: 'continue',
      branch: 'success',
    };
  }
}
