# Stripe Subscription Flow - Visual Guide

## 🎨 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SUBSCRIPTION PURCHASE FLOW                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────┐                    ┌─────────┐                    ┌─────────┐
│         │                    │         │                    │         │
│  USER   │                    │ BACKEND │                    │ STRIPE  │
│         │                    │         │                    │         │
└────┬────┘                    └────┬────┘                    └────┬────┘
     │                              │                              │
     │  1. Clicks "Select Plan"     │                              │
     ├─────────────────────────────>│                              │
     │                              │                              │
     │                              │  2. Create checkout session  │
     │                              ├─────────────────────────────>│
     │                              │     with price_xxxxx         │
     │                              │                              │
     │                              │  3. Return checkout URL      │
     │                              │<─────────────────────────────┤
     │                              │                              │
     │  4. Checkout URL             │                              │
     │<─────────────────────────────┤                              │
     │                              │                              │
     │  5. Redirect to Stripe       │                              │
     ├──────────────────────────────┼─────────────────────────────>│
     │                              │                              │
     │  6. Enter card details       │                              │
     ├─────────────────────────────────────────────────────────────>│
     │      4242 4242 4242 4242     │                              │
     │                              │                              │
     │                              │  7. Webhook: checkout.session│
     │                              │<─────────────────────────────┤
     │                              │     .completed               │
     │                              │                              │
     │                              │  8. Update database:         │
     │                              │     subscription_tier='starter'│
     │                              │     subscription_status='active'│
     │                              │                              │
     │                              │  9. Return 200 OK            │
     │                              ├─────────────────────────────>│
     │                              │                              │
     │  10. Redirect back           │                              │
     │<─────────────────────────────┼──────────────────────────────┤
     │    /dashboard?sub=success    │                              │
     │                              │                              │
     │  11. GET /api/me             │                              │
     ├─────────────────────────────>│                              │
     │                              │                              │
     │  12. Return profile          │                              │
     │<─────────────────────────────┤                              │
     │     tier: 'starter'          │                              │
     │                              │                              │
     │  13. Show "Starter" badge    │                              │
     │      + upgraded limits       │                              │
     │                              │                              │
```

---

## 🔑 Key Components

### 1. Frontend (React)
**File:** `src/components/pricing/PricingPage.tsx`

```tsx
// When user clicks "Select Plan"
async function startSubscription(tier: PlanId) {
  // Call backend to create checkout
  const { url } = await apiPost(
    '/api/stripe/billing/create-subscription-session',
    { tier: 'starter', artistId }
  );
  
  // Redirect to Stripe
  window.location.href = url;
}
```

### 2. Backend Endpoint
**File:** `server/index.js` (line 2073)

```javascript
app.post('/api/stripe/billing/create-subscription-session', async (req, res) => {
  const artist = await requireArtist(req, res);
  const tier = req.body.tier; // 'starter', 'growth', or 'pro'
  
  // Get price ID from environment
  const priceId = process.env.STRIPE_SUB_PRICE_STARTER;
  
  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    success_url: 'https://artwalls.space/#/artist-dashboard?sub=success',
    cancel_url: 'https://artwalls.space/#/artist-dashboard?sub=cancel',
    customer: artist.stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { artistId: artist.id, tier: tier }
  });
  
  return res.json({ url: session.url });
});
```

### 3. Webhook Handler
**File:** `server/index.js` (line 1116)

```javascript
async function handleStripeWebhookEvent(event) {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    if (session.mode === 'subscription') {
      const artistId = session.metadata.artistId;
      const tier = session.metadata.tier;
      const subscriptionId = session.subscription;
      
      // Update database
      await upsertArtist({
        id: artistId,
        stripeSubscriptionId: subscriptionId,
        subscriptionTier: tier,  // ← USER UPGRADED HERE!
        subscriptionStatus: 'active'
      });
    }
  }
}
```

---

## 📊 Data Flow

### Environment Variables (.dev.vars)
```
STRIPE_SECRET_KEY=sk_live_51SiQpRE1V7i70KPh...
STRIPE_WEBHOOK_SECRET=whsec_n55NX5gpF2r0c3wO55A992ujs6rRpgs9

STRIPE_SUB_PRICE_STARTER=price_1SrsqDE1V7i70KPhBmE4lAaC
STRIPE_SUB_PRICE_GROWTH=price_1SrsrDE1V7i70KPhHjMGLwvu
STRIPE_SUB_PRICE_PRO=price_1SrsrdE1V7i70KPhorOqhCge
```

### Database Updates
```sql
-- Before subscription
artists {
  id: 'uuid',
  subscription_tier: 'free',
  subscription_status: null,
  stripe_subscription_id: null
}

-- After webhook
artists {
  id: 'uuid',
  subscription_tier: 'starter',      ← Updated!
  subscription_status: 'active',     ← Updated!
  stripe_subscription_id: 'sub_xxx' ← Updated!
}
```

### Stripe Objects Created
```javascript
// Customer (if not exists)
{
  id: 'cus_xxxxx',
  email: 'user@example.com',
  metadata: { artistId: 'uuid' }
}

// Subscription
{
  id: 'sub_xxxxx',
  customer: 'cus_xxxxx',
  status: 'active',
  items: [{
    price: 'price_1SrsqDE1V7i70KPhBmE4lAaC',
    quantity: 1
  }],
  metadata: {
    artistId: 'uuid',
    tier: 'starter'
  }
}

// Checkout Session
{
  id: 'cs_xxxxx',
  mode: 'subscription',
  customer: 'cus_xxxxx',
  subscription: 'sub_xxxxx',
  metadata: {
    artistId: 'uuid',
    tier: 'starter'
  }
}
```

---

## 🎯 Tier Upgrade Impact

### Before (Free Tier)
```
User Limits:
- Artworks: 1
- Active Displays: 1
- Venue Applications: 1/month
- Platform Fee: 20%
- Artist Take-Home: 65%
```

### After (Starter Tier - $9/month)
```
User Limits:
- Artworks: 10          ← Upgraded!
- Active Displays: 4     ← Upgraded!
- Venue Applications: 3/month  ← Upgraded!
- Platform Fee: 5%      ← Reduced!
- Artist Take-Home: 80% ← Increased!
```

---

## 🔄 Subscription Lifecycle

```
┌──────────────────────────────────────────────────────┐
│              SUBSCRIPTION LIFECYCLE                   │
└──────────────────────────────────────────────────────┘

   INACTIVE          ACTIVE           PAST_DUE         CANCELED
      │                │                  │                │
      │  Purchase      │  Payment Failed  │  Retry Failed │
      ├──────────────> │ ──────────────> │ ──────────────>│
      │                │                  │                │
      │                │  Payment Success │                │
      │                │ <────────────────┤                │
      │                │                  │                │
      │                │  User Cancels    │                │
      │                │ ──────────────────────────────────>│
      │                │                  │                │

Webhook Events:
- checkout.session.completed  → ACTIVE
- customer.subscription.updated → Status change
- customer.subscription.deleted → CANCELED
```

---

## 🛠️ Webhook Configuration

### Stripe Dashboard Setup
```
┌─────────────────────────────────────────────┐
│  Stripe Dashboard → Developers → Webhooks  │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  Endpoint URL:                              │
│  https://api.artwalls.space/api/stripe/webhook │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  Events to send:                            │
│  ☑ checkout.session.completed               │
│  ☑ customer.subscription.updated            │
│  ☑ customer.subscription.deleted            │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  Signing secret:                            │
│  whsec_n55NX5gpF2r0c3wO55A992ujs6rRpgs9   │
│                                             │
│  → Add to STRIPE_WEBHOOK_SECRET             │
└─────────────────────────────────────────────┘
```

---

## 🧪 Testing Flow

### Test Scenario 1: Successful Subscription
```
1. User visits: /plans-pricing
2. Clicks: "Select Plan" on Starter
3. Redirected to: Stripe checkout
4. Enters card: 4242 4242 4242 4242
5. Completes payment
6. Redirected to: /dashboard?sub=success
7. Webhook fired: checkout.session.completed
8. Database updated: tier = 'starter'
9. Dashboard shows: "Starter" badge
10. Limits updated: 10 artworks, 4 displays
```

### Test Scenario 2: Failed Payment
```
1. User visits: /plans-pricing
2. Clicks: "Select Plan" on Starter
3. Redirected to: Stripe checkout
4. Enters card: 4000 0000 0000 0002 (decline)
5. Payment fails
6. Stays on: Stripe checkout with error
7. User can retry with different card
```

### Test Scenario 3: Cancel Checkout
```
1. User visits: /plans-pricing
2. Clicks: "Select Plan" on Starter
3. Redirected to: Stripe checkout
4. Clicks: ← Back button
5. Redirected to: /dashboard?sub=cancel
6. No charge made
7. Tier remains: 'free'
```

---

## 📈 Monitoring Dashboard

### Webhook Delivery Status
```
┌──────────────────────────────────────────┐
│  Stripe Dashboard → Webhooks → Logs     │
├──────────────────────────────────────────┤
│  Recent Events:                          │
│                                          │
│  ✅ checkout.session.completed           │
│     Status: 200 OK                       │
│     Time: 0.234s                         │
│                                          │
│  ✅ customer.subscription.updated        │
│     Status: 200 OK                       │
│     Time: 0.189s                         │
│                                          │
│  ❌ customer.subscription.deleted        │
│     Status: 500 Internal Server Error    │
│     Time: 0.456s                         │
│     → Check server logs                  │
└──────────────────────────────────────────┘
```

### Subscription Analytics
```sql
-- Daily subscription summary
SELECT 
  DATE(created_at) as date,
  subscription_tier,
  COUNT(*) as new_subs,
  SUM(CASE WHEN subscription_status = 'active' THEN 1 ELSE 0 END) as active
FROM artists
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), subscription_tier
ORDER BY date DESC;
```

---

## 🚨 Error Handling

### Common Errors & Solutions

```
┌─────────────────────────────────────────────────────┐
│  Error: "Webhook signature verification failed"     │
├─────────────────────────────────────────────────────┤
│  Cause: STRIPE_WEBHOOK_SECRET doesn't match        │
│  Fix:   Copy correct secret from Stripe Dashboard  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Error: "Invalid tier or missing price ID"          │
├─────────────────────────────────────────────────────┤
│  Cause: Price ID not in environment variables       │
│  Fix:   Add STRIPE_SUB_PRICE_* to .dev.vars        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Error: "Customer not found"                        │
├─────────────────────────────────────────────────────┤
│  Cause: Artist doesn't have stripe_customer_id      │
│  Fix:   Backend creates customer automatically     │
└─────────────────────────────────────────────────────┘
```

---

## 🎉 Success Indicators

### ✅ Everything Working When:
- User can click "Select Plan"
- Redirected to Stripe checkout
- Can enter payment details
- Payment succeeds
- Redirected back to dashboard
- Webhook shows 200 OK in Stripe logs
- Database shows updated tier
- Dashboard displays correct badge
- User has upgraded limits

---

## 📚 Related Documentation

- [STRIPE_QUICK_START.md](STRIPE_QUICK_START.md) - Quick 5-minute setup
- [STRIPE_SUBSCRIPTION_COMPLETE_GUIDE.md](STRIPE_SUBSCRIPTION_COMPLETE_GUIDE.md) - Full documentation
- [STRIPE_DEPLOYMENT_CHECKLIST.md](STRIPE_DEPLOYMENT_CHECKLIST.md) - Pre-launch checklist

---

**Visual Guide Complete! 🎨**

Next: [Configure your webhook](STRIPE_QUICK_START.md) and test it!
