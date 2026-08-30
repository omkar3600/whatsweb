-- WhatsWeb Marketing Consent Engine -- Database Migration
-- Creates the contact marketing consent + audit log tables.
-- This migration is ADDITIVE ONLY -- no data is modified or dropped.
-- Consent state is fully independent from AI/chatbot logic (deterministic keyword matching).

-- CreateTable ContactMarketingConsent
CREATE TABLE "ContactMarketingConsent" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNKNOWN', -- OPTED_IN, OPTED_OUT, PENDING, UNKNOWN
    "source" TEXT NOT NULL DEFAULT 'MANUAL_ACTION', -- CUSTOMER_REPLY, MANUAL_ACTION, IMPORT, CAMPAIGN_LINK, ADMIN, API
    "reason" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ContactMarketingConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable ConsentAuditLog
CREATE TABLE "ConsentAuditLog" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "contactId" TEXT,
    "consentId" TEXT,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "reason" TEXT,
    "updatedBy" TEXT,
    "messageText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConsentAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContactMarketingConsent_contactId_key" ON "ContactMarketingConsent"("contactId");
CREATE INDEX "ContactMarketingConsent_shopId_status_idx" ON "ContactMarketingConsent"("shopId", "status");
CREATE INDEX "ContactMarketingConsent_shopId_contactId_idx" ON "ContactMarketingConsent"("shopId", "contactId");
CREATE UNIQUE INDEX "ContactMarketingConsent_shopId_contactId_key" ON "ContactMarketingConsent"("shopId", "contactId");
CREATE INDEX "ConsentAuditLog_shopId_idx" ON "ConsentAuditLog"("shopId");
CREATE INDEX "ConsentAuditLog_contactId_idx" ON "ConsentAuditLog"("contactId");
CREATE INDEX "ConsentAuditLog_shopId_consentId_idx" ON "ConsentAuditLog"("shopId", "consentId");

-- AddForeignKey
ALTER TABLE "ContactMarketingConsent" ADD CONSTRAINT "ContactMarketingConsent_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContactMarketingConsent" ADD CONSTRAINT "ContactMarketingConsent_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsentAuditLog" ADD CONSTRAINT "ConsentAuditLog_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConsentAuditLog" ADD CONSTRAINT "ConsentAuditLog_consentId_fkey" FOREIGN KEY ("consentId") REFERENCES "ContactMarketingConsent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
