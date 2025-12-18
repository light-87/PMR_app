# 📊 Inventory Dashboard - User Guide

**For: PMR Industries Management**
**Date: December 2025**
**Purpose: Make smarter inventory and production decisions**

---

## 🎯 What is This Dashboard?

The Inventory Dashboard is your **control center** for tracking:
- How many buckets you have in stock
- Which buckets are selling fast vs slow
- When to reorder more buckets
- **MOST IMPORTANT:** When to produce more FREE DEF (loose fluid)

Think of it as your **early warning system** that prevents:
- ❌ Running out of stock (losing sales)
- ❌ Ordering too much (money stuck in inventory)
- ❌ Running out of FREE DEF (production stops)

---

## 📈 Dashboard Sections Explained

The dashboard has **TWO main parts:**

### **PART 1: BUCKET INVENTORY** (Top Section)
Tracks your packaged products in buckets

### **PART 2: FREE DEF ANALYTICS** (Bottom Section)
Tracks your loose DEF fluid (the raw product that fills buckets)

---

## 🪣 PART 1: BUCKET INVENTORY SECTION

### 1️⃣ **Overview Cards** (4 Big Numbers at the Top)

```
┌─────────────┬──────────────┬──────────────┬──────────────┐
│ Total       │ Total        │ Turnover     │ Current      │
│ Stocked     │ Sold         │ Rate         │ Stock        │
│ 500 buckets │ 450 buckets  │ 2.5x         │ 250 buckets  │
│ +12.5% ↑    │ +8.3% ↑      │              │              │
└─────────────┴──────────────┴──────────────┴──────────────┘
```

**What This Tells You:**
- **Total Stocked:** How many buckets you received (from factory/suppliers)
- **Total Sold:** How many buckets customers bought
- **Turnover Rate:** How fast buckets are moving (higher = better)
  - 2.5x means buckets are sold 2.5 times per period
  - Good turnover = 2-3x per month
- **Current Stock:** Total buckets across all warehouses right now
- **↑ ↓ Arrows:** Compared to last period (green ↑ = improvement, red ↓ = decline)

**How to Use This:**
- ✅ If "Total Sold" increasing → Business growing! 🎉
- ⚠️ If "Turnover Rate" < 1x → Stock moving too slowly, reduce orders
- ⚠️ If "Current Stock" too low → Order more soon

---

### 2️⃣ **Movement Trends Chart** (Line Graph)

Shows your bucket flow over time with three lines:
- **Blue Line (Stocked):** Buckets you received
- **Green Line (Sold):** Buckets customers bought
- **Gray Dashed (Net):** Overall change (stocked - sold)

**What This Tells You:**
- Busy vs slow months/weeks
- If you're selling faster than restocking (net going down)
- Seasonal patterns (e.g., always busy in summer)

**How to Use This:**
- 📈 If green line (sold) higher than blue (stocked) → You're depleting stock, order more
- 📉 If blue line (stocked) much higher than green (sold) → Overstocking, slow down orders
- 🔄 Look for patterns to predict busy periods

---

### 3️⃣ **Sales Forecast Chart** (Future Predictions)

Shows:
- **Historical (solid green):** Past actual sales
- **Projected (dashed orange):** Predicted future sales based on trends

**What This Tells You:**
- Expected sales for next 30 days (daily view) or 3 months (monthly view)
- Helps plan how much to order

**How to Use This:**
- 📅 Plan your orders based on forecast
- 🎯 Prepare for predicted busy periods
- 💰 Budget for expected purchases

---

### 4️⃣ **Reorder Recommendations Table** (⚠️ Action Items)

```
┌──────────────┬────────────┬──────────────┬─────────────┐
│ Bucket Type  │ Stock      │ Days Left    │ Status      │
├──────────────┼────────────┼──────────────┼─────────────┤
│ TATA G       │ 50         │ 8 days       │ 🔴 Urgent   │
│ TATA W       │ 120        │ 18 days      │ 🟡 Soon     │
│ AL 10 ltr    │ 200        │ 45 days      │ 🟢 OK       │
└──────────────┴────────────┴──────────────┴─────────────┘
```

**Color Codes:**
- 🔴 **Red (Urgent):** Less than 14 days left → **ORDER NOW!**
- 🟡 **Yellow (Soon):** 14-30 days left → Plan to order this week
- 🟢 **Green (Sufficient):** More than 30 days → You're good

**What This Tells You:**
- Which buckets to reorder immediately
- How many to order (see "Recommended Order Qty" column)
- Prevents running out of popular items

**How to Use This:**
- ⚠️ **Every morning**, check this table first!
- 🔴 Red items → Call supplier TODAY
- 🟡 Yellow items → Add to this week's order list
- 📝 Use "Recommended Order Qty" as guide (it targets 60 days supply)

**Example:**
> "TATA G shows 🔴 Urgent with 8 days left. Recommended order: 150 buckets"
> **Action:** Call supplier today, order 150 TATA G buckets

---

### 5️⃣ **Bucket Performance Table** (Which Sell Best?)

```
┌──────────────┬──────────┬────────┬──────────┬────────┐
│ Bucket       │ Stocked  │ Sold   │ Turnover │ Status │
├──────────────┼──────────┼────────┼──────────┼────────┤
│ TATA G       │ 500      │ 480    │ 3.2x     │ ⚡ Fast│
│ TATA W       │ 300      │ 180    │ 1.5x     │ ⏱️ Moderate │
│ AP Blue      │ 150      │ 20     │ 0.3x     │ 🐌 Slow│
└──────────────┴──────────┴────────┴──────────┴────────┘
```

**Status Badges:**
- ⚡ **Fast-moving:** Turnover > 2x/month (hot sellers!)
- ⏱️ **Moderate:** Turnover 0.5-2x/month (steady sellers)
- 🐌 **Slow-moving:** Turnover < 0.5x/month (weak sellers)

**What This Tells You:**
- Your best-selling products
- Which products tie up money (slow movers)
- Where to focus your sales efforts

**How to Use This:**
- ✅ **Fast movers:** Keep high stock, promote these
- 📊 **Moderate:** Maintain normal stock levels
- 🐌 **Slow movers:**
  - Reduce orders (don't tie up money)
  - Consider discounts/promotions
  - Maybe discontinue if consistently slow

**Business Decision Example:**
> "TATA G is ⚡ Fast (3.2x turnover) → Increase stock, ensure never runs out"
> "AP Blue is 🐌 Slow (0.3x turnover) → Order less, free up cash for fast movers"

---

### 6️⃣ **Top 10 Customers & Suppliers** (Know Your Partners)

Two side-by-side tables showing:
- **Left:** Top 10 customers (who buys most buckets)
- **Right:** Top 10 suppliers (who supplies most buckets)

**What This Tells You:**
- Your most valuable customers (VIPs!)
- Your most reliable suppliers
- Who to prioritize for good relationships

**How to Use This:**
- 🥇 **Top 3 customers:** Give special attention, discounts, priority service
- 📞 Stay in regular contact with top customers
- 🤝 Build strong relationships with top suppliers for better deals
- 🎯 If big customer buying less lately → Call them, offer deals

---

## 💧 PART 2: FREE DEF ANALYTICS SECTION

### **Why This Section Exists**

FREE DEF is your **loose DEF fluid** (measured in liters, not buckets). This is critical because:
- You produce FREE DEF from urea (raw material)
- FREE DEF is consumed when you **fill and sell buckets** (20L per bucket, 10L for small buckets)
- You also sell FREE DEF directly to some customers (loose sales)
- **If FREE DEF runs out → Production stops → No buckets to sell → Lost revenue**

This section answers: **"Do we need to produce more DEF? If yes, how much and when?"**

---

### 1️⃣ **FREE DEF Overview Cards** (4 Key Metrics)

```
┌─────────────┬──────────────┬─────────────┬──────────────┐
│ 🏭 Produced │ 📦 Consumed  │ 💧 Sold     │ 📊 Current   │
│ 5,000 L     │ 4,000 L      │ 1,200 L     │ 2,500 L      │
│ +12.5% ↑    │ (for buckets)│ (loose)     │              │
└─────────────┴──────────────┴─────────────┴──────────────┘
```

**What This Tells You:**
- **Produced:** How much DEF you manufactured (from urea)
- **Consumed by Buckets:** DEF used when selling buckets
  - Calculated automatically: bucket quantity × bucket size
  - Example: 100 TATA_G buckets sold = 100 × 20L = 2,000L consumed
- **Sold Direct:** Loose DEF sold to customers (not in buckets)
- **Current Stock:** How much DEF you have right now

**How to Use This:**
- 📊 Compare Produced vs (Consumed + Sold Direct)
- ⚠️ If Consumed + Sold > Produced → Stock decreasing, produce soon
- ✅ If Produced > Consumed + Sold → Stock increasing, you're good

---

### 2️⃣ **Production Forecast** ⭐ **MOST IMPORTANT FEATURE**

```
┌─────────────────────────────────────────────────┐
│  🔴 URGENT - Production Needed NOW              │
├─────────────────────────────────────────────────┤
│  Current Stock:        2,500 Liters             │
│  Daily Consumption:    180 L/day                │
│    • Buckets: 150 L/day (bucket sales)         │
│    • Direct:   30 L/day (loose sales)           │
│                                                  │
│  📅 Days Until Stockout: 14 days                │
│                                                  │
│  🏭 Recommended Action:                         │
│  ┌────────────────────────────────────────────┐ │
│  │ Produce 2 batches NOW (2,000 Liters)      │ │
│  │ This will provide 25 days of supply       │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  📊 Production Schedule:                        │
│  • Next batch due: Jan 20, 2025                │
│  • Following batch: Feb 5, 2025                │
└─────────────────────────────────────────────────┘
```

**Alert Levels:**
- 🔴 **URGENT (< 14 days):** Produce immediately or you'll run out!
- 🟡 **Warning (14-30 days):** Plan production this week
- 🟢 **Sufficient (> 30 days):** You're good, no rush

**What This Tells You:**
- **Exactly how many days** until DEF runs out
- **How many batches** to produce (1 batch = 1,000 liters)
- **When to schedule** production (specific dates)
- **Breakdown** of consumption (buckets vs direct sales)

**How to Use This - Step by Step:**

**Example Scenario:**
```
Alert shows: 🔴 URGENT - 11 days left
Recommendation: Produce 2 batches NOW
```

**Your Action Plan:**
1. ✅ **Immediate:** Check urea stock (need 360kg × 2 = 720kg for 2 batches)
2. ✅ **If urea sufficient:** Schedule production TODAY/TOMORROW
3. ✅ **If urea low:** Order urea URGENTLY
4. ✅ **Communicate:** Tell team about urgent production needed
5. ✅ **Plan ahead:** Note next batch date (e.g., Jan 20) in calendar

**Why This Matters:**
- ⚠️ Running out of DEF = **ZERO production** = no buckets to sell = lost sales
- ⚠️ Customers get angry if you can't fulfill orders
- ⚠️ Competitors steal your customers
- ✅ This tool prevents ALL of that by warning you in advance

**Best Practice:**
> **Check this forecast every Monday morning!**
> If it shows 🔴 Red or 🟡 Yellow → Take action that week

---

### 3️⃣ **FREE DEF Flow Chart** (Production vs Consumption)

Multi-line chart showing:
- **Blue Line (Produced):** DEF manufactured
- **Red Line (Consumed):** DEF used for bucket filling
- **Green Line (Sold Direct):** Loose DEF sold
- **Purple Dashed (Net):** Overall stock change

**What This Tells You:**
- Are you producing enough to keep up with consumption?
- Trends over time (busy vs slow periods)
- Balance between production and usage

**How to Use This:**
- 📈 If red line (consumed) consistently above blue (produced) → Increase production frequency
- 📉 If purple net line going down → Stock depleting, produce more
- 🔄 Identify patterns (e.g., high consumption every month-end)

---

### 4️⃣ **Customer Analysis** (Two Tables)

**Left Table: Top 10 Direct DEF Buyers**
- Customers who buy loose DEF (not in buckets)
- Shows liters purchased

**Right Table: Bucket Impact on DEF**
- How much DEF each bucket type consumes
- Example: "TATA G: 100 buckets = 2,000L consumed"

**What This Tells You:**
- Who your biggest loose DEF customers are
- Which bucket types consume most DEF
- Total DEF consumption breakdown

**How to Use This:**
- 🥇 Maintain good relationships with top DEF buyers
- 📊 Know which buckets "cost" more DEF to sell
- 🎯 If TATA G consumes most DEF → Ensure sufficient production when selling TATA G heavily

---

## 🎯 How to Use This Dashboard Daily/Weekly

### **Every Monday Morning (5 minutes):**
1. ✅ Check **Production Forecast** for FREE DEF
   - 🔴 Red → Produce THIS WEEK
   - 🟡 Yellow → Plan production soon
   - 🟢 Green → You're good

2. ✅ Check **Reorder Recommendations Table**
   - 🔴 Red items → Order TODAY
   - 🟡 Yellow items → Add to order list
   - Note the "Recommended Order Qty"

3. ✅ Look at **Overview Cards**
   - Are sales increasing (↑) or decreasing (↓)?
   - Is current stock sufficient?

### **Every Month (15 minutes):**
1. ✅ Review **Bucket Performance Table**
   - Identify ⚡ fast movers → Stock more
   - Identify 🐌 slow movers → Stock less or promote

2. ✅ Check **Top 10 Customers**
   - Any big customers buying less? → Call them
   - Any new customers in top 10? → Build relationship

3. ✅ Review **Movement Trends Chart**
   - Compare this month vs last month
   - Plan for next month based on trends

4. ✅ Analyze **FREE DEF Flow**
   - Is production keeping up with consumption?
   - Adjust production schedule if needed

---

## 💡 Real-World Business Scenarios

### **Scenario 1: Preventing Stockout**

**Dashboard Shows:**
- Reorder Table: TATA G → 🔴 Urgent, 9 days left

**Your Action:**
1. Call supplier immediately
2. Order the recommended quantity (e.g., 150 buckets)
3. Follow up to ensure delivery within 7 days

**Result:** ✅ Never run out → Don't lose sales

---

### **Scenario 2: Optimizing Cash Flow**

**Dashboard Shows:**
- Bucket Performance: AP Blue → 🐌 Slow (0.2x turnover)
- Current stock: 200 AP Blue buckets

**Your Action:**
1. Stop ordering AP Blue (you have 6+ months supply!)
2. Use that cash to stock fast movers instead
3. Maybe offer AP Blue at discount to clear stock

**Result:** ✅ Cash freed up → Invest in products that actually sell

---

### **Scenario 3: Production Planning**

**Dashboard Shows:**
- Production Forecast: 🔴 Urgent - 12 days until DEF stockout
- Recommendation: Produce 2 batches

**Your Action:**
1. Check urea stock (need 720kg)
2. If sufficient → Schedule production tomorrow
3. If low → URGENT urea order
4. Mark calendar for next batch date

**Result:** ✅ Continuous production → No lost sales

---

### **Scenario 4: Growing Sales**

**Dashboard Shows:**
- Overview: Total Sold +25% ↑ (big increase!)
- Forecast: Projects even higher sales next month

**Your Action:**
1. Increase orders across all ⚡ fast movers
2. Plan extra DEF production (more buckets = more DEF needed)
3. Communicate with suppliers about increased volumes
4. Ensure sufficient urea stock

**Result:** ✅ Meet demand → Capture growth opportunity

---

## ⚙️ SETTINGS & VARIABLES YOU CAN CUSTOMIZE

Please review these settings and let us know if you want to change any:

### **1. Reorder Alert Thresholds (Buckets)**

**Current Settings:**
- 🔴 **Urgent Alert:** Less than **14 days** of stock remaining
- 🟡 **Warning Alert:** **14-30 days** of stock remaining
- 🟢 **Sufficient:** More than **30 days** of stock
- **Target Stock:** **60 days** supply when ordering

**Questions for You:**
- Is 14 days enough warning time, or do you need more/less?
- Do you want 60-day supply target, or different amount (e.g., 45 days, 90 days)?
- Different thresholds for different bucket types? (e.g., fast movers = 21 days warning)

---

### **2. FREE DEF Production Alerts**

**Current Settings:**
- 🔴 **Urgent Alert:** Less than **14 days** of DEF remaining
- 🟡 **Warning Alert:** **14-30 days** of DEF remaining
- 🟢 **Sufficient:** More than **30 days** of DEF
- **Target Production:** Maintain **60 days** supply
- **Batch Size:** **1,000 liters** per batch

**Questions for You:**
- Is 14 days enough warning for DEF production, or need earlier warning?
- Is 60-day supply target correct, or prefer more/less buffer?
- Confirm batch size: Is it always 1,000 liters? Or does it vary?
- Do you want to see **urea stock** in forecast? (to know if you can produce)

---

### **3. Bucket Performance Classification**

**Current Settings:**
- ⚡ **Fast-moving:** Turnover **> 2x per month**
- ⏱️ **Moderate:** Turnover **0.5-2x per month**
- 🐌 **Slow-moving:** Turnover **< 0.5x per month**

**Questions for You:**
- Are these thresholds right for your business?
- Want different thresholds? (e.g., Fast = > 3x, Slow = < 1x)
- Any specific bucket types to treat differently?

---

### **4. Time Period Defaults**

**Current Settings:**
- **Default View:** Last **3 months** (monthly view)
- **Forecast Period:** **30 days** (daily) or **3 months** (monthly) ahead
- **Consumption Calculation:** Based on last **30 days** of sales

**Questions for You:**
- Change default to last 6 months? Last month? Different period?
- Want longer/shorter forecast periods?
- Calculate consumption based on 60 days instead of 30?

---

### **5. Dashboard Refresh**

**Current Settings:**
- Data refreshes when you **open/reload the page**
- No automatic refresh while page is open

**Questions for You:**
- Want automatic refresh every 5 minutes (like Daily Report)?
- Or keep manual refresh only?
- Different refresh for different sections?

---

### **6. Warehouse-Specific Settings**

**Questions for You:**
- Do you want **separate alerts per warehouse**?
  - Example: Pallavi warehouse low on TATA G, but Tularam has plenty
- Want to see **warehouse comparison** more prominently?
- Any warehouse-specific reorder thresholds?

---

### **7. Cost & Pricing Data**

**Current Status:** Dashboard does NOT include costs/prices

**Questions for You:**
- Want to add **profit margin** tracking per bucket type?
- Show **revenue** instead of just quantities?
- Include **urea cost** in production forecast?
- Calculate **ROI** on inventory investment?

**Note:** This requires adding price data to the system

---

### **8. Notifications & Alerts**

**Current Status:** Alerts shown only when viewing dashboard

**Questions for You:**
- Want **email alerts** when something is 🔴 Urgent?
  - Example: "TATA G only 9 days left - Order now!"
  - Example: "DEF only 11 days left - Produce now!"
- Want **WhatsApp/SMS alerts** instead/additionally?
- Daily/weekly summary emails?
- Who should receive alerts? (yourself, warehouse manager, procurement team?)

---

### **9. Custom Bucket Groupings**

**Questions for You:**
- Want to group buckets by category?
  - Example: "TATA" group (TATA G, TATA W, TATA HP)
  - Example: "Small buckets" (10L sizes)
  - Example: "Premium" vs "Standard"
- Show performance by group?

---

### **10. Export & Reporting**

**Questions for You:**
- Want to **export data to Excel**?
- Generate **PDF reports** for meetings?
- Automated **weekly/monthly reports** sent by email?
- What format do you prefer?

---

## 📞 How to Request Changes

If you want to change any of the settings above:

1. **Email/Message Format:**
```
Subject: Inventory Dashboard - Settings Change Request

Changes requested:
1. [Setting name] - Change from [X] to [Y]
2. [Setting name] - Change from [X] to [Y]

Reason: [Brief explanation why]
```

2. **Example:**
```
Subject: Inventory Dashboard - Settings Change Request

Changes requested:
1. Reorder urgent threshold - Change from 14 days to 21 days
2. DEF production urgent - Change from 14 days to 21 days
3. Target stock - Change from 60 days to 90 days

Reason: Our suppliers take 2-3 weeks to deliver, so 14 days is too
tight. We need more buffer time. Also, we prefer keeping 90 days
supply to avoid frequent orders.
```

---

## 🎓 Training & Support

**Recommended Training:**
1. **Week 1:** Review this guide
2. **Week 2:** Watch dashboard daily, get familiar
3. **Week 3:** Start making decisions based on alerts
4. **Week 4:** Full adoption

**Need Help?**
- Questions about what a metric means
- Not sure how to interpret data
- Want additional features
- Technical issues

**Contact:** [Your support contact info]

---

## ✅ Success Checklist

You'll know the dashboard is working when:

- ✅ You never run out of top-selling buckets
- ✅ You never run out of FREE DEF
- ✅ Your cash isn't tied up in slow-moving inventory
- ✅ You can confidently predict next month's orders
- ✅ You know your most valuable customers
- ✅ You make data-driven decisions (not gut feeling)

---

## 📊 Quick Reference Card (Print This!)

```
╔════════════════════════════════════════════════════╗
║  INVENTORY DASHBOARD - QUICK REFERENCE             ║
╠════════════════════════════════════════════════════╣
║                                                    ║
║  🪣 BUCKET ALERTS (Check Daily)                    ║
║  🔴 Red (Urgent)    → Order TODAY                  ║
║  🟡 Yellow (Soon)   → Order this week              ║
║  🟢 Green (OK)      → No action needed             ║
║                                                    ║
║  💧 FREE DEF ALERTS (Check Weekly)                 ║
║  🔴 Red (<14 days)  → Produce NOW                  ║
║  🟡 Yellow (14-30)  → Plan production              ║
║  🟢 Green (>30)     → You're good                  ║
║                                                    ║
║  ⚡ PERFORMANCE STATUS                             ║
║  ⚡ Fast (>2x)      → Keep high stock              ║
║  ⏱️ Moderate (0.5-2x) → Normal stock               ║
║  🐌 Slow (<0.5x)    → Reduce orders                ║
║                                                    ║
║  📅 MONDAY MORNING ROUTINE (5 min)                 ║
║  1. Check Production Forecast                      ║
║  2. Check Reorder Recommendations                  ║
║  3. Note red/yellow alerts                         ║
║  4. Take action on urgent items                    ║
║                                                    ║
╚════════════════════════════════════════════════════╝
```

---

**Last Updated:** December 2025
**Version:** 1.0
**Created for:** PMR Industries Management

---

## 📝 Feedback Form

After using the dashboard for 2 weeks, please provide feedback:

1. **What do you like most about the dashboard?**
2. **What's confusing or unclear?**
3. **What features are you NOT using? (Why not?)**
4. **What additional features would help your business?**
5. **Overall rating: ⭐⭐⭐⭐⭐ (1-5 stars)**

This helps us improve the dashboard to better serve your needs!

---

*End of Guide*
