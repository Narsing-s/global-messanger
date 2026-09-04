ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "privacyLastSeen" TEXT NOT NULL DEFAULT 'everyone';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "privacyProfilePhoto" TEXT NOT NULL DEFAULT 'everyone';
ALTER TABLE "ConversationMember" ADD COLUMN IF NOT EXISTS "disappearingSeconds" INTEGER;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Message_expiresAt_idx" ON "Message"("expiresAt");
CREATE TABLE IF NOT EXISTS "UserSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "deviceName" TEXT,
  "platform" TEXT,
  "userAgent" TEXT,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserSession_tokenHash_key" UNIQUE ("tokenHash"),
  CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "UserSession_userId_revokedAt_idx" ON "UserSession"("userId", "revokedAt");
