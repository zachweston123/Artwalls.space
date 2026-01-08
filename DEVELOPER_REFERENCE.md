# Subscription Model Refactor - Developer Reference Card

## Quick Reference

### The New Model

```
ARTIST TAKE-HOME (per tier)
├─ Free:    65%  (5000 bps platform share)
├─ Starter: 80%  (1000 bps platform share)
├─ Growth:  83%  (700 bps platform share)
└─ Pro:     85%  (500 bps platform share)

ALWAYS CONSTANT
├─ Venue Commission: 10% of list price
└─ Buyer Support Fee: 3% of list price (charged separately)

EXAMPLE: $140 Pro Tier Purchase
├─ List Price: $140.00
├─ Artist Earns: $119.00 (85%)
├─ Venue Gets: $14.00 (10%)
├─ Buyer Pays: $4.20 (3% fee)
└─ Platform Net: ~$3.00 (after payment processing)
```

### Key Functions

#### `plans.calculateOrderBreakdown(listPriceCents, tierString)`
Returns breakdown for an order:
```javascript
const breakdown = plans.calculateOrderBreakdown(14000, 'pro');
// Returns:
// {
//   listPrice: 14000,
//   artistAmount: 11900,
//   venueAmount: 1400,
//   buyerFee: 420,
//   buyerTotal: 14420,
//   platformNetCents: 280
// }
```

#### `plans.getArtistTakeHomePct(tierString)`
Returns take-home percentage as decimal (0.65, 0.80, 0.83, or 0.85):
```javascript
const pct = plans.getArtistTakeHomePct('pro');  // 0.85
const earnings = 14000 * pct;  // 11900 cents = $119.00
```

#### `plans.getPlatformFeeBpsFromPlan(tierString)`
Returns basis points (where 10000 bps = 100%):
```javascript
const bps = plans.getPlatformFeeBpsFromPlan('pro');  // 500
// Means platform takes 500 bps = 5% gross (after artist 85% + venue 10%)
```

### Key Constants

| Constant | Value | Formula |
|----------|-------|---------|
| VENUE_COMMISSION_PCT | 0.10 | Always 10% of list price |
| BUYER_FEE_PCT | 0.03 | Always 3% of list price |
| Free Artist % | 0.65 | 6500 bps of list price |
| Starter Artist % | 0.80 | 8000 bps of list price |
| Growth Artist % | 0.83 | 8300 bps of list price |
| Pro Artist % | 0.85 | 8500 bps of list price |

### File Locations

| Purpose | File | Status |
|---------|------|--------|
| Plan configuration | `server/plans.js` | ✅ Complete |
| Pricing page UI | `src/components/pricing/PricingPage.tsx` | ✅ Updated |
| Checkout calculation | `server/index.js` line ~2000 | ⏳ Needs integration |
| Fee function | `server/index.js` line ~1200 | ✅ Updated |
| Database schema | `migrations/SUBSCRIPTION_MODEL_UPDATE.sql` | ⏳ Pending |
| Email templates | `server/mail.js` | ⏳ Needs update |
| Tests | `server/tests/subscription-model.test.js` | ✅ Complete |
| Documentation | `IMPLEMENTATION_ROADMAP.md` | ✅ Complete |

## Common Tasks

### Task: Use new order breakdown in checkout

```javascript
// ❌ OLD WAY
const platformFeeBps = 2000;  // hardcoded
const platformFee = Math.round(amount * platformFeeBps / 10000);
const artistPayout = amount - platformFee - venueCommission;

// ✅ NEW WAY
const breakdown = plans.calculateOrderBreakdown(amount, artist.subscription_tier);
const artistPayout = breakdown.artistAmount;
const venueCommission = breakdown.venueAmount;
const buyerFee = breakdown.buyerFee;
```

### Task: Display earnings on artist dashboard

```javascript
// ❌ OLD WAY
<p>You keep 85% after 15% platform fee</p>

// ✅ NEW WAY
const takeHomePct = plans.getArtistTakeHomePct(artist.subscription_tier);
<p>You take home {Math.round(takeHomePct * 100)}% per sale</p>
```

### Task: Calculate buyer fee

```javascript
// ❌ OLD WAY - hardcoded
const buyerFee = amount * 0.03;

// ✅ NEW WAY - from breakdown
const breakdown = plans.calculateOrderBreakdown(amount, tier);
const buyerFee = breakdown.buyerFee;
```

### Task: Create Stripe line items with buyer fee

```javascript
// In checkout endpoint:
const breakdown = plans.calculateOrderBreakdown(artworkPrice, tier);

// Artwork line item (existing)
lineItems.push({
  price_data: {
    currency: 'usd',
    product_data: { name: artwork.title },
    unit_amount: breakdown.listPrice,
  },
  quantity: 1,
});

// ADD: Buyer support fee line item
lineItems.push({
  price_data: {
    currency: 'usd',
    product_data: {
      name: 'Artwalls Buyer Support',
      description: 'Processing and artist support'
    },
    unit_amount: breakdown.buyerFee,
  },
  quantity: 1,
});
```

### Task: Format currency in UI

```javascript
// Helper function for consistent formatting
function formatCurrency(cents) {
  return '$' + (cents / 100).toFixed(2);
}

// Usage:
const breakdown = plans.calculateOrderBreakdown(14000, 'pro');
console.log(formatCurrency(breakdown.artistAmount));  // "$119.00"
```

## Basis Points Reference

Used throughout Stripe and payment systems where 10000 bps = 100%:

```
100 bps   = 1%
500 bps   = 5%
700 bps   = 7%
1000 bps  = 10%
2500 bps  = 25%
8500 bps  = 85%
10000 bps = 100%
```

For the subscription model:
- **Free tier**: Platform takes ~25% (2500 bps) after artist 65% + venue 10% = 25%
- **Starter**: Platform takes ~10% (1000 bps) after artist 80% + venue 10% = 10%
- **Growth**: Platform takes ~7% (700 bps) after artist 83% + venue 10% = 7%
- **Pro**: Platform takes ~5% (500 bps) after artist 85% + venue 10% = 5%

## Validation Checklist

When implementing changes, verify:

- [ ] `calculateOrderBreakdown()` produces same results as PricingPage calculator
- [ ] Checkout order creation uses new `calculateOrderBreakdown()`
- [ ] Buyer fee is calculated as 3% of list price
- [ ] Venue commission is exactly 10% of list price
- [ ] Artist payout = list price × artist take-home %
- [ ] All sums add up: artist + venue + buyer fee + platform = list price + buyer fee
- [ ] No contradictions between pricing page, checkout, dashboard, emails
- [ ] $140 example shows $119 artist payout for Pro tier everywhere
- [ ] Database order records store all breakdown components
- [ ] Stripe transfers use correct amounts
- [ ] Email templates use new language ("Take home X%", not "Y% fee")

## Testing Strategy

### Unit Tests
```bash
node server/tests/subscription-model.test.js
```

### Manual Test: $140 Example

1. Create $140 artwork with Pro artist
2. Verify pricing page shows "$119 artist take-home"
3. Buy artwork as test buyer
4. Check order confirmation shows:
   - Artist gets $119
   - Venue gets $14
   - Buyer paid $4.20 fee
5. Check receipt email shows breakdown
6. Check artist dashboard shows 85% take-home %
7. Check admin dashboard shows correct platform net

### Database Validation
```sql
-- Check recent orders for calculation errors
SELECT o.id, validation.is_valid, validation.error_message
FROM orders o
CROSS JOIN LATERAL validate_order_breakdown(
  o.amount_cents, 
  o.artist_payout_cents,
  o.venue_payout_cents,
  'pro'  -- replace with actual tier
) validation
WHERE NOT validation.is_valid;
```

## Common Pitfalls

### ❌ Forgetting to import plans.js
```javascript
// Missing: const plans = require('./plans');
const breakdown = plans.calculateOrderBreakdown(...);  // ERROR!
```

### ❌ Using hardcoded percentages instead of plans functions
```javascript
// ❌ BAD - hardcoded percentages scatter throughout code
const artistAmount = amount * 0.85;

// ✅ GOOD - use plans functions
const takeHome = plans.getArtistTakeHomePct('pro');
const artistAmount = amount * takeHome;
```

### ❌ Confusing cents and dollars
```javascript
// ❌ BAD - mixing units
const breakdown = plans.calculateOrderBreakdown('$140', 'pro');

// ✅ GOOD - always use cents
const breakdown = plans.calculateOrderBreakdown(14000, 'pro');
```

### ❌ Forgetting buyer fee is separate from list price
```javascript
// ❌ BAD - buyer fee included in list price
const total = listPrice;

// ✅ GOOD - buyer fee is added
const total = listPrice + breakdown.buyerFee;
```

### ❌ Using environment variables for fees instead of plans.js
```javascript
// ❌ BAD - fees scattered across env vars
const fee = process.env.FEE_BPS_PRO;

// ✅ GOOD - single source of truth
const fee = plans.getPlatformFeeBpsFromPlan('pro');
```

## Debugging Tips

### To see what a specific purchase breaks down to:
```bash
node -e "
const plans = require('./server/plans');
const bd = plans.calculateOrderBreakdown(14000, 'pro');
console.log('List Price: \$140.00');
console.log('Artist (' + (plans.getArtistTakeHomePct('pro')*100) + '%): \$' + (bd.artistAmount/100).toFixed(2));
console.log('Venue (10%): \$' + (bd.venueAmount/100).toFixed(2));
console.log('Buyer Fee (3%): \$' + (bd.buyerFee/100).toFixed(2));
console.log('Total with Fee: \$' + (bd.buyerTotal/100).toFixed(2));
"
```

### To verify database values for an order:
```sql
SELECT 
  o.amount_cents / 100.0 as list_price,
  a.subscription_tier,
  o.artist_payout_cents / 100.0 as artist_payout,
  o.venue_payout_cents / 100.0 as venue_payout,
  (o.artist_payout_cents + o.venue_payout_cents) / 100.0 as total_payouts,
  (o.amount_cents - o.artist_payout_cents - o.venue_payout_cents) / 100.0 as platform_net
FROM orders o
JOIN artworks aw ON o.artwork_id = aw.id
JOIN artists a ON aw.artist_id = a.id
WHERE o.id = [ORDER_ID];
```

## Related Documentation

- 📋 Full implementation steps: `IMPLEMENTATION_ROADMAP.md`
- 🧪 Test suite: `server/tests/subscription-model.test.js`
- 🚀 Deployment guide: `DEPLOYMENT_GUIDE.sh`
- 📊 Database migration: `migrations/SUBSCRIPTION_MODEL_UPDATE.sql`
- 💾 Plan configuration: `server/plans.js`

---

**Last Updated**: 2024
**Status**: Implementation in progress
**Contacts**: Engineering team
