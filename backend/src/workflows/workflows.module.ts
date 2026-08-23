import { Module, OnModuleInit, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { HttpModule } from '@nestjs/axios';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';
import { WorkflowEngineService } from './engine/workflow-engine.service';
import { WorkflowPublishingService } from './engine/workflow-publishing.service';
import { ExpressionEngineService } from './engine/expression-engine.service';
import { WorkflowLinterService } from './engine/workflow-linter.service';
import { NodeExecutorRegistry } from './engine/registries/node-executor.registry';
import { TriggerRegistry } from './engine/registries/trigger.registry';
import { WorkflowQueueProcessor } from './engine/processors/workflow-queue.processor';

import { SendMessageExecutor } from './engine/nodes/send-message.node';
import { DelayExecutor } from './engine/nodes/delay.node';
import { ConditionExecutor } from './engine/nodes/condition.node';
import { WaitReplyExecutor } from './engine/nodes/wait-reply.node';
import { AiAgentExecutor } from './engine/nodes/ai-agent.node';
import { AskQuestionExecutor } from './engine/nodes/ask-question.node';
import { HttpRequestExecutor } from './engine/nodes/http-request.node';
import { CrmActionExecutor } from './engine/nodes/crm-action.node';
import { AiIntentRouterExecutor } from './engine/nodes/ai-intent-router.node';
import { AbTestSplitterExecutor } from './engine/nodes/ab-test-splitter.node';
import { DataTransformExecutor } from './engine/nodes/data-transform.node';
import { ForEachExecutor } from './engine/nodes/for-each.node';
import { BusinessHoursExecutor } from './engine/nodes/business-hours.node';
import { TeamHandoffExecutor } from './engine/nodes/team-handoff.node';
import { ApprovalExecutor } from './engine/nodes/approval-node.node';

// Workflow Nodes
import { AiExtractionExecutor } from './engine/nodes/ai-extraction.node';
import { AiSentimentExecutor } from './engine/nodes/ai-sentiment.node';
import { SubWorkflowExecutor } from './engine/nodes/sub-workflow.node';
import { AskInputExecutor } from './engine/nodes/ask-input.node';
import { WhatsAppCatalogExecutor } from './engine/nodes/whatsapp-catalog.node';
import { EcomOrderExecutor } from './engine/nodes/ecom-order.node';
import { AiGoalAgentExecutor } from './engine/nodes/ai-goal-agent.node';
import { AiDecisionExecutor } from './engine/nodes/ai-decision.node';
import { ForwardToOwnerExecutor } from './engine/nodes/forward-to-owner.node';

import { IncomingMessageTrigger } from './engine/triggers/incoming-message.trigger';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    HttpModule,
    BullModule.registerQueue({
      name: 'workflow-execution-queue',
    }),
    BullModule.registerQueue({
      name: 'workflow-dlq',
    }),
    forwardRef(() => WhatsappModule),
    forwardRef(() => AiModule),
  ],
  controllers: [WorkflowsController],
  providers: [
    WorkflowsService,
    WorkflowEngineService,
    WorkflowPublishingService,
    ExpressionEngineService,
    WorkflowLinterService,
    NodeExecutorRegistry,
    TriggerRegistry,
    WorkflowQueueProcessor,
    SendMessageExecutor,
    DelayExecutor,
    ConditionExecutor,
    WaitReplyExecutor,
    AiAgentExecutor,
    AskQuestionExecutor,
    HttpRequestExecutor,
    CrmActionExecutor,
    AiIntentRouterExecutor,
    AbTestSplitterExecutor,
    DataTransformExecutor,
    ForEachExecutor,
    BusinessHoursExecutor,
    TeamHandoffExecutor,
    ApprovalExecutor,
    AiExtractionExecutor,
    AiSentimentExecutor,
    SubWorkflowExecutor,
    AskInputExecutor,
    WhatsAppCatalogExecutor,
    EcomOrderExecutor,
    AiGoalAgentExecutor,
    AiDecisionExecutor,
    ForwardToOwnerExecutor,
    IncomingMessageTrigger,
  ],
  exports: [
    WorkflowEngineService,
    WorkflowLinterService,
    TriggerRegistry,
  ],
})
export class WorkflowsModule implements OnModuleInit {
  constructor(
    private readonly nodeRegistry: NodeExecutorRegistry,
    private readonly sendMessageExecutor: SendMessageExecutor,
    private readonly delayExecutor: DelayExecutor,
    private readonly conditionExecutor: ConditionExecutor,
    private readonly waitReplyExecutor: WaitReplyExecutor,
    private readonly aiAgentExecutor: AiAgentExecutor,
    private readonly askQuestionExecutor: AskQuestionExecutor,
    private readonly httpRequestExecutor: HttpRequestExecutor,
    private readonly crmActionExecutor: CrmActionExecutor,
    private readonly aiIntentRouterExecutor: AiIntentRouterExecutor,
    private readonly abTestSplitterExecutor: AbTestSplitterExecutor,
    private readonly dataTransformExecutor: DataTransformExecutor,
    private readonly forEachExecutor: ForEachExecutor,
    private readonly businessHoursExecutor: BusinessHoursExecutor,
    private readonly teamHandoffExecutor: TeamHandoffExecutor,
    private readonly approvalExecutor: ApprovalExecutor,
    private readonly aiExtractionExecutor: AiExtractionExecutor,
    private readonly aiSentimentExecutor: AiSentimentExecutor,
    private readonly subWorkflowExecutor: SubWorkflowExecutor,
    private readonly askInputExecutor: AskInputExecutor,
    private readonly whatsAppCatalogExecutor: WhatsAppCatalogExecutor,
    private readonly ecomOrderExecutor: EcomOrderExecutor,
    private readonly aiGoalAgentExecutor: AiGoalAgentExecutor,
    private readonly aiDecisionExecutor: AiDecisionExecutor,
    private readonly forwardToOwnerExecutor: ForwardToOwnerExecutor,
    private readonly incomingMessageTrigger: IncomingMessageTrigger,
    private readonly triggerRegistry: TriggerRegistry,
  ) {}

  onModuleInit() {
    this.nodeRegistry.register(this.sendMessageExecutor);
    this.nodeRegistry.register(this.delayExecutor);
    this.nodeRegistry.register(this.conditionExecutor);
    this.nodeRegistry.register(this.waitReplyExecutor);
    this.nodeRegistry.register(this.aiAgentExecutor);
    this.nodeRegistry.register(this.askQuestionExecutor);
    this.nodeRegistry.register(this.httpRequestExecutor);
    this.nodeRegistry.register(this.crmActionExecutor);
    this.nodeRegistry.register(this.aiIntentRouterExecutor);
    this.nodeRegistry.register(this.abTestSplitterExecutor);
    this.nodeRegistry.register(this.dataTransformExecutor);
    this.nodeRegistry.register(this.forEachExecutor);
    this.nodeRegistry.register(this.businessHoursExecutor);
    this.nodeRegistry.register(this.teamHandoffExecutor);
    this.nodeRegistry.register(this.approvalExecutor);
    this.nodeRegistry.register(this.aiExtractionExecutor);
    this.nodeRegistry.register(this.aiSentimentExecutor);
    this.nodeRegistry.register(this.subWorkflowExecutor);
    this.nodeRegistry.register(this.askInputExecutor);
    this.nodeRegistry.register(this.whatsAppCatalogExecutor);
    this.nodeRegistry.register(this.ecomOrderExecutor);
    this.nodeRegistry.register(this.aiGoalAgentExecutor);
    this.nodeRegistry.register(this.aiDecisionExecutor);
    this.nodeRegistry.register(this.forwardToOwnerExecutor);

    this.triggerRegistry.register(this.incomingMessageTrigger);
  }
}
