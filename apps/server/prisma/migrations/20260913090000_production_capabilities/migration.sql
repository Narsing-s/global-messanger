CREATE TABLE "GlobalEntity" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GlobalEntity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GlobalEntity_ownerId_kind_status_idx" ON "GlobalEntity"("ownerId", "kind", "status");
CREATE INDEX "GlobalEntity_ownerId_name_status_idx" ON "GlobalEntity"("ownerId", "name", "status");

CREATE TABLE "DeveloperApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "scopes" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeveloperApiKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeveloperApiKey_keyHash_key" ON "DeveloperApiKey"("keyHash");
CREATE INDEX "DeveloperApiKey_userId_active_revokedAt_idx" ON "DeveloperApiKey"("userId", "active", "revokedAt");
