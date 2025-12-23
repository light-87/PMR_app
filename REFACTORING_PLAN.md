# Refactoring Plan: Next.js Implementation

This document outlines the step-by-step changes required in the Next.js application to support the Multi-Tenant Architecture.

## 1. Schema & Prisma Update
- [ ] **Apply Migration:** Run the generated SQL migration script in the Supabase SQL Editor.
- [ ] **Update Prisma Client:** Run `npx prisma generate` to update the client with the new schema (Tenant, Warehouse, Account, Product tables).
- [ ] **Verify Database:** Ensure all existing data is correctly backfilled to the 'PMR' tenant.

## 2. Authentication Logic Update (`src/lib/auth.ts` & Login API)
- [ ] **Update Session Data:** Modify `SessionData` interface in `src/lib/auth.ts`:
  ```typescript
  export interface SessionData {
    pinId: string
    tenantId: string // NEW
    role: 'ADMIN' | 'EXPENSE_INVENTORY' | 'INVENTORY_ONLY'
    expiresAt: number
  }
  ```
- [ ] **Login API (`src/app/api/auth/login/route.ts`):**
  - Accept `companySlug` and `pin` in the request body.
  - Query logic:
    1. Find `Tenant` by `slug`. If not found -> Error.
    2. Find `Pin` by `pinNumber` AND `tenantId`. If not found -> Error.
  - Create session token including `tenantId`.

## 3. Middleware Update (`src/middleware.ts`)
- [ ] **Extract Tenant:** Read `tenantId` from the verified session.
- [ ] **Tenant Context:**
  - *Option A (Header):* Set `x-tenant-id` header in the request for downstream API routes.
  - *Option B (Cookie):* Just rely on the session cookie.
- [ ] **RLS Configuration (Crucial):**
  - Ensure that for every request, we can pass the `tenantId` to the database context if using direct SQL.
  - *Note:* Since we are using Prisma, we will manually enforce tenancy in the WHERE clauses (Application-level RLS).

## 4. Refactor "Enum" Types to Dynamic Data
- [ ] **Update Types (`src/types/index.ts`):**
  - Remove hardcoded `Warehouse` and `ExpenseAccount` types if they are strict unions. Change them to `string` (UUIDs).
  - Remove `BUCKET_SIZES` constant.
- [ ] **Create Context/Store:**
  - Create a React Context or Zustand store to fetch and hold `Warehouses`, `Accounts`, and `Products` for the current tenant upon login.
  - This replaces the hardcoded `BUCKET_SIZES` and `ACCOUNT_LABELS`.

## 5. API Route Refactoring (The Heavy Lift)
- [ ] **Base Query Update:** Update *every* Prisma query in `src/app/api/...` to include `where: { tenantId: session.tenantId }`.
  - Example: `prisma.inventoryTransaction.findMany({ where: { tenantId: user.tenantId, ... } })`
- [ ] **Dynamic Configuration:**
  - Instead of `BUCKET_SIZES[type]`, query the `Product` table (or cache it).
  - Instead of hardcoded "PALLAVI"/"TULARAM" columns in logic, iterate over the fetched `Warehouse` list.

## 6. UI Component Refactoring
- [ ] **AddEntryForm (`src/app/inventory/components/AddEntryForm.tsx`):**
  - Fetch warehouse list from API instead of hardcoded enum.
  - Fetch product list (buckets) from API.
  - Remove specific logic like `if (warehouse === 'FACTORY')` if possible, or make it data-driven (e.g., add `isFactory` flag to Warehouse table).
- [ ] **Dashboards:**
  - Update charts to handle dynamic warehouse names and dynamic account names.
  - Remove `InventorySummary` hardcoded fields (`pallavi`, `tularam`). Update to `{ warehouseId: string, quantity: number }[]`.

## 7. Testing
- [ ] **Multi-Tenant Test:**
  - Create a second tenant 'TEST_CORP'.
  - Log in as TEST_CORP. Ensure NO data from PMR is visible.
  - Create data as TEST_CORP.
  - Log in as PMR. Ensure NO data from TEST_CORP is visible.
