-- CreateEnum
CREATE TYPE "PinRole" AS ENUM ('ADMIN', 'EXPENSE_INVENTORY', 'INVENTORY_ONLY');

-- CreateEnum
CREATE TYPE "Warehouse" AS ENUM ('PALLAVI', 'TULARAM', 'FACTORY');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('STOCK', 'SELL');

-- CreateEnum
CREATE TYPE "StockTransactionType" AS ENUM ('ADD_UREA', 'PRODUCE_BATCH', 'SELL_FREE_DEF', 'FILL_BUCKETS', 'SELL_BUCKETS');

-- CreateEnum
CREATE TYPE "StockCategory" AS ENUM ('UREA', 'FREE_DEF', 'FINISHED_GOODS');

-- CreateEnum
CREATE TYPE "StockUnit" AS ENUM ('KG', 'LITERS', 'BAGS');

-- CreateEnum
CREATE TYPE "ExpenseAccount" AS ENUM ('CASH', 'PRASHANT_GAYDHANE', 'PMR', 'KPG_SAVING', 'KP_ENTERPRISES');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateTable
CREATE TABLE "Pin" (
    "id" TEXT NOT NULL,
    "pinNumber" TEXT NOT NULL,
    "role" "PinRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTransaction" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "warehouse" "Warehouse" NOT NULL,
    "bucketType" TEXT NOT NULL,
    "action" "ActionType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "buyerSeller" TEXT NOT NULL,
    "runningTotal" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "StockTransaction" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "StockTransactionType" NOT NULL,
    "category" "StockCategory" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" "StockUnit" NOT NULL,
    "description" TEXT,
    "runningTotal" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseTransaction" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "account" "ExpenseAccount" NOT NULL,
    "type" "TransactionType" NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackupLog" (
    "id" TEXT NOT NULL,
    "backupDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "backupType" TEXT NOT NULL,
    "driveFileId" TEXT,
    "inventoryCount" INTEGER NOT NULL,
    "expenseCount" INTEGER NOT NULL,
    "stockCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,

    CONSTRAINT "BackupLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pin_pinNumber_key" ON "Pin"("pinNumber");

-- CreateIndex
CREATE INDEX "Pin_pinNumber_idx" ON "Pin"("pinNumber");

-- CreateIndex
CREATE INDEX "InventoryTransaction_date_idx" ON "InventoryTransaction"("date");

-- CreateIndex
CREATE INDEX "InventoryTransaction_warehouse_idx" ON "InventoryTransaction"("warehouse");

-- CreateIndex
CREATE INDEX "InventoryTransaction_bucketType_idx" ON "InventoryTransaction"("bucketType");

-- CreateIndex
CREATE INDEX "InventoryTransaction_buyerSeller_idx" ON "InventoryTransaction"("buyerSeller");

-- CreateIndex
CREATE UNIQUE INDEX "BucketTypeConfig_code_key" ON "BucketTypeConfig"("code");

-- CreateIndex
CREATE INDEX "BucketTypeConfig_code_idx" ON "BucketTypeConfig"("code");

-- CreateIndex
CREATE INDEX "BucketTypeConfig_isActive_idx" ON "BucketTypeConfig"("isActive");

-- CreateIndex
CREATE INDEX "StockTransaction_date_idx" ON "StockTransaction"("date");

-- CreateIndex
CREATE INDEX "StockTransaction_type_idx" ON "StockTransaction"("type");

-- CreateIndex
CREATE INDEX "StockTransaction_category_idx" ON "StockTransaction"("category");

-- CreateIndex
CREATE INDEX "ExpenseTransaction_date_idx" ON "ExpenseTransaction"("date");

-- CreateIndex
CREATE INDEX "ExpenseTransaction_account_idx" ON "ExpenseTransaction"("account");

-- CreateIndex
CREATE INDEX "ExpenseTransaction_type_idx" ON "ExpenseTransaction"("type");

-- CreateIndex
CREATE INDEX "ExpenseTransaction_name_idx" ON "ExpenseTransaction"("name");

-- CreateIndex
CREATE INDEX "BackupLog_backupDate_idx" ON "BackupLog"("backupDate");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSettings_key_key" ON "SystemSettings"("key");

-- Seed BucketTypeConfig with all bucket types
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
    (gen_random_uuid()::TEXT, 'IBC_TANK', 'IBC tank', 1000, true, false, NOW(), NOW()),
    (gen_random_uuid()::TEXT, 'AP_BLUE', 'AP Blue', 20, true, false, NOW(), NOW()),
    (gen_random_uuid()::TEXT, 'FREE_DEF', 'Free DEF', 0, true, true, NOW(), NOW());
