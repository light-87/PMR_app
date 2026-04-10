# Stock Transaction Fix Tool - Complete Guide

## 🎯 Problem Solved

**Issue:** Mistakenly added **90,000 kg urea** instead of **9,000 kg**, breaking all running totals  
**Solution:** Admin-only fix tool that:
1. Finds the mistaken transaction
2. Corrects the entry
3. Auto-recalculates ALL running totals from that point onwards

---

## 📍 Where to Find It

**Admin Settings** → Look for the yellow "Fix Stock Transaction" card at the top

```
Admin Settings
  ↓
  [⚠️ FIX STOCK TRANSACTION (90000 → 9000)]
  [📤 Bulk Upload]
  [💾 Backup & Restore]
  ...
```

---

## 🔧 How to Use - Step by Step

### STEP 1️⃣: LOAD THE PAGE

Go to `/admin` page. The fix tool appears immediately.

**What you see:**
- Search field with default value "90000"
- List of recent stock transactions below
- "Search" button

### STEP 2️⃣: FIND THE MISTAKEN TRANSACTION

```
╔═════════════════════════════════════════════════════════╗
║  Step 1: Find Mistaken Transaction                      ║
║  Search by incorrect quantity value                     ║
║                                                          ║
║  [90000___________] [Search]                            ║
║                                                          ║
║  Recent Stock Transactions:                             ║
║  ┌──────────────────────────────────────────────────┐  ║
║  │ Date        Type        Qty (kg)    Running Total│  ║
║  │ 04-09-2025  ADD_UREA    500        2500          │  ║
║  │ 04-08-2025  ADD_UREA    🔴 90000   90000         │  ║  ← Highlighted!
║  │ 04-07-2025  PRODUCE     1500       88500         │  ║
║  │ 04-06-2025  ADD_UREA    2000       87000         │  ║
║  └──────────────────────────────────────────────────┘  ║
╚═════════════════════════════════════════════════════════╝
```

**Action:** Click the "Search" button

**System finds:** Transaction from April 8, 2025 with 90,000 kg

**You'll see:**
```
✓ Transaction Found:
├─ Date: 04/08/2025
├─ Current Qty: 🔴 90,000 kg (in red, error indicator)
├─ Type: ADD_UREA
└─ Running Total: 90,000 kg (wrong - too high)
```

---

### STEP 2️⃣: ENTER CORRECT VALUE

The form now shows the found transaction and lets you correct it:

```
╔═════════════════════════════════════════════════════════╗
║  Step 2: Enter Correct Quantity                         ║
║  What should the value actually be?                     ║
║                                                          ║
║  [9000___________] [Correct]                            ║
║                                                          ║
║  Reducing by: -81,000 kg (-90%)                         ║
╚═════════════════════════════════════════════════════════╝
```

**You do:**
1. Clear the field (or it defaults to 9000)
2. Enter **9000**
3. You'll see "Reducing by: -81,000 kg (-90%)"

---

### STEP 3️⃣: PREVIEW THE FIX

Click **"Preview Changes"** button

```
╔═════════════════════════════════════════════════════════╗
║  📊 IMPACT ANALYSIS                                      ║
├─────────────────────────────────────────────────────────┤
║                                                          ║
║  Old Quantity              New Quantity                  ║
║  ┌─────────────┐          ┌─────────────┐              ║
║  │  90,000 kg  │    →     │   9,000 kg  │              ║
║  │     ❌      │          │     ✅      │              ║
║  └─────────────┘          └─────────────┘              ║
║                                                          ║
║  Adjustment: -81,000 kg                                 ║
║  Running Total (After): 9,000 kg                        ║
║                                                          ║
║  📊 Recalculation: 47 transactions will be recalculated ║
║     with corrected running totals                       ║
║                                                          ║
║  [Reset] [Recalculate] [✅ Apply Fix & Recalculate]   ║
╚═════════════════════════════════════════════════════════╝
```

**What happens:**
- Shows side-by-side comparison
- Shows adjustment amount (-81,000 kg)
- Shows NEW running total (9,000 kg instead of 90,000)
- Shows how many transactions are affected (all from that date onwards)
- **NO DATABASE CHANGES YET** - this is just a preview

**You can:**
- ✅ **Apply Fix & Recalculate** - Make the change permanent
- 🔄 **Recalculate Preview** - Re-check the calculation
- 🔁 **Reset** - Start over

---

### STEP 4️⃣: APPLY THE FIX

Click **"Apply Fix & Recalculate"** button

```
Button shows: [⏳ Applying...]  ← Spinner appears

(System working...)

Then you see:
╔═════════════════════════════════════════════════════════╗
║  ✅ Stock transaction fixed and running totals          ║
║     recalculated successfully!                          ║
║                                                          ║
║  Database has been updated with the correct values      ║
╚═════════════════════════════════════════════════════════╝
```

**Behind the scenes:**
1. ✅ Updates transaction quantity: 90,000 → 9,000
2. ✅ Recalculates running total: 90,000 → 9,000
3. ✅ Recalculates ALL subsequent transactions (47 total)
4. ✅ Logs the change for audit trail
5. ✅ Returns to idle state

**All affected transactions recalculated:**
```
Before Fix:
├─ 04-08: ADD 90,000 → Running Total: 90,000
├─ 04-09: ADD 500   → Running Total: 90,500
├─ 04-10: PRODUCE 1500 → Running Total: 89,000
└─ ... (all wrong)

After Fix:
├─ 04-08: ADD 9,000 → Running Total: 9,000 ✅
├─ 04-09: ADD 500   → Running Total: 9,500 ✅
├─ 04-10: PRODUCE 1500 → Running Total: 8,000 ✅
└─ ... (all corrected)
```

---

## 🛡️ Safety Features Built In

### 1. **Admin-Only Access**
```typescript
if (!session || session.role !== 'ADMIN') {
  return 403 Unauthorized
}
```
- Only ADMIN can use this tool
- Other roles see nothing

### 2. **Search & Confirm**
- Must FIND the transaction first
- Must ENTER the correct value
- Must PREVIEW before applying
- Only THEN can you apply

### 3. **Dry Run / Preview Mode**
- Click "Preview Changes" first
- See exactly what will change
- No database updates until you click "Apply"
- Can cancel and reset anytime

### 4. **Automatic Recalculation**
- Not just fixing one entry
- Recalculates ALL affected running totals
- Ensures data integrity
- Logs all changes

### 5. **Audit Trail**
All changes are logged:
```
[FIX-STOCK-ENTRY] TX: xyz123 | QUANTITY: 90000 → 9000 
ADJUSTMENT: -81,000 kg (-90%) | AFFECTED: 47 transactions 
APPLIED BY: ADMIN | TIME: 2025-04-10T10:30:45Z
```

---

## 🔒 Prevent Future Mistakes

The AddUreaForm (normal stock entry form) is now locked down:

### Validation Rules:
```
Maximum quantity: 50,000 kg
  ↓
If > 50,000: ERROR (blocked)

High quantity: 20,000+ kg
  ↓
If > 20,000:
  ├─ Yellow warning appears
  ├─ Confirmation checkbox appears
  └─ Submit button disabled until confirmed
```

### What the User Sees:

**Normal Entry:**
```
Add Urea Stock
  Date: [04-10-2025]
  Quantity (kg): [5000]
  Description: [___________]
  
  Equivalent: 50 bags (100kg per bag)
  
  [Cancel] [Add Urea]
```

**High Quantity Warning:**
```
Add Urea Stock
  Date: [04-10-2025]
  Quantity (kg): [25000] ⚠️ HIGH QUANTITY
  
  ⚠️ Verify Quantity: You entered 25,000 kg.
     Please confirm this is correct.
  
  Equivalent: 250 bags (100kg per bag)
  
  ☐ ✓ I confirm this quantity is correct
                ↑ Must check this box
  
  [Cancel] [Add Urea]  ← Button disabled until checked
```

**Extreme Quantity (Blocked):**
```
Add Urea Stock
  Date: [04-10-2025]
  Quantity (kg): [90000] ⚠️ HIGH QUANTITY
  
  ERROR: Quantity exceeds typical range (max 50,000 kg). 
         Please verify!
  
  [Cancel] [Add Urea]  ← Button disabled, cannot submit
```

---

## 📊 Complete Workflow Visual

```
┌─────────────────────────────────────────┐
│  User makes typo                        │
│  Adds 90,000 kg instead of 9,000 kg     │
│  ❌ All running totals broken           │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│  NEW PREVENTION LAYER                   │
│  AddUreaForm has warnings & validation  │
│  ✅ Future mistakes harder to make      │
│  ✅ Confirmation required for large qty │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│  IF MISTAKE STILL HAPPENS               │
│  Go to Admin → Fix Stock Transaction    │
│                                          │
│  1. Search by wrong quantity (90000)    │
│  2. Find the transaction                │
│  3. Enter correct value (9000)          │
│  4. Preview the fix                     │
│  5. Apply & auto-recalculate            │
│  ✅ All running totals fixed            │
└─────────────────────────────────────────┘
```

---

## 📝 API Endpoints

### Preview (Dry Run)
```bash
POST /api/admin/fix-stock-entry
Content-Type: application/json

{
  "action": "preview",
  "transactionId": "clx123abc",
  "newQuantity": 9000
}

Response:
{
  "success": true,
  "details": {
    "oldQuantity": 90000,
    "newQuantity": 9000,
    "difference": 81000,
    "affectedTransactions": 47,
    "newRunningTotal": 9000
  }
}
```

### Apply Fix
```bash
POST /api/admin/fix-stock-entry
Content-Type: application/json

{
  "action": "apply",
  "transactionId": "clx123abc",
  "newQuantity": 9000
}

Response:
{
  "success": true,
  "message": "Stock transaction fixed and running totals recalculated",
  "details": {
    "txId": "clx123abc",
    "oldQuantity": 90000,
    "newQuantity": 9000,
    "affectedTransactions": 47,
    "newRunningTotal": 9000
  }
}
```

---

## 🚀 Key Improvements

| Aspect | Before | After |
|--------|--------|-------|
| **Typo Prevention** | No warnings | Validation + confirmation |
| **Max Quantity** | Unlimited | 50,000 kg limit |
| **High Qty Alert** | None | Warning + checkbox |
| **Fix Tool** | Manual SQL | Admin UI tool |
| **Recalculation** | Manual per entry | Auto-recalc all affected |
| **Audit Trail** | None | Logged with timestamp |
| **Rollback** | N/A | Preview before apply |

---

## 🎓 Example Scenario

**Monday 9:00 AM:**
- Employee adds "90,000 kg urea" (typo - meant 9,000)
- Form now shows warning but employee clicks through
- System logs: Transaction created ❌

**Monday 10:00 AM:**
- Admin notices inventory numbers are wrong
- Goes to Admin → Fix Stock Transaction
- Searches for "90000" → finds it
- Previews correction: 90,000 → 9,000
- Clicks "Apply Fix & Recalculate"
- System updates 47 transactions
- All running totals now correct ✅
- Audit log shows: "Fixed by Admin at 10:00 AM"

**Prevention:**
- Employee goes back to form
- Tries to add 50,000+ kg
- Form blocks them with error
- Employee corrects to 5,000 and submits ✅

---

## ⚙️ Configuration

Want to adjust the limits?

**File:** `src/app/stockboard/components/AddUreaForm.tsx`

```typescript
// Change max quantity limit:
.max(50000, 'Quantity exceeds...')  // Change 50000 to your value

// Change high quantity threshold:
const isHighQuantity = quantityKg > 20000  // Change 20000 to your value
```

**File:** `src/app/api/admin/fix-stock-entry/route.ts`

All recalculation logic is here. Safe to review but locked to ADMIN role.

---

## ✅ Testing Checklist

- [ ] Go to Admin page, see the fix tool
- [ ] Try searching for a transaction
- [ ] Preview a correction without applying
- [ ] Apply a correction and see results
- [ ] Check that running totals recalculated
- [ ] Add urea normally (no warning if < 20k)
- [ ] Add > 20,000 kg (see warning)
- [ ] Try to add > 50,000 kg (should error)
- [ ] Confirm checkbox required for > 20k
- [ ] Verify audit logs recorded

---

## 🆘 Troubleshooting

**"Transaction not found"**
- Check the quantity value is exact
- Look at the recent transactions list
- Make sure you're searching by OLD quantity (90000)

**"Unauthorized"**
- Only ADMIN role can use this
- Check your PIN role

**Numbers still wrong after fix**
- Check that "Apply" button was clicked
- Verify database was actually updated
- Check browser console for errors

**Can't add high quantity**
- This is intentional! Prevents mistakes
- Check the warning message
- Click confirmation checkbox
- Or reduce quantity and try again

---

