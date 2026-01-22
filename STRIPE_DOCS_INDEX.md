# 📚 Stripe Subscription Documentation Index

Complete guide to setting up and troubleshooting Stripe subscriptions on Artwalls.

---

## 🚀 Start Here

### [STRIPE_SETUP_SUMMARY.md](STRIPE_SETUP_SUMMARY.md) ⭐
**READ THIS FIRST!** Overview of what you have and what you need to do.
- ✅ What's already built
- 🚀 What you need to do (5 minutes)
- 📖 Links to all other docs

---

## 📖 Setup Guides

### 1. [STRIPE_QUICK_START.md](STRIPE_QUICK_START.md) ⚡
**5-minute setup guide**
- Configure webhook
- Test subscription
- Verify it works

**Use this when:** You want to get up and running fast

### 2. [STRIPE_SUBSCRIPTION_COMPLETE_GUIDE.md](STRIPE_SUBSCRIPTION_COMPLETE_GUIDE.md) 📚
**Complete reference guide**
- How everything works (step-by-step)
- Environment variable setup
- Webhook configuration
- Testing procedures
- Common issues & solutions
- Production deployment

**Use this when:** You want to understand the full system

### 3. [STRIPE_VISUAL_FLOW.md](STRIPE_VISUAL_FLOW.md) 🎨
**Visual diagrams and flow charts**
- Complete flow diagram
- Component breakdown
- Data flow
- Tier upgrade impact
- Subscription lifecycle

**Use this when:** You learn better with visuals

---

## ✅ Deployment Checklist

### [STRIPE_DEPLOYMENT_CHECKLIST.md](STRIPE_DEPLOYMENT_CHECKLIST.md)
**Step-by-step deployment checklist**
- Pre-deployment (development)
- Production deployment
- Post-deployment verification
- Monitoring setup
- Rollback plan

**Use this when:** You're ready to deploy to production

---

## 🔧 Troubleshooting

### [STRIPE_TROUBLESHOOTING.md](STRIPE_TROUBLESHOOTING.md)
**Common issues and solutions**
- Webhook signature verification failed
- Tier not updating after payment
- "Invalid tier or missing price ID"
- User stuck on "Processing..."
- Checkout succeeds but no redirect
- Database column missing
- Test card declined
- And more...

**Use this when:** Something's not working

---

## 🛠️ Helper Scripts

### 1. Test Script
**File:** `scripts/test-stripe-setup.sh`

Tests your Stripe configuration:
- Checks environment variables
- Verifies Stripe API connectivity
- Tests price IDs
- Checks backend server
- Provides summary report

**Run it:**
```bash
bash scripts/test-stripe-setup.sh
```

### 2. Webhook Setup Helper
**File:** `scripts/setup-webhook.sh`

Interactive guide for webhook setup:
- Shows webhook URL
- Lists required events
- Step-by-step Stripe Dashboard instructions
- Testing procedures

**Run it:**
```bash
bash scripts/setup-webhook.sh
```

---

## 📂 File Reference

### Backend Files

| File | Line | Description |
|------|------|-------------|
| `server/index.js` | 2073 | Subscription checkout endpoint |
| `server/index.js` | 1116 | Webhook handler (upgrades tier) |
| `server/index.js` | 1006 | Sync subscription from Stripe |
| `server/index.js` | 45-70 | Environment variables setup |

### Frontend Files

| File | Line | Description |
|------|------|-------------|
| `src/components/pricing/PricingPage.tsx` | 225 | Subscription purchase function |
| `src/components/pricing/PricingPage.tsx` | 265-360 | Plan cards UI |
| `src/components/pricing/UpgradePromptCard.tsx` | - | Upgrade CTA component |
| `src/components/artist/ArtistDashboard.tsx` | 182-220 | Subscription status display |

### Configuration Files

| File | Description |
|------|-------------|
| `.dev.vars` | Environment variables (local) |
| `.dev.vars.example` | Example environment file |
| `wrangler.toml` | Cloudflare Workers config |

---

## 🔑 Key Concepts

### Environment Variables
```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_live_...          # Backend authentication
STRIPE_WEBHOOK_SECRET=whsec_...        # Webhook signature verification

# Subscription Price IDs
STRIPE_SUB_PRICE_STARTER=price_...     # $9/month tier
STRIPE_SUB_PRICE_GROWTH=price_...      # $19/month tier
STRIPE_SUB_PRICE_PRO=price_...         # $39/month tier

# Success/Cancel URLs
SUB_SUCCESS_URL=https://...            # Where to redirect after success
SUB_CANCEL_URL=https://...             # Where to redirect after cancel
```

### Database Schema
```sql
-- Artists table columns
subscription_tier        text     default 'free'
subscription_status      text     
stripe_customer_id       text     
stripe_subscription_id   text
```

### API Endpoints
```
POST /api/stripe/billing/create-subscription-session
  → Creates Stripe checkout session
  → Returns checkout URL

POST /api/stripe/webhook
  → Receives Stripe webhook events
  → Updates user subscription tier

GET /api/me
  → Returns user profile
  → Includes subscription_tier and subscription_status
```

### Webhook Events
```
checkout.session.completed
  → Fired when payment succeeds
  → Updates user to paid tier

customer.subscription.updated
  → Fired when subscription changes
  → Updates subscription status

customer.subscription.deleted
  → Fired when subscription cancelled
  → Downgrades user to free tier
```

---

## 🎯 Common Tasks

### Task: Configure Webhook
1. Read: [STRIPE_QUICK_START.md](STRIPE_QUICK_START.md#step-1-configure-webhook)
2. Run: `bash scripts/setup-webhook.sh`
3. Verify: Check Stripe Dashboard → Webhooks

### Task: Test Subscription
1. Read: [STRIPE_QUICK_START.md](STRIPE_QUICK_START.md#step-3-test-it)
2. Use test card: `4242 4242 4242 4242`
3. Verify: Check database for updated tier

### Task: Deploy to Production
1. Read: [STRIPE_DEPLOYMENT_CHECKLIST.md](STRIPE_DEPLOYMENT_CHECKLIST.md#production-deployment)
2. Switch to live keys
3. Create live webhook
4. Update Cloudflare Workers variables

### Task: Debug Issue
1. Check: [STRIPE_TROUBLESHOOTING.md](STRIPE_TROUBLESHOOTING.md)
2. Run: `bash scripts/test-stripe-setup.sh`
3. Review: Stripe Dashboard → Webhooks → Logs

---

## 📞 External Resources

### Stripe Documentation
- **Billing Overview:** https://stripe.com/docs/billing
- **Subscriptions:** https://stripe.com/docs/billing/subscriptions/overview
- **Webhooks:** https://stripe.com/docs/webhooks
- **Testing:** https://stripe.com/docs/testing
- **API Reference:** https://stripe.com/docs/api

### Stripe Dashboard Links
- **Products:** https://dashboard.stripe.com/products
- **Webhooks:** https://dashboard.stripe.com/webhooks
- **API Keys:** https://dashboard.stripe.com/apikeys
- **Customers:** https://dashboard.stripe.com/customers
- **Subscriptions:** https://dashboard.stripe.com/subscriptions

### Other Tools
- **Stripe CLI:** https://stripe.com/docs/stripe-cli
- **Webhook Tester:** https://webhook.site
- **Cloudflare Docs:** https://developers.cloudflare.com/workers

---

## 🎓 Learning Path

### For Complete Beginners
1. Start: [STRIPE_SETUP_SUMMARY.md](STRIPE_SETUP_SUMMARY.md)
2. Read: [STRIPE_VISUAL_FLOW.md](STRIPE_VISUAL_FLOW.md)
3. Follow: [STRIPE_QUICK_START.md](STRIPE_QUICK_START.md)
4. Test: `bash scripts/test-stripe-setup.sh`

### For Quick Setup
1. Read: [STRIPE_QUICK_START.md](STRIPE_QUICK_START.md)
2. Configure webhook (5 min)
3. Test subscription (5 min)
4. Done!

### For Production Deployment
1. Review: [STRIPE_DEPLOYMENT_CHECKLIST.md](STRIPE_DEPLOYMENT_CHECKLIST.md)
2. Complete pre-deployment checklist
3. Deploy with live keys
4. Monitor webhook logs

### For Troubleshooting
1. Check: [STRIPE_TROUBLESHOOTING.md](STRIPE_TROUBLESHOOTING.md)
2. Find your error message
3. Follow solution steps
4. Test again

---

## 📊 Document Status

| Document | Status | Last Updated |
|----------|--------|--------------|
| STRIPE_SETUP_SUMMARY.md | ✅ Complete | Jan 2026 |
| STRIPE_QUICK_START.md | ✅ Complete | Jan 2026 |
| STRIPE_SUBSCRIPTION_COMPLETE_GUIDE.md | ✅ Complete | Jan 2026 |
| STRIPE_VISUAL_FLOW.md | ✅ Complete | Jan 2026 |
| STRIPE_DEPLOYMENT_CHECKLIST.md | ✅ Complete | Jan 2026 |
| STRIPE_TROUBLESHOOTING.md | ✅ Complete | Jan 2026 |
| test-stripe-setup.sh | ✅ Complete | Jan 2026 |
| setup-webhook.sh | ✅ Complete | Jan 2026 |

---

## 🎉 Quick Reference Card

```
┌─────────────────────────────────────────────────┐
│         STRIPE SUBSCRIPTION QUICK REF           │
├─────────────────────────────────────────────────┤
│  Webhook URL:                                   │
│  https://api.artwalls.space/api/stripe/webhook │
│                                                 │
│  Test Card: 4242 4242 4242 4242                 │
│  Exp: 12/34  CVC: 123                          │
│                                                 │
│  Test Script:                                   │
│  bash scripts/test-stripe-setup.sh             │
│                                                 │
│  Webhook Events:                                │
│  - checkout.session.completed                   │
│  - customer.subscription.updated                │
│  - customer.subscription.deleted                │
│                                                 │
│  Price IDs (from .dev.vars):                    │
│  - STRIPE_SUB_PRICE_STARTER=price_1Srsq...     │
│  - STRIPE_SUB_PRICE_GROWTH=price_1Srsr...      │
│  - STRIPE_SUB_PRICE_PRO=price_1Srsrd...        │
└─────────────────────────────────────────────────┘
```

---

## 🤝 Contributing

Found an issue or have a suggestion?
1. Check [STRIPE_TROUBLESHOOTING.md](STRIPE_TROUBLESHOOTING.md) first
2. Review [STRIPE_SUBSCRIPTION_COMPLETE_GUIDE.md](STRIPE_SUBSCRIPTION_COMPLETE_GUIDE.md)
3. Check Stripe Documentation
4. Contact support if needed

---

**Ready to get started? → [STRIPE_SETUP_SUMMARY.md](STRIPE_SETUP_SUMMARY.md)**
