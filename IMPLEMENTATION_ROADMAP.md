# Subscription Model Refactor - Critical Path Implementation Guide

## Overview

This document provides step-by-step instructions for completing the subscription model refactor. The refactor standardizes artist earnings across the app:

- **Artist Take-Home**: 65% (Free), 80% (Starter), 83% (Growth), 85% (Pro)
- **Venue Commission**: Always 10% of list price
- **Buyer Support Fee**: Always 3% of list price (charged separately at checkout)

## Completed Tasks ✅

1. ✅ Created `server/plans.js` - Single source of truth for plan configuration
2. ✅ Updated `src/components/pricing/PricingPage.tsx` - Consumer-friendly copy with "take home X%" language
3. ✅ Updated `server/index.js` - `getPlatformFeeBpsForArtist()` function with new basis points mapping
4. ✅ Created comprehensive documentation and test utilities

## Critical Path - Remaining Tasks

### PHASE 1: Checkout Order Calculation (PRIORITY 1 - HIGH)

**Goal**: Integrate the new order breakdown calculation into the checkout flow

**Files to Modify**:
- `server/index.js` - POST `/api/stripe/create-checkout-session` endpoint

**Steps**:

1. **Import the new function**:
   ```javascript
   const plans = require('./plans');
   ```

2. **Locate the checkout endpoint** (around line 2000 in server/index.js):
   ```javascript
   app.post('/api/stripe/create-checkout-session', requireAuth, async (req, res) => {
     // ... existing code ...
     // Find the section where order amounts are calculated
   ```

3. **Replace the fee calculation logic**:

   **OLD CODE** (to find and replace):
   ```javascript
   const platformFeeBpsForArtist = await getPlatformFeeBpsForArtist(artist);
   const platformFeeBps = platformFeeBpsForArtist;
   const platformFeeAmount = Math.round(totalAmountCents * platformFeeBps / 10000);
   const artistPayoutAmount = totalAmountCents - platformFeeAmount - venueCommission;
   ```

   **NEW CODE** (replacement):
   ```javascript
   // Use new standardized order breakdown
   const orderBreakdown = plans.calculateOrderBreakdown(
     totalAmountCents,
     artist.subscription_tier || 'free'
   );
   
   const artistPayoutAmount = orderBreakdown.artistAmount;
   const platformFeeAmount = orderBreakdown.platformNetCents;
   const venueCommission = orderBreakdown.venueAmount;
   const buyerFeeAmount = orderBreakdown.buyerFee;
   ```

4. **Update Stripe checkout params to include buyer fee**:
   ```javascript
   // Existing line items (keep these)
   lineItems.push({
     price_data: {
       currency: 'usd',
       product_data: { name: 'Artwork' },
       unit_amount: totalAmountCents,
     },
     quantity: 1,
   });
   
   // ADD THIS: Buyer support fee as separate line item
   lineItems.push({
     price_data: {
       currency: 'usd',
       product_data: {
         name: 'Artwalls Buyer Support Fee',
         description: 'Processing and artist support'
       },
       unit_amount: buyerFeeAmount,
     },
     quantity: 1,
   });
   ```

5. **Update order creation in database**:
   ```javascript
   // When creating order in database, include all breakdown amounts
   const order = await db.createOrder({
     artwork_id: artworkId,
     buyer_email: stripeCheckoutSession.customer_email,
     amount_cents: totalAmountCents,
     currency: 'usd',
     platform_fee_bps: Math.round((orderBreakdown.platformNetCents / totalAmountCents) * 10000),
     platform_fee_cents: orderBreakdown.platformNetCents,
     artist_payout_cents: orderBreakdown.artistAmount,
     venue_payout_cents: orderBreakdown.venueAmount,
     buyer_fee_cents: orderBreakdown.buyerFee,  // NEW FIELD
     status: 'pending'
   });
   ```

6. **Test the change**:
   ```bash
   # Run the test suite to verify calculations
   node server/tests/subscription-model.test.js
   ```

### PHASE 2: Order Display & Receipts (PRIORITY 1 - HIGH)

**Goal**: Update all order display surfaces to show the new breakdown consistently

**Files to Modify**:
- `src/pages/OrderConfirmation.tsx` (if it exists)
- Email templates in `server/mail.js`
- Order receipt components throughout the app

**Steps**:

1. **Find order confirmation template** in your codebase:
   ```bash
   grep -r "Order Total" src/ --include="*.tsx" --include="*.jsx"
   grep -r "Order Confirmation" src/ --include="*.tsx" --include="*.jsx"
   ```

2. **Update the confirmation display** to show:
   ```
   Artwork Price:          $140.00
   Buyer Support Fee (3%):  $4.20
   ─────────────────────────────────
   Total Charged to You:   $144.20
   
   The artist will receive:
   $119.00 (85% of artwork price)
   ```

3. **Update email template** in `server/mail.js`:
   ```javascript
   // Find the order confirmation email function
   // Update it to include the breakdown:
   
   async function sendOrderConfirmationEmail(order, artist, artwork) {
     const breakdown = plans.calculateOrderBreakdown(
       order.amount_cents,
       artist.subscription_tier || 'free'
     );
     
     const emailHTML = `
       <h2>Order Confirmation</h2>
       <p>Thank you for purchasing "${artwork.title}"!</p>
       
       <h3>Order Details</h3>
       <table>
         <tr>
           <td>Artwork Price:</td>
           <td>$${(order.amount_cents / 100).toFixed(2)}</td>
         </tr>
         <tr>
           <td>Buyer Support Fee (3%):</td>
           <td>$${(breakdown.buyerFee / 100).toFixed(2)}</td>
         </tr>
         <tr>
           <td><strong>Total Charged:</strong></td>
           <td><strong>$${(breakdown.buyerTotal / 100).toFixed(2)}</strong></td>
         </tr>
       </table>
       
       <p>The artist will receive <strong>$${(breakdown.artistAmount / 100).toFixed(2)}</strong> 
       (${(plans.getArtistTakeHomePct(artist.subscription_tier) * 100).toFixed(0)}% of the artwork price).</p>
     `;
     
     return sendEmail(order.buyer_email, emailHTML);
   }
   ```

### PHASE 3: Artist Dashboard Updates (PRIORITY 2 - MEDIUM)

**Goal**: Update artist earnings display to show new percentages and breakdown

**Files to Modify**:
- `src/pages/ArtistDashboard.tsx` (or relevant component)
- `src/components/ArtistPayoutsCard.tsx` (if it exists)
- Any earnings summary components

**Steps**:

1. **Find earnings display component**:
   ```bash
   grep -r "earnings\|payout\|revenue" src/ --include="*.tsx" -i | grep -i component
   ```

2. **Update earnings calculation**:
   ```javascript
   // OLD: Manual fee calculation
   const artistTakeHome = salePrice * (1 - platformFee);
   
   // NEW: Use standardized calculation
   const breakdown = plans.calculateOrderBreakdown(salePrice, artistTier);
   const artistTakeHome = breakdown.artistAmount;
   ```

3. **Update display text**:
   ```typescript
   // OLD:
   <p>You keep 85% after 15% platform fee</p>
   
   // NEW:
   <p>You take home 85% per sale</p>
   <p>Venue gets 10%, buyers pay 3% support fee</p>
   ```

4. **Add interactive calculator**:
   ```typescript
   <div className="earnings-calculator">
     <h3>Earnings Calculator</h3>
     <input 
       type="number" 
       placeholder="Artwork price"
       onChange={(e) => {
         const breakdown = plans.calculateOrderBreakdown(
           parseInt(e.target.value) * 100,
           artistTier
         );
         setCalculation(breakdown);
       }}
     />
     {calculation && (
       <p>You'll earn: ${(calculation.artistAmount / 100).toFixed(2)}</p>
     )}
   </div>
   ```

### PHASE 4: Database Schema Update (PRIORITY 2 - MEDIUM)

**Goal**: Add columns to persist order breakdown for audit trail

**Files to Modify**:
- Run migration: `migrations/SUBSCRIPTION_MODEL_UPDATE.sql`

**Steps**:

1. **Run the migration**:
   ```bash
   # For Supabase:
   supabase migration up
   
   # Or execute the SQL file directly:
   psql $DATABASE_URL < migrations/SUBSCRIPTION_MODEL_UPDATE.sql
   ```

2. **Verify new columns exist**:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'orders';
   ```

### PHASE 5: Stripe Metadata & Subscription Syncing (PRIORITY 2 - MEDIUM)

**Goal**: Ensure subscription sync uses correct metadata format

**Files to Modify**:
- `server/index.js` - `syncArtistSubscriptionFromStripe()` function

**Steps**:

1. **Find the sync function** (around line 1500):
   ```javascript
   async function syncArtistSubscriptionFromStripe(artistId) {
     // ... existing code ...
   }
   ```

2. **Update metadata reading**:
   ```javascript
   // OLD: Read from price metadata
   const platformFeeBps = price.metadata?.platform_fee_bps;
   
   // NEW: Read from price metadata
   const artistTakeHomePct = parseFloat(price.metadata?.artist_take_home_pct || '0.65');
   const artistTier = price.metadata?.tier || 'free';
   
   // Update artist record
   await db.updateArtist(artistId, {
     subscription_tier: artistTier,
     subscription_status: subscription.status,
     platform_fee_bps: plans.getPlatformFeeBpsFromPlan(artistTier)
   });
   ```

3. **Verify Stripe price metadata**:
   ```bash
   # Check that prices in Stripe have correct metadata
   # Use Stripe Dashboard: Products > [Plan] > Price Data > Metadata
   # Should have: tier: "pro", artist_take_home_pct: 0.85
   ```

### PHASE 6: Admin Dashboard & Reporting (PRIORITY 3 - LOW)

**Goal**: Update admin views to show new model

**Files to Modify**:
- Admin dashboard components (locations vary by implementation)

**Key Metrics to Display**:
```
Order Summary:
- Total Gross Revenue: $XXXX
- Artist Payouts: $XXXX (65-85%)
- Venue Commissions: $XXXX (10%)
- Buyer Fees: $XXXX (3%)
- Platform Net: $XXXX (after Stripe fees)

By Subscription Tier:
- Free: X orders, $XXXX gross, X% to artists
- Starter: X orders, $XXXX gross, X% to artists
- Growth: X orders, $XXXX gross, X% to artists
- Pro: X orders, $XXXX gross, X% to artists

Artist Payouts:
- Free tier artists: $XXXX (65% of sales)
- Starter tier artists: $XXXX (80% of sales)
- Growth tier artists: $XXXX (83% of sales)
- Pro tier artists: $XXXX (85% of sales)
```

**SQL Queries for Admin**:
```sql
-- Use the views created in migration:
SELECT * FROM vw_revenue_by_tier;
SELECT * FROM vw_artist_earnings LIMIT 10;
SELECT * FROM vw_orders_breakdown WHERE created_at >= NOW() - INTERVAL '7 days';
```

### PHASE 7: FAQ & Help Documentation (PRIORITY 3 - LOW)

**Goal**: Update help pages with new model explanation

**Files to Create/Modify**:
- FAQ page
- Help/Support pages
- Terms of Service (if applicable)

**Key Topics to Cover**:

1. **What are the subscription tiers?**
   - List each tier with take-home percentage
   - Explain artwork limits

2. **How much will I earn?**
   - Show the breakdown: artist take-home, venue commission, buyer fee
   - Use $140 example

3. **What does the Buyer Support Fee go toward?**
   - Explain that 3% supports Artwalls operations
   - Mention payment processing costs

4. **Can I change my subscription?**
   - Explain upgrade/downgrade process
   - When changes take effect

### PHASE 8: Testing & Validation (PRIORITY 1 - URGENT BEFORE SHIPPING)

**Goal**: Ensure consistency across all surfaces with no contradictions

**Test Coverage**:

1. **Unit Tests**:
   ```bash
   node server/tests/subscription-model.test.js
   ```
   Expected output: ✅ ALL TESTS PASSED

2. **Integration Tests** - Test the $140 example everywhere:
   - [ ] Pricing page shows "$119 artist take-home" for Pro tier
   - [ ] Checkout shows $144.20 total ($140 + $4.20 fee)
   - [ ] Order confirmation shows artist gets $119
   - [ ] Receipt email shows breakdown correctly
   - [ ] Artist dashboard shows 85% take-home percentage
   - [ ] Admin dashboard shows correct platform net amount

3. **Database Validation**:
   ```sql
   -- Run the validation function on recent orders
   SELECT o.id, validation.is_valid, validation.error_message
   FROM orders o
   CROSS JOIN LATERAL validate_order_breakdown(
     o.amount_cents,
     o.artist_payout_cents,
     o.venue_payout_cents,
     (SELECT subscription_tier FROM artists WHERE id = o.artist_id)
   ) AS validation
   WHERE o.created_at >= NOW() - INTERVAL '7 days'
     AND NOT validation.is_valid;
   ```

4. **Stripe Integration Validation**:
   - [ ] Stripe transfers are created for correct amounts
   - [ ] Artist receives correct Stripe Connect transfer
   - [ ] Venue receives correct commission transfer

## Implementation Order

**Week 1:**
1. PHASE 1: Checkout order calculation (Day 1-2)
2. PHASE 2: Order display & receipts (Day 2-3)
3. PHASE 8: Testing (Day 3-5)
4. Deploy to production

**Week 2:**
1. PHASE 3: Artist dashboard (Day 1-2)
2. PHASE 4: Database schema (Day 2)
3. PHASE 7: Documentation (Day 3)

**Week 3:**
1. PHASE 5: Stripe sync updates (Day 1)
2. PHASE 6: Admin dashboard (Day 1-2)
3. Post-deployment validation & monitoring (Day 3-5)

## Rollback Plan

If issues are discovered:

1. **Immediate**: Disable new checkout flow, use legacy calculation
2. **Short-term**: Revert server/index.js to use old fee calculation
3. **Analysis**: Check order_audit_log table for calculation issues
4. **Long-term**: Fix and re-deploy with additional testing

## Documentation for Users

**Email to all artists:**
```
Subject: 🎉 Better Earnings on Artwalls!

Hi [Artist Name],

We've updated our subscription model to be clearer and more transparent. 

Starting today:
✓ Free Plan: Take home 65%
✓ Starter: Take home 80%
✓ Growth: Take home 83%
✓ Pro: Take home 85%

What changed:
- Clearer language: You take home a % of the artwork price
- Same venue commission: 10% (supports the gallery)
- Small buyer support fee: 3% (helps us operate)
- Everything else goes to payment processing

Example: On a $140 artwork with Pro:
- You earn: $119 (85%)
- Venue gets: $14 (10%)
- Buyer pays: +$4.20 (3% support fee)

Your subscription tier stays the same. No action needed!

Questions? Check our updated FAQ.

Best,
The Artwalls Team
```

## Success Criteria

✅ All tests pass
✅ $140 example shows same breakdown everywhere
✅ No old percentages visible in UI
✅ Emails show new language
✅ Admin dashboard updated
✅ Artist dashboard updated
✅ Documentation updated
✅ Stripe transfers match calculated amounts
✅ Zero contradictions across surfaces
✅ Team trained on new model

---

**Need help?** Check the DEPLOYMENT_GUIDE.sh for step-by-step validation instructions.
