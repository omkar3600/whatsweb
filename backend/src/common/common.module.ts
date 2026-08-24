import { Module, Global } from '@nestjs/common';
import { CryptoService } from './services/crypto.service';
import { TrafficMonitorService } from './services/traffic-monitor.service';
import { TrafficMonitorInterceptor } from './interceptors/traffic-monitor.interceptor';

@Global()
@Module({
    providers: [CryptoService, TrafficMonitorService, TrafficMonitorInterceptor],
    exports: [CryptoService, TrafficMonitorService, TrafficMonitorInterceptor],
})
export class CommonModule { }
