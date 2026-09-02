-- Repair migration for production databases where the E2EE and message reliability migrations
-- may have been recorded/applied incompletely. These statements are intentionally idempotent.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "e2eePublicKey" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "e2eeKeyVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "clientId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Message_senderId_clientId_key"
  ON "Message"("senderId", "clientId");
