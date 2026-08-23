import { Injectable, OnModuleInit } from '@nestjs/common';
import { AiTool } from '../tool.interface';
import { KnowledgeTools } from '../impl/knowledge-tools';
import { ContactTools } from '../impl/contact-tools';
import { ConversationTools } from '../impl/conversation-tools';
import { WhatsAppTools } from '../impl/whatsapp-tools';
import { CampaignTools } from '../impl/campaign-tools';
import { LeadTools } from '../impl/lead-tools';
import { AnalyticsTools } from '../impl/analytics-tools';
import { HandoffTool } from '../impl/handoff-tool';
import { ProductTools } from '../impl/product-tools';
import { SalesTools } from '../impl/sales-tools';
import { WorkflowTools } from '../impl/workflow-tools';
import { OwnerTools } from '../impl/owner-tools';

@Injectable()
export class ToolRegistry implements OnModuleInit {
  private tools = new Map<string, AiTool>();

  constructor(
    private readonly knowledge: KnowledgeTools,
    private readonly contacts: ContactTools,
    private readonly conversations: ConversationTools,
    private readonly whatsapp: WhatsAppTools,
    private readonly campaigns: CampaignTools,
    private readonly leads: LeadTools,
    private readonly analytics: AnalyticsTools,
    private readonly handoff: HandoffTool,
    private readonly product: ProductTools,
    private readonly sales: SalesTools,
    private readonly workflow: WorkflowTools,
    private readonly owner: OwnerTools,
  ) {}

  onModuleInit() {
    const allTools: AiTool[] = [
      ...this.knowledge.getTools(),
      ...this.contacts.getTools(),
      ...this.conversations.getTools(),
      ...this.whatsapp.getTools(),
      ...this.campaigns.getTools(),
      ...this.leads.getTools(),
      ...this.analytics.getTools(),
      ...this.handoff.getTools(),
      ...this.product.getTools(),
      ...this.sales.getTools(),
      ...this.workflow.getTools(),
      ...this.owner.getTools(),
    ];
    for (const tool of allTools) {
      this.tools.set(tool.name, tool);
    }
  }

  get(name: string): AiTool | undefined {
    return this.tools.get(name);
  }

  getAll(): AiTool[] {
    return Array.from(this.tools.values());
  }

  /** Returns tools allowed for a given autonomy level, allowed-tools whitelist, and agent permissions */
  getAvailableTools(autonomyLevel: number, allowedTools?: string[] | null, permissions?: string[] | null): AiTool[] {
    return this.getAll().filter(t => {
      if (allowedTools && allowedTools.length > 0 && !allowedTools.includes(t.name)) return false;
      if (permissions && permissions.length > 0 && t.permissions) {
        const hasPermission = t.permissions.some(p => permissions.includes(p));
        if (!hasPermission) return false;
      }
      return true;
    });
  }
}
