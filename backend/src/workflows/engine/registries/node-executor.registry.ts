import { Injectable, Logger } from '@nestjs/common';
import { INodeExecutor } from '../interfaces/node-executor.interface';

@Injectable()
export class NodeExecutorRegistry {
  private readonly logger = new Logger(NodeExecutorRegistry.name);
  private executors = new Map<string, INodeExecutor>();

  register(executor: INodeExecutor) {
    if (this.executors.has(executor.type)) {
      this.logger.warn(`Node executor for type ${executor.type} is already registered. Overwriting.`);
    }
    this.executors.set(executor.type, executor);
    this.logger.log(`Registered node executor: ${executor.type}`);
  }

  get(type: string): INodeExecutor | undefined {
    return this.executors.get(type);
  }

  getAll(): INodeExecutor[] {
    return Array.from(this.executors.values());
  }
}
