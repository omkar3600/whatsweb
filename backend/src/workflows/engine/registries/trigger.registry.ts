import { Injectable, Logger } from '@nestjs/common';
import { ITriggerExecutor } from '../interfaces/trigger-executor.interface';

@Injectable()
export class TriggerRegistry {
  private readonly logger = new Logger(TriggerRegistry.name);
  private triggers = new Map<string, ITriggerExecutor>();

  register(executor: ITriggerExecutor) {
    if (this.triggers.has(executor.type)) {
      this.logger.warn(`Trigger executor for type ${executor.type} is already registered. Overwriting.`);
    }
    this.triggers.set(executor.type, executor);
    this.logger.log(`Registered trigger executor: ${executor.type}`);
  }

  get(type: string): ITriggerExecutor | undefined {
    return this.triggers.get(type);
  }

  getAll(): ITriggerExecutor[] {
    return Array.from(this.triggers.values());
  }
}
