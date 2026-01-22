# Stripe Subscription Quick Start ⚡

**TL;DR:** Your subscription system is already built! Just configure the webhook and test it.

---

## 🎯 What You Have

✅ **Backend endpoint** that creates Stripe checkout sessions  
✅ **Webhook handler** that upgrades user tiers when they pay  
✅ **Frontend** that sends users to checkout  
✅ **Database columns** to store subscription info  
✅ **Stripe products** created with price IDs  

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Configure Webhook in Stripe

1. Go to: https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. Enter: `https://api.artwalls.space/api/stripe/webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click **"Add endpoint"**
6. Copy the **Signing secret** (starts with `whsec_...`)

### Step 2: Add Webhook Secret

**For Cloudflare Workers:**
1. Go to Cloudflare Dashboard → Workers → your api worker
2. Settings → Variables
3. Add: `STRIPE_WEBHOOK_SECRET = whsec_...`

**For Local Development:**
Add to `.dev.vars`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Step 3: Test It!

1. Go to: `https://artwalls.space/#/plans-pricing`
2. Click **"Select Plan"** on any tier
3. Use test card: `4242 4242 4242 4242`
4. Complete checkout
5. Check if your tier upgraded! ✅

---

## 🔍 Verify It's Working

### Check 1: Webhook Received
- Stripe Dashboard → Webhooks → Your endpoint → Logs
- Should see `checkout.session.completed` with **200 OK**

### Check 2: Database Updated
```sql
SELECT subscription_tier, subscription_status 
FROM artists 
WHERE email = 'YOUR_EMAIL';
```
- `subscription_tier` should be 'starter', 'growth', or 'pro'
- `subscription_status` should be 'active'

### Check 3: Dashboard Shows New Tier
- Refresh your dashboard
- Should see tier badge (e.g., "Starter")
- Limits should be upgraded

---

## 🎨 How It Works

```
User clicks "Select Plan"
    ↓
Backend creates Stripe checkout session
    ↓
User redirected to Stripe payment page
    ↓
User enters card details and pays
    ↓
Stripe sends webhook to your server
    ↓
Webhook updates database:
  - subscription_tier = 'starter'
  - subscription_status = 'active'
    ↓
User returns to dashboard
    ↓
Dashboard fetches profile → shows new tier
```

---

## 🐛 Troubleshooting

### Problem: Webhook returns 400 "Signature verification failed"
**Fix:** Check that `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard

### Problem: Tier not updating after payment
**Fix:** Check Stripe Dashboard → Webhooks → Logs for errors

### Problem: "Invalid tier or missing subscription price ID"
**Fix:** Verify price IDs in environment variables match Stripe Dashboard

### Problem: Getting charged but tier not updating
**Fix:** Check that product metadata includes `tier` key in Stripe Dashboard

---

## 📚 Full Documentation

- **Complete Guide:** [STRIPE_SUBSCRIPTION_COMPLETE_GUIDE.md](STRIPE_SUBSCRIPTION_COMPLETE_GUIDE.md)
- **Deployment Checklist:** [STRIPE_DEPLOYMENT_CHECKLIST.md](STRIPE_DEPLOYMENT_CHECKLIST.md)
- **Test Script:** Run `bash scripts/test-stripe-setup.sh`
- **Webhook Helper:** Run `bash scripts/setup-webhook.sh`

---

## 💡 Key Files

| File | What It Does |
|------|--------------|
| `server/index.js:2073` | Creates Stripe checkout session |
| `server/index.js:1116` | Handles webhook and upgrades tier |
| `src/components/pricing/PricingPage.tsx:225` | Frontend subscription button |
| `.dev.vars` | Environment variables (price IDs, keys) |

---

## 🎉 You're Done!

Your subscription system is ready. Just:
1. ✅ Configure webhook (5 min)
2. ✅ Test with test card (2 min)
3. ✅ Deploy to production

**Need help?** Check the full guide or Stripe documentation.

---

## 📞 Support

- **Stripe Docs:** https://stripe.com/docs/billing/subscriptions
- **Webhook Testing:** https://dashboard.stripe.com/test/webhooks
- **Test Cards:** https://stripe.com/docs/testing

---

**Last Updated:** January 2026
