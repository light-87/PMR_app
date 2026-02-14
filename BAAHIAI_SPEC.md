# BaahiAI (बाही AI) — Smart Expense Tracker for Indian Businesses

## What is BaahiAI?

A multi-tenant SaaS expense management platform for small Indian businesses with AI-powered voice entry, chat, and daily briefings in Marathi, Hindi, and English. Users track income/expenses across custom accounts, view daily reports and dashboards, search transactions, and use AI to add entries by voice or ask questions about their finances.

**Pricing:** ₹2,000/year (Basic) | ₹5,000/year (Premium)
**Free tier:** 50 AI requests included, then requires subscription
**Target:** Any small Indian business — shops, traders, manufacturers, service providers

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Bun |
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Database** | Supabase (PostgreSQL + Auth + RLS) |
| **Auth** | Supabase Auth (username + password) |
| **ORM** | Prisma |
| **UI** | TailwindCSS + shadcn/ui + Lucide icons |
| **AI** | Sarvam AI (STT, Chat, TTS, Translation) — single master API key |
| **Charts** | Recharts |
| **Deployment** | Vercel + Supabase |
| **State** | Zustand |
| **Forms** | React Hook Form + Zod |

---

## Architecture

### Multi-Tenancy: Shared DB with tenant_id

Every data table has a `tenant_id` column. Supabase Row-Level Security (RLS) policies ensure each user only sees their own data. The super admin bypasses RLS to manage all tenants.

```
┌─────────────────────────────────────────────────┐
│                   Vercel (Frontend + API)        │
│                   Next.js + Bun                  │
└────────────────────────┬────────────────────────┘
                         │
              ┌──────────┴──────────┐
              │    Supabase         │
              │  ┌───────────────┐  │
              │  │ PostgreSQL    │  │
              │  │ + RLS (tenant │  │
              │  │   isolation)  │  │
              │  └───────────────┘  │
              │  ┌───────────────┐  │
              │  │ Supabase Auth │  │
              │  │ (username/pw) │  │
              │  └───────────────┘  │
              └─────────────────────┘
                         │
              ┌──────────┴──────────┐
              │    Sarvam AI        │
              │  (Master API Key)   │
              │  STT, Chat, TTS     │
              └─────────────────────┘
```

---

## Database Schema

### Auth & Tenancy

```prisma
// Managed by Supabase Auth (auth.users table)
// We extend with our own profile/tenant tables

model Tenant {
  id             String   @id @default(cuid())
  name           String                          // Business name
  ownerName      String                          // Owner's full name
  phone          String?                         // Contact phone
  email          String?                         // Contact email
  language       String   @default("mr")         // Preferred language: mr, hi, en

  // Subscription
  plan           Plan     @default(FREE)         // FREE, BASIC, PREMIUM
  subscriptionStart DateTime?
  subscriptionEnd   DateTime?
  isActive       Boolean  @default(true)

  // AI Credits
  aiCreditsTotal    Int   @default(50)           // Total credits allocated
  aiCreditsUsed     Int   @default(0)            // Credits consumed

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Relations
  users          User[]
  accounts       Account[]
  transactions   Transaction[]
  aiUsageLogs    AIUsageLog[]
}

enum Plan {
  FREE       // 50 AI credits, basic features
  BASIC      // ₹2,000/year — 500 AI credits/year
  PREMIUM    // ₹5,000/year — unlimited AI credits
}

model User {
  id           String   @id @default(cuid())
  supabaseId   String   @unique                // Links to Supabase auth.users.id
  username     String
  role         UserRole @default(OWNER)
  tenantId     String
  tenant       Tenant   @relation(fields: [tenantId], references: [id])
  createdAt    DateTime @default(now())

  @@index([tenantId])
  @@index([supabaseId])
}

enum UserRole {
  OWNER      // Full access (like ADMIN in PMR)
  STAFF      // Can add transactions, view reports (no settings/delete)
}
```

### Financial Data

```prisma
model Account {
  id          String   @id @default(cuid())
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  name        String                           // "Cash", "HDFC Bank", "SBI", etc.
  type        AccountType @default(CASH)
  isDefault   Boolean  @default(false)         // One default account
  isActive    Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())

  transactions Transaction[]

  @@unique([tenantId, name])
  @@index([tenantId])
}

enum AccountType {
  CASH
  BANK
  WALLET       // Paytm, PhonePe, etc.
  CREDIT       // Credit line / udhari
  OTHER
}

model Transaction {
  id          String          @id @default(cuid())
  tenantId    String
  tenant      Tenant          @relation(fields: [tenantId], references: [id])
  date        DateTime
  amount      Decimal         @db.Decimal(12, 2)
  type        TransactionType
  accountId   String
  account     Account         @relation(fields: [accountId], references: [id])
  name        String          @default("")      // Customer/vendor name
  note        String?                            // Optional note/description
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  @@index([tenantId, date])
  @@index([tenantId, accountId])
  @@index([tenantId, type])
  @@index([tenantId, name])
}

enum TransactionType {
  INCOME
  EXPENSE
}
```

### AI & System

```prisma
model AIUsageLog {
  id          String   @id @default(cuid())
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  feature     AIFeature                        // Which AI feature was used
  creditsUsed Int      @default(1)             // Credits consumed (usually 1)
  inputText   String?                          // For debugging (optional)
  createdAt   DateTime @default(now())

  @@index([tenantId, createdAt])
  @@index([tenantId, feature])
}

enum AIFeature {
  VOICE_ENTRY
  CHAT
  BRIEFING
  TTS
}

model SystemConfig {
  id    String @id @default(cuid())
  key   String @unique
  value String

  // Keys stored here:
  // - sarvam_api_key (master key for all tenants)
  // - sarvam_api_key_backup (fallback key)
}
```

---

## Supabase Row-Level Security (RLS)

Every data table uses RLS to isolate tenants:

```sql
-- Example for transactions table
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tenant's data
CREATE POLICY "tenant_isolation" ON "Transaction"
  FOR ALL
  USING (tenant_id = (
    SELECT tenant_id FROM "User" WHERE supabase_id = auth.uid()
  ));

-- Super admin can see everything
CREATE POLICY "super_admin_all" ON "Transaction"
  FOR ALL
  USING (
    auth.uid() IN (SELECT supabase_id FROM "User" WHERE role = 'SUPER_ADMIN')
  );
```

---

## User Flows

### Onboarding (New User)

```
1. User visits baahiai.com
2. Clicks "Sign Up"
3. Enters: username, password, business name, owner name, phone (optional)
4. Selects preferred language: Marathi / Hindi / English
5. Supabase creates auth user
6. System creates: Tenant + User + default Account ("Cash")
7. Prompted to add more accounts (bank accounts, wallets)
8. Lands on dashboard with 50 free AI credits
```

### Daily Usage

```
1. User logs in (username + password)
2. Lands on Dashboard (today's summary)
3. Can:
   a. Add transaction (manual form or voice)
   b. View expense list with filters
   c. Check daily report
   d. Search transactions
   e. Use AI chat to ask questions
   f. Generate daily briefing
```

---

## Pages & Routes

### Public Routes
| Route | Page |
|-------|------|
| `/` | Landing page (marketing, pricing, sign up CTA) |
| `/login` | Username + password login |
| `/signup` | Registration with business details |

### User Routes (authenticated)
| Route | Page | Description |
|-------|------|-------------|
| `/dashboard` | Dashboard | Today's summary cards, charts, quick stats |
| `/transactions` | Transaction List | Paginated list with filters (date, account, type, name) |
| `/transactions/add` | Add Transaction | Form — or redirect to voice entry |
| `/search` | Advanced Search | Date range, account, type, name filter + totals + print |
| `/daily-report` | Daily Report | Date picker, 4 metric cards, charts, timeline, insights |
| `/ai-lab` | AI Lab Hub | 3 experiment cards + credit usage display |
| `/ai-lab/voice-entry` | Voice Entry | Record Marathi/Hindi/English → parse → confirm → save |
| `/ai-lab/chat` | Ask BaahiAI | Chat with voice input, ask questions about finances |
| `/ai-lab/briefing` | Daily Briefing | AI morning summary in preferred language |
| `/settings` | Settings | Business profile, accounts, language, subscription |
| `/settings/accounts` | Manage Accounts | Add/edit/reorder/deactivate accounts |

### Super Admin Routes
| Route | Page | Description |
|-------|------|-------------|
| `/admin` | Admin Dashboard | Total tenants, active subscriptions, revenue, AI usage |
| `/admin/tenants` | Tenant List | All tenants with search, filter by plan/status |
| `/admin/tenants/[id]` | Tenant Detail | Edit tenant, manage subscription, view usage, reset credits |
| `/admin/subscriptions` | Subscription Manager | Expiring soon, renewal reminders, activate/deactivate |
| `/admin/ai-usage` | AI Usage Dashboard | Credits consumed per tenant, per feature, cost tracking |
| `/admin/api-keys` | API Key Manager | View/rotate Sarvam master key, set backup key |
| `/admin/settings` | System Settings | Global config, default credits, pricing |

---

## Feature Details

### 1. Expense/Income Tracking

**Add Transaction Form:**
- Date (defaults to today)
- Amount (numeric, required, shown prominently)
- Type: Income / Expense (toggle or radio)
- Account: dropdown of user's active accounts
- Name: text with autocomplete from existing names
- Note: optional text field

**Transaction List Page:**
- Paginated table (50 per page)
- Filters: date range, account, type, name search
- Each row: date, name, type badge, amount, account badge
- Swipe to edit/delete (mobile)
- Running balance display
- Quick add button (floating, mobile-friendly)

**Key differences from PMR:**
- No inventory (buckets/warehouses/stock) — pure financial tracking
- User-defined accounts instead of hardcoded enums
- tenant_id on every query
- Note field for descriptions

### 2. Daily Report

Same structure as PMR but simplified (no inventory/production):

**Metric Cards:**
- Financial: totalIncome, totalExpense, netProfit, transactionCount
- Account Breakdown: income/expense per account
- Comparison: vs yesterday (trend arrows with %)
- Health Score: 0-100 based on cash flow patterns

**Charts:**
- Account-wise breakdown (bar chart)
- Income vs Expense trend (daily for last 7 days)

**Activity Timeline:**
- Chronological list of today's transactions
- Color-coded by type (green=income, red=expense)

**Quick Insights (AI-generated for Premium):**
- "आज चा profit ₹12,000 — गेल्या आठवड्याच्या average पेक्षा 20% जास्त"
- "Cash account मध्ये सर्वाधिक activity"
- Alert if expenses > income

### 3. Dashboard

**Summary View:**
- Period selector: Today / This Week / This Month / This Year
- Total Income, Total Expense, Net Profit cards
- Monthly bar chart (income vs expense)
- Top 5 customers/vendors (by transaction volume)
- Account balances overview

### 4. Search

**Advanced Search Page:**
- Date range (from → to)
- Account filter (multi-select)
- Type filter (Income/Expense/Both)
- Name search (autocomplete)
- Results table with totals row
- Print button (A4 formatted statement)
- Export to Excel/PDF

### 5. AI Lab

**Credit System:**

| Plan | AI Credits | Resets |
|------|-----------|--------|
| FREE | 50 total (one-time) | Never |
| BASIC (₹2,000/yr) | 500/year | On subscription renewal |
| PREMIUM (₹5,000/yr) | Unlimited | N/A |

**Credit Costs:**
- Voice Entry: 2 credits (STT + LLM parse)
- Chat question: 1 credit
- Daily Briefing: 2 credits
- TTS (Read Aloud): 1 credit

**AI Lab Hub Page shows:**
- Credits remaining: "42/50 remaining" with progress bar
- If near limit: "Upgrade to Basic for 500 credits/year"
- 3 experiment cards (same as PMR design)

#### 5a. Voice Entry (same as PMR AI Lab)
- Record audio in Marathi/Hindi/English
- Sarvam STT → Sarvam-M parses into transaction fields
- System prompt includes user's account names (not hardcoded)
- Existing names from user's transaction history fed to LLM
- Preview with editable fields + confidence score
- Explicit "Confirm & Add" button
- Checks credits before processing, shows upgrade prompt if depleted

#### 5b. Ask BaahiAI Chat (same as PMR Ask PMR)
- Text + voice input
- Sarvam-M answers questions about user's financial data
- Query classification → Prisma query (filtered by tenant_id) → LLM answer
- All queries scoped to the user's tenant
- Read-only, never writes
- Suggested questions adapted for expense tracking:
  - "आजचा income किती आहे?"
  - "या महिन्यात profit किती झाला?"
  - "कोणाला सर्वात जास्त payment दिले?"
  - "Cash account मध्ये balance किती?"
  - "गेल्या आठवड्यात सर्वात मोठा expense कोणता?"

#### 5c. Smart Daily Briefing (same as PMR)
- Auto-fetches yesterday + today data
- Sarvam-M generates narrative in user's preferred language
- "Read Aloud" button via Sarvam TTS
- Sections: financial summary, top transactions, alerts, insights

**No Production Advisor** (not relevant for general businesses)

---

## Super Admin Platform

### Admin Dashboard (`/admin`)

**Overview Cards:**
- Total Tenants (active / inactive)
- Active Subscriptions (Basic / Premium)
- Monthly Revenue (₹)
- Total AI Credits Used (this month)
- Sarvam API Cost Estimate (₹)

**Quick Actions:**
- Add New Tenant
- Send Payment Reminders
- Rotate API Key

### Tenant Management (`/admin/tenants`)

**Tenant List:**
- Searchable, filterable table
- Columns: Business Name, Owner, Plan, Status, Credits Used, Subscription Expiry
- Color badges: green (active), yellow (expiring soon), red (expired), gray (free)
- Click to open tenant detail

**Tenant Detail (`/admin/tenants/[id]`):**
- Business info (editable)
- Subscription section:
  - Current plan + dates
  - "Start Subscription" button (for free users)
  - "Upgrade to Premium" button
  - "Renew Subscription" button
  - "Extend by 1 Year" button
  - Manual subscription override (start/end dates)
- AI Credits section:
  - Credits used / total (progress bar)
  - "Reset Credits" button
  - "Add Bonus Credits" input
  - Usage breakdown by feature (pie chart)
- Activity section:
  - Total transactions
  - Last active date
  - Registration date
- Danger zone:
  - Deactivate tenant
  - Delete tenant (with confirmation)

### Subscription Manager (`/admin/subscriptions`)

**Views:**
- Expiring This Week (needs renewal reminder)
- Expiring This Month
- Expired (grace period or deactivate)
- All Subscriptions

**Actions per subscription:**
- Send payment reminder (WhatsApp/SMS link)
- Mark as paid + renew
- Extend subscription
- Change plan

**Subscription Renewal Flow:**
```
1. Subscription expires
2. Super admin sees it in "Expiring" list
3. Contacts user for payment
4. User pays (UPI/bank transfer — manual for now)
5. Super admin clicks "Renew" → sets new end date
6. System resets AI credits for the new period
7. User gets full access again
```

Note: No automated payment gateway for now. Manual payment + manual renewal by super admin. Can add Razorpay/Cashfree later.

### AI Usage Dashboard (`/admin/ai-usage`)

**Charts:**
- Total credits used per day (line chart, last 30 days)
- Credits by feature (pie chart: Voice, Chat, Briefing, TTS)
- Top 10 tenants by usage (bar chart)
- Estimated Sarvam API cost (₹) per month

**Table:**
- Tenant name, plan, credits used, credits remaining, last AI usage date
- Sortable by any column
- Export to CSV

### API Key Manager (`/admin/api-keys`)

- Current Sarvam API key (masked: `sk-xxxx...xxxx`)
- "Update Key" button
- Backup key field
- Key rotation history (when changed, by whom)
- Test key button (makes a quick Sarvam API call to verify)

---

## Subscription & Credit Logic

### Plan Features Matrix

| Feature | FREE | BASIC (₹2K/yr) | PREMIUM (₹5K/yr) |
|---------|------|-----------------|-------------------|
| Manual transaction entry | Yes | Yes | Yes |
| Unlimited transactions | Yes | Yes | Yes |
| Daily report | Yes | Yes | Yes |
| Dashboard | Yes | Yes | Yes |
| Search + Print | Yes | Yes | Yes |
| Export (Excel/PDF) | No | Yes | Yes |
| AI Voice Entry | 50 credits | 500/year | Unlimited |
| AI Chat | 50 credits | 500/year | Unlimited |
| AI Briefing | 50 credits | 500/year | Unlimited |
| AI TTS (Read Aloud) | 50 credits | 500/year | Unlimited |
| Multiple accounts | 2 max | 5 max | Unlimited |
| Staff users | No | 1 staff | 3 staff |
| Print statements | Basic | Branded | Branded + logo |

### Credit Check Flow

```typescript
async function checkAndDeductCredits(tenantId: string, feature: AIFeature, cost: number): Promise<boolean> {
  const tenant = await getTenant(tenantId)

  // Premium = unlimited
  if (tenant.plan === 'PREMIUM') {
    await logAIUsage(tenantId, feature, cost)
    return true
  }

  // Check remaining credits
  const remaining = tenant.aiCreditsTotal - tenant.aiCreditsUsed
  if (remaining < cost) {
    return false // Frontend shows upgrade prompt
  }

  // Deduct credits
  await deductCredits(tenantId, cost)
  await logAIUsage(tenantId, feature, cost)
  return true
}
```

### Subscription Expiry Handling

```
- 7 days before expiry: Show banner "Subscription expiring soon"
- On expiry day: Show modal "Subscription expired, contact admin to renew"
- After expiry:
  - Downgrade to FREE plan behavior
  - AI credits = 0 (no free credits on expiry)
  - All data preserved (read-only for AI, full manual access continues)
  - Cannot add more than 2 accounts
```

---

## API Routes Structure

### Auth
```
POST /api/auth/signup         — Register new user + create tenant
POST /api/auth/login          — Login (handled by Supabase client)
POST /api/auth/logout         — Logout
GET  /api/auth/me             — Get current user + tenant info
```

### Transactions
```
GET    /api/transactions         — List with pagination + filters (tenant-scoped)
POST   /api/transactions         — Create transaction
PUT    /api/transactions/[id]    — Update transaction
DELETE /api/transactions/[id]    — Delete transaction
GET    /api/transactions/names   — Unique names for autocomplete (tenant-scoped)
```

### Accounts
```
GET    /api/accounts             — List user's accounts
POST   /api/accounts             — Create new account
PUT    /api/accounts/[id]        — Update account
DELETE /api/accounts/[id]        — Deactivate account (soft delete)
```

### Reports
```
GET /api/daily-report?date=     — Daily report data (tenant-scoped)
GET /api/dashboard?period=      — Dashboard data (tenant-scoped)
GET /api/search?...             — Advanced search with totals (tenant-scoped)
```

### AI Lab
```
POST /api/ai/voice-parse        — STT + LLM parse (checks credits)
POST /api/ai/chat               — Chat question (checks credits)
GET  /api/ai/briefing           — Daily briefing (checks credits)
POST /api/ai/stt                — Speech-to-text only (checks credits)
POST /api/ai/tts                — Text-to-speech (checks credits)
GET  /api/ai/credits            — Get remaining credits
```

### Settings
```
GET  /api/settings/profile      — Get tenant profile
PUT  /api/settings/profile      — Update tenant profile
GET  /api/settings/subscription — Get subscription details
```

### Super Admin
```
GET    /api/admin/tenants            — List all tenants
POST   /api/admin/tenants            — Create tenant manually
GET    /api/admin/tenants/[id]       — Tenant detail
PUT    /api/admin/tenants/[id]       — Update tenant
DELETE /api/admin/tenants/[id]       — Delete tenant

POST   /api/admin/tenants/[id]/subscribe   — Start/renew subscription
POST   /api/admin/tenants/[id]/credits     — Add/reset credits
POST   /api/admin/tenants/[id]/deactivate  — Deactivate tenant

GET    /api/admin/subscriptions      — All subscriptions with expiry info
GET    /api/admin/ai-usage           — AI usage stats
GET    /api/admin/api-keys           — Get current API keys
POST   /api/admin/api-keys           — Update API key
GET    /api/admin/stats              — Dashboard overview stats
```

---

## AI System Prompts (Adapted for BaahiAI)

### Voice Parse System Prompt

```
You are a transaction parser for a small Indian business expense tracker called BaahiAI.

Parse spoken text (Marathi, Hindi, or English) into a transaction.

## User's Accounts:
{dynamically injected from user's accounts}
Example: "Cash" (CASH), "HDFC Bank" (BANK), "PhonePe" (WALLET)

## Existing Names in Database:
{dynamically injected from user's transaction names}

## Output JSON:
{
  "date": "YYYY-MM-DD",
  "amount": number,
  "type": "INCOME" | "EXPENSE",
  "accountName": "<matched account name>",
  "name": "<person/vendor name>",
  "note": "<optional description>",
  "isNewName": true | false,
  "confidence": 0.0 to 1.0
}
```

### Chat Classification (adapted — no inventory/stock/leads)

```
Categories:
- EXPENSE_SUMMARY: income, expenses, profit questions
- ACCOUNT_BALANCE: balance in specific account
- CUSTOMER_STATEMENT: transactions with specific person
- TOP_ANALYSIS: top customers, biggest expenses, most frequent
- GENERAL: broad financial questions
```

---

## Onboarding Setup

When a new user signs up:

1. **Supabase Auth** creates user with username/password
2. **API creates:**
   - `Tenant` record (business name, owner, language, plan=FREE, credits=50)
   - `User` record (linked to Supabase auth, role=OWNER)
   - `Account` records: "Cash" (default, CASH type) — user can add more
3. **Redirect** to dashboard with welcome modal:
   - "Welcome to BaahiAI! 🎉"
   - "You have 50 free AI credits"
   - "Add your bank accounts in Settings"
   - Quick tour of features

---

## Language Support

UI text and AI responses support 3 languages:
- **Marathi (mr)** — default
- **Hindi (hi)**
- **English (en)**

Language is stored per tenant. UI labels use a simple i18n object:

```typescript
const labels = {
  mr: { income: 'जमा', expense: 'खर्च', profit: 'नफा', ... },
  hi: { income: 'आय', expense: 'व्यय', profit: 'लाभ', ... },
  en: { income: 'Income', expense: 'Expense', profit: 'Profit', ... },
}
```

AI system prompts tell Sarvam-M to respond in the user's preferred language.

---

## Project Structure

```
baahiai/
├── src/
│   ├── app/
│   │   ├── (public)/              # Landing, login, signup
│   │   │   ├── page.tsx           # Landing page
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (app)/                 # Authenticated user routes
│   │   │   ├── layout.tsx         # App shell with nav
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── transactions/page.tsx
│   │   │   ├── search/page.tsx
│   │   │   ├── daily-report/page.tsx
│   │   │   ├── ai-lab/
│   │   │   │   ├── page.tsx       # Hub
│   │   │   │   ├── voice-entry/page.tsx
│   │   │   │   ├── chat/page.tsx
│   │   │   │   └── briefing/page.tsx
│   │   │   └── settings/
│   │   │       ├── page.tsx       # Profile
│   │   │       └── accounts/page.tsx
│   │   ├── (admin)/               # Super admin routes
│   │   │   ├── admin/page.tsx     # Admin dashboard
│   │   │   ├── admin/tenants/
│   │   │   ├── admin/subscriptions/
│   │   │   ├── admin/ai-usage/
│   │   │   ├── admin/api-keys/
│   │   │   └── admin/settings/
│   │   └── api/
│   │       ├── auth/
│   │       ├── transactions/
│   │       ├── accounts/
│   │       ├── daily-report/
│   │       ├── dashboard/
│   │       ├── search/
│   │       ├── ai/
│   │       ├── settings/
│   │       └── admin/
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts          # Browser client
│   │   │   ├── server.ts          # Server client
│   │   │   └── admin.ts           # Service role client (for admin)
│   │   ├── sarvam.ts              # Sarvam AI client (same as PMR)
│   │   ├── credits.ts             # Credit check/deduct logic
│   │   ├── prisma.ts
│   │   └── i18n.ts                # Language labels
│   ├── components/
│   │   ├── ui/                    # shadcn components
│   │   ├── layout/
│   │   │   ├── AppShell.tsx       # Sidebar/header for app
│   │   │   ├── AdminShell.tsx     # Sidebar/header for admin
│   │   │   └── MobileNav.tsx
│   │   └── shared/
│   │       ├── CreditBadge.tsx    # Shows remaining credits
│   │       ├── UpgradePrompt.tsx  # Shown when credits exhausted
│   │       └── MarkdownRenderer.tsx
│   ├── store/
│   │   └── authStore.ts
│   └── types/
│       └── index.ts
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts                    # Creates super admin user
│   └── migrations/
├── supabase/
│   └── migrations/                # RLS policies
├── package.json
├── bunfig.toml
├── tailwind.config.ts
├── tsconfig.json
└── next.config.mjs
```

---

## Implementation Order

### Phase 1: Foundation (Week 1)
1. Init project: `bun create next-app baahiai`
2. Setup Supabase project + Prisma schema
3. Configure auth (signup/login pages)
4. Create Tenant/User/Account models with RLS
5. Build app shell (nav, layout, mobile-responsive)
6. Onboarding flow (signup → create tenant → add accounts)

### Phase 2: Core Features (Week 2)
7. Transaction CRUD (add, list, edit, delete)
8. Add transaction form with account dropdown + name autocomplete
9. Transaction list with pagination + filters
10. Search page with advanced filters + print
11. Settings page (profile, accounts, language)

### Phase 3: Reports (Week 3)
12. Daily report API (financial metrics, timeline, insights)
13. Daily report page with metric cards + charts
14. Dashboard page (period selector, monthly chart, summary)

### Phase 4: AI Lab (Week 4)
15. Sarvam AI integration (same lib as PMR)
16. Credit system (check, deduct, log)
17. AI Lab hub with credit display
18. Voice Entry (adapted for expense-only, user's accounts in prompt)
19. Ask BaahiAI chat (adapted query types for expense-only)
20. Daily Briefing (simplified — financial only)

### Phase 5: Super Admin (Week 5)
21. Admin dashboard (stats overview)
22. Tenant management (list, detail, create)
23. Subscription management (start, renew, expire logic)
24. Credit management (reset, add bonus, usage charts)
25. API key management

### Phase 6: Polish (Week 6)
26. Landing page (marketing, pricing table, testimonials)
27. Upgrade prompts throughout the app
28. Subscription expiry banners + handling
29. Mobile optimization
30. Language switcher + i18n labels
31. Export (Excel/PDF) for paid plans

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx          # For admin operations

# Database (Supabase Postgres)
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...               # For migrations

# Sarvam AI (Master key — shared across all tenants)
SARVAM_API_KEY=sk-xxxx

# App
NEXT_PUBLIC_APP_URL=https://baahiai.com
SUPER_ADMIN_EMAIL=admin@baahiai.com       # Bootstrap super admin
```

---

## Key Differences from PMR App

| Aspect | PMR App | BaahiAI |
|--------|---------|---------|
| Tenancy | Single-tenant | Multi-tenant with RLS |
| Auth | PIN-based (4 digits) | Username + password (Supabase) |
| Users | Fixed PINs | Signup/login, multiple users per tenant |
| Accounts | 5 hardcoded | User-defined, unlimited |
| Inventory | 14 bucket types, 3 warehouses | None |
| Production | Urea/DEF tracking | None |
| CRM | Lead management | None |
| AI | Direct API key per instance | Master key with credit system |
| AI Credits | Unlimited | Metered (50/500/unlimited by plan) |
| Admin | Single admin page | Full super admin platform |
| Subscriptions | None | ₹2K/5K yearly with renewal tracking |
| Backup | Google Drive | Supabase handles it |
| Runtime | Node.js | Bun |
| Database | Vercel Postgres / Neon | Supabase PostgreSQL |
| Language | English UI, Marathi AI | Full i18n (mr/hi/en) |
