-- CreateTable
CREATE TABLE "BucketTypeConfig" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacityLiters" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BucketTypeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BucketTypeConfig_code_key" ON "BucketTypeConfig"("code");

-- CreateIndex
CREATE INDEX "BucketTypeConfig_code_idx" ON "BucketTypeConfig"("code");

-- CreateIndex
CREATE INDEX "BucketTypeConfig_isActive_idx" ON "BucketTypeConfig"("isActive");

-- AlterTable: Change bucketType from enum to String in InventoryTransaction
-- First, we need to drop the enum constraint and convert to String
ALTER TABLE "InventoryTransaction" ALTER COLUMN "bucketType" DROP DEFAULT;
ALTER TABLE "InventoryTransaction" ALTER COLUMN "bucketType" TYPE TEXT USING "bucketType"::TEXT;

-- Seed BucketTypeConfig with existing bucket types
INSERT INTO "BucketTypeConfig" ("id", "code", "name", "capacityLiters", "isActive", "isSystem", "createdAt", "updatedAt") VALUES
    (gen_random_uuid()::TEXT, 'TATA_G', 'TATA G', 20, true, false, NOW(), NOW()),
    (gen_random_uuid()::TEXT, 'TATA_W', 'TATA W', 20, true, false, NOW(), NOW()),
    (gen_random_uuid()::TEXT, 'AL_10_LTR', 'AL 10 ltr', 10, true, false, NOW(), NOW()),
    (gen_random_uuid()::TEXT, 'AL', 'AL', 20, true, false, NOW(), NOW()),
    (gen_random_uuid()::TEXT, 'BB', 'BB', 20, true, false, NOW(), NOW()),
    (gen_random_uuid()::TEXT, 'ES', 'ES', 20, true, false, NOW(), NOW()),
    (gen_random_uuid()::TEXT, 'MH', 'MH', 20, true, false, NOW(), NOW()),
    (gen_random_uuid()::TEXT, 'MH_10_LTR', 'MH 10 Ltr', 10, true, false, NOW(), NOW()),
    (gen_random_uuid()::TEXT, 'TATA_10_LTR', 'TATA 10 Ltr', 10, true, false, NOW(), NOW()),
    (gen_random_uuid()::TEXT, 'IBC_TANK', 'IBC tank', 0, true, false, NOW(), NOW()),
    (gen_random_uuid()::TEXT, 'AP_BLUE', 'AP Blue', 20, true, false, NOW(), NOW()),
    (gen_random_uuid()::TEXT, 'FREE_DEF', 'Free DEF', 0, true, true, NOW(), NOW());

-- Drop the old BucketType enum (only if it exists and is no longer used)
-- We can't drop it yet because existing data might still reference it
-- This will be handled manually or in a future migration after verifying all data is migrated
