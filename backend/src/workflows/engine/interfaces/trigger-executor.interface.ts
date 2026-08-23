import { INodeSchema } from './node-executor.interface';

export interface ITriggerExecutor {
  type: string;
  schema?: INodeSchema;
  evaluate?(payload: any): Promise<void>;
  validateCondition?(triggerData: any, eventData: any): boolean;
}
