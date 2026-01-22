# Stripe Subscription Integration - Complete Setup Guide

## 🎉 Good News: Your System is Already 90% Complete!

You've already created your products in Stripe and have the price IDs. Let me show you exactly how everything connects and what you need to verify.

---

## Current Setup Status

### ✅ What's Already Done

1. **Stripe Products Created** - You have 3 subscription products in Stripe
2. **Price IDs in Environment** - Stored in `.dev.vars`:
   - `STRIPE_SUB_PRICE_STARTER=price_1SrsqDE1V7i70KPhBmE4lAaC`
   - `STRIPE_SUB_PRICE_GROWTH=price_1SrsrDE1V7i70KPhHjMGLwvu`
   - `STRIPE_SUB_PRICE_PRO=price_1SrsrdE1V7i70KPhorOqhCge`

3. **Backend Endpoint** - `/api/stripe/billing/create-subscription-session` (line 2073 in server/index.js)
4. **Webhook Handler** - Processes `checkout.session.completed` and updates user tier
5. **Frontend Integration** - PricingPage.tsx calls the subscription endpoint
6. **Database Fields** - Artists table has `subscription_tier` and `subscription_status`

---

## How It Works (Step-by-Step)

### 1. **User Clicks "Select Plan" Button**
Location: `src/components/pricing/PricingPage.tsx` (line 225)

```tsx
async function startSubscription(tier: PlanId) {
  // Calls backend to create Stripe checkout session
  const { url } = await apiPost(
    '/api/stripe/billing/create-subscription-session',
    { tier: 'starter', artistId }  // tier can be 'starter', 'growth', or 'pro'
  );
  window.location.href = url;  // Redirect to Stripe checkout
}
```

### 2. **Backend Creates Checkout Session**
Location: `server/index.js` (line 2073)

```javascript
app.post('/api/stripe/billing/create-subscription-session', async (req, res) => {
  const artist = await requireArtist(req, res);
  const tier = req.body?.tier;  // 'starter', 'growth', or 'pro'
  
  // Get price ID from environment
  const SUB_PRICE_IDS = {
    starter: process.env.STRIPE_SUB_PRICE_STARTER,
    growth: process.env.STRIPE_SUB_PRICE_GROWTH,
    pro: process.env.STRIPE_SUB_PRICE_PRO,
  };
  const priceId = SUB_PRICE_IDS[tier];
  
  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    success_url: 'https://artwalls.space/#/artist-dashboard?sub=success',
    cancel_url: 'https://artwalls.space/#/artist-dashboard?sub=cancel',
    customer: artist.stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { artistId: artist.id, tier: tier },
    subscription_data: {
      metadata: { artistId: artist.id, tier: tier }
    }
  });
  
  res.json({ url: session.url });  // Return checkout URL
});
```

### 3. **User Completes Payment on Stripe**
- User enters credit card details
- Stripe processes payment
- Subscription is created in Stripe

### 4. **Stripe Sends Webhook to Your Server**
Event: `checkout.session.completed`

Location: `server/index.js` (line 1116)

```javascript
async function handleStripeWebhookEvent(event) {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    if (session.mode === 'subscription') {
      const artistId = session.metadata.artistId;
      const tier = session.metadata.tier;
      const subscriptionId = session.subscription;
      
      // Update artist in database
      await upsertArtist({
        id: artistId,
        stripeSubscriptionId: subscriptionId,
        subscriptionTier: tier,  // 'starter', 'growth', or 'pro'
        subscriptionStatus: 'active'
      });
      
      console.log('✅ Artist subscription activated', { artistId, tier });
    }
  }
}
```

### 5. **User's Tier is Upgraded**
The database is updated with:
- `subscription_tier` = 'starter' (or 'growth', 'pro')
- `subscription_status` = 'active'
- `stripe_subscription_id` = 'sub_xxxxx'

### 6. **User Gets Access to New Features**
When user returns to dashboard, API fetches their profile:
- `/api/me` returns `subscription_tier: 'starter'`
- Frontend shows upgraded features based on tier
- Limits automatically adjust (displays, artworks, etc.)

---

## Setup Checklist

### Step 1: Verify Environment Variables

Check that these are set in your deployment environment:

**Cloudflare Workers (.dev.vars is already set ✅):**
```bash
STRIPE_SECRET_KEY=sk_live_51SiQpRE1V7i70KPh...
STRIPE_WEBHOOK_SECRET=whsec_n55NX5gpF2r0c3wO55A992ujs6rRpgs9
STRIPE_SUB_PRICE_STARTER=price_1SrsqDE1V7i70KPhBmE4lAaC
STRIPE_SUB_PRICE_GROWTH=price_1SrsrDE1V7i70KPhHjMGLwvu
STRIPE_SUB_PRICE_PRO=price_1SrsrdE1V7i70KPhorOqhCge
```

**For Production Deployment:**
1. Go to Cloudflare Dashboard → Workers → your api worker
2. Settings → Variables
3. Add all the variables above

### Step 2: Configure Webhook in Stripe Dashboard

1. Go to **Stripe Dashboard** → [Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. Enter endpoint URL:
   ```
   https://api.artwalls.space/api/stripe/webhook
   ```
4. Select events to listen for:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   
5. Click **"Add endpoint"**
6. Copy the **Signing secret** (starts with `whsec_...`)
7. Update `STRIPE_WEBHOOK_SECRET` in your Cloudflare Workers environment

### Step 3: Add Metadata to Your Stripe Products (IMPORTANT!)

Go to each product in Stripe Dashboard and add metadata:

**Starter Product:**
- Key: `tier` → Value: `starter`

**Growth Product:**
- Key: `tier` → Value: `growth`

**Pro Product:**
- Key: `tier` → Value: `pro`

This ensures the webhook handler can identify which tier to assign.

### Step 4: Test the Flow

#### Test Subscription Purchase (Recommended: Test Mode First)

1. **Use Stripe Test Keys:**
   ```bash
   STRIPE_SECRET_KEY=sk_test_...  # Get from Stripe Dashboard → Developers → API Keys
   ```

2. **Test Card Numbers:**
   - Success: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/34`)
   - CVC: Any 3 digits (e.g., `123`)

3. **Testing Steps:**
   ```
   1. Sign in to your app as an artist
   2. Navigate to: https://artwalls.space/#/plans-pricing
   3. Click "Select Plan" on Starter tier
   4. Complete checkout with test card
   5. Verify:
      - Redirected to /artist-dashboard?sub=success
      - Database shows: subscription_tier = 'starter'
      - Dashboard shows "Starter" badge
      - User can create 10 artworks (was 1 on free tier)
   ```

#### Verify Webhook Delivery

1. Go to **Stripe Dashboard** → Developers → Webhooks
2. Click on your webhook endpoint
3. Check **"Logs"** tab
4. Look for recent `checkout.session.completed` events
5. Status should be **200 OK**

If you see errors:
- Check server logs for error messages
- Verify `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
- Ensure endpoint URL is correct

---

## Common Issues & Solutions

### Issue 1: "Invalid tier or missing subscription price ID"

**Cause:** Price ID not found in environment variables

**Fix:**
1. Verify price IDs in `.dev.vars` match your Stripe Dashboard
2. Redeploy your Cloudflare Worker after updating variables
3. Check Cloudflare Workers → Settings → Variables

### Issue 2: Webhook not triggering tier upgrade

**Cause:** Webhook secret mismatch or events not selected

**Fix:**
1. Go to Stripe Dashboard → Webhooks → Your Endpoint
2. Verify events include: `checkout.session.completed`
3. Copy the signing secret and update `STRIPE_WEBHOOK_SECRET`
4. Verify endpoint URL: `https://api.artwalls.space/api/stripe/webhook`

### Issue 3: User stuck on "Processing..." after payment

**Cause:** Success URL redirect issue

**Fix:**
1. Check `SUB_SUCCESS_URL` in server/index.js (line 66):
   ```javascript
   const SUB_SUCCESS_URL = process.env.SUB_SUCCESS_URL || 
     `${APP_URL}/#/artist-dashboard?sub=success`;
   ```
2. Verify `APP_URL` environment variable is set correctly
3. Test manually: Visit the success URL to ensure page loads

### Issue 4: Subscription created but tier not updated

**Cause:** Webhook event processed but database update failed

**Fix:**
1. Check server logs for database errors
2. Verify Supabase connection is working:
   ```bash
   curl https://api.artwalls.space/api/debug/supabase
   ```
3. Check that `artists` table has columns:
   - `subscription_tier` (text)
   - `subscription_status` (text)
   - `stripe_subscription_id` (text)
   - `stripe_customer_id` (text)

---

## Database Schema Verification

Ensure your `artists` table has these columns:

```sql
-- Check if columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'artists' 
AND column_name IN (
  'subscription_tier',
  'subscription_status', 
  'stripe_customer_id',
  'stripe_subscription_id'
);
```

If missing, add them:

```sql
ALTER TABLE public.artists 
ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
```

---

## Testing Checklist

- [ ] Environment variables set in Cloudflare Workers
- [ ] Webhook endpoint configured in Stripe Dashboard
- [ ] Webhook signing secret matches environment variable
- [ ] Product metadata includes `tier` key
- [ ] Test subscription purchase completes successfully
- [ ] User tier updates in database after payment
- [ ] Dashboard shows correct tier badge
- [ ] User gains access to tier features (artwork limits, etc.)
- [ ] Webhook logs show 200 OK responses
- [ ] Subscription appears in Stripe Dashboard

---

## Production Deployment

### Pre-Launch Checklist

1. **Switch to Live Keys:**
   ```bash
   # Replace test keys with live keys
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...  # From live webhook endpoint
   ```

2. **Update Webhook Endpoint:**
   - Create a NEW webhook endpoint for production
   - Use same URL: `https://api.artwalls.space/api/stripe/webhook`
   - Select same events
   - Copy NEW signing secret for live mode

3. **Verify Live Products:**
   - Ensure price IDs in environment are from LIVE mode
   - Test with real card or Stripe test mode disabled

4. **Monitor First Transactions:**
   - Watch Stripe Dashboard → Payments
   - Check server logs for webhook processing
   - Verify user upgrades are working

---

## Support & Monitoring

### Key Metrics to Track

1. **Subscription Conversion Rate:**
   - Track clicks on "Select Plan" button
   - Monitor checkout completion rate
   - Analyze cancellations vs completions

2. **Webhook Health:**
   - Monitor 200 OK response rate
   - Set up alerts for 400/500 errors
   - Check processing latency

3. **User Tier Distribution:**
   ```sql
   SELECT 
     subscription_tier,
     COUNT(*) as count,
     ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
   FROM artists
   GROUP BY subscription_tier
   ORDER BY count DESC;
   ```

### Monitoring Commands

**Check webhook processing:**
```bash
# View recent webhook events in Stripe
# Go to: https://dashboard.stripe.com/webhooks → Your Endpoint → Logs

# Check server logs (if using Cloudflare Workers)
wrangler tail  # Real-time logs
```

**Verify user upgrade:**
```sql
-- Check user's current subscription
SELECT 
  id,
  name,
  email,
  subscription_tier,
  subscription_status,
  stripe_subscription_id
FROM artists 
WHERE email = 'user@example.com';
```

---

## Next Steps

1. **Test in development:**
   - Use test mode Stripe keys
   - Complete a test subscription purchase
   - Verify tier upgrade works

2. **Deploy to production:**
   - Switch to live keys
   - Update webhook endpoint
   - Monitor first real transaction

3. **Add features:**
   - Subscription management portal (cancel, upgrade)
   - Promo codes for discounts
   - Annual billing option

---

## Quick Reference

### Environment Variables
```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Subscription Price IDs
STRIPE_SUB_PRICE_STARTER=price_1SrsqDE1V7i70KPhBmE4lAaC
STRIPE_SUB_PRICE_GROWTH=price_1SrsrDE1V7i70KPhHjMGLwvu
STRIPE_SUB_PRICE_PRO=price_1SrsrdE1V7i70KPhorOqhCge

# Success/Cancel URLs
SUB_SUCCESS_URL=https://artwalls.space/#/artist-dashboard?sub=success
SUB_CANCEL_URL=https://artwalls.space/#/artist-dashboard?sub=cancel
```

### API Endpoints
```
POST /api/stripe/billing/create-subscription-session
  Body: { tier: 'starter' | 'growth' | 'pro', artistId: 'uuid' }
  Returns: { url: 'https://checkout.stripe.com/...' }

POST /api/stripe/webhook
  Stripe sends webhooks here (signature verified)
  
GET /api/me
  Returns: { profile: { subscription_tier, subscription_status } }
```

### Test Card Numbers
```
Success:     4242 4242 4242 4242
Decline:     4000 0000 0000 0002
3D Secure:   4000 0025 0000 3155
Insufficient: 4000 0000 0000 9995
```

---

## Summary

Your system is **already connected and ready to go**! Here's what happens:

1. ✅ User clicks upgrade button → Frontend calls your backend
2. ✅ Backend creates Stripe checkout → User redirected to Stripe
3. ✅ User pays → Stripe webhook fires
4. ✅ Webhook updates database → User tier upgraded
5. ✅ User refreshes page → Sees new tier and features

**You just need to:**
1. Configure the webhook endpoint in Stripe Dashboard
2. Verify the webhook secret matches
3. Test with a subscription purchase
4. Deploy to production!

---

**Need Help?**
- Stripe Docs: https://stripe.com/docs/billing/subscriptions/overview
- Webhook Testing: https://dashboard.stripe.com/test/webhooks
- Support: Check server logs or Stripe Dashboard for errors
