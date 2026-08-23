-- WhatsHub AI Business Agent System -- Database Migration
-- Adds AI columns to existing tables and creates all new AI models
-- This migration is ADDITIVE ONLY -- no data is modified or dropped

-- AlterTable Contact (add AI fields)
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "aiSegment" TEXT;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "aiLeadStage" TEXT;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "lastAiInteractionAt" TIMESTAMP(3);

-- AlterTable Conversation
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "aiState" JSONB;

-- AlterTable ChatbotConfig (add agent fields)
ALTER TABLE "ChatbotConfig" ADD COLUMN IF NOT EXISTS "agentMode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ChatbotConfig" ADD COLUMN IF NOT EXISTS "autonomyLevel" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "ChatbotConfig" ADD COLUMN IF NOT EXISTS "agentName" TEXT DEFAULT 'AI Assistant';
ALTER TABLE "ChatbotConfig" ADD COLUMN IF NOT EXISTS "agentPersonality" TEXT;
ALTER TABLE "ChatbotConfig" ADD COLUMN IF NOT EXISTS "allowedTools" JSONB;
ALTER TABLE "ChatbotConfig" ADD COLUMN IF NOT EXISTS "followupEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ChatbotConfig" ADD COLUMN IF NOT EXISTS "hotLeadThreshold" INTEGER NOT NULL DEFAULT 70;
ALTER TABLE "ChatbotConfig" ADD COLUMN IF NOT EXISTS "maxIterations" INTEGER NOT NULL DEFAULT 8;

-- CreateTable AiAgentConfig
CREATE TABLE IF NOT EXISTS "AiAgentConfig" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT NOT NULL DEFAULT 'groq',
    "model" TEXT NOT NULL DEFAULT 'llama-3.3-70b-versatile',
    "apiKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiAgentConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable AiMemory
CREATE TABLE IF NOT EXISTS "AiMemory" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "purchaseHistory" JSONB NOT NULL DEFAULT '[]',
    "interactions" JSONB NOT NULL DEFAULT '{}',
    "customFields" JSONB NOT NULL DEFAULT '{}',
    "lastSummarizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable AiConversationSummary
CREATE TABLE IF NOT EXISTS "AiConversationSummary" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "coveredUntil" TIMESTAMP(3) NOT NULL,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiConversationSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable AiConversationState
CREATE TABLE IF NOT EXISTS "AiConversationState" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "conversationId" TEXT,
    "state" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiConversationState_pkey" PRIMARY KEY ("id")
);

-- CreateTable AiLeadScore
CREATE TABLE IF NOT EXISTS "AiLeadScore" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "stage" TEXT NOT NULL DEFAULT 'NEW',
    "intent" TEXT,
    "sentiment" TEXT,
    "urgency" TEXT,
    "productInterest" JSONB,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "lastScoredAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiLeadScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable AiAction
CREATE TABLE IF NOT EXISTS "AiAction" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "contactId" TEXT,
    "toolName" TEXT NOT NULL,
    "toolInput" JSONB NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "result" JSONB,
    "errorMessage" TEXT,
    "approvedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable AiAuditLog
CREATE TABLE IF NOT EXISTS "AiAuditLog" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "contactId" TEXT,
    "toolName" TEXT NOT NULL,
    "toolInput" JSONB NOT NULL,
    "toolOutput" JSONB,
    "riskLevel" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable AiFollowUp
CREATE TABLE IF NOT EXISTS "AiFollowUp" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "aiMessage" TEXT NOT NULL,
    "useTemplate" BOOLEAN NOT NULL DEFAULT false,
    "templateId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "result" JSONB,
    "errorMessage" TEXT,
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiFollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable AiKnowledgeSource
CREATE TABLE IF NOT EXISTS "AiKnowledgeSource" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiKnowledgeSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AiAgentConfig_shopId_key" ON "AiAgentConfig"("shopId");
CREATE UNIQUE INDEX IF NOT EXISTS "AiMemory_contactId_key" ON "AiMemory"("contactId");
CREATE UNIQUE INDEX IF NOT EXISTS "AiLeadScore_contactId_key" ON "AiLeadScore"("contactId");

-- AddForeignKey
ALTER TABLE "AiAgentConfig" ADD CONSTRAINT "AiAgentConfig_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiMemory" ADD CONSTRAINT "AiMemory_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiMemory" ADD CONSTRAINT "AiMemory_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiConversationSummary" ADD CONSTRAINT "AiConversationSummary_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiConversationSummary" ADD CONSTRAINT "AiConversationSummary_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiConversationState" ADD CONSTRAINT "AiConversationState_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiConversationState" ADD CONSTRAINT "AiConversationState_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiLeadScore" ADD CONSTRAINT "AiLeadScore_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiLeadScore" ADD CONSTRAINT "AiLeadScore_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiAction" ADD CONSTRAINT "AiAction_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiAction" ADD CONSTRAINT "AiAction_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiAuditLog" ADD CONSTRAINT "AiAuditLog_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiFollowUp" ADD CONSTRAINT "AiFollowUp_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiFollowUp" ADD CONSTRAINT "AiFollowUp_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiKnowledgeSource" ADD CONSTRAINT "AiKnowledgeSource_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
