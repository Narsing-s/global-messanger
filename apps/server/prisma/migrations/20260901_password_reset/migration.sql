ALTER TABLE "User" ADD COLUMN "email" TEXT;
ALTER TABLE "User" ADD COLUMN "resetTokenHash" TEXT;
ALTER TABLE "User" ADD COLUMN "resetTokenExpiresAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
