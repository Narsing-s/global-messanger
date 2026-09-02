-- Durable per-recipient delivery/read state and client idempotency.
ALTER TABLE "Message" ADD COLUMN "clientId" TEXT;

CREATE UNIQUE INDEX "Message_clientId_key" ON "Message"("clientId");

CREATE TABLE "MessageReceipt" (
  "messageId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "deliveredAt" TIMESTAMP(3),
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MessageReceipt_pkey" PRIMARY KEY ("messageId", "userId"),
  CONSTRAINT "MessageReceipt_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MessageReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "MessageReceipt_userId_readAt_idx" ON "MessageReceipt"("userId", "readAt");
CREATE INDEX "MessageReceipt_messageId_deliveredAt_idx" ON "MessageReceipt"("messageId", "deliveredAt");
