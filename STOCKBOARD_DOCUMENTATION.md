# StockBoard - Production & Stock Management System

## 📋 Overview

StockBoard is a comprehensive production and stock management module that tracks raw materials (Urea), production batches, and finished goods (Free DEF and Buckets). It provides real-time visibility into inventory levels and production history.

---

## 🔐 Access Control

### Who Can Access StockBoard?

**All 3 PIN types can access StockBoard:**
- ✅ PIN 1 (ADMIN) - Full access with production controls
- ✅ PIN 2 (EXPENSE_INVENTORY) - View-only access
- ✅ PIN 3 (INVENTORY_ONLY) - View-only access

### Default Landing Page

**StockBoard is now the first page you see after login** for all users. This ensures everyone has immediate visibility into production status and stock levels.

---

## 📊 What Information Does StockBoard Display?

### 1. Stock Overview Dashboard

Shows real-time stock levels for all materials:

**Urea (Raw Material)**
- Stock in Kilograms (kg)
- Stock in Bags (45 kg per bag)
- Production capacity (how many liters can be produced with current stock)

**Free DEF (Loose Product)**
- Available liters that can be:
  - Filled into buckets, OR
  - Sold directly to customers (loose/bulk)

**Buckets (Packaged Product)**
- Total liters in all buckets across warehouses
- Calculated from bucket inventory (all bucket types combined)

**Finished Goods (Total)**
- Total finished product = Free DEF + Buckets
- Represents complete production output

**Color-Coded Status:**
- 🟢 Green: Good stock levels
- 🟡 Yellow: Low stock warning
- 🔴 Red: Critical/out of stock

### 2. Quick Actions Section

**For Admin Users (PIN 1):**
- **Add Urea** button - Record new Urea purchases
- **Produce Batch** button - Convert Urea into Free DEF
- **Refresh** button - Update all data

**For Non-Admin Users (PIN 2 & 3):**
- **Refresh** button only
- View-only message: "View stock levels and production history. Contact admin for production actions."

### 3. Stock Transaction Log

Complete history of all stock activities:
- Urea additions
- Production batches (grouped display)
- Free DEF sales
- Bucket fills
- Bucket sales

**Each transaction shows:**
- Date
- Type of transaction
- Quantity added/removed
- Running balance after transaction
- Description/notes

---

## 🔄 Material Flow & Stock Tracking

### Complete Material Journey

```
Step 1: Purchase Urea
         ↓
Step 2: Production (360kg Urea → 1000L Free DEF)
         ↓
Step 3: Free DEF can be:
         - Filled into Buckets (via Inventory page)
         - Sold directly as loose DEF (via Inventory page)
         ↓
Step 4: Buckets can be:
         - Sold to customers (via Inventory page)
```

### Stock Categories Explained

**1. UREA (Raw Material)**
- Purchased in 45kg bags
- Used for production only
- Decreases when producing batches

**2. FREE_DEF (Loose Product)**
- Created during production
- Decreases when:
  - Filling buckets
  - Selling loose DEF to customers
- Increases when: Producing batches

**3. FINISHED_GOODS (Total Output)**
- Increases when: Producing batches
- Decreases when: Selling loose DEF
- Does NOT decrease when filling buckets (internal transfer)

---

## ⚙️ Production Operations (Admin Only)

### 1. Adding Urea Stock

**When to use:** After purchasing new Urea from supplier

**Steps:**
1. Click "Add Urea" button
2. Enter date of purchase
3. Enter quantity in kilograms
4. (Optional) Add description (e.g., "Purchased from supplier XYZ")
5. Click "Add Urea"

**System shows:**
- Equivalent bags (auto-calculated at 45kg per bag)
- Example: 360kg = 8 bags

**Result:**
- Urea stock increases
- Transaction recorded in log

---

### 2. Producing Batches

**When to use:** When converting Urea into Free DEF (production runs)

**Production Formula:**
- **Input:** 360 kg Urea (8 bags)
- **Output:** 1000 liters Free DEF

**Steps:**
1. Click "Produce Batch" button
2. Enter number of batches (1-100)
3. Select production date
4. Review stock check:
   - ✅ Green = Enough Urea available
   - ❌ Red = Insufficient Urea
5. Review production output summary
6. Click "Produce Batch"

**Example - Multiple Batches:**
- 3 batches requires:
  - Input: 1,080 kg Urea (24 bags)
  - Output: 3,000 liters Free DEF

**System Validation:**
- Checks if enough Urea is available
- Shows remaining Urea after production
- Prevents production if insufficient stock

**Result:**
- Urea stock decreases
- Free DEF stock increases
- Finished Goods increases
- Single grouped transaction in log

**Transaction Display:**
- Production transactions appear as **one combined card** showing:
  - Urea Used: -360 kg
  - Free DEF Produced: +1000 L
  - Finished Goods: +1000 L

---

## 📦 Inventory Operations (Done in Inventory Page)

### 3. Selling Free DEF (Loose/Bulk)

**Where:** Inventory page → "Sell Free DEF" button (Admin only)

**When to use:** Selling DEF directly to customers without buckets

**Steps:**
1. Go to Inventory page
2. Click "Sell Free DEF" button
3. Enter customer name
4. Enter quantity in liters
5. Select date
6. Click "Sell Free DEF"

**Result:**
- Free DEF stock decreases
- Finished Goods decreases
- Transaction recorded in StockBoard log

---

### 4. Filling Buckets

**Where:** Inventory page → "Add Entry" → Stock

**When to use:** Packaging Free DEF into buckets for storage/sale

**Steps:**
1. Go to Inventory page
2. Click "Add Entry"
3. Select warehouse (Pallavi or Tularam)
4. Select bucket type (TATA_G, AL, AP_BLUE, etc.)
5. Select "Stock" action
6. Enter quantity of buckets
7. Enter buyer/seller name
8. Select date
9. Click "Add Entry"

**System Auto-Calculation:**
- Automatically calculates liters needed
- Example: Stocking 10 × AP_BLUE buckets = 200 liters (20L each)

**Result:**
- Free DEF decreases (used for filling)
- Bucket inventory increases
- Finished Goods stays the same (internal transfer)
- Transaction recorded in both Inventory and StockBoard

---

### 5. Selling Buckets

**Where:** Inventory page → "Add Entry" → Sell

**When to use:** Selling packaged buckets to customers

**Steps:**
1. Go to Inventory page
2. Click "Add Entry"
3. Select warehouse
4. Select bucket type
5. Select "Sell" action
6. Enter quantity of buckets (negative number)
7. Enter customer name
8. Select date
9. Click "Add Entry"

**Result:**
- Bucket inventory decreases
- Finished Goods decreases
- Transaction recorded in both Inventory and StockBoard

---

## 🔄 Auto-Refresh Features

### When Does StockBoard Auto-Refresh?

1. **Window Focus:** Data refreshes automatically when you return to the browser tab
2. **After Actions:** Refreshes after adding Urea or producing batches
3. **Manual Refresh:** Click the "Refresh" button anytime

**Why Auto-Refresh?**
- Ensures data is always current
- Accounts for changes made in Inventory page
- Multiple users see updated information

---

## 📊 Understanding the Dashboard

### Stock Overview Calculations

**Urea Section:**
- **Urea (kg):** Current stock in kilograms
- **Urea (bags):** Current stock ÷ 45 kg per bag
- **Can Produce:** (Current stock ÷ 360 kg) × 1000 L

**Example:**
- If you have 720 kg Urea:
  - Bags: 720 ÷ 45 = 16 bags
  - Can Produce: (720 ÷ 360) × 1000 = 2,000 liters

**Free DEF Section:**
- Shows available loose DEF (not in buckets)
- Can be used for filling buckets or selling directly

**Buckets Section:**
- Calculated from Inventory transactions
- Combines all bucket types across both warehouses
- Formula: Sum of (bucket count × bucket size) for each type

**Finished Goods Section:**
- Total output: Free DEF + Buckets (in liters)
- Represents complete inventory ready for sale

---

## 📝 Transaction Log Details

### Transaction Types

**1. ADD_UREA**
- Icon: Package (📦)
- Color: Blue
- Shows: Urea added, new balance

**2. PRODUCE_BATCH**
- Icon: Factory (🏭)
- Color: Purple
- Shows: Combined view of Urea used, Free DEF produced, Finished Goods
- Grouped display for better clarity

**3. SELL_FREE_DEF**
- Icon: Trending Down (📉)
- Color: Red
- Shows: Free DEF sold, customer info

**4. FILL_BUCKETS**
- Icon: Trending Down (📉)
- Color: Orange
- Auto-created from Inventory "Stock" action
- Shows: Free DEF used for filling buckets

**5. SELL_BUCKETS**
- Icon: Trending Down (📉)
- Color: Red
- Auto-created from Inventory "Sell" action
- Shows: Finished Goods sold via buckets

### Reading Transaction Cards

**Each card displays:**
- **Left side:**
  - Icon indicating transaction type
  - Transaction name
  - Category (Urea, Free DEF, Finished Goods)
  - Description
  - Date
- **Right side:**
  - Quantity (+ for additions, - for consumption/sales)
  - Running balance after transaction

**Production Batch Cards (Special):**
- Purple background
- Shows all 3 impacts in one card:
  - Urea Used (red)
  - Free DEF Produced (green)
  - Finished Goods (green)

---

## 💾 Backup Integration

### StockBoard Data in Backups

**What's Backed Up:**
All StockBoard transactions are automatically included in system backups:
- Google Drive Excel file now has 3 sheets:
  1. Inventory
  2. Expenses
  3. **Stock** (NEW)

**Stock Sheet Contains:**
- Transaction ID
- Date
- Type (ADD_UREA, PRODUCE_BATCH, etc.)
- Category (UREA, FREE_DEF, FINISHED_GOODS)
- Quantity
- Unit (KG, LITERS)
- Description
- Running Total
- Created timestamp

**Backup Schedule:**
- Automatic backup every 24 hours
- Manual backup available in Admin settings

---

## 🎯 Common Workflows

### Daily Production Workflow

**Morning:**
1. Admin logs in → Lands on StockBoard
2. Check Urea stock levels
3. If Urea is low → Add Urea stock

**Production Time:**
1. Click "Produce Batch"
2. Enter number of batches based on demand
3. System validates Urea availability
4. Confirm production
5. Free DEF stock increases

**Packaging:**
1. Go to Inventory page
2. Fill buckets as needed for orders
3. Free DEF decreases, Bucket inventory increases

**Sales:**
1. Sell buckets via Inventory page, OR
2. Sell Free DEF (loose) via Inventory page "Sell Free DEF" button
3. Finished Goods decreases

### Weekly Review Workflow

**As Admin:**
1. Open StockBoard
2. Review transaction log for the week
3. Check Finished Goods levels
4. Plan next week's Urea purchases

**As Staff (Non-Admin):**
1. Open StockBoard
2. Check current stock levels
3. Report to admin if stock is low
4. View production history

---

## 🚨 Important Notes

### Stock Level Warnings

**When Urea is Low:**
- Dashboard shows red color
- Cannot produce batches if insufficient

**When Free DEF is Low:**
- Cannot fill buckets if insufficient
- Warning appears when trying to fill/sell

**When Finished Goods is Low:**
- Indicates need for more production
- Time to add Urea and produce batches

### Permissions Summary

| Action | PIN 1 (Admin) | PIN 2 | PIN 3 |
|--------|---------------|-------|-------|
| View StockBoard | ✅ | ✅ | ✅ |
| Refresh Data | ✅ | ✅ | ✅ |
| Add Urea | ✅ | ❌ | ❌ |
| Produce Batch | ✅ | ❌ | ❌ |
| Sell Free DEF | ✅ | ❌ | ❌ |
| View Transactions | ✅ | ✅ | ✅ |

### Data Integrity

**Running Totals:**
- System maintains accurate running balances
- Each transaction records the balance after that transaction
- Cannot be manually edited (prevents errors)

**Auto-Tracking:**
- Inventory actions automatically update StockBoard
- Ensures consistency across modules
- No manual duplication needed

---

## 🔧 Database Migration (Production Deployment)

### For Initial Setup

After deploying to production, run this command once:

```bash
npx prisma migrate deploy
```

This creates the StockTransaction table in the production database.

**Migration Files Created:**
1. `20251121155631_add_stock_tracking` - Adds StockTransaction table
2. `20251121170000_add_stock_count_to_backup_log` - Adds stock count to backups

**If Migration Already Run:**
- System will show graceful messages
- App will work normally

---

## 📱 User Experience

### Navigation

**After Login:**
- All users land on StockBoard (default page)
- Top navigation bar shows:
  - StockBoard (current)
  - Inventory
  - Expenses (if permitted)
  - Dashboard (Admin only)
  - Statements (Admin only)

### Mobile Responsive

- All StockBoard features work on mobile
- Cards stack vertically on small screens
- Easy to read stock levels
- Touch-friendly buttons

---

## ❓ FAQ

**Q: What happens if I produce a batch without enough Urea?**
A: The system prevents it. You'll see a red warning with the exact amount needed vs. available.

**Q: Why doesn't Finished Goods decrease when filling buckets?**
A: Filling buckets is an internal transfer (Free DEF → Buckets). Total finished goods stays the same. Only selling decreases Finished Goods.

**Q: Can non-admin users see transaction history?**
A: Yes! All users can view the complete transaction log and stock levels.

**Q: How do I know when to order more Urea?**
A: Check "Can Produce" in the dashboard. If it's less than your typical weekly production, order more Urea.

**Q: Can I produce multiple batches at once?**
A: Yes! You can produce 1-100 batches in a single transaction. The system calculates total Urea needed.

**Q: Where do I see bucket stock?**
A: Bucket stock is shown in "Buckets" section (calculated from Inventory). For detailed bucket breakdown, go to Inventory page.

**Q: How often should I refresh?**
A: Auto-refresh handles it, but you can manually refresh anytime for instant updates.

---

## 📞 Support

For questions or issues with StockBoard:
1. Check this documentation first
2. Review transaction log for recent changes
3. Contact system administrator (PIN 1 holder)

---

## 🎉 Benefits of StockBoard

✅ **Real-time visibility** - Always know current stock levels
✅ **Automated tracking** - No manual calculations needed
✅ **Complete history** - Every transaction recorded
✅ **Multi-user access** - All staff can view status
✅ **Production validation** - Prevents errors
✅ **Integrated with Inventory** - Single source of truth
✅ **Backup included** - Data protection guaranteed
✅ **Mobile friendly** - Access from anywhere

---

**Document Version:** 1.0
**Last Updated:** November 21, 2025
**System:** PMR Industries - Production Management
