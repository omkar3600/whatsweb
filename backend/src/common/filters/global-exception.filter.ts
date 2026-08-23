import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Always extract a plain string message
    let message: string;
    if (exception instanceof HttpException) {
      const resp = exception.getResponse();
      if (typeof resp === 'string') {
        message = resp;
      } else if (typeof resp === 'object' && resp !== null) {
        const r = resp as any;
        const raw = r.message ?? r.error ?? 'An error occurred';
        message = Array.isArray(raw) ? raw.join(', ') : String(raw);
      } else {
        message = 'An error occurred';
      }
    } else {
      message = 'Internal server error';
    }

    // Log the exception
    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} - ${status}`,
        exception instanceof Error ? exception.stack : JSON.stringify(exception)
      );
    } else {
      this.logger.warn(`[${request.method}] ${request.url} - ${status} - ${message}`);
    }

    // Do not leak stack traces or internal errors to client in production
    const isProduction = process.env.NODE_ENV === 'production';
    
    const detail = exception instanceof Error ? exception.message : message;
    
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message,
      errorDetail: detail,
    });
  }
}
