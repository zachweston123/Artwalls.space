# Quick Stripe Setup Checklist

Follow these steps to get subscriptions working in 15 minutes:

## ✅ Step 1: Create Stripe Account & Get Keys (5 min)

- [ ] Go to https://stripe.com and create account
- [ ] Verify your email
- [ ] Go to Developers → API Keys
- [ ] Copy your **Secret Key** (sk_test_...)
- [ ] Copy your **Publishable Key** (pk_test_...)

## ✅ Step 2: Create 3 Products with Monthly Pricing (5 min)

In Stripe Dashboard → Billing → Products:

### Starter Plan
- [ ] Click "Add product"
- [ ] Name: **Starter Plan**
- [ ] Price: **$9/month**
- [ ] Billing period: **Monthly**
- [ ] **COPY PRICE ID** → looks like `price_1ABC123...`

### Growth Plan (Elite Tier)  
- [ ] Click "Add product"
- [ ] Name: **Elite Plan** (or Growth Plan)
- [ ] Price: **$19/month**
- [ ] Billing period: **Monthly**
- [ ] **COPY PRICE ID** → Save as `STRIPE_SUB_PRICE_ELITE`

### Pro Plan
- [ ] Click "Add product"
- [ ] Name: **Pro Plan**
- [ ] Price: **$39/month**
- [ ] Billing period: **Monthly**
- [ ] **COPY PRICE ID**

## ✅ Step 3: Setup Webhook (3 min)

In Stripe Dashboard → Developers → Webhooks:

- [ ] Click "Add endpoint"
- [ ] Endpoint URL: `http://localhost:4242/api/stripe/webhook`
- [ ] Select events: `checkout.session.completed`, `customer.subscription.created`
- [ ] **COPY SIGNING SECRET** → looks like `whsec_...`

## ✅ Step 4: Configure Environment (2 min)

Open `server/.env` and add:

```env
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_SUB_PRICE_STARTER=price_xxxxx
STRIPE_SUB_PRICE_ELITE=price_xxxxx
STRIPE_SUB_PRICE_PRO=price_xxxxx
FEE_BPS_FREE=2000
FEE_BPS_STARTER=1500
FEE_BPS_ELITE=800
FEE_BPS_PRO=1000
SUB_SUCCESS_URL=http://localhost:5173/#/artist-dashboard?sub=success
SUB_CANCEL_URL=http://localhost:5173/#/artist-dashboard?sub=cancel
```

## ✅ Step 5: Test (Optional)

1. Start server: `cd server && npm start`
2. Start frontend: `npm run dev`
3. Log in as artist
4. Click "Plans & Pricing"
5. Click "Get Started" on any plan
6. Use test card: `4242 4242 4242 4242`
7. Any future expiry date, any CVC

## 🎉 Done!

Your subscriptions are now configured!

For detailed setup instructions, see [STRIPE_SUBSCRIPTION_SETUP.md](STRIPE_SUBSCRIPTION_SETUP.md)
