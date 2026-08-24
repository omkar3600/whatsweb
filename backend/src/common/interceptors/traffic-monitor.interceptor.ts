import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { TrafficMonitorService } from '../services/traffic-monitor.service';

@Injectable()
export class TrafficMonitorInterceptor implements NestInterceptor {
    constructor(private readonly trafficMonitor: TrafficMonitorService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const httpCtx = context.switchToHttp();
        const request = httpCtx.getRequest();
        const response = httpCtx.getResponse();
        const startTime = Date.now();

        const method = request.method || 'GET';
        const url = request.originalUrl || request.url || '/';

        return next.handle().pipe(
            tap({
                next: (data) => {
                    const durationMs = Date.now() - startTime;
                    const statusCode = response.statusCode || 200;
                    let responseBytes = 0;

                    if (data) {
                        if (Buffer.isBuffer(data)) {
                            responseBytes = data.length;
                        } else if (typeof data === 'string') {
                            responseBytes = Buffer.byteLength(data, 'utf8');
                        } else {
                            try {
                                responseBytes = Buffer.byteLength(JSON.stringify(data), 'utf8');
                            } catch {
                                responseBytes = 0;
                            }
                        }
                    }

                    this.trafficMonitor.recordRequest({
                        route: url,
                        method,
                        statusCode,
                        responseBytes,
                        durationMs,
                    });
                },
                error: (err) => {
                    const durationMs = Date.now() - startTime;
                    const statusCode = err.status || err.statusCode || 500;
                    this.trafficMonitor.recordRequest({
                        route: url,
                        method,
                        statusCode,
                        responseBytes: 100,
                        durationMs,
                    });
                }
            })
        );
    }
}
