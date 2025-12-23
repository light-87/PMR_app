-- ==============================================================================
-- 1. Create Tenant Table & Default Tenant
-- ==============================================================================

CREATE TABLE "Tenant" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- Insert Default Tenant 'PMR'
INSERT INTO "Tenant" ("slug", "name") VALUES ('pmr', 'PMR');


-- ==============================================================================
-- 2. Create Dynamic Enum Tables (Warehouse, Account, Product)
-- ==============================================================================

CREATE TABLE "Warehouse" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "tenantId" UUID NOT NULL,
  CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Warehouse_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Warehouse_tenantId_name_key" UNIQUE ("tenantId", "name")
);

CREATE TABLE "Account" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "tenantId" UUID NOT NULL,
  CONSTRAINT "Account_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Account_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Account_tenantId_name_key" UNIQUE ("tenantId", "name")
);

CREATE TABLE "Product" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "size" INTEGER NOT NULL, -- in liters
  "tenantId" UUID NOT NULL,
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Product_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Product_tenantId_name_key" UNIQUE ("tenantId", "name")
);

-- Backfill 'PMR' Data into New Tables
DO $$
DECLARE
  pmr_id UUID;
BEGIN
  SELECT id INTO pmr_id FROM "Tenant" WHERE slug = 'pmr';

  -- Warehouses
  INSERT INTO "Warehouse" ("name", "tenantId") VALUES
    ('PALLAVI', pmr_id),
    ('TULARAM', pmr_id),
    ('FACTORY', pmr_id);

  -- Accounts
  INSERT INTO "Account" ("name", "tenantId") VALUES
    ('CASH', pmr_id),
    ('PRASHANT_GAYDHANE', pmr_id),
    ('PMR', pmr_id),
    ('KPG_SAVING', pmr_id),
    ('KP_ENTERPRISES', pmr_id);

  -- Products (from BUCKET_SIZES)
  INSERT INTO "Product" ("name", "size", "tenantId") VALUES
    ('TATA_G', 20, pmr_id),
    ('TATA_W', 20, pmr_id),
    ('TATA_HP', 20, pmr_id),
    ('AL_10_LTR', 10, pmr_id),
    ('AL', 20, pmr_id),
    ('BB', 20, pmr_id),
    ('ES', 20, pmr_id),
    ('MH', 20, pmr_id),
    ('MH_10_LTR', 10, pmr_id),
    ('TATA_10_LTR', 10, pmr_id),
    ('IBC_TANK', 0, pmr_id),
    ('AP_BLUE', 20, pmr_id),
    ('INDIAN_OIL_20L', 20, pmr_id),
    ('FREE_DEF', 0, pmr_id);
END $$;


-- ==============================================================================
-- 3. Add tenantId to Existing Tables & Backfill
-- ==============================================================================

DO $$
DECLARE
  pmr_id UUID;
BEGIN
  SELECT id INTO pmr_id FROM "Tenant" WHERE slug = 'pmr';

  -- Helper macro-like logic for each table
  -- Pin
  ALTER TABLE "Pin" ADD COLUMN "tenantId" UUID;
  UPDATE "Pin" SET "tenantId" = pmr_id;
  ALTER TABLE "Pin" ALTER COLUMN "tenantId" SET NOT NULL;
  ALTER TABLE "Pin" ADD CONSTRAINT "Pin_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

  -- InventoryTransaction
  ALTER TABLE "InventoryTransaction" ADD COLUMN "tenantId" UUID;
  UPDATE "InventoryTransaction" SET "tenantId" = pmr_id;
  ALTER TABLE "InventoryTransaction" ALTER COLUMN "tenantId" SET NOT NULL;
  ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

  -- StockTransaction
  ALTER TABLE "StockTransaction" ADD COLUMN "tenantId" UUID;
  UPDATE "StockTransaction" SET "tenantId" = pmr_id;
  ALTER TABLE "StockTransaction" ALTER COLUMN "tenantId" SET NOT NULL;
  ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

  -- ExpenseTransaction
  ALTER TABLE "ExpenseTransaction" ADD COLUMN "tenantId" UUID;
  UPDATE "ExpenseTransaction" SET "tenantId" = pmr_id;
  ALTER TABLE "ExpenseTransaction" ALTER COLUMN "tenantId" SET NOT NULL;
  ALTER TABLE "ExpenseTransaction" ADD CONSTRAINT "ExpenseTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

  -- BackupLog
  ALTER TABLE "BackupLog" ADD COLUMN "tenantId" UUID;
  UPDATE "BackupLog" SET "tenantId" = pmr_id;
  ALTER TABLE "BackupLog" ALTER COLUMN "tenantId" SET NOT NULL;
  ALTER TABLE "BackupLog" ADD CONSTRAINT "BackupLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

  -- SystemSettings
  ALTER TABLE "SystemSettings" ADD COLUMN "tenantId" UUID;
  UPDATE "SystemSettings" SET "tenantId" = pmr_id;
  ALTER TABLE "SystemSettings" ALTER COLUMN "tenantId" SET NOT NULL;
  ALTER TABLE "SystemSettings" ADD CONSTRAINT "SystemSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

  -- Lead
  ALTER TABLE "Lead" ADD COLUMN "tenantId" UUID;
  UPDATE "Lead" SET "tenantId" = pmr_id;
  ALTER TABLE "Lead" ALTER COLUMN "tenantId" SET NOT NULL;
  ALTER TABLE "Lead" ADD CONSTRAINT "Lead_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
END $$;


-- ==============================================================================
-- 4. Update Pin Unique Constraints
-- ==============================================================================

ALTER TABLE "Pin" DROP CONSTRAINT "Pin_pinNumber_key";
CREATE UNIQUE INDEX "Pin_tenantId_pinNumber_key" ON "Pin"("tenantId", "pinNumber");


-- ==============================================================================
-- 5. Migrate Data from Enums to Foreign Keys
-- ==============================================================================

-- InventoryTransaction: Add warehouseId and productId
ALTER TABLE "InventoryTransaction" ADD COLUMN "warehouseId" UUID;
ALTER TABLE "InventoryTransaction" ADD COLUMN "productId" UUID;

-- Update warehouseId
UPDATE "InventoryTransaction" it
SET "warehouseId" = w.id
FROM "Warehouse" w
WHERE w.name = it.warehouse::text AND w."tenantId" = it."tenantId";

-- Update productId
UPDATE "InventoryTransaction" it
SET "productId" = p.id
FROM "Product" p
WHERE p.name = it."bucketType"::text AND p."tenantId" = it."tenantId";

-- Add Constraints
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ExpenseTransaction: Add accountId
ALTER TABLE "ExpenseTransaction" ADD COLUMN "accountId" UUID;

-- Update accountId
UPDATE "ExpenseTransaction" et
SET "accountId" = a.id
FROM "Account" a
WHERE a.name = et.account::text AND a."tenantId" = et."tenantId";

-- Add Constraints
ALTER TABLE "ExpenseTransaction" ADD CONSTRAINT "ExpenseTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ==============================================================================
-- 6. Enable RLS (Row Level Security)
-- ==============================================================================

ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Pin" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Warehouse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExpenseTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BackupLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SystemSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lead" ENABLE ROW LEVEL SECURITY;

-- Policies assuming 'app.current_tenant' is set by the application/middleware
CREATE POLICY "Tenant Isolation" ON "Pin" USING ("tenantId" = current_setting('app.current_tenant')::uuid);
CREATE POLICY "Tenant Isolation" ON "Warehouse" USING ("tenantId" = current_setting('app.current_tenant')::uuid);
CREATE POLICY "Tenant Isolation" ON "Account" USING ("tenantId" = current_setting('app.current_tenant')::uuid);
CREATE POLICY "Tenant Isolation" ON "Product" USING ("tenantId" = current_setting('app.current_tenant')::uuid);
CREATE POLICY "Tenant Isolation" ON "InventoryTransaction" USING ("tenantId" = current_setting('app.current_tenant')::uuid);
CREATE POLICY "Tenant Isolation" ON "StockTransaction" USING ("tenantId" = current_setting('app.current_tenant')::uuid);
CREATE POLICY "Tenant Isolation" ON "ExpenseTransaction" USING ("tenantId" = current_setting('app.current_tenant')::uuid);
CREATE POLICY "Tenant Isolation" ON "BackupLog" USING ("tenantId" = current_setting('app.current_tenant')::uuid);
CREATE POLICY "Tenant Isolation" ON "SystemSettings" USING ("tenantId" = current_setting('app.current_tenant')::uuid);
CREATE POLICY "Tenant Isolation" ON "Lead" USING ("tenantId" = current_setting('app.current_tenant')::uuid);
-- Tenant: Allow reading own tenant data
CREATE POLICY "Tenant Self View" ON "Tenant" USING ("id" = current_setting('app.current_tenant')::uuid);
