-- ============================================
-- Pagarbook (Employee + Attendance + Payroll) module
-- Phase 1 schema — paste into Supabase SQL editor.
-- Idempotent: safe to re-run.
-- ============================================

-- Enums (idempotent via DO/EXCEPTION)
DO $$ BEGIN
  CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "AttendanceSource" AS ENUM ('FACE_SCAN', 'ADMIN_MANUAL', 'EMPLOYEE_SELF');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "SalaryPaymentType" AS ENUM ('REGULAR', 'ADVANCE', 'ADJUSTMENT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================
-- Employee
-- ============================================
CREATE TABLE IF NOT EXISTS "Employee" (
  "id"               TEXT PRIMARY KEY,
  "name"             TEXT NOT NULL,
  "phone"            TEXT NOT NULL UNIQUE,
  "pin"              TEXT NOT NULL,                 -- 4 digits, plaintext (per design)
  "monthlySalary"    DECIMAL(12,2) NOT NULL,
  "joinedDate"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "active"           BOOLEAN NOT NULL DEFAULT true,
  "faceDescriptors"  JSONB,                          -- array of 128-float arrays
  "pushSubscription" JSONB,                          -- single subscription, last-device-wins
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Employee_phone_idx"  ON "Employee"("phone");
CREATE INDEX IF NOT EXISTS "Employee_active_idx" ON "Employee"("active");

-- ============================================
-- AttendanceRecord
-- ============================================
CREATE TABLE IF NOT EXISTS "AttendanceRecord" (
  "id"          TEXT PRIMARY KEY,
  "employeeId"  TEXT NOT NULL REFERENCES "Employee"("id") ON DELETE CASCADE,
  "date"        TIMESTAMP(3) NOT NULL,                                      -- IST 00:00 UTC of that day
  "markedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,            -- actual scan/self-mark time
  "status"      "AttendanceStatus" NOT NULL,
  "source"      "AttendanceSource" NOT NULL,
  "approved"    BOOLEAN NOT NULL DEFAULT false,
  "approvedAt"  TIMESTAMP(3),
  "modified"    BOOLEAN NOT NULL DEFAULT false,                             -- admin edited after creation
  "modifiedAt"  TIMESTAMP(3),
  "notes"       TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AttendanceRecord_employeeId_date_key" UNIQUE ("employeeId","date")
);
CREATE INDEX IF NOT EXISTS "AttendanceRecord_date_idx"     ON "AttendanceRecord"("date");
CREATE INDEX IF NOT EXISTS "AttendanceRecord_approved_idx" ON "AttendanceRecord"("approved");

-- ============================================
-- SalaryPayment (no UNIQUE on month — multiple payments per month allowed)
-- ============================================
CREATE TABLE IF NOT EXISTS "SalaryPayment" (
  "id"               TEXT PRIMARY KEY,
  "employeeId"       TEXT NOT NULL REFERENCES "Employee"("id"),
  "type"             "SalaryPaymentType" NOT NULL DEFAULT 'REGULAR',
  "periodStart"      TIMESTAMP(3) NOT NULL,
  "periodEnd"        TIMESTAMP(3) NOT NULL,
  "daysInMonth"      INT NOT NULL,
  "daysAttended"     INT NOT NULL,
  "monthlySalary"    DECIMAL(12,2) NOT NULL,                                -- snapshot at payment time
  "calculatedAmount" DECIMAL(12,2) NOT NULL,                                -- system-suggested
  "amountPaid"       DECIMAL(12,2) NOT NULL,                                -- admin-typed (can differ, can be negative)
  "paidDate"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "account"          "ExpenseAccount" NOT NULL DEFAULT 'CASH',
  "expenseId"        TEXT REFERENCES "ExpenseTransaction"("id"),
  "notes"            TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "SalaryPayment_paidDate_idx"   ON "SalaryPayment"("paidDate");
CREATE INDEX IF NOT EXISTS "SalaryPayment_employeeId_idx" ON "SalaryPayment"("employeeId");

-- ============================================
-- Done. Verify with:
--   SELECT to_regclass('"Employee"'),
--          to_regclass('"AttendanceRecord"'),
--          to_regclass('"SalaryPayment"');
-- ============================================
