import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { EmbeddedSignupController } from './embedded-signup.controller';
import { EmbeddedSignupService } from './embedded-signup.service';
import { TokenRefreshService } from './token-refresh.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [HttpModule, PrismaModule],
    controllers: [EmbeddedSignupController],
    providers: [EmbeddedSignupService, TokenRefreshService],
    exports: [EmbeddedSignupService],
})
export class EmbeddedSignupModule { }
