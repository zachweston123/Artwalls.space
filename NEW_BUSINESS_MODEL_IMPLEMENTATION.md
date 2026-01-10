# NEW BUSINESS MODEL IMPLEMENTATION ✅

**Status**: In Progress  
**Last Updated**: January 9, 2026  
**Priority**: Critical - Production Implementation

---

## EXECUTIVE SUMMARY

Artwalls is transitioning to a new revenue model that **emphasizes artist take-home percentages** instead of platform fees, with updated commission structures:

| Component | Old Model | **New Model** |
|-----------|-----------|--------------|
| Venue Commission | 10% | **15%** |
| Buyer Fee | 3% | **4.5%** |
| Artist Take-Home (Free) | 65% | **60%** |
| Artist Take-Home (Starter) | 80% | **80%** (unchanged) |
| Artist Take-Home (Growth) | 83% | **83%** (unchanged) |
| Artist Take-Home (Pro) | 85% | **85%** (unchanged) |

**Key Change**: All user-facing copy shifts from "platform fee %" language to "artist take home %" language.

---

## CONSTANTS (SOURCE OF TRUTH)

```javascript
// server/plans.js
export const VENUE_COMMISSION_PCT = 0.15;   // 15% of list price
export const BUYER_FEE_PCT = 0.045;          // 4.5% of list price (added at checkout)

export const SUBSCRIPTION_PLANS = {
  free: { artist_take_home_pct: 0.60, monthly_price: 0 },
  starter: { artist_take_home_pct: 0.80, monthly_price: 9 },
  growth: { artist_take_home_pct: 0.83, monthly_price: 19 },
  pro: { artist_take_home_pct: 0.85, monthly_price: 39 },
};
```

---

## CALCULATION RULES

For any order with **List Price = P**:

```javascript
buyer_fee = round_cents(P * 0.045)                    // 4.5%
buyer_total = P + buyer_fee
venue_amount = round_cents(P * 0.15)                  // 15%
artist_amount = round_cents(P * artist_take_home_pct) // Plan-dependent
platform_gross_before_stripe = P - venue_amount - artist_amount
stripe_fee_amount = read_from_stripe_balance_transaction
platform_net = platform_gross_before_stripe - stripe_fee_amount
```

### Example: $140 Sale on Pro Plan (85% take-home)

```
List Price:                  $140.00
Buyer Fee (4.5%):            $6.30
Buyer Total (charged):       $146.30

Venue Commission (15%):      $21.00
Artist Take-Home (85%):      $119.00
Platform + Processing:       $0.00 (before Stripe fees)

(After 2.9% + $0.30 Stripe fee ≈ $4.53)
Platform Net:                -$4.53 (Stripe fee paid by platform)
```

---

## FILES CHANGED

### ✅ COMPLETED

#### 1. [server/plans.js](server/plans.js)
- ✅ Updated VENUE_COMMISSION_PCT to 0.15 (was 0.10)
- ✅ Updated BUYER_FEE_PCT to 0.045 (was 0.03)
- ✅ Updated Free plan from 0.65 to 0.60 take-home
- ✅ Added monthly_price_cents field for all plans
- ✅ Updated calculation comments with new percentages

#### 2. [src/components/pricing/PricingPage.tsx](src/components/pricing/PricingPage.tsx)
- ✅ Free plan: takeHome: 60 (was 65)
- ✅ Updated calculateArtistTakeHome() function
  - Venue: 0.15 (was 0.10)
  - Buyer fee: 0.045 (was 0.03)
- ✅ Updated Free plan earnings calculation
- ✅ Updated all "Venue Commission (10%)" to "(15%)"
- ✅ Updated all breakdown displays
- ✅ Updated Pro tip text to show "highest artist take-home"
- ✅ Updated calculator plan data from `fee` to `takeHome`

#### 3. [DEPLOYMENT_GUIDE.sh](DEPLOYMENT_GUIDE.sh)
- ✅ Updated test expectations:
  - Free: Artist gets $84 per sale (was $91)
  - Buyer Support Fee: $6.30 (was $4.20)
  - Venue Commission: $21 (was $14)
  - Updated copy for "Platform + Processing"

### 🔄 IN PROGRESS

#### 4. [server/index.js](server/index.js) - Checkout Integration
**Task**: Update `/api/stripe/create-checkout-session` to use `calculateOrderBreakdown()`

**Current State**: Uses old bps-based system
- `platformFeeBps`, `venueFeeBps` calculations
- No buyer fee line item

**Changes Needed**:
- [ ] Import `calculateOrderBreakdown` from `./plans.js`
- [ ] Replace bps calculations with `calculateOrderBreakdown(amountCents, artist.subscription_tier)`
- [ ] Add buyer fee as separate line item in Stripe session
- [ ] Store all breakdown fields in order record
- [ ] Update order metadata for webhooks

**Code Pattern**:
```javascript
import { calculateOrderBreakdown } from './plans.js';

// In checkout endpoint:
const breakdown = calculateOrderBreakdown(amountCents, artist.subscription_tier);

const session = await stripe.checkout.sessions.create({
  line_items: [
    {
      price_data: {
        currency: 'usd',
        product_data: { name: artwork.title },
        unit_amount: breakdown.listPriceCents,
      },
      quantity: 1,
    },
    {
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Artwalls Buyer Support',
          description: 'Processing and artist support (4.5%)',
        },
        unit_amount: breakdown.buyerFeeCents,
      },
      quantity: 1,
    },
  ],
});
```

### ⏳ NOT STARTED

#### 5. Email Templates
Files to update:
- `server/mail.js` - Order confirmation, receipt templates
- Any Sendgrid/Mailgun templates

Copy changes:
- "List Price" instead of "Amount"
- "Buyer Support Fee (4.5%)" instead of "fee"
- "Venue Commission (15%)" instead of "fee"
- "Artist Take-Home (X%)" instead of "You earn X%"
- "Platform + Processing" for remainder

#### 6. Admin Dashboards
Files to update:
- `src/components/admin/AdminSales.tsx`
- `src/components/admin/AdminUsers.tsx`
- `src/components/admin/AdminDashboard.tsx`

Display updates:
- Show "Artist Take-Home %" not "Platform Fee %"
- Display venue commission as 15%
- Display buyer fee as 4.5%

#### 7. Order Display Components
Files to update:
- `src/components/PurchasePage.tsx`
- `src/components/OrderConfirmation.tsx`
- `src/components/artist/ArtistSales.tsx`
- `src/components/venue/VenueDashboard.tsx`

Display pattern:
```jsx
<OrderBreakdown
  listPrice={order.list_price_cents}
  buyerFee={order.buyer_fee_cents}
  venueCommission={order.venue_amount_cents}
  artistTakeHome={order.artist_amount_cents}
  stripeFee={order.stripe_fee_cents}
/>
```

#### 8. Database Migrations
Create migration to add columns if not present:
- `list_price_cents`
- `buyer_fee_cents`
- `buyer_total_cents`
- `venue_amount_cents`
- `artist_amount_cents`
- `platform_gross_before_stripe_cents`
- `stripe_fee_cents`
- `platform_net_cents`
- `artist_plan_id_at_purchase`

#### 9. Documentation Updates
Files to update:
- `README.md` - High-level overview
- `QUICK_START.md` - Getting started guide
- Any FAQs or help docs
- Integration guides

---

## BACKWARD COMPATIBILITY

### Historical Orders
- All existing orders retain their calculated amounts at time of sale
- Do NOT retroactively recalculate old orders
- Store snapshot of `artist_plan_id_at_purchase` for auditing

### Legacy Code
- Old `platform_fee_bps` fields remain in database for audit trail
- New code uses `calculateOrderBreakdown()` exclusively
- Deprecate old bps-based functions in server code

---

## TESTING CHECKLIST

### ✅ Unit Tests (server/plans.js)
```javascript
// Test $140 sale on each plan
Test('calculateOrderBreakdown', () => {
  const free140 = calculateOrderBreakdown(14000, 'free');
  assert(free140.artistCents === 8400); // 60%
  assert(free140.venueCents === 2100);  // 15%
  assert(free140.buyerFeeCents === 630); // 4.5%
  
  const pro140 = calculateOrderBreakdown(14000, 'pro');
  assert(pro140.artistCents === 11900); // 85%
  assert(pro140.venueCents === 2100);   // 15%
  assert(pro140.buyerFeeCents === 630);  // 4.5%
});
```

### ✅ Integration Tests (Pricing Page)
- [ ] Free plan: Shows 60% take-home
- [ ] Starter plan: Shows 80% take-home
- [ ] Growth plan: Shows 83% take-home
- [ ] Pro plan: Shows 85% take-home
- [ ] Calculator shows correct breakdown for $140
- [ ] No old percentages visible on page

### ✅ E2E Tests (Checkout Flow)
- [ ] Artwork $140, select plan, checkout
- [ ] Buyer sees fee breakdown (15% venue, 4.5% support)
- [ ] Order created with correct breakdown amounts
- [ ] Stripe charges correct total
- [ ] Splits route to artist/venue correctly

### ✅ Admin Tests
- [ ] Admin dashboard shows new percentages
- [ ] Order export shows new fields
- [ ] Historical orders show old breakdown

---

## COPY GUIDELINES

### Never Say (Old Model)
❌ "We charge you 15% platform fee"  
❌ "You keep 85%"  
❌ "Your fee breakdown"  
❌ "Platform takes 15%"  

### Always Say (New Model)
✅ "You take home 85%"  
✅ "Artist Take-Home: 85% per sale"  
✅ "Venue Commission: 15%"  
✅ "Buyer Support Fee: 4.5%"  
✅ "Platform + Processing: Remainder"  

### Breakdown Naming
- **List Price** = artwork price (pre-fees)
- **Buyer Support Fee** = 4.5% added at checkout
- **Venue Commission** = 15% of list price
- **Artist Take-Home** = plan % of list price
- **Platform + Processing** = remainder after Stripe fees

---

## STRIPE CONNECT IMPLEMENTATION

### Payment Flow
1. Buyer charged: P + (P × 0.045)
2. Artist transfer: P × artist_take_home_pct
3. Venue transfer: P × 0.15
4. Platform retains remainder minus Stripe fees

### Transfers
```javascript
// Per transaction:
const breakdown = calculateOrderBreakdown(P, artistTier);

await stripe.transfers.create({
  amount: breakdown.artistCents,
  currency: 'usd',
  destination: artist.stripeAccountId,
  transfer_group: orderId,
});

await stripe.transfers.create({
  amount: breakdown.venueCents,
  currency: 'usd',
  destination: venue.stripeAccountId,
  transfer_group: orderId,
});

// Platform keeps: breakdown.platformGrossCents - actual_stripe_fee
```

---

## METRICS & MONITORING

### Dashboard KPIs
- Average artist take-home %
- Venue commission volume
- Buyer fee revenue
- Stripe fee impact

### Alerts
- Orders where artist payout < 0 (config error)
- Stripe fee > expected (price change?)
- Transfer failures (account issues)

---

## ROLLOUT PLAN

### Phase 1: Core Implementation (NOW)
- ✅ Update plans.js
- ✅ Update PricingPage
- 🔄 Update checkout calculation
- 🔄 Add buyer fee line item

### Phase 2: Integration (Week 1)
- Update email templates
- Update dashboards
- Add order breakdown display
- Run E2E tests

### Phase 3: Deployment (Week 2)
- Production deployment
- Monitor order processing
- Verify Stripe splits
- Customer communication

### Phase 4: Cleanup (Week 3)
- Remove old bps-based code
- Archive legacy documentation
- Collect metrics

---

## QUICK REFERENCE

### New Percentages
```
Free:    60% artist, 15% venue, 4.5% buyer, 20.5% platform+stripe
Starter: 80% artist, 15% venue, 4.5% buyer, 0.5% platform+stripe
Growth:  83% artist, 15% venue, 4.5% buyer, -2.5% platform+stripe (platform subsidy)
Pro:     85% artist, 15% venue, 4.5% buyer, -4.5% platform+stripe (platform subsidy)
```

### Example Calculations
```
$100 sale:
- Free:    $60 artist, $15 venue, $4.50 buyer fee, $20.50 platform
- Pro:     $85 artist, $15 venue, $4.50 buyer fee, -$4.50 platform (subsidy)

$140 sale:
- Pro:     $119 artist, $21 venue, $6.30 buyer fee, -$6.30 platform
```

### Testing Command
```bash
node -e "
const plans = require('./server/plans.js');
const bd = plans.calculateOrderBreakdown(14000, 'pro');
console.log(JSON.stringify(bd, null, 2));
"
```

---

**Implementation Status**: 40% Complete  
**Next Step**: Update server/index.js checkout integration
