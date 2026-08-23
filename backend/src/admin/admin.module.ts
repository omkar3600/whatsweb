import { Module, Global } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SystemConfigService } from './system-config.service';

@Global()
@Module({
  controllers: [AdminController],
  providers: [AdminService, SystemConfigService],
  exports: [SystemConfigService],
})
export class AdminModule {}
