-- Client-generated public identity keys for end-to-end encrypted message envelopes.
ALTER TABLE "User" ADD COLUMN "e2eePublicKey" TEXT;
ALTER TABLE "User" ADD COLUMN "e2eeKeyVersion" INTEGER NOT NULL DEFAULT 1;
