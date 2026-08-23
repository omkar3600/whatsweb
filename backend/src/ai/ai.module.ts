import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

// Providers
import { LlmProviderFactory } from './providers/llm-provider.factory';

// Tools
import { ToolRegistry } from './tools/registry/tool.registry';
import { KnowledgeTools } from './tools/impl/knowledge-tools';
import { ContactTools } from './tools/impl/contact-tools';
import { ConversationTools } from './tools/impl/conversation-tools';
import { WhatsAppTools } from './tools/impl/whatsapp-tools';
import { CampaignTools } from './tools/impl/campaign-tools';
import { LeadTools } from './tools/impl/lead-tools';
import { AnalyticsTools } from './tools/impl/analytics-tools';
import { HandoffTool } from './tools/impl/handoff-tool';
import { ProductTools } from './tools/impl/product-tools';
import { SalesTools } from './tools/impl/sales-tools';
import { WorkflowTools } from './tools/impl/workflow-tools';
import { OwnerTools } from './tools/impl/owner-tools';

// Services & Controllers
import { BusinessAgentService } from './business/business-agent.service';
import { BusinessAgentController } from './business/business-agent.controller';

import { KnowledgeService } from './knowledge/knowledge.service';
import { KnowledgeController } from './knowledge/knowledge.controller';

import { FollowUpService } from './followup/followup.service';

// Dependencies
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { AdminModule } from '../admin/admin.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { CampaignsModule } from '../campaigns/campaigns.module';

@Module({
  imports: [
    PrismaModule,
    CommonModule,
    AdminModule,
    CampaignsModule,
    BullModule.registerQueue({ name: 'ai-agent-queue' }),
    forwardRef(() => WhatsappModule),
  ],
  providers: [
    LlmProviderFactory,
    ToolRegistry,
    KnowledgeTools,
    ContactTools,
    ConversationTools,
    WhatsAppTools,
    CampaignTools,
    LeadTools,
    AnalyticsTools,
    HandoffTool,
    ProductTools,
    SalesTools,
    WorkflowTools,
    OwnerTools,
    BusinessAgentService,
    KnowledgeService,
    FollowUpService,
  ],
  controllers: [
    BusinessAgentController,
    KnowledgeController,
  ],
  exports: [
    BusinessAgentService,
    KnowledgeService,
    FollowUpService,
    LlmProviderFactory,
    ToolRegistry,
  ],
})
export class AiModule {}
