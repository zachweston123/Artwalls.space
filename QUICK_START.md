# 🚀 Quick Start Guide - Subscription Model Refactor

**Goal**: Standardize artist earnings at 65/80/83/85% take-home per tier  
**Status**: Infrastructure complete, ready for integration  
**Time to read**: 5 minutes

---

## In 30 Seconds

The new model:
- **Artists take home**: 65% (Free), 80% (Starter), 83% (Growth), 85% (Pro)
- **Venues always get**: 10% of list price
- **Buyers pay**: 3% support fee (separate from artwork price)
- **Single source of truth**: `server/plans.js`

Example: $140 Pro sale
```
Artist gets: $119 (85%)
Venue gets: $14 (10%)
Buyer pays: +$4.20 (3% fee)
Platform: ~$7 (after Stripe fees)
```

---

## What's Ready to Use

### ✅ Infrastructure Complete
1. **server/plans.js** - Use this for all calculations
   ```javascript
   const plans = require('./server/plans');
   const breakdown = plans.calculateOrderBreakdown(14000, 'pro');
   // Returns: { artistAmount: 11900, venueAmount: 1400, buyerFee: 420, ... }
   ```

2. **Test Suite** - Validates all calculations
   ```bash
   node server/tests/subscription-model.test.js
   ```

3. **Documentation** - Everything documented
   - DEVELOPER_REFERENCE.md - Quick reference
   - IMPLEMENTATION_ROADMAP.md - Step-by-step guide
   - DEPLOYMENT_GUIDE.sh - Testing checklist

### ⏳ Ready for Phase 1
- Frontend pricing page ✅ Updated
- Backend fee function ✅ Updated
- Checkout integration ⏳ Waiting for you
- Email templates ⏳ Waiting for you
- Dashboard ⏳ Waiting for you

---

## Your First Task

### 1. Run the Tests
```bash
cd /path/to/Artwalls.space
node server/tests/subscription-model.test.js
```

You should see:
```
🧪 SUBSCRIPTION MODEL TEST SUITE
✅ ALL TESTS PASSED!
✨ Model is ready for production!
```

### 2. Review the Code
```javascript
// server/plans.js - Main file you'll use
const plans = require('./server/plans');

// Get artist take-home percentage
const pct = plans.getArtistTakeHomePct('pro');  // 0.85

// Calculate order breakdown
const breakdown = plans.calculateOrderBreakdown(14000, 'pro');
// Returns complete breakdown: artist, venue, buyer fee, platform

// Get all plans (for UI)
const allPlans = plans.getAllPlans();  // Array of 4 plans
```

### 3. Read the Guide (5 minutes)
Open and skim:
- **DEVELOPER_REFERENCE.md** - Common tasks section
- **IMPLEMENTATION_ROADMAP.md** - PHASE 1 overview

---

## Common Integration Tasks

### Task: Replace Fee Calculation in Checkout
```javascript
// ❌ OLD CODE (find and replace)
const platformFeeBps = 2000;  // hardcoded
const fee = Math.round(amount * platformFeeBps / 10000);

// ✅ NEW CODE
const breakdown = plans.calculateOrderBreakdown(amount, artist.subscription_tier);
const fee = breakdown.platformNetCents;
const artistPayout = breakdown.artistAmount;
```

### Task: Update Email Template
```javascript
// ❌ OLD
<p>You keep 85% after 15% platform fee</p>

// ✅ NEW
<p>You'll receive $${(breakdown.artistAmount / 100).toFixed(2)} (85% of sale)</p>
<p>Venue commission: $${(breakdown.venueAmount / 100).toFixed(2)} (10%)</p>
<p>Buyer support fee: $${(breakdown.buyerFee / 100).toFixed(2)} (3%)</p>
```

### Task: Display Breakdown in UI
```javascript
const breakdown = plans.calculateOrderBreakdown(amount, tier);

<div>
  <p>Artwork: ${(breakdown.listPrice / 100).toFixed(2)}</p>
  <p>Buyer Fee: ${(breakdown.buyerFee / 100).toFixed(2)}</p>
  <p>Total: ${(breakdown.buyerTotal / 100).toFixed(2)}</p>
</div>
```

---

## File Locations

```
server/
  ├─ plans.js ........................... ✅ USE THIS FILE
  ├─ index.js .......................... ⏳ Needs checkout update
  └─ mail.js ........................... ⏳ Needs email update

src/
  ├─ components/pricing/
  │  └─ PricingPage.tsx ............... ✅ Already updated
  └─ pages/
     ├─ OrderConfirmation.tsx ......... ⏳ Needs update
     └─ DashboardPages.tsx ............ ⏳ Needs update
```

---

## Key Constants to Know

```javascript
// Basis Points (where 10000 = 100%)
FREE_BPS = 2500      // Platform gets 25% (65% artist + 10% venue = 75%)
STARTER_BPS = 1000   // Platform gets 10% (80% + 10% = 90%)
GROWTH_BPS = 700     // Platform gets 7% (83% + 10% = 93%)
PRO_BPS = 500        // Platform gets 5% (85% + 10% = 95%)

// Percentages
ARTIST_TAKE_HOME = {
  free: 0.65,
  starter: 0.80,
  growth: 0.83,
  pro: 0.85
}
VENUE_COMMISSION = 0.10  // Always 10%
BUYER_FEE = 0.03         // Always 3%
```

---

## Testing Your Changes

### After Each File Change
```bash
# Run tests to verify no calculation errors
node server/tests/subscription-model.test.js
```

### Manual Testing
```bash
# Test a specific calculation
node -e "
const plans = require('./server/plans');
const bd = plans.calculateOrderBreakdown(14000, 'pro');
console.log({
  listPrice: '\$140.00',
  artist: '\$' + (bd.artistAmount/100).toFixed(2),
  venue: '\$' + (bd.venueAmount/100).toFixed(2),
  buyerFee: '\$' + (bd.buyerFee/100).toFixed(2),
  total: '\$' + (bd.buyerTotal/100).toFixed(2)
});
"
```

### Visual Testing
- Go to `/plans-pricing` page - verify shows 65/80/83/85%
- Enter $140 in calculator - verify shows correct splits
- Complete test purchase - verify order shows correct breakdown
- Check email - verify uses new language

---

## Common Mistakes to Avoid

❌ **Hardcoding percentages**
```javascript
const artist = amount * 0.85;  // WRONG! Use plans.js
```

✅ **Use plans.js functions**
```javascript
const pct = plans.getArtistTakeHomePct(tier);
const artist = amount * pct;  // RIGHT!
```

---

❌ **Mixing cents and dollars**
```javascript
const breakdown = plans.calculateOrderBreakdown('$140', 'pro');  // ERROR!
```

✅ **Always use cents (integers)**
```javascript
const breakdown = plans.calculateOrderBreakdown(14000, 'pro');  // Correct!
```

---

❌ **Forgetting buyer fee is separate**
```javascript
const total = listPrice;  // WRONG! Missing buyer fee
```

✅ **Add buyer fee to total**
```javascript
const total = listPrice + breakdown.buyerFee;  // Correct!
```

---

## Getting Unstuck

| Problem | Solution |
|---------|----------|
| "plans is not defined" | Add `const plans = require('./plans');` at top of file |
| Tests failing | Check that all percentages are decimals (0.85, not 85) |
| Calculations don't match | Use `calculateOrderBreakdown()` instead of manual math |
| Not sure what field to use | Check DEVELOPER_REFERENCE.md - Common Tasks section |
| Need to understand breakdown | Run test: `node server/tests/subscription-model.test.js` |

---

## Full Documentation

For more details, see:

| Document | Purpose |
|----------|---------|
| **DEVELOPER_REFERENCE.md** | Quick reference, common tasks, basis points |
| **IMPLEMENTATION_ROADMAP.md** | Step-by-step Phase 1 guide |
| **PROJECT_STATUS.md** | Current status, timeline, checklist |
| **DEPLOYMENT_GUIDE.sh** | Testing & validation steps |
| **FILE_INVENTORY.md** | Complete file listing |

---

## Next Steps

1. ✅ Run the test suite
   ```bash
   node server/tests/subscription-model.test.js
   ```

2. ⏳ Integrate into checkout
   - See IMPLEMENTATION_ROADMAP.md - PHASE 1
   - Import plans.js
   - Replace fee calculation
   - Add buyer fee line item

3. ⏳ Update emails
   - See IMPLEMENTATION_ROADMAP.md - PHASE 2
   - Show breakdown in confirmation
   - Use new language

4. ⏳ Update dashboard
   - See IMPLEMENTATION_ROADMAP.md - PHASE 3
   - Show take-home %
   - Add earnings calculator

---

## Quick Reference

```javascript
// Import the plans module
const plans = require('./server/plans');

// Get take-home percentage for a tier
const pct = plans.getArtistTakeHomePct('pro');  // 0.85

// Calculate complete order breakdown
const breakdown = plans.calculateOrderBreakdown(14000, 'pro');
// Returns: {
//   listPrice: 14000,
//   artistAmount: 11900,
//   artistCents: 11900,
//   venueAmount: 1400,
//   venueCents: 1400,
//   buyerFee: 420,
//   buyerFeeCents: 420,
//   buyerTotal: 14420,
//   buyerTotalCents: 14420,
//   platformNetCents: 280,
//   artistTakeHomePct: 0.85
// }

// Get basis points for platform fee (for legacy compatibility)
const bps = plans.getPlatformFeeBpsFromPlan('pro');  // 500

// Get all plans (for UI)
const allPlans = plans.getAllPlans();

// Get specific plan
const proPlan = plans.getPlanById('pro');
```

---

**You're ready! Questions? Check the documentation files.** 🎨
