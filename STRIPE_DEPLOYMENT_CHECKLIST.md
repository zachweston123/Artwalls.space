# Stripe Subscription - Deployment Checklist

Use this checklist to deploy Stripe subscriptions to production.

## Pre-Deployment (Development)

### 1. Environment Setup
- [ ] `.dev.vars` file exists with all required variables
- [ ] `STRIPE_SECRET_KEY` is set (test mode: `sk_test_...`)
- [ ] `STRIPE_WEBHOOK_SECRET` is set (from test webhook)
- [ ] All 3 price IDs are set:
  - [ ] `STRIPE_SUB_PRICE_STARTER`
  - [ ] `STRIPE_SUB_PRICE_GROWTH`
  - [ ] `STRIPE_SUB_PRICE_PRO`
- [ ] `SUPABASE_URL` is set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set

### 2. Database Schema
- [ ] `artists` table has column `subscription_tier` (text, default 'free')
- [ ] `artists` table has column `subscription_status` (text)
- [ ] `artists` table has column `stripe_customer_id` (text)
- [ ] `artists` table has column `stripe_subscription_id` (text)

### 3. Stripe Dashboard (Test Mode)
- [ ] 3 products created (Starter, Growth, Pro)
- [ ] Each product has a price configured
- [ ] Price IDs match environment variables
- [ ] Product metadata includes `tier` key:
  - [ ] Starter: `tier = "starter"`
  - [ ] Growth: `tier = "growth"`
  - [ ] Pro: `tier = "pro"`

### 4. Webhook Configuration (Test Mode)
- [ ] Test webhook endpoint created in Stripe Dashboard
- [ ] URL: `http://localhost:4242/api/stripe/webhook` (or ngrok URL)
- [ ] Events selected:
  - [ ] `checkout.session.completed`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
- [ ] Signing secret copied to `STRIPE_WEBHOOK_SECRET`

### 5. Local Testing
- [ ] Run test script: `bash scripts/test-stripe-setup.sh`
- [ ] All checks pass ✅
- [ ] Backend server starts without errors
- [ ] Can access `/api/health` endpoint
- [ ] Can access `/api/debug/env` endpoint

### 6. End-to-End Test (Development)
- [ ] Create test user account
- [ ] Navigate to pricing page
- [ ] Click "Select Plan" on Starter tier
- [ ] Redirected to Stripe checkout
- [ ] Enter test card: `4242 4242 4242 4242`
- [ ] Complete payment successfully
- [ ] Redirected back to dashboard with `?sub=success`
- [ ] Check Stripe Dashboard → Webhooks → Logs
  - [ ] `checkout.session.completed` shows 200 OK
- [ ] Query database:
  ```sql
  SELECT subscription_tier, subscription_status, stripe_subscription_id
  FROM artists WHERE email = 'test@example.com';
  ```
  - [ ] `subscription_tier` = 'starter'
  - [ ] `subscription_status` = 'active'
  - [ ] `stripe_subscription_id` is populated
- [ ] Dashboard shows "Starter" badge
- [ ] User can create 10 artworks (was limited to 1)
- [ ] User can use 4 active displays (was limited to 1)

---

## Production Deployment

### 1. Stripe Live Mode Setup

#### Switch to Live Keys
- [ ] Go to Stripe Dashboard → Switch to "Live mode" (toggle in top right)
- [ ] Get live API keys: Dashboard → Developers → API Keys
- [ ] Copy **Secret key** (starts with `sk_live_...`)
- [ ] Save for deployment

#### Verify Live Products
- [ ] Verify products exist in Live mode (not just Test mode)
- [ ] Get live price IDs from Dashboard → Products
- [ ] Copy price IDs for Starter, Growth, and Pro
- [ ] Save for deployment

#### Create Live Webhook
- [ ] Go to Dashboard → Developers → Webhooks (in Live mode)
- [ ] Click "Add endpoint"
- [ ] URL: `https://api.artwalls.space/api/stripe/webhook`
- [ ] Select events:
  - [ ] `checkout.session.completed`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
- [ ] Click "Add endpoint"
- [ ] Copy **Signing secret** (starts with `whsec_...`)
- [ ] Save for deployment

### 2. Cloudflare Workers Deployment

#### Set Environment Variables
- [ ] Go to Cloudflare Dashboard
- [ ] Navigate to: Workers & Pages → your worker (e.g., `api`)
- [ ] Click Settings → Variables
- [ ] Add/Update these variables:
  - [ ] `STRIPE_SECRET_KEY` = `sk_live_...` (LIVE key)
  - [ ] `STRIPE_WEBHOOK_SECRET` = `whsec_...` (LIVE webhook secret)
  - [ ] `STRIPE_SUB_PRICE_STARTER` = `price_...` (LIVE price ID)
  - [ ] `STRIPE_SUB_PRICE_GROWTH` = `price_...` (LIVE price ID)
  - [ ] `STRIPE_SUB_PRICE_PRO` = `price_...` (LIVE price ID)
  - [ ] `SUPABASE_URL` = your Supabase project URL
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` = your service role key
- [ ] Click "Deploy" or "Save and Deploy"

#### Deploy Code
- [ ] Commit all changes to git
- [ ] Push to main branch
- [ ] Verify Cloudflare Pages automatically deploys
- [ ] Check deployment logs for errors
- [ ] Wait for deployment to complete (usually 1-2 minutes)

### 3. Post-Deployment Verification

#### Check Webhook Endpoint
- [ ] Test webhook endpoint is accessible:
  ```bash
  curl -X POST https://api.artwalls.space/api/stripe/webhook \
    -H "Content-Type: application/json" \
    -d '{"test": true}'
  ```
  - [ ] Should return 400 (signature verification failed) - this is GOOD
  - [ ] Should NOT return 500 or 404

#### Check Environment Variables
- [ ] Visit: `https://api.artwalls.space/api/debug/env`
- [ ] Verify output shows:
  - [ ] `stripe.secretKey: true`
  - [ ] `stripe.webhookSecret: true`

#### Test Subscription Purchase (LIVE!)
- [ ] Create real user account (or use existing)
- [ ] Navigate to: `https://artwalls.space/#/plans-pricing`
- [ ] Click "Select Plan" on Starter tier ($9/month)
- [ ] **USE REAL CARD** or Stripe test card if in test mode
- [ ] Complete checkout
- [ ] Verify:
  - [ ] Redirected to dashboard with `?sub=success`
  - [ ] Stripe Dashboard shows new subscription
  - [ ] Webhook log shows 200 OK for `checkout.session.completed`
  - [ ] Database updated correctly:
    ```sql
    SELECT * FROM artists WHERE email = 'YOUR_EMAIL';
    ```
  - [ ] Dashboard shows correct tier badge
  - [ ] User has upgraded limits

### 4. Monitoring Setup

#### Stripe Dashboard Alerts
- [ ] Go to Stripe Dashboard → Settings → Notifications
- [ ] Enable email alerts for:
  - [ ] Failed payments
  - [ ] Webhook errors
  - [ ] Subscription cancellations

#### Application Monitoring
- [ ] Set up error tracking (e.g., Sentry)
- [ ] Monitor webhook processing errors
- [ ] Track subscription conversion rate
- [ ] Monitor failed payment attempts

#### Database Monitoring
- [ ] Create query to track tier distribution:
  ```sql
  SELECT subscription_tier, COUNT(*) 
  FROM artists 
  GROUP BY subscription_tier;
  ```
- [ ] Set up alerts for NULL subscription_tier
- [ ] Monitor subscription_status != 'active'

### 5. Communication

#### Update Documentation
- [ ] Add subscription pricing to FAQ
- [ ] Update Terms of Service
- [ ] Add cancellation policy
- [ ] Document refund policy

#### Notify Users (if launching subscriptions for existing platform)
- [ ] Email existing users about new pricing
- [ ] Offer grandfathering or promotional discount
- [ ] Set grace period for migration
- [ ] Provide support contact for questions

---

## Rollback Plan

If something goes wrong:

### Emergency Rollback
1. [ ] Switch back to test mode keys in Cloudflare Workers
2. [ ] Or: Remove Stripe price IDs to disable subscription checkout
3. [ ] Set all users to `subscription_tier = 'free'` temporarily
4. [ ] Investigate issues in Stripe Dashboard → Webhooks → Logs
5. [ ] Check server logs for errors
6. [ ] Fix issues and redeploy

### Common Issues & Fixes

#### Issue: Webhook returns 400 "Signature verification failed"
- **Fix:** Verify `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard (Live mode)
- **Check:** Are you using test webhook secret with live keys?

#### Issue: Webhook returns 500 "Database error"
- **Fix:** Check Supabase connection
- **Test:** `curl https://api.artwalls.space/api/debug/supabase`
- **Verify:** Service role key has correct permissions

#### Issue: User tier not updating after payment
- **Check:** Stripe Dashboard → Webhooks → Logs for errors
- **Verify:** Webhook received `checkout.session.completed` event
- **Debug:** Check `session.metadata.artistId` is set correctly

#### Issue: "Invalid tier or missing subscription price ID"
- **Fix:** Verify price IDs in Cloudflare Workers variables
- **Check:** Are you using test price IDs with live keys?

---

## Post-Launch Monitoring (First Week)

### Daily Checks
- [ ] Check Stripe Dashboard for new subscriptions
- [ ] Review webhook delivery success rate
- [ ] Monitor subscription cancellations
- [ ] Check support tickets for payment issues

### Weekly Analysis
- [ ] Calculate conversion rate (clicks → purchases)
- [ ] Analyze tier distribution
- [ ] Review churn rate
- [ ] Gather user feedback

### Optimization Opportunities
- [ ] A/B test pricing page copy
- [ ] Test different price points
- [ ] Add annual billing option
- [ ] Create promotional offers

---

## Checklist Summary

**Development:**
- ✅ Environment variables configured
- ✅ Database schema ready
- ✅ Test webhook configured
- ✅ End-to-end test passed

**Production:**
- ✅ Live Stripe keys obtained
- ✅ Live webhook configured
- ✅ Cloudflare Workers deployed
- ✅ Post-deployment verification complete

**Monitoring:**
- ✅ Alerts configured
- ✅ Dashboard created
- ✅ Documentation updated

**You're ready to go! 🚀**

---

## Quick Reference

### Test Card Numbers
```
Success:     4242 4242 4242 4242
Decline:     4000 0000 0000 0002
3D Secure:   4000 0025 0000 3155
```

### API Endpoints
```
POST /api/stripe/billing/create-subscription-session
POST /api/stripe/webhook
GET  /api/me
GET  /api/health
GET  /api/debug/env
```

### Stripe Dashboard Links
```
Products:    https://dashboard.stripe.com/products
Webhooks:    https://dashboard.stripe.com/webhooks
API Keys:    https://dashboard.stripe.com/apikeys
Customers:   https://dashboard.stripe.com/customers
```

### Support
- Stripe Docs: https://stripe.com/docs
- Stripe Support: https://support.stripe.com
- Cloudflare Docs: https://developers.cloudflare.com/workers
