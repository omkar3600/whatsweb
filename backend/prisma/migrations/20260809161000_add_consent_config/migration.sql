-- WhatsHub Marketing Consent Engine -- Per-business config + campaign audience filters
-- ADDITIVE ONLY -- no data is modified or dropped.

-- CreateTable ShopConsentConfig (per-business configurable opt-in/opt-out keywords)
CREATE TABLE "ShopConsentConfig" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "optInKeywords" JSONB NOT NULL DEFAULT '[]',
    "optOutKeywords" JSONB NOT NULL DEFAULT '[]',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ShopConsentConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopConsentConfig_shopId_key" ON "ShopConsentConfig"("shopId");

-- AddForeignKey
ALTER TABLE "ShopConsentConfig" ADD CONSTRAINT "ShopConsentConfig_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable Campaign (add audienceFilters JSON)
ALTER TABLE "Campaign" ADD COLUMN "audienceFilters" JSONB;
