ALTER TABLE "User" ADD COLUMN "bio" TEXT;

ALTER TABLE "ConversationMember" ADD COLUMN "favoriteAt" TIMESTAMP(3);
ALTER TABLE "ConversationMember" ADD COLUMN "pinnedAt" TIMESTAMP(3);

CREATE INDEX "ConversationMember_userId_favoriteAt_idx" ON "ConversationMember"("userId", "favoriteAt");
CREATE INDEX "ConversationMember_userId_pinnedAt_idx" ON "ConversationMember"("userId", "pinnedAt");
CREATE INDEX "ConversationMember_userId_archivedAt_idx" ON "ConversationMember"("userId", "archivedAt");
