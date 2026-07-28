-- AlterEnum
-- IF NOT EXISTS because this value was already added by hand in the Supabase SQL editor;
-- this keeps `prisma migrate deploy` idempotent so the migration history can catch up.
ALTER TYPE "BucketType" ADD VALUE IF NOT EXISTS 'UF_FILTER';
