import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { ActiveShopInterceptor } from './auth/interceptors/active-shop.interceptor';
import { PrismaModule } from './prisma/prisma.module';
import { AdminModule } from './admin/admin.module';
import { ShopsModule } from './shops/shops.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { ContactsModule } from './contacts/contacts.module';
import { ConversationsModule } from './conversations/conversations.module';
import { MessagesModule } from './messages/messages.module';
import { ChatModule } from './chat/chat.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { ConsentModule } from './consent/consent.module';
import { AutomationsModule } from './automations/automations.module';
import { TemplatesModule } from './templates/templates.module';
import { MediaModule } from './media/media.module';
import { UsersModule } from './users/users.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { EmbeddedSignupModule } from './embedded-signup/embedded-signup.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { IntegrationModule } from './integration/integration.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { AiModule } from './ai/ai.module';

import { NtfyService } from './notifications/ntfy.service';
import { N8nWebhookService } from './webhooks/n8n.service';
import { SystemSchedulerService } from './scheduler/system-scheduler.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // Rate limiting: 60 requests per 60 seconds per IP
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 120,
    }]),
    PrismaModule,
    CommonModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        username: process.env.REDIS_USERNAME || 'default',
        password: process.env.REDIS_PASSWORD || '',
        tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
        connectTimeout: 5000,
      },
    }),
    AuthModule,
    AdminModule,
    ShopsModule,
    WhatsappModule,
    ContactsModule,
    ConversationsModule,
    MessagesModule,
    ChatModule,
    CampaignsModule,
    ConsentModule,
    AutomationsModule,
    TemplatesModule,
    MediaModule,
    UsersModule,
    ChatbotModule,
    EmbeddedSignupModule,
    ApiKeysModule,
    IntegrationModule,
    WorkflowsModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    NtfyService,
    N8nWebhookService,
    SystemSchedulerService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ActiveShopInterceptor,
    },
  ],
})
export class AppModule { }
