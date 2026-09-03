CREATE TABLE "SupportRequest" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "details" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SupportRequest_requestId_key" ON "SupportRequest"("requestId");
CREATE INDEX "SupportRequest_email_createdAt_idx" ON "SupportRequest"("email", "createdAt");
CREATE INDEX "SupportRequest_status_createdAt_idx" ON "SupportRequest"("status", "createdAt");
