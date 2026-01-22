# Stripe Subscription Troubleshooting Guide 🔧

Quick reference for common issues and their solutions.

---

## 🚨 Issue: Webhook Signature Verification Failed

### Error Message
```
Webhook signature verification failed
Status: 400 Bad Request
```

### Causes
1. `STRIPE_WEBHOOK_SECRET` doesn't match Stripe Dashboard
2. Using test webhook secret with live keys (or vice versa)
3. Webhook secret not set in environment

### Solutions

**Check webhook secret:**
```bash
# In .dev.vars
STRIPE_WEBHOOK_SECRET=whsec_...

# Verify it matches Stripe Dashboard:
# Dashboard → Webhooks → Your endpoint → "Signing secret"
```

**Verify environment:**
```bash
# Check if secret is loaded
curl https://api.artwalls.space/api/debug/env

# Should show:
# "stripe": {
#   "secretKey": true,
#   "webhookSecret": true  ← Should be true
# }
```

**Re-create webhook:**
1. Delete old webhook in Stripe Dashboard
2. Create new webhook
3. Copy NEW signing secret
4. Update `STRIPE_WEBHOOK_SECRET`
5. Redeploy

---

## 🚨 Issue: Tier Not Updating After Payment

### Symptoms
- Payment succeeds in Stripe
- User redirected back to dashboard
- Tier still shows "Free"
- No error messages visible

### Check #1: Webhook Delivery
```
1. Go to: Stripe Dashboard → Webhooks → Your endpoint
2. Click "Logs" tab
3. Look for recent "checkout.session.completed" event
4. Check status:
   - ✅ 200 OK = Good
   - ❌ 400/500 = Problem
```

### Check #2: Database Update
```sql
-- Check if subscription_tier was updated
SELECT 
  email,
  subscription_tier,
  subscription_status,
  stripe_subscription_id,
  updated_at
FROM artists 
WHERE email = 'USER_EMAIL'
ORDER BY updated_at DESC
LIMIT 1;
```

### Check #3: Metadata
```
In Stripe Dashboard:
1. Go to: Subscriptions → Recent subscription
2. Check "Metadata" section
3. Should have:
   - artistId: uuid
   - tier: 'starter' (or 'growth', 'pro')
```

### Solutions

**If webhook shows 500 error:**
- Check server logs for database errors
- Verify Supabase connection: `curl https://api.artwalls.space/api/debug/supabase`
- Verify `artists` table has required columns

**If webhook not firing:**
- Verify webhook URL is correct: `https://api.artwalls.space/api/stripe/webhook`
- Check events are selected: `checkout.session.completed`
- Ensure endpoint is in correct mode (test/live)

**If metadata missing:**
- Check backend code sets metadata in `stripe.checkout.sessions.create()`
- Should include: `{ artistId, tier }` in `metadata` and `subscription_data.metadata`

---

## 🚨 Issue: "Invalid tier or missing subscription price ID"

### Error Message
```json
{
  "error": "Invalid tier or missing subscription price ID (env or settings)"
}
```

### Causes
1. Price IDs not set in environment variables
2. Wrong price ID format
3. Price ID from test mode but using live keys

### Solutions

**Verify price IDs:**
```bash
# Check .dev.vars has all 3 price IDs
STRIPE_SUB_PRICE_STARTER=price_1SrsqDE1V7i70KPhBmE4lAaC
STRIPE_SUB_PRICE_GROWTH=price_1SrsrDE1V7i70KPhHjMGLwvu
STRIPE_SUB_PRICE_PRO=price_1SrsrdE1V7i70KPhorOqhCge
```

**Verify price exists in Stripe:**
```bash
# Test with curl
curl https://api.stripe.com/v1/prices/price_1SrsqDE1V7i70KPhBmE4lAaC \
  -u "sk_live_...:"

# Should return:
# {
#   "id": "price_1SrsqDE1V7i70KPhBmE4lAaC",
#   "object": "price",
#   "active": true,
#   ...
# }
```

**Match test/live mode:**
- Test keys (`sk_test_...`) → Test price IDs
- Live keys (`sk_live_...`) → Live price IDs
- Don't mix test and live!

---

## 🚨 Issue: User Stuck on "Processing..."

### Symptoms
- User clicks "Select Plan"
- Sees "Processing..." spinner
- Never redirects to Stripe checkout
- Browser console shows error

### Check Browser Console
Press F12 and look for errors:

**Common errors:**

```javascript
// Error 1: CORS error
"Access to fetch at 'https://api.artwalls.space' 
has been blocked by CORS policy"

// Solution: Check CORS_ORIGIN in server environment
```

```javascript
// Error 2: Network error
"Failed to fetch"

// Solution: Backend server not running or wrong API_BASE_URL
```

```javascript
// Error 3: 401 Unauthorized
"Missing Authorization bearer token"

// Solution: User not logged in or session expired
```

### Solutions

**Check backend is running:**
```bash
curl https://api.artwalls.space/api/health

# Should return:
# {"ok":true}
```

**Check user is authenticated:**
```javascript
// In browser console
const session = await supabase.auth.getSession()
console.log(session)

// Should have: session.data.session.access_token
```

**Check API_BASE_URL:**
```javascript
// In src/lib/api.ts
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.artwalls.space';
console.log('API_BASE:', API_BASE);
```

---

## 🚨 Issue: Checkout Succeeds But No Redirect

### Symptoms
- Payment completes successfully
- User stays on Stripe checkout page
- No redirect back to your site

### Causes
1. `success_url` not set correctly
2. Redirect URL blocked by browser
3. Session ID mismatch

### Check Success URL
```javascript
// In server/index.js
const SUB_SUCCESS_URL = process.env.SUB_SUCCESS_URL || 
  `${APP_URL}/#/artist-dashboard?sub=success`;

console.log('SUB_SUCCESS_URL:', SUB_SUCCESS_URL);

// Should be: https://artwalls.space/#/artist-dashboard?sub=success
```

### Solutions

**Set explicit success URL:**
```bash
# In .dev.vars or Cloudflare Workers
SUB_SUCCESS_URL=https://artwalls.space/#/artist-dashboard?sub=success
SUB_CANCEL_URL=https://artwalls.space/#/artist-dashboard?sub=cancel
```

**Test redirect manually:**
```bash
# Copy the success_url from Stripe checkout session
# Paste into browser
# Should load your dashboard
```

---

## 🚨 Issue: Database Column Missing

### Error Message
```
Database error: column "subscription_tier" does not exist
```

### Solution
```sql
-- Add missing columns to artists table
ALTER TABLE public.artists 
ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_status text,
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- Verify columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'artists' 
AND column_name LIKE 'subscription%' OR column_name LIKE 'stripe%';
```

---

## 🚨 Issue: Test Card Declined

### Symptoms
- Using test card `4242 4242 4242 4242`
- Card gets declined
- Error: "Your card was declined"

### Causes
1. Using test card in live mode
2. Using live card in test mode
3. Stripe account restricted

### Solutions

**Verify mode:**
```bash
# Check if using test or live key
echo $STRIPE_SECRET_KEY

# Test mode:  sk_test_...
# Live mode:  sk_live_...
```

**Use correct cards:**
```
Test Mode Cards:
- Success:     4242 4242 4242 4242
- Decline:     4000 0000 0000 0002
- 3D Secure:   4000 0025 0000 3155

Live Mode:
- Use real credit card
- Or enable test mode in Stripe Dashboard
```

---

## 🚨 Issue: "Customer not found"

### Error Message
```
No such customer: 'cus_xxxxx'
```

### Causes
1. Customer ID from test mode but using live keys
2. Customer deleted from Stripe Dashboard
3. Wrong Stripe account

### Solutions

**Check customer ID:**
```sql
-- Get customer ID from database
SELECT stripe_customer_id 
FROM artists 
WHERE email = 'USER_EMAIL';
```

**Verify customer exists in Stripe:**
```bash
curl https://api.stripe.com/v1/customers/cus_xxxxx \
  -u "sk_live_...:"
```

**Re-create customer:**
```sql
-- Clear customer ID to force re-creation
UPDATE artists 
SET stripe_customer_id = NULL 
WHERE email = 'USER_EMAIL';
```

---

## 🚨 Issue: Webhook Endpoint Not Found (404)

### Error Message
```
404 Not Found
POST https://api.artwalls.space/api/stripe/webhook
```

### Causes
1. Backend server not deployed
2. Wrong endpoint URL
3. Route not registered

### Solutions

**Verify endpoint exists:**
```bash
curl -X POST https://api.artwalls.space/api/stripe/webhook \
  -H "Content-Type: application/json"

# Should return 400 (bad signature) NOT 404
```

**Check route registration:**
```javascript
// In server/index.js, verify this exists:
app.post('/api/stripe/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  // ... webhook handler
});
```

**Deploy backend:**
```bash
# Push to git
git push origin main

# Cloudflare Workers will auto-deploy
# Check deployment logs in Cloudflare Dashboard
```

---

## 🛠️ Debugging Tools

### Test Webhook Locally with Stripe CLI

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:4242/api/stripe/webhook

# Copy the webhook signing secret shown
# Add to .dev.vars: STRIPE_WEBHOOK_SECRET=whsec_...

# Test trigger
stripe trigger checkout.session.completed
```

### Check All Environment Variables

```bash
# Run test script
bash scripts/test-stripe-setup.sh

# Should show:
# ✅ Stripe Secret Key is set
# ✅ Webhook Secret is set
# ✅ All price IDs are set
# ✅ Stripe API connection successful
```

### Database Query Helpers

```sql
-- Find user by email
SELECT * FROM artists WHERE email = 'user@example.com';

-- Check recent subscriptions
SELECT 
  name, 
  email, 
  subscription_tier,
  subscription_status,
  stripe_subscription_id,
  created_at
FROM artists 
WHERE subscription_status = 'active'
ORDER BY created_at DESC 
LIMIT 10;

-- Find users with NULL tier (should be 'free')
SELECT id, email, subscription_tier 
FROM artists 
WHERE subscription_tier IS NULL;

-- Fix NULL tiers
UPDATE artists 
SET subscription_tier = 'free' 
WHERE subscription_tier IS NULL;
```

---

## 📞 Getting More Help

### Stripe Support
- Dashboard: https://dashboard.stripe.com
- Docs: https://stripe.com/docs/billing/subscriptions
- Support: https://support.stripe.com
- Status: https://status.stripe.com

### Check Webhook Logs
- Dashboard → Webhooks → Your endpoint → Logs
- Shows all webhook deliveries
- Click event to see full request/response

### Check Server Logs
```bash
# Cloudflare Workers
wrangler tail

# Or check Cloudflare Dashboard → Workers → your worker → Logs
```

### Test with Postman/Curl

**Create subscription session:**
```bash
curl -X POST https://api.artwalls.space/api/stripe/billing/create-subscription-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT" \
  -d '{"tier":"starter","artistId":"YOUR_UUID"}'

# Should return:
# {"url":"https://checkout.stripe.com/c/pay/..."}
```

**Check profile:**
```bash
curl https://api.artwalls.space/api/me \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT"

# Should include:
# {
#   "profile": {
#     "subscription_tier": "starter",
#     "subscription_status": "active"
#   }
# }
```

---

## ✅ Quick Checklist for Debugging

When something's not working:

- [ ] Backend server is running (`curl /api/health`)
- [ ] Stripe keys are set correctly (test vs live)
- [ ] Webhook secret matches Stripe Dashboard
- [ ] All price IDs are set in environment
- [ ] Webhook endpoint URL is correct
- [ ] Webhook events are selected (checkout.session.completed)
- [ ] Database has required columns
- [ ] User is authenticated (has valid JWT)
- [ ] Browser console shows no errors
- [ ] Stripe webhook logs show 200 OK

---

## 📚 Related Docs

- [STRIPE_QUICK_START.md](STRIPE_QUICK_START.md) - Quick setup guide
- [STRIPE_SUBSCRIPTION_COMPLETE_GUIDE.md](STRIPE_SUBSCRIPTION_COMPLETE_GUIDE.md) - Full documentation
- [STRIPE_VISUAL_FLOW.md](STRIPE_VISUAL_FLOW.md) - Visual diagrams

---

**Still stuck? Check the full guide or Stripe documentation!**
