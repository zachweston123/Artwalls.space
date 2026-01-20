# Stripe Connect Testing Plan

## Prerequisites Check ✓

All environment variables should already be configured in your Cloudflare Worker:
- ✅ `STRIPE_SECRET_KEY` 
- ✅ `STRIPE_WEBHOOK_SECRET`
- ✅ `APP_URL`

## Testing Steps

### 1. Database Migration Verification

Run this SQL in Supabase Dashboard → SQL Editor:

```sql
-- Check if Stripe Connect columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'artists' 
  AND column_name LIKE 'stripe_%'
ORDER BY column_name;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'venues' 
  AND column_name LIKE 'stripe_%'
ORDER BY column_name;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
  AND column_name IN (
    'list_price_cents', 'buyer_fee_cents', 'buyer_total_cents',
    'venue_amount_cents', 'artist_amount_cents', 
    'platform_gross_before_stripe_cents', 'stripe_fee_cents',
    'platform_net_cents', 'stripe_balance_transaction_id',
    'stripe_transfer_id_artist', 'stripe_transfer_id_venue',
    'payout_status', 'payout_error'
  )
ORDER BY column_name;
```

**Expected**: Should see all Stripe Connect columns. If not, run the migration:

```bash
# Copy migration to clipboard, then paste in Supabase Dashboard → SQL Editor
cat supabase/migrations/20260120_add_stripe_connect.sql
```

### 2. Server Startup Test

```bash
cd /Users/zachweston/Artwalls.space-github
npm run dev
```

**Expected Console Output**:
```
✅ Stripe initialized with API version 2024-06-20
✅ Stripe Connect module initialized
Server listening on :4242
```

**Check for errors**: Look for "Missing STRIPE_SECRET_KEY" or other startup errors.

### 3. API Endpoint Tests

Open a new terminal and run these curl commands:

#### Test 1: Health Check
```bash
curl http://localhost:4242/api/debug/env
```

**Expected**: Should show Stripe environment variables as configured.

#### Test 2: Create Connect Account (Artist)
```bash
# First, get an auth token by logging in as an artist
# Then replace YOUR_TOKEN below

curl -X POST http://localhost:4242/api/stripe/connect/create-account \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "artist"}'
```

**Expected Response**:
```json
{
  "accountId": "acct_xxx...",
  "onboardingRequired": true
}
```

#### Test 3: Generate Onboarding Link
```bash
curl -X POST http://localhost:4242/api/stripe/connect/account-link \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "artist",
    "returnUrl": "http://localhost:3000/#/stripe-return?role=artist",
    "refreshUrl": "http://localhost:3000/#/artist-dashboard"
  }'
```

**Expected Response**:
```json
{
  "url": "https://connect.stripe.com/setup/e/acct_xxx..."
}
```

#### Test 4: Check Pending Payouts (Admin)
```bash
curl http://localhost:4242/api/admin/stripe/pending-payouts
```

**Expected**: JSON array of pending payouts (may be empty initially).

### 4. Webhook Configuration

1. Go to **Stripe Dashboard → Developers → Webhooks**
2. Click **Add endpoint**
3. Set URL to: `https://artwalls.space/api/stripe/webhook`
4. Select these events:
   - `account.updated` (for Connect status sync)
   - `charge.succeeded` (for automatic payouts)
   - `checkout.session.completed` (existing)
   - `customer.subscription.updated` (existing)
   - `customer.subscription.deleted` (existing)
5. Copy the webhook signing secret
6. **Update your Cloudflare Worker** with the new `STRIPE_WEBHOOK_SECRET`

### 5. Frontend Integration Test

#### Artist Dashboard Test
1. Login as artist
2. Navigate to `/artist-dashboard`
3. You should see a "Stripe Connect Status" card
4. Click "Get Started with Stripe" → redirects to Stripe onboarding
5. Complete onboarding (use test data in test mode)
6. Return to dashboard → status should update to "Payouts Enabled ✓"

#### Venue Dashboard Test
1. Login as venue
2. Navigate to `/venue-dashboard`
3. Same flow as artist above

#### Admin Panel Test
1. Navigate to `/admin`
2. Enter admin password
3. Check "Stripe Connect Setup" section:
   - ✅ STRIPE_SECRET_KEY configured
   - ✅ STRIPE_WEBHOOK_SECRET configured
   - ✅ Webhook URL displayed
4. View "Pending Payouts" list
5. Try "Retry" on any pending payouts

### 6. End-to-End Purchase Test

#### Setup:
1. Artist completes Stripe onboarding
2. Venue completes Stripe onboarding
3. Artist uploads artwork and assigns to venue
4. Admin approves artwork

#### Test Flow:
1. Navigate to artwork purchase page
2. Complete checkout (use test card: 4242 4242 4242 4242)
3. **Monitor server logs** for:
   ```
   ✅ Checkout completed, waiting for charge.succeeded to create payouts
   ✅ Artist Connect account updated
   ✅ Venue Connect account updated
   💰 Payouts created successfully for order [orderId]
   ```
4. Check Stripe Dashboard:
   - Go to Connect → Transfers
   - Should see 2 transfers (artist + venue)
5. Check database:
   ```sql
   SELECT id, payout_status, artist_amount_cents, venue_amount_cents, 
          stripe_transfer_id_artist, stripe_transfer_id_venue
   FROM orders 
   WHERE id = 'YOUR_ORDER_ID';
   ```
   - `payout_status` should be `'paid'`
   - Transfer IDs should be populated

### 7. Error Scenarios

#### Test: Account Not Onboarded
1. Create artist without completing Stripe onboarding
2. Purchase their artwork
3. Check order status → should be `'pending_connect'`
4. Artist completes onboarding
5. Admin clicks "Retry Payout" in admin panel
6. Status should update to `'paid'`

#### Test: Webhook Signature Failure
1. Send a fake webhook request:
   ```bash
   curl -X POST http://localhost:4242/api/stripe/webhook \
     -H "Content-Type: application/json" \
     -d '{"type": "test"}'
   ```
2. **Expected**: `400 Bad Request: Webhook Error: No signatures found matching the expected signature`

## Success Criteria

✅ All database columns exist  
✅ Server starts without errors  
✅ Artists can complete onboarding  
✅ Venues can complete onboarding  
✅ Purchases trigger automatic payouts  
✅ Stripe Dashboard shows transfers  
✅ Admin panel displays pending payouts  
✅ Retry mechanism works for pending payouts  
✅ Webhooks are processed correctly  

## Common Issues & Fixes

### Issue: "Missing STRIPE_SECRET_KEY"
**Fix**: Add secret to Cloudflare Worker environment variables

### Issue: "Webhook signature verification failed"
**Fix**: Copy webhook signing secret from Stripe Dashboard → Update Worker env var

### Issue: Database columns don't exist
**Fix**: Run migration in Supabase SQL Editor

### Issue: Onboarding link returns 401
**Fix**: Ensure valid Bearer token in Authorization header

### Issue: Payouts stuck in "pending_connect"
**Fix**: 
1. Check artist/venue `stripe_onboarding_status` = 'complete'
2. Ensure `stripe_payouts_enabled` = true
3. Use Admin panel "Retry Payout" button

## Monitoring

Check these regularly:
- Stripe Dashboard → Connect → Transfers (see payout activity)
- Supabase → Database → orders table → filter by `payout_status`
- Server logs for webhook processing
- Admin panel → Pending Payouts section

## Next Steps After Testing

1. ✅ Deploy to production (already done with git push)
2. ⚠️ Switch Stripe from Test Mode to Live Mode
3. ⚠️ Update webhook endpoint to production URL
4. ⚠️ Notify artists/venues to complete onboarding
5. 📊 Monitor first real transactions
