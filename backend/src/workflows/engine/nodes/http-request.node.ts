import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ExecutionContext, ExecutionResult, INodeExecutor, INodeSchema } from '../interfaces/node-executor.interface';
import { ExpressionEngineService } from '../expression-engine.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

class HttpRequestSchema implements INodeSchema {
  validate(config: any): void {
    if (!config.url) {
      throw new Error('url is required for HttpRequestNode');
    }
  }
  getSchema(): any {
    return {
      type: 'object',
      properties: {
        method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'] },
        url: { type: 'string' },
        headersJson: { type: 'string' },
        bodyJson: { type: 'string' },
        outputVariable: { type: 'string' },
      },
      required: ['url'],
    };
  }
}

@Injectable()
export class HttpRequestExecutor implements INodeExecutor {
  type = 'httpRequest';
  schema = new HttpRequestSchema();
  private readonly logger = new Logger(HttpRequestExecutor.name);

  constructor(
    private readonly expressionEngine: ExpressionEngineService,
    private readonly httpService: HttpService,
  ) {}

  async execute(context: ExecutionContext, nodeData: any): Promise<ExecutionResult> {
    this.logger.log(`[Workflow Node] Executing HttpRequest for instance ${context.instanceId}`);

    try {
      const evalCtx = {
        contact: context.variables.contact || {},
        variables: context.variables,
        workflow: context.variables.workflow || {},
      };

      const method = (nodeData.method || 'GET').toUpperCase();
      const rawUrl = nodeData.url || '';
      const interpolatedUrl = await this.expressionEngine.evaluateString(rawUrl, evalCtx);

      let headers = {};
      if (nodeData.headersJson) {
        try {
          const evalHeaders = await this.expressionEngine.evaluateString(nodeData.headersJson, evalCtx);
          headers = JSON.parse(evalHeaders);
        } catch (e: any) {
          this.logger.warn(`Failed to parse headers JSON: ${e.message}`);
        }
      }

      let data: any = undefined;
      if (['POST', 'PUT', 'PATCH'].includes(method) && nodeData.bodyJson) {
        try {
          const evalBody = await this.expressionEngine.evaluateString(nodeData.bodyJson, evalCtx);
          data = JSON.parse(evalBody);
        } catch {
          data = nodeData.bodyJson;
        }
      }

      this.logger.log(`[Workflow HTTP] ${method} ${interpolatedUrl}`);
      const response = await firstValueFrom(
        this.httpService.request({
          method,
          url: interpolatedUrl,
          headers,
          data,
          timeout: 10000,
        }),
      );

      const varName = nodeData.outputVariable || 'apiResponse';
      context.variables[varName] = response.data;
      return { status: 'continue', branch: 'success' };
    } catch (error: any) {
      this.logger.error(`[Workflow HTTP Error] ${error.message}`);
      const varName = nodeData.outputVariable || 'apiResponse';
      context.variables[varName] = { error: error.message, status: error.response?.status };
      return { status: 'continue', branch: 'error' };
    }
  }
}
