# Stripe Subscription Setup Guide

This guide walks you through setting up Stripe subscriptions for the Artwalls platform. The subscription system allows artists to upgrade their plans and pay for monthly access to features.

## Architecture Overview

The subscription system consists of:

1. **Frontend (React)**: [PricingPage.tsx](src/components/pricing/PricingPage.tsx) - Displays plans and initiates upgrades
2. **Backend (Node/Express)**: `server/index.js` - Handles Stripe checkout session creation
3. **Stripe**: Manages subscriptions, billing, and payments
4. **Database**: Stores artist subscription info and preferences

## Prerequisites

- Stripe account (https://stripe.com)
- Environment variables configured in `server/.env`
- Server running on port 4242
- Frontend running on port 5173

## Step 1: Create Subscription Products in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Billing** → **Products**
3. Create three products (or use names matching your tiers):

   ### Product: Starter Plan
   - **Name**: Starter Plan
   - **Description**: 4 active displays, 10 artworks, 15% platform fee
   - **Price**: $9/month (recurring)
   - **Billing period**: Monthly
   - **Copy the Price ID** (looks like `price_1ABC...`)

   ### Product: Elite Plan (Growth)
   - **Name**: Elite Plan
   - **Description**: 10 active displays, 30 artworks, 8% platform fee
   - **Price**: $19/month (recurring)
   - **Billing period**: Monthly
   - **Copy the Price ID**

   ### Product: Pro Plan
   - **Name**: Pro Plan
   - **Description**: Unlimited displays, artworks, 6% platform fee, included protection
   - **Price**: $39/month (recurring)
   - **Billing period**: Monthly
   - **Copy the Price ID**

## Step 2: Get Your API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **API Keys**
3. Copy:
   - **Secret Key** (starts with `sk_test_` or `sk_live_`)
   - **Publishable Key** (starts with `pk_test_` or `pk_live_`)

## Step 3: Get Webhook Signing Secret

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://yourdomain.com/api/stripe/webhook` (or `http://localhost:4242/api/stripe/webhook` for local)
4. Events to send: Select all `checkout.session.*` and `subscription.*` events
5. Copy the **Signing secret** (starts with `whsec_`)

## Step 4: Configure Environment Variables

Update `server/.env`:

```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_xxxxx...
STRIPE_WEBHOOK_SECRET=whsec_xxxxx...

# Stripe Subscription Price IDs (from Step 1)
# Note: Growth plan uses "elite" tier name internally
STRIPE_SUB_PRICE_STARTER=price_xxxxx...
STRIPE_SUB_PRICE_ELITE=price_xxxxx...
STRIPE_SUB_PRICE_PRO=price_xxxxx...

# Platform fees (in basis points, 100 = 1%)
FEE_BPS_FREE=2000       # 20%
FEE_BPS_STARTER=1500    # 15%
FEE_BPS_ELITE=800       # 8%
FEE_BPS_PRO=1000        # 10%

# Redirect URLs after subscription
SUB_SUCCESS_URL=http://localhost:5173/#/artist-dashboard?sub=success
SUB_CANCEL_URL=http://localhost:5173/#/artist-dashboard?sub=cancel

# App URLs
APP_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
```

## Step 5: Test the Integration

1. **Start the server**:
   ```bash
   cd server
   npm install
   npm start
   ```

2. **Start the frontend**:
   ```bash
   npm run dev
   ```

3. **Log in as an artist**:
   - Go to http://localhost:5173
   - Sign in with artist role

4. **Navigate to pricing**:
   - Click on "Plans & Pricing" or navigate to `/#/plans-pricing`
   - Click "Get Started" or "Upgrade" on any plan

5. **Expected behavior**:
   - You should be redirected to Stripe Checkout
   - Complete a test payment using Stripe test card: `4242 4242 4242 4242`
   - Expiry: any future date
   - CVC: any 3 digits

## Step 6: Verify Webhook Events

After a successful test payment:

1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Click on your endpoint
3. You should see incoming webhook events:
   - `checkout.session.completed` - Initial session creation
   - `customer.subscription.created` - Subscription created
   - `invoice.payment_succeeded` - Payment processed

## Frontend Implementation Details

### PricingPage Component

The [PricingPage.tsx](src/components/pricing/PricingPage.tsx) component:

- **Displays 4 plans**: Free (default), Starter ($9), Growth ($19), Pro ($39)
- **Props**:
  - `onNavigate`: Callback for navigation
  - `currentPlan`: Current user's plan
  - `currentUser`: Current logged-in user (required for upgrades)

- **handleUpgrade function**:
  ```typescript
  const handleUpgrade = async (tier: string, planId: string) => {
    // Validates user is logged in and is an artist
    // Calls POST /api/stripe/billing/create-subscription-session with tier
    // Redirects to Stripe Checkout URL on success
  }
  ```

### API Endpoint: Create Subscription Session

**Route**: `POST /api/stripe/billing/create-subscription-session`

**Request Body**:
```json
{
  "tier": "starter"  // Can be: "starter", "growth", "pro"
}
```

**Response**:
```json
{
  "url": "https://checkout.stripe.com/pay/cs_..."
}
```

**Error Handling**:
- Returns 400 if user not authenticated
- Returns 400 if user is not an artist
- Returns 400 if invalid tier or missing price ID in env
- Returns 500 for Stripe API errors

## Backend Implementation Details

### Database Schema

The system assumes the `artists` table has these columns:
- `id` (primary key)
- `email`
- `name`
- `stripe_customer_id` - Stripe customer ID (auto-created on first subscription)

### Key Functions in server/index.js

1. **requireArtist()** - Middleware to verify request is from authenticated artist
2. **stripe.checkout.sessions.create()** - Creates Stripe checkout session
3. **stripe.customers.create()** - Creates Stripe customer for artist
4. **upsertArtist()** - Stores stripe_customer_id in database

### Webhook Handling

The `/api/stripe/webhook` endpoint handles:

1. **checkout.session.completed**: 
   - Marks subscription as active
   - Updates artist record with Stripe customer ID
   - Stores metadata (tier, artistId)

2. **customer.subscription.created**:
   - Updates subscription status
   - Records subscription tier preference

3. **invoice.payment_succeeded**:
   - Processes recurring payment
   - Updates payment history

## Production Deployment

### Before Going Live

1. **Get Live Stripe Keys**:
   - Switch from Test mode to Live mode in Stripe Dashboard
   - Use live secret key (`sk_live_...`) and webhook secret

2. **Update Environment Variables**:
   ```env
   STRIPE_SECRET_KEY=sk_live_xxxxx...
   STRIPE_WEBHOOK_SECRET=whsec_live_xxxxx...
   SUB_SUCCESS_URL=https://yourdomain.com/#/artist-dashboard?sub=success
   SUB_CANCEL_URL=https://yourdomain.com/#/artist-dashboard?sub=cancel
   ```

3. **Configure Webhook Endpoint**:
   - Update endpoint URL to: `https://yourdomain.com/api/stripe/webhook`
   - Re-copy the signing secret

4. **Test with Real Cards**:
   - Use actual test cards provided by Stripe
   - Verify all webhook events are received

5. **Enable CORS** for your production domain:
   ```env
   CORS_ORIGIN=https://yourdomain.com
   ```

## Troubleshooting

### "Invalid tier or missing STRIPE_SUB_PRICE_* env for that tier"
- **Cause**: Environment variable not set or misspelled
- **Solution**: Double-check price IDs in `.env` file match Stripe

### "Page does not load when clicking upgrade"
- **Cause**: API endpoint not responding
- **Solution**: 
  - Verify server is running on port 4242
  - Check `STRIPE_SECRET_KEY` is set correctly
  - Look for errors in server console

### Webhook events not received
- **Cause**: Webhook endpoint not publicly accessible
- **Solution**: 
  - For local development, use [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward webhooks
  - For production, ensure endpoint is publicly accessible

### "User not authenticated" error
- **Cause**: No authentication header in request
- **Solution**: Ensure user is logged in before attempting upgrade

## Customization

### Changing Plan Pricing

1. In Stripe Dashboard, create new prices
2. Update `STRIPE_SUB_PRICE_*` environment variables
3. Update plan details in [PricingPage.tsx](src/components/pricing/PricingPage.tsx)

### Adding New Plan Tier

1. Create product and price in Stripe
2. Add environment variable: `STRIPE_SUB_PRICE_NEWNAME=price_...`
3. Update `SUB_PRICE_IDS` object in `server/index.js`
4. Add plan to `plans` array in `PricingPage.tsx`

### Customizing Platform Fees

Update `FEE_BPS_*` environment variables:
- 100 basis points = 1%
- 2000 basis points = 20%

## References

- [Stripe Billing Documentation](https://stripe.com/docs/billing)
- [Stripe Checkout Documentation](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe API Reference](https://stripe.com/docs/api)
