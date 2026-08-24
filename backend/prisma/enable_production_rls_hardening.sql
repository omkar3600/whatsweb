-- ============================================================================
-- WhatsHub Production Row Level Security (RLS) Hardening Migration
-- Enables RLS and tenant-isolation policies on all 44 public tables
-- Safe for execution via Supabase SQL Editor, psql, or Prisma Migrate
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Helper Functions (STABLE, SECURITY DEFINER, search_path = public)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_auth_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    auth.uid()::text,
    (current_setting('request.jwt.claims', true)::jsonb ->> 'sub'),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'userId')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM "public"."User" u
    WHERE u."id" = public.get_auth_user_id()
    AND u."role" = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.user_owns_shop(target_shop_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM "public"."Shop" s
    WHERE s."id" = target_shop_id
    AND (s."ownerId" = public.get_auth_user_id() OR public.is_admin())
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_auth_user_id() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.user_owns_shop(TEXT) TO authenticated, anon, service_role;

-- ----------------------------------------------------------------------------
-- 2. Core Account Tables: User, Shop, Subscription, ApiKey, DemoRequest, OnboardingEvent
-- ----------------------------------------------------------------------------

-- public.User
ALTER TABLE "public"."User" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_self_manage" ON "public"."User";
CREATE POLICY "user_self_manage" ON "public"."User"
  FOR ALL
  TO authenticated
  USING ("id" = public.get_auth_user_id() OR public.is_admin())
  WITH CHECK ("id" = public.get_auth_user_id() OR public.is_admin());

-- public.Shop
ALTER TABLE "public"."Shop" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shop_owner_manage" ON "public"."Shop";
CREATE POLICY "shop_owner_manage" ON "public"."Shop"
  FOR ALL
  TO authenticated
  USING ("ownerId" = public.get_auth_user_id() OR public.is_admin())
  WITH CHECK ("ownerId" = public.get_auth_user_id() OR public.is_admin());

-- public.Subscription
ALTER TABLE "public"."Subscription" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscription_tenant_isolation" ON "public"."Subscription";
CREATE POLICY "subscription_tenant_isolation" ON "public"."Subscription"
  FOR ALL
  TO authenticated
  USING (public.user_owns_shop("shopId"))
  WITH CHECK (public.user_owns_shop("shopId"));

-- public.ApiKey
ALTER TABLE "public"."ApiKey" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "api_key_tenant_isolation" ON "public"."ApiKey";
CREATE POLICY "api_key_tenant_isolation" ON "public"."ApiKey"
  FOR ALL
  TO authenticated
  USING (public.user_owns_shop("shopId"))
  WITH CHECK (public.user_owns_shop("shopId"));

-- public.DemoRequest (Public Leads Submission + Admin Read/Write)
ALTER TABLE "public"."DemoRequest" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "demo_request_anon_insert" ON "public"."DemoRequest";
CREATE POLICY "demo_request_anon_insert" ON "public"."DemoRequest"
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "demo_request_admin_manage" ON "public"."DemoRequest";
CREATE POLICY "demo_request_admin_manage" ON "public"."DemoRequest"
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- public.OnboardingEvent
ALTER TABLE "public"."OnboardingEvent" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "onboarding_event_tenant_isolation" ON "public"."OnboardingEvent";
CREATE POLICY "onboarding_event_tenant_isolation" ON "public"."OnboardingEvent"
  FOR ALL
  TO authenticated
  USING (public.user_owns_shop("shopId"))
  WITH CHECK (public.user_owns_shop("shopId"));

-- ----------------------------------------------------------------------------
-- 3. Messaging & WhatsApp Tables: Contact, Conversation, Message, Template, MediaFile, WhatsAppBusinessAccount, WhatsAppPhoneNumber
-- ----------------------------------------------------------------------------

-- public.Contact
ALTER TABLE "public"."Contact" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contact_tenant_isolation" ON "public"."Contact";
CREATE POLICY "contact_tenant_isolation" ON "public"."Contact"
  FOR ALL
  TO authenticated
  USING (public.user_owns_shop("shopId"))
  WITH CHECK (public.user_owns_shop("shopId"));

-- public.ShopConsentConfig
ALTER TABLE "public"."ShopConsentConfig" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shop_consent_config_tenant_isolation" ON "public"."ShopConsentConfig";
CREATE POLICY "shop_consent_config_tenant_isolation" ON "public"."ShopConsentConfig"
  FOR ALL
  TO authenticated
  USING (public.user_owns_shop("shopId"))
  WITH CHECK (public.user_owns_shop("shopId"));

-- public.ContactMarketingConsent
ALTER TABLE "public"."ContactMarketingConsent" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contact_marketing_consent_tenant_isolation" ON "public"."ContactMarketingConsent";
CREATE POLICY "contact_marketing_consent_tenant_isolation" ON "public"."ContactMarketingConsent"
  FOR ALL
  TO authenticated
  USING (public.user_owns_shop("shopId"))
  WITH CHECK (public.user_owns_shop("shopId"));

-- public.ConsentAuditLog
ALTER TABLE "public"."ConsentAuditLog" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "consent_audit_log_tenant_isolation" ON "public"."ConsentAuditLog";
CREATE POLICY "consent_audit_log_tenant_isolation" ON "public"."ConsentAuditLog"
  FOR ALL
  TO authenticated
  USING (public.user_owns_shop("shopId"))
  WITH CHECK (public.user_owns_shop("shopId"));

-- public.Conversation
ALTER TABLE "public"."Conversation" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conversation_tenant_isolation" ON "public"."Conversation";
CREATE POLICY "conversation_tenant_isolation" ON "public"."Conversation"
  FOR ALL
  TO authenticated
  USING (public.user_owns_shop("shopId"))
  WITH CHECK (public.user_owns_shop("shopId"));

-- public.Message
ALTER TABLE "public"."Message" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "message_tenant_isolation" ON "public"."Message";
CREATE POLICY "message_tenant_isolation" ON "public"."Message"
  FOR ALL
  TO authenticated
  USING (public.user_owns_shop("shopId"))
  WITH CHECK (public.user_owns_shop("shopId"));

-- public.Template
ALTER TABLE "public"."Template" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "template_tenant_isolation" ON "public"."Template";
CREATE POLICY "template_tenant_isolation" ON "public"."Template"
  FOR ALL
  TO authenticated
  USING (public.user_owns_shop("shopId"))
  WITH CHECK (public.user_owns_shop("shopId"));

-- public.MediaFile
ALTER TABLE "public"."MediaFile" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "media_file_tenant_isolation" ON "public"."MediaFile";
CREATE POLICY "media_file_tenant_isolation" ON "public"."MediaFile"
  FOR ALL
  TO authenticated
  USING (public.user_owns_shop("shopId"))
  WITH CHECK (public.user_owns_shop("shopId"));

-- public.WhatsAppBusinessAccount
ALTER TABLE "public"."WhatsAppBusinessAccount" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "waba_tenant_isolation" ON "public"."WhatsAppBusinessAccount";
CREATE POLICY "waba_tenant_isolation" ON "public"."WhatsAppBusinessAccount"
  FOR ALL
  TO authenticated
  USING (public.user_owns_shop("shopId"))
  WITH CHECK (public.user_owns_shop("shopId"));

-- public.WhatsAppPhoneNumber
ALTER TABLE "public"."WhatsAppPhoneNumber" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wa_phone_tenant_isolation" ON "public"."WhatsAppPhoneNumber";
CREATE POLICY "wa_phone_tenant_isolation" ON "public"."WhatsAppPhoneNumber"
  FOR ALL
  TO authenticated
  USING (public.user_owns_shop("shopId"))
  WITH CHECK (public.user_owns_shop("shopId"));

-- ----------------------------------------------------------------------------
-- 4. Campaigns & Marketing: Campaign, CampaignContact, Automation
-- ----------------------------------------------------------------------------

-- public.Campaign
ALTER TABLE "public"."Campaign" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "campaign_tenant_isolation" ON "public"."Campaign";
CREATE POLICY "campaign_tenant_isolation" ON "public"."Campaign"
  FOR ALL
  TO authenticated
  USING (public.user_owns_shop("shopId"))
  WITH CHECK (public.user_owns_shop("shopId"));

-- public.CampaignContact (Derived through Campaign foreign key)
ALTER TABLE "public"."CampaignContact" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "campaign_contact_tenant_isolation" ON "public"."CampaignContact";
CREATE POLICY "campaign_contact_tenant_isolation" ON "public"."CampaignContact"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "public"."Campaign" c
      WHERE c."id" = "CampaignContact"."campaignId"
      AND public.user_owns_shop(c."shopId")
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "public"."Campaign" c
      WHERE c."id" = "CampaignContact"."campaignId"
      AND public.user_owns_shop(c."shopId")
    )
  );

-- public.Automation
ALTER TABLE "public"."Automation" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "automation_tenant_isolation" ON "public"."Automation";
CREATE POLICY "automation_tenant_isolation" ON "public"."Automation"
  FOR ALL
  TO authenticated
  USING (public.user_owns_shop("shopId"))
  WITH CHECK (public.user_owns_shop("shopId"));

-- ----------------------------------------------------------------------------
-- 5. Flows & Sessions: Flow, FlowVersion, FlowSession, FlowAnalytics
-- ----------------------------------------------------------------------------

-- public.Flow
ALTER TABLE "public"."Flow" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "flow_tenant_isolation" ON "public"."Flow";
CREATE POLICY "flow_tenant_isolation" ON "public"."Flow"
  FOR ALL
  TO authenticated
  USING (public.user_owns_shop("shopId"))
  WITH CHECK (public.user_owns_shop("shopId"));

-- public.FlowVersion (Derived through Flow foreign key)
ALTER TABLE "public"."FlowVersion" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "flow_version_tenant_isolation" ON "public"."FlowVersion";
CREATE POLICY "flow_version_tenant_isolation" ON "public"."FlowVersion"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "public"."Flow" f
      WHERE f."id" = "FlowVersion"."flowId"
      AND public.user_owns_shop(f."shopId")
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "public"."Flow" f
      WHERE f."id" = "FlowVersion"."flowId"
      AND public.user_owns_shop(f."shopId")
    )
  );

-- public.FlowSession (Derived through Flow foreign key)
ALTER TABLE "public"."FlowSession" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "flow_session_tenant_isolation" ON "public"."FlowSession";
CREATE POLICY "flow_session_tenant_isolation" ON "public"."FlowSession"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "public"."Flow" f
      WHERE f."id" = "FlowSession"."flowId"
      AND public.user_owns_shop(f."shopId")
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "public"."Flow" f
      WHERE f."id" = "FlowSession"."flowId"
      AND public.user_owns_shop(f."shopId")
    )
  );

-- public.FlowAnalytics (Derived through Flow foreign key)
ALTER TABLE "public"."FlowAnalytics" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "flow_analytics_tenant_isolation" ON "public"."FlowAnalytics";
CREATE POLICY "flow_analytics_tenant_isolation" ON "public"."FlowAnalytics"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "public"."Flow" f
      WHERE f."id" = "FlowAnalytics"."flowId"
      AND public.user_owns_shop(f."shopId")
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "public"."Flow" f
      WHERE f."id" = "FlowAnalytics"."flowId"
      AND public.user_owns_shop(f."shopId")
    )
  );

-- ----------------------------------------------------------------------------
-- 6. Workflows & Automation Engine: Workflow, WorkflowVersion, WorkflowInstance, WorkflowJob, WorkflowExecutionLog, WorkflowAuditLog, WorkflowAnalytics, WorkflowTemplate
-- ----------------------------------------------------------------------------

-- public.Workflow
ALTER TABLE "public"."Workflow" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workflow_tenant_isolation" ON "public"."Workflow";
CREATE POLICY "workflow_tenant_isolation" ON "public"."Workflow"
  FOR ALL
  TO authenticated
  USING (public.user_owns_shop("shopId"))
  WITH CHECK (public.user_owns_shop("shopId"));

-- public.WorkflowVersion (Derived through Workflow foreign key)
ALTER TABLE "public"."WorkflowVersion" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workflow_version_tenant_isolation" ON "public"."WorkflowVersion";
CREATE POLICY "workflow_version_tenant_isolation" ON "public"."WorkflowVersion"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "public"."Workflow" w
      WHERE w."id" = "WorkflowVersion"."workflowId"
      AND public.user_owns_shop(w."shopId")
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "public"."Workflow" w
      WHERE w."id" = "WorkflowVersion"."workflowId"
      AND public.user_owns_shop(w."shopId")
    )
  );

-- public.WorkflowInstance
ALTER TABLE "public"."WorkflowInstance" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workflow_instance_tenant_isolation" ON "public"."WorkflowInstance";
CREATE POLICY "workflow_instance_tenant_isolation" ON "public"."WorkflowInstance"
  FOR ALL
  TO authenticated
  USING (public.user_owns_shop("shopId"))
  WITH CHECK (public.user_owns_shop("shopId"));

-- public.WorkflowJob
ALTER TABLE "public"."WorkflowJob" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workflow_job_tenant_isolation" ON "public"."WorkflowJob";
CREATE POLICY "workflow_job_tenant_isolation" ON "public"."WorkflowJob"
  FOR ALL
  TO authenticated
  USING (public.user_owns_shop("shopId"))
  WITH CHECK (public.user_owns_shop("shopId"));

-- public.WorkflowExecutionLog (Derived through WorkflowInstance foreign key)
ALTER TABLE "public"."WorkflowExecutionLog" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workflow_execution_log_tenant_isolation" ON "public"."WorkflowExecutionLog";
CREATE POLICY "workflow_execution_log_tenant_isolation" ON "public"."WorkflowExecutionLog"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "public"."WorkflowInstance" wi
      WHERE wi."id" = "WorkflowExecutionLog"."instanceId"
      AND public.user_owns_shop(wi."shopId")
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "public"."WorkflowInstance" wi
      WHERE wi."id" = "WorkflowExecutionLog"."instanceId"
      AND public.user_owns_shop(wi."shopId")
    )
  );

-- public.WorkflowAuditLog
ALTER TABLE "public"."WorkflowAuditLog" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workflow_audit_log_tenant_isolation" ON "public"."WorkflowAuditLog";
CREATE POLICY "workflow_audit_log_tenant_isolation" ON "public"."WorkflowAuditLog"
  FOR ALL
  TO authenticated
  USING (public.user_owns_shop("shopId"))
  WITH CHECK (public.user_owns_shop("shopId"));

-- public.WorkflowAnalytics
ALTER TABLE "public"."WorkflowAnalytics" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workflow_analytics_tenant_isolation" ON "public"."WorkflowAnalytics";
CREATE POLICY "workflow_analytics_tenant_isolation" ON "public"."WorkflowAnalytics"
  FOR ALL
  TO authenticated
  USING (public.user_owns_shop("shopId"))
  WITH CHECK (public.user_owns_shop("shopId"));

-- public.WorkflowTemplate (System templates or shop-owned templates)
ALTER TABLE "public"."WorkflowTemplate" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workflow_template_select" ON "public"."WorkflowTemplate";
CREATE POLICY "workflow_template_select" ON "public"."WorkflowTemplate"
  FOR SELECT
  TO authenticated
  USING ("isSystem" = true OR ("shopId" IS NOT NULL AND public.user_owns_shop("shopId")) OR public.is_admin());

DROP POLICY IF EXISTS "workflow_template_manage" ON "public"."WorkflowTemplate";
CREATE POLICY "workflow_template_manage" ON "public"."WorkflowTemplate"
  FOR ALL
  TO authenticated
  USING (("shopId" IS NOT NULL AND public.user_owns_shop("shopId")) OR public.is_admin())
  WITH CHECK (("shopId" IS NOT NULL AND public.user_owns_shop("shopId")) OR public.is_admin());

-- ----------------------------------------------------------------------------
-- 7. AI & Chatbot Engine: ChatbotConfig, AiAgentConfig, AiAction, AiKnowledgeSource, AiMemory, AiConversationState, AiConversationSummary, AiLeadScore, AiFollowUp, AiAuditLog
-- ----------------------------------------------------------------------------

-- public.ChatbotConfig
ALTER TABLE "public"."ChatbotConfig" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chatbot_config_tenant_isolation" ON "public"."ChatbotConfig";
CREATE POLICY "chatbot_config_tenant_isolation" ON "public"."ChatbotConfig"
  FOR ALL
  TO authenticated
  USING (public.user_owns_shop("shopId"))
  WITH CHECK (public.user_owns_shop("shopId"));

-- public.AiAgentConfig
ALTER TABLE "public"."AiAgentConfig" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_agent_config_tenant_isolation" ON "public"."AiAgentConfig";
CREATE POLICY "ai_agent_config_tenant_isolation" ON "public"."AiAgentConfig"
  FOR ALL
  TO authenticated
  USING (public.user_owns_shop("shopId"))
  WITH CHECK (public.user_owns_shop("shopId"));

-- public.AiAction
ALTER TABLE "public"."AiAction" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_action_tenant_isolation" ON "public"."AiAction";
CREATE POLICY "ai_action_tenant_isolation" ON "public"."AiAction"
  FOR ALL
  TO authenticated
  USING (public.user_owns_shop("shopId"))
  WITH CHECK (public.user_owns_shop("shopId"));

-- public.AiKnowledgeSource
ALTER TABLE "public"."AiKnowledgeSource" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_knowledge_source_tenant_isolation" ON "public"."AiKnowledgeSource";
CREATE POLICY "ai_knowledge_source_tenant_isolation" ON "public"."AiKnowledgeSource"
  FOR ALL
  TO authenticated
  USING (public.user_owns_shop("shopId"))
  WITH CHECK (public.user_owns_shop("shopId"));

-- public.AiMemory
ALTER TABLE "public"."AiMemory" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_memory_tenant_isolation" ON "public"."AiMemory";
CREATE POLICY "ai_memory_tenant_isolation" ON "public"."AiMemory"
  FOR ALL
  TO authenticated
  USING (public.user_owns_shop("shopId"))
  WITH CHECK (public.user_owns_shop("shopId"));

-- public.AiConversationState
ALTER TABLE "public"."AiConversationState" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_conversation_state_tenant_isolation" ON "public"."AiConversationState";
CREATE POLICY "ai_conversation_state_tenant_isolation" ON "public"."AiConversationState"
  FOR ALL
  TO authenticated
  USING (public.user_owns_shop("shopId"))
  WITH CHECK (public.user_owns_shop("shopId"));

-- public.AiConversationSummary
ALTER TABLE "public"."AiConversationSummary" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_conversation_summary_tenant_isolation" ON "public"."AiConversationSummary";
CREATE POLICY "ai_conversation_summary_tenant_isolation" ON "public"."AiConversationSummary"
  FOR ALL
  TO authenticated
  USING (public.user_owns_shop("shopId"))
  WITH CHECK (public.user_owns_shop("shopId"));

-- public.AiLeadScore
ALTER TABLE "public"."AiLeadScore" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_lead_score_tenant_isolation" ON "public"."AiLeadScore";
CREATE POLICY "ai_lead_score_tenant_isolation" ON "public"."AiLeadScore"
  FOR ALL
  TO authenticated
  USING (public.user_owns_shop("shopId"))
  WITH CHECK (public.user_owns_shop("shopId"));

-- public.AiFollowUp
ALTER TABLE "public"."AiFollowUp" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_follow_up_tenant_isolation" ON "public"."AiFollowUp";
CREATE POLICY "ai_follow_up_tenant_isolation" ON "public"."AiFollowUp"
  FOR ALL
  TO authenticated
  USING (public.user_owns_shop("shopId"))
  WITH CHECK (public.user_owns_shop("shopId"));

-- public.AiAuditLog
ALTER TABLE "public"."AiAuditLog" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_audit_log_tenant_isolation" ON "public"."AiAuditLog";
CREATE POLICY "ai_audit_log_tenant_isolation" ON "public"."AiAuditLog"
  FOR ALL
  TO authenticated
  USING (public.user_owns_shop("shopId"))
  WITH CHECK (public.user_owns_shop("shopId"));

-- ----------------------------------------------------------------------------
-- 8. Logs & System Tables: WebhookAuditLog, DeadLetterEvent, SystemConfig
-- ----------------------------------------------------------------------------

-- public.WebhookAuditLog
ALTER TABLE "public"."WebhookAuditLog" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "webhook_audit_log_isolation" ON "public"."WebhookAuditLog";
CREATE POLICY "webhook_audit_log_isolation" ON "public"."WebhookAuditLog"
  FOR ALL
  TO authenticated
  USING (("shopId" IS NOT NULL AND public.user_owns_shop("shopId")) OR public.is_admin())
  WITH CHECK (("shopId" IS NOT NULL AND public.user_owns_shop("shopId")) OR public.is_admin());

-- public.DeadLetterEvent (Backend / Admin Only)
ALTER TABLE "public"."DeadLetterEvent" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dead_letter_admin_only" ON "public"."DeadLetterEvent";
CREATE POLICY "dead_letter_admin_only" ON "public"."DeadLetterEvent"
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- public.SystemConfig (Masked public read, Admin write)
ALTER TABLE "public"."SystemConfig" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "system_config_read" ON "public"."SystemConfig";
CREATE POLICY "system_config_read" ON "public"."SystemConfig"
  FOR SELECT
  TO authenticated
  USING ("isSecret" = false OR public.is_admin());

DROP POLICY IF EXISTS "system_config_admin_manage" ON "public"."SystemConfig";
CREATE POLICY "system_config_admin_manage" ON "public"."SystemConfig"
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
