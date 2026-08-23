import { Injectable, Logger } from '@nestjs/common';
import { ExecutionContext, ExecutionResult, INodeExecutor, INodeSchema } from '../interfaces/node-executor.interface';
import { PrismaService } from '../../../prisma/prisma.service';

class BusinessHoursSchema implements INodeSchema {
  validate(config: any): void {}
  getSchema(): any {
    return {
      type: 'object',
      properties: {
        startHour: { type: 'number', default: 9 },
        endHour: { type: 'number', default: 18 },
        timezone: { type: 'string', default: 'UTC' },
      },
    };
  }
}

@Injectable()
export class BusinessHoursExecutor implements INodeExecutor {
  type = 'businessHours';
  schema = new BusinessHoursSchema();
  private readonly logger = new Logger(BusinessHoursExecutor.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(context: ExecutionContext, nodeData: any): Promise<ExecutionResult> {
    this.logger.log(`[Workflow Node] Executing BusinessHours for instance ${context.instanceId}`);

    const now = new Date();
    const currentHour = now.getUTCHours(); // default UTC calculation
    const start = typeof nodeData.startHour === 'number' ? nodeData.startHour : 9;
    const end = typeof nodeData.endHour === 'number' ? nodeData.endHour : 18;

    const isOpen = currentHour >= start && currentHour < end;
    const branch = isOpen ? 'open' : 'closed';

    this.logger.log(`[BusinessHours Node] Hour=${currentHour} (${start}:00-${end}:00) -> Branch: ${branch}`);
    context.variables.businessHoursStatus = branch;
    return { status: 'continue', branch };
  }
}
