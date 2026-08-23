import { Injectable } from '@nestjs/common';
import { INodeExecutor, INodeSchema, ExecutionContext, ExecutionResult } from '../interfaces/node-executor.interface';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class EcomOrderExecutor implements INodeExecutor {
  type = 'ecomOrder';
  schema: INodeSchema = {
    validate: () => {},
    getSchema: () => ({ type: 'object' }),
  };

  constructor(private readonly prisma: PrismaService) {}

  async execute(context: ExecutionContext, nodeData: any): Promise<ExecutionResult> {
    const action = nodeData.action || 'check_status';

    if (action === 'create_order') {
      const orderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
      context.variables.lastOrderId = orderId;

      await this.prisma.contact.update({
        where: { id: context.contactId },
        data: { aiLeadStage: 'PAYMENT_PENDING' },
      });

      return {
        status: 'continue',
        branch: 'success',
      };
    }

    return {
      status: 'continue',
      branch: 'success',
    };
  }
}
