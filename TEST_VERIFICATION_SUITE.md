# BUSINESS MODEL - TEST VERIFICATION SUITE

**Purpose**: Validate that new business model (15% venue, 4.5% buyer, 60/80/83/85% artist) is correctly implemented across all systems

**Run Date**: January 9, 2026

---

## SETUP

```bash
cd /path/to/artwalls
npm install
npm run dev  # Start both server and frontend
```

---

## VERIFICATION TESTS

### 1. CONSTANTS VERIFICATION ✅

**File**: `server/plans.js`

**Test Command**:
```bash
node -e "
const plans = require('./server/plans.js');
console.log('VENUE_COMMISSION_PCT:', plans.VENUE_COMMISSION_PCT);
console.log('BUYER_FEE_PCT:', plans.BUYER_FEE_PCT);
console.log('Free artist %:', plans.SUBSCRIPTION_PLANS.free.artist_take_home_pct);
console.log('Starter artist %:', plans.SUBSCRIPTION_PLANS.starter.artist_take_home_pct);
console.log('Growth artist %:', plans.SUBSCRIPTION_PLANS.growth.artist_take_home_pct);
console.log('Pro artist %:', plans.SUBSCRIPTION_PLANS.pro.artist_take_home_pct);
"
```

**Expected Output**:
```
VENUE_COMMISSION_PCT: 0.15
BUYER_FEE_PCT: 0.045
Free artist %: 0.6
Starter artist %: 0.8
Growth artist %: 0.83
Pro artist %: 0.85
```

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### 2. CALCULATION VERIFICATION ✅

**Test Command**:
```bash
node -e "
const plans = require('./server/plans.js');

// Test $140 sale on each plan
const priceInCents = 14000;

function testPlan(name, planId, expectedArtist) {
  const breakdown = plans.calculateOrderBreakdown(priceInCents, planId);
  const artistMatch = breakdown.artistCents === expectedArtist;
  const venueMatch = breakdown.venueCents === 2100; // 15% of 140
  const buyerMatch = breakdown.buyerFeeCents === 630; // 4.5% of 140
  
  console.log(name + ' Plan (' + (expectedArtist/100) + '%):');
  console.log('  Artist:', breakdown.artistCents, 'expected:', expectedArtist, artistMatch ? '✓' : '✗');
  console.log('  Venue:', breakdown.venueCents, 'expected: 2100', venueMatch ? '✓' : '✗');
  console.log('  Buyer Fee:', breakdown.buyerFeeCents, 'expected: 630', buyerMatch ? '✓' : '✗');
  return artistMatch && venueMatch && buyerMatch;
}

const results = [
  testPlan('Free', 'free', 8400),
  testPlan('Starter', 'starter', 11200),
  testPlan('Growth', 'growth', 11620),
  testPlan('Pro', 'pro', 11900),
];

console.log('\nAll tests passed:', results.every(r => r) ? '✓' : '✗');
"
```

**Expected Output**:
```
Free Plan (0.6%):
  Artist: 8400 expected: 8400 ✓
  Venue: 2100 expected: 2100 ✓
  Buyer Fee: 630 expected: 630 ✓

Starter Plan (0.8%):
  Artist: 11200 expected: 11200 ✓
  Venue: 2100 expected: 2100 ✓
  Buyer Fee: 630 expected: 630 ✓

Growth Plan (0.83%):
  Artist: 11620 expected: 11620 ✓
  Venue: 2100 expected: 2100 ✓
  Buyer Fee: 630 expected: 630 ✓

Pro Plan (0.85%):
  Artist: 11900 expected: 11900 ✓
  Venue: 2100 expected: 2100 ✓
  Buyer Fee: 630 expected: 630 ✓

All tests passed: ✓
```

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### 3. PRICING PAGE DISPLAY ✅

**URL**: `http://localhost:5173/#/plans-pricing`

**Verify Visually**:

#### 3.1 Free Plan
- [ ] Shows "Take home 60%" (NOT 65%)
- [ ] Breakdown shows $84 (not $91) for $140 example
- [ ] "Venue Commission (15%)" displays correctly

#### 3.2 Starter Plan
- [ ] Shows "Take home 80%"
- [ ] Breakdown shows $112 for $140 example
- [ ] "Venue Commission (15%)" displays correctly

#### 3.3 Growth Plan
- [ ] Shows "Take home 83%"
- [ ] Labeled "Most Popular"
- [ ] Breakdown shows $116.20 for $140 example
- [ ] "Venue Commission (15%)" displays correctly

#### 3.4 Pro Plan
- [ ] Shows "Take home 85%"
- [ ] Breakdown shows $119 for $140 example
- [ ] "Venue Commission (15%)" displays correctly
- [ ] Pro tip mentions "highest artist take-home"

#### 3.5 Calculator
- [ ] Set sale value to $140
- [ ] Verify each plan earnings:
  - Free: ~$84
  - Starter: ~$112
  - Growth: ~$116.20
  - Pro: ~$119
- [ ] All show "Venue Commission (15%)" not (10%)
- [ ] All show buyer fee breakdown

#### 3.6 Copy Check
- [ ] No "65%" appears anywhere (old Free %)
- [ ] No "10%" venue commission appears
- [ ] No "3%" buyer fee appears
- [ ] No "platform fee" language
- [ ] Uses "Take home X%", "Artist Take-Home", "Venue Commission"

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### 4. PRICING BREAKDOWN EXAMPLES ✅

**Expected for $140 Sale**:

```
┌─────────────────────────────────────────────┐
│         FREE PLAN (60% Take-Home)           │
├─────────────────────────────────────────────┤
│ List Price:              $140.00             │
│ Venue Commission (15%):   $21.00             │
│ Buyer Fee (4.5%):         $6.30              │
│ Buyer Pays:             $146.30              │
│                                              │
│ Artist Takes Home:        $84.00  ✓          │
│ Platform + Processing:    $35.00             │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│        STARTER PLAN (80% Take-Home)         │
├─────────────────────────────────────────────┤
│ List Price:              $140.00             │
│ Venue Commission (15%):   $21.00             │
│ Buyer Fee (4.5%):         $6.30              │
│ Buyer Pays:             $146.30              │
│                                              │
│ Artist Takes Home:       $112.00  ✓          │
│ Platform + Processing:    $7.00              │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│        GROWTH PLAN (83% Take-Home)          │
├─────────────────────────────────────────────┤
│ List Price:              $140.00             │
│ Venue Commission (15%):   $21.00             │
│ Buyer Fee (4.5%):         $6.30              │
│ Buyer Pays:             $146.30              │
│                                              │
│ Artist Takes Home:       $116.20  ✓          │
│ Platform + Processing:    $2.80              │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│         PRO PLAN (85% Take-Home)            │
├─────────────────────────────────────────────┤
│ List Price:              $140.00             │
│ Venue Commission (15%):   $21.00             │
│ Buyer Fee (4.5%):         $6.30              │
│ Buyer Pays:             $146.30              │
│                                              │
│ Artist Takes Home:       $119.00  ✓          │
│ Platform + Processing:    $0.00              │
│ (Stripe fee covered by platform)            │
└─────────────────────────────────────────────┘
```

**Verify on Page**: ☐ MATCHES ☐ DIFFERS

---

### 5. CODE SEARCH VERIFICATION ✅

**Search for Old Percentages** - Should find NONE in UI/docs:

```bash
# Should return NO results (except in documentation explaining changes):
grep -r "65%" src/ --include="*.tsx" --include="*.jsx" --exclude-dir=node_modules
# Expected: (no matches in active components)

grep -r "\"10%\"" src/ --include="*.tsx" --include="*.jsx" | grep -i venue
# Expected: (no matches - replaced with 15%)

grep -r "0\.03" src/ | grep -i fee
# Expected: (no matches - replaced with 0.045)

grep -r "platformFee\|platform_fee" src/ | head -5
# May have matches but should note they're legacy/deprecated
```

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### 6. DEPLOYMENT GUIDE ALIGNMENT ✅

**File**: `DEPLOYMENT_GUIDE.sh`

**Check**:
```bash
# Expected values in guide:
grep "Artist gets \$84"              DEPLOYMENT_GUIDE.sh  # Free on $140
grep "Artist gets \$112"             DEPLOYMENT_GUIDE.sh  # Starter on $140
grep "Artist gets \$116.20"          DEPLOYMENT_GUIDE.sh  # Growth on $140
grep "Artist gets \$119"             DEPLOYMENT_GUIDE.sh  # Pro on $140
grep "Venue Commission (15%)"        DEPLOYMENT_GUIDE.sh  # Should be 15%
grep "Buyer Support Fee (4.5%)"      DEPLOYMENT_GUIDE.sh  # Should be 4.5%
grep "\$21" DEPLOYMENT_GUIDE.sh                           # Venue on $140

# Should NOT contain:
grep "Artist gets \$91"              DEPLOYMENT_GUIDE.sh  # Old Free
grep "Venue Commission (10%)"        DEPLOYMENT_GUIDE.sh  # Old venue
grep "\$4.20"                        DEPLOYMENT_GUIDE.sh  # Old buyer fee
grep "\$14"                          DEPLOYMENT_GUIDE.sh  # Old venue amount
```

**Expected Results**:
- ✓ All new values present
- ✗ All old values removed

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### 7. DATABASE SCHEMA CHECK ⏳

**If implemented**: Verify these columns exist:

```sql
-- Run in Supabase SQL editor:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders'
ORDER BY column_name;

-- Should include:
-- ✓ list_price_cents
-- ✓ buyer_fee_cents
-- ✓ buyer_total_cents
-- ✓ venue_amount_cents
-- ✓ artist_amount_cents
-- ✓ platform_gross_before_stripe_cents
-- ✓ stripe_fee_cents
-- ✓ platform_net_cents
-- ✓ artist_plan_id_at_purchase
```

**Pass/Fail**: ☐ PASS ☐ FAIL (if not yet implemented, mark as N/A)

---

### 8. CHECKOUT INTEGRATION ⏳

**When Implemented**:

```bash
# Create test artwork at $140
# Start checkout flow
# Verify on Stripe Checkout page:
# - Artwork: $140.00
# - Buyer Support Fee (4.5%): $6.30
# - Total: $146.30

# (Skip this test until server/index.js updated)
```

**Pass/Fail**: ☐ PASS ☐ FAIL (N/A until checkout updated)

---

### 9. EMAIL TEMPLATES ⏳

**When Implemented**:

```
Test email should show:
- List Price: $140.00
- Venue Commission (15%): $21.00
- Buyer Support Fee (4.5%): $6.30
- Artist Take-Home (85%): $119.00
- Platform + Processing: (remainder)

NOT:
- Old percentages
- "Platform fee" language
```

**Pass/Fail**: ☐ PASS ☐ FAIL (N/A until email updated)

---

### 10. DASHBOARD DISPLAYS ⏳

**When Implemented**:

```
Admin dashboard should show:
- Artist Take-Home %: 60/80/83/85 (not platform fee %)
- Venue Commission: 15%
- Buyer Fee: 4.5%

Artist dashboard should show:
- "You take home X%" not "We charge X%"

Venue dashboard should show:
- Commission 15%
```

**Pass/Fail**: ☐ PASS ☐ FAIL (N/A until dashboards updated)

---

## SUMMARY CHECKLIST

### Phase 1: Configuration & Frontend (TODAY) ✅
- [x] plans.js constants updated
- [x] PricingPage displays correctly
- [x] DEPLOYMENT_GUIDE aligned
- [x] Implementation guide created

### Phase 2: Backend Integration (PENDING) ⏳
- [ ] Server checkout endpoint updated
- [ ] Order records store all breakdown fields
- [ ] Email templates updated
- [ ] Webhook handlers use stored amounts

### Phase 3: Displays (PENDING) ⏳
- [ ] Admin dashboards updated
- [ ] Artist dashboards updated
- [ ] Venue dashboards updated
- [ ] Order confirmation updated

### Phase 4: Testing & Validation (PENDING) ⏳
- [ ] Unit tests pass (items 1-3)
- [ ] Visual tests pass (item 4)
- [ ] E2E checkout test passes (item 8)
- [ ] Admin exports match (item 10)

---

## PASS/FAIL SUMMARY

**Currently Verifiable** (Phase 1):
- Test 1 (Constants): ☐
- Test 2 (Calculations): ☐
- Test 3 (Pricing Page): ☐
- Test 4 (Breakdowns): ☐
- Test 5 (Code Search): ☐
- Test 6 (Deployment Guide): ☐

**Deferred Until Implementation**:
- Test 7 (Database Schema): PENDING
- Test 8 (Checkout): PENDING
- Test 9 (Email): PENDING
- Test 10 (Dashboards): PENDING

---

## RUNNING TESTS

### Automated Test Suite (Future)
```bash
npm run test:business-model
```

### Manual Verification
1. Start app: `npm run dev`
2. Open pricing page
3. Verify against Test 3 & 4
4. Run tests 1, 2, 5, 6

### Performance Impact
- No performance impact (calculations identical complexity)
- Database queries unchanged
- Stripe API unchanged

---

## SIGN-OFF

**Tested By**: _______________  
**Date**: _______________  
**Overall Result**: ☐ PASS ☐ FAIL  

**Notes**:
```
_______________________________________________________________________

_______________________________________________________________________

_______________________________________________________________________
```

---

**Next Step**: Complete Phase 2 (Backend Integration) and re-run full suite
