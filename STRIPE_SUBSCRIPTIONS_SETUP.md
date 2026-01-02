# Stripe Subscriptions Setup Guide

## Overview

Your Artwalls platform subscription system is configured to receive payments from artists upgrading their subscription plans. The backend is ready to handle subscription checkout and webhook events.

## Setup Steps

### 1. Create Subscription Products in Stripe Dashboard

Go to your Stripe Dashboard and create these products with pricing:

#### Free Plan
- **Product Name:** Artwalls Free Plan
- **Price:** $0/month
- **Billing Period:** Monthly
- **Metadata:** Add `tier: free`

#### Starter Plan ($9/month)
- **Product Name:** Artwalls Starter Plan
- **Price:** $9.00/month USD
- **Billing Period:** Monthly
- **Metadata:** Add `tier: starter` and `platform_fee_bps: 1000` (10%)

#### Growth Plan ($19/month)
- **Product Name:** Artwalls Growth Plan
- **Price:** $19.00/month USD
- **Billing Period:** Monthly
- **Metadata:** Add `tier: growth` and `platform_fee_bps: 800` (8%)

#### Pro Plan ($39/month)
- **Product Name:** Artwalls Pro Plan
- **Price:** $39.00/month USD
- **Billing Period:** Monthly
- **Metadata:** Add `tier: pro` and `platform_fee_bps: 600` (6%)

### 2. Get Price IDs

After creating products, copy the **Price IDs** (not Product IDs) and add them to your `.env` file:

```env
STRIPE_SUB_PRICE_STARTER=price_xxxxx
STRIPE_SUB_PRICE_PRO=price_xxxxx
STRIPE_SUB_PRICE_ELITE=price_xxxxx
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### 3. Test Subscription Checkout

1. Artist goes to Pricing page
2. Clicks "Get Started" on Starter, Growth, or Pro plan
3. System creates Stripe Checkout Session in subscription mode
4. Artist completes payment

### 4. Webhook Handling

Your server automatically handles:
- `checkout.session.completed` - Saves subscription to database
- `customer.subscription.updated` - Updates subscription tier when changed
- `customer.subscription.deleted` - Marks subscription as canceled

The system syncs the artist's subscription tier and platform fee from Stripe price metadata.

## Payment Flow

1. **Artist selects plan** → Clicks upgrade button
2. **System creates checkout session** → `POST /api/stripe/billing/create-subscription-session`
3. **Stripe processes payment** → Creates subscription
4. **Webhook fires** → System updates artist record with tier
5. **Artist can see new features** → Based on subscription tier

## Revenue Split for Sales

Once an artist has an active subscription:
- **Free:** 15% platform fee
- **Starter:** 10% platform fee (vs 15% normally)
- **Growth:** 8% platform fee (vs 15% normally)
- **Pro:** 6% platform fee (vs 15% normally)

Example:
- $100 sale with Free plan: Artist keeps $85, platform gets $15
- $100 sale with Starter plan: Artist keeps $90, platform gets $10 (+ $9 subscription)

## Admin Dashboard

Access the admin console with:
- **Shortcut:** Cmd+Shift+A (Mac) or Ctrl+Shift+A (Windows/Linux)
- **Password:** StormBL26

From the Stripe Payments section, you can:
- View connection status
- Manage API keys
- Configure test/live mode
- View webhook settings

## Testing in Stripe Test Mode

Use Stripe's test credit cards:
- **Visa:** 4242 4242 4242 4242
- **Expiry:** Any future date
- **CVC:** Any 3 digits

## Next Steps

1. Create the subscription products in Stripe Dashboard
2. Copy Price IDs to your `.env` file
3. Restart the server: `npm run dev`
4. Test subscription checkout on the Pricing page
5. Verify webhook events are being processed

## Troubleshooting

**"Missing STRIPE_SUB_PRICE_* env"**
- Add the price IDs to `.env` and restart server

**Subscription not updating in database**
- Check webhook secret matches: `STRIPE_WEBHOOK_SECRET`
- Verify webhook endpoint is active in Stripe Dashboard

**Artist doesn't see reduced fees**
- Confirm subscription tier and status in database
- Check webhook processed the `customer.subscription.updated` event
