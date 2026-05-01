-- CreateEnum
CREATE TYPE "BagSize" AS ENUM ('KG_45', 'KG_50');

-- AlterTable
ALTER TABLE "StockTransaction" ADD COLUMN "bagSize" "BagSize";

-- Backfill: assume all existing UREA stock is 45kg bags
UPDATE "StockTransaction"
SET "bagSize" = 'KG_45'
WHERE "category" = 'UREA';

-- CreateIndex
CREATE INDEX "StockTransaction_category_bagSize_idx" ON "StockTransaction"("category", "bagSize");
