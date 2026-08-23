export interface INodeSchema {
  validate(config: any): void;
  getSchema(): any;
}

export interface ExecutionContext {
  instanceId: string;
  shopId: string;
  workflowId: string;
  contactId: string;
  variables: Record<string, any>;
  getNodeData(nodeId: string): any;
}

export interface ExecutionResult {
  status: 'continue' | 'pause' | 'wait' | 'stop' | 'error';
  error?: string;
  delayMs?: number; // For pause
  resumeToken?: string; // For wait
  branch?: string; // For condition nodes (e.g., 'true' or 'false')
}

export interface INodeExecutor {
  type: string;
  schema: INodeSchema;
  execute(context: ExecutionContext, nodeData: any): Promise<ExecutionResult>;
}
