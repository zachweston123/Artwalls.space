# Subscription Model Refactor - Implementation Status

**Date**: January 7, 2026
**Goal**: Standardize subscription model across all UI/UX, business logic, copy, and database

## COMPLETED

### 1. Plan Configuration File Created ✅
- **File**: [server/plans.js](../server/plans.js)
- **What**: Single source of truth for all plan definitions
- **Key Data**:
  - Free: 65% artist take-home
  - Starter ($9/mo): 80% artist take-home  
  - Growth ($19/mo): 83% artist take-home
  - Pro ($39/mo): 85% artist take-home
  - Venue: Always 10% of list price
  - Buyer fee: Always 3% of list price
- **Functions**:
  - `getArtistTakeHomePct(planId)`: Get artist percentage
  - `calculateOrderBreakdown(listPriceCents, planId)`: Full order breakdown
  - `getPlanById(planId)`: Get plan details

### 2. Pricing Page Updated ✅
- **File**: [src/components/pricing/PricingPage.tsx](../src/components/pricing/PricingPage.tsx)
- **Changes**:
  - Replaced "platform fee %" language with "Take home X%"
  - Added `takeHome` and `tagline` fields to each plan
  - Removed explicit "platform fee on sales" mentions
  - Changed features to be benefit-focused rather than fee-focused
  - Updated calculation functions to use new take-home model

## TODO - CRITICAL PATH

### 3. Update Stripe Metadata & Subscription Syncing
**Priority: HIGH** (affects charge calculations)
**Location**: server/index.js (`syncArtistSubscriptionFromStripe`, Stripe price metadata)
**Changes Needed**:
- Update Stripe price metadata to store `artist_take_home_pct` instead of `platform_fee_bps`
- Example: Starter price should have metadata `{ tier: "starter", artist_take_home_pct: 0.80 }`
- Update webhook handler to read new metadata
- Convert legacy `platform_fee_bps` to `artist_take_home_pct` format

### 4. Update Checkout & Order Calculation
**Priority: HIGH** (affects payments)
**Location**: server/index.js (`POST /api/stripe/create-checkout-session`)
**Changes Needed**:
- Import `calculateOrderBreakdown` from server/plans.js
- Calculate breakdown using: `listPrice`, `artworkId` (to get artist tier), `planId`
- Store persisted breakdown in orders table:
  - `buyer_fee_cents`
  - `artist_payout_cents` (calculated from take-home %)
  - `venue_payout_cents` (10% of list price)
  - `platform_gross_cents` (remainder before Stripe fees)
- Verify Stripe transfer splits match persisted amounts

### 5. Update Order Display / Receipts
**Priority: HIGH** (customer-facing)
**Locations**:
- Order confirmation page
- Receipt emails
- Dashboard earnings breakdown
**Changes Needed**:
- Display breakdown as:
  - "Artwork Price: $140"
  - "Venue Commission (10%): $14.00"
  - "Artist Take Home (85%): $119.00"
  - "Platform & Processing Fee: [remainder]"
  - "Buyer Support Fee (3%, paid by buyer): $4.20"
  - "Total Charged to Buyer: $144.20"

### 6. Update Artist Dashboard Earnings
**Priority: MEDIUM**
**Location**: src/components/artist/ArtistPayoutsCard.tsx and related
**Changes Needed**:
- Replace "Your earnings" calculations to show "Take home X%"
- Update tooltips to explain:
  - "65% of every artwork sale"
  - "Venues earn 10%, buyers pay 3% fee, platform retains processing fees"
- Add example breakdown widget:
  - "$140 artwork at 85% take-home → $119 to you"

### 7. Update Plan Limits Display
**Priority: MEDIUM**
**Locations**: Dashboard, plan comparison, settings
**Changes Needed**:
- Replace "platform fee on sales" with "Artist take home"
- Add note: "Venues always earn 10% per artwork sold"
- Add note: "Buyers pay 3% support fee at checkout"

### 8. Email Template Updates
**Priority: MEDIUM**
**Locations**: 
- Order receipt (to artist)
- Order receipt (to buyer)
- Payout notifications
- Subscription confirmation
**Changes Needed**:
- Replace all "platform fee" language
- Add "Take home X% per sale" in subscription emails
- Add breakdown table in order receipts showing all splits

### 9. Admin Dashboard Updates  
**Priority: LOW**
**Location**: Admin revenue/earnings reports
**Changes Needed**:
- Update revenue calculations to use new splits
- Ensure admin sees:
  - Artist take-home %
  - Venue commission (always 10%)
  - Buyer fee (always 3%)
  - Platform net (after Stripe)

### 10. FAQ / Help Pages
**Priority: LOW**
**Locations**: Help section, Terms of Service, FAQ
**Changes Needed**:
- Explain "Take home X% of artwork list price"
- Explain venue 10% commission
- Explain buyer 3% support fee
- Explain what "Platform & Processing Fee" covers

## VALIDATION CHECKLIST

Before shipping, verify:

- [ ] All 4 plans show correct take-home percentages (65%, 80%, 83%, 85%)
- [ ] No page displays old percentages (15%, 10%, 8%, 6%)
- [ ] No page says artist is "charged" a fee (use "platform retains")
- [ ] $140 example produces consistent results across:
  - [ ] Pricing calculator
  - [ ] Checkout breakdown
  - [ ] Order confirmation
  - [ ] Dashboard earnings
  - [ ] Receipt email
- [ ] Venue always shows 10% commission (1400 bps)
- [ ] Buyer always shows 3% fee (300 bps)
- [ ] "Platform + Processing Fee" label appears on all relevant surfaces
- [ ] Tooltips explain the fee breakdown
- [ ] Stripe transfers match persisted order amounts
- [ ] Legacy orders remain unchanged (historical data preserved)

## EXAMPLE BREAKDOWN ($140 artwork, Pro plan at 85%)

```
LIST PRICE:        $140.00
Venue (10%):        $14.00
Artist (85%):      $119.00
Platform/Proc.:      $7.00
                   -------
Subtotal:          $140.00

Buyer Fee (3%):      $4.20
BUYER PAYS:        $144.20
```

## FILES MODIFIED

1. ✅ server/plans.js (NEW)
2. ✅ src/components/pricing/PricingPage.tsx
3. ⏳ server/index.js (checkout, subscription sync)
4. ⏳ src/components/artist/ArtistPayoutsCard.tsx
5. ⏳ Email templates (order receipts, payouts)
6. ⏳ Admin dashboard/reports
7. ⏳ FAQ/Help pages

## BREAKING CHANGES

- **Database**: Orders table will have new fields (`buyer_fee_cents`, updated calculations)
- **Stripe**: Price metadata format changes (from `platform_fee_bps` to `artist_take_home_pct`)
- **API Responses**: May include new breakdown fields
- **UI**: Terminology shifts from "platform fee %" to "take home %"

## MIGRATION NOTES

- **Existing Artists**: Their subscription tier remains the same, but % take-home increases
  - Free: 15% → 65% (SIGNIFICANT INCREASE)
  - Starter: 10% → 20% (SIGNIFICANT INCREASE)
  - Growth: 8% → 17% (SIGNIFICANT INCREASE)
  - Pro: 6% → 15% (SIGNIFICANT INCREASE)
- **Legacy Orders**: Keep stored breakdown values, do NOT recalculate
- **Conversion Date**: All new orders use new model; backfill old orders with "legacy" flag if needed

## NEXT STEPS

1. Update server/index.js `syncArtistSubscriptionFromStripe()` and webhook handlers
2. Update checkout order creation with new calculation
3. Update all dashboard/receipt displays
4. Add comprehensive tests for $140 example across all surfaces
5. Deploy with feature flag to test on staging first
6. Update Terms of Service and FAQ
7. Notify all artists of the change (positive message: they earn more!)
