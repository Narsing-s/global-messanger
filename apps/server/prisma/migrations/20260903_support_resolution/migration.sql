ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'USER';

CREATE TABLE "SupportResolution" (
  "id" TEXT NOT NULL,
  "supportRequestId" TEXT NOT NULL,
  "resolvedById" TEXT,
  "resolutionType" TEXT NOT NULL,
  "resolutionNotes" TEXT,
  "resolutionTimeSecs" INTEGER NOT NULL,
  "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportResolution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupportResolution_supportRequestId_key" ON "SupportResolution"("supportRequestId");
CREATE INDEX "SupportResolution_resolvedById_closedAt_idx" ON "SupportResolution"("resolvedById", "closedAt");
CREATE INDEX "SupportResolution_resolutionType_closedAt_idx" ON "SupportResolution"("resolutionType", "closedAt");

ALTER TABLE "SupportResolution" ADD CONSTRAINT "SupportResolution_supportRequestId_fkey" FOREIGN KEY ("supportRequestId") REFERENCES "SupportRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportResolution" ADD CONSTRAINT "SupportResolution_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
