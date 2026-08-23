-- Migration: Add SystemConfig table for admin-configurable platform settings
-- Run this on your Supabase DB via the SQL editor or psql

CREATE TABLE IF NOT EXISTS "SystemConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "updatedBy" TEXT,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SystemConfig_key_key" ON "SystemConfig"("key");
