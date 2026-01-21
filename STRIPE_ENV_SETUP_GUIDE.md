# Step 2: Request Stripe Environment Setup

To get your subscriptions working, you need to add your Stripe API keys and Price IDs to your project configuration.

## 1. Edit your Environment File
I have created a file named `.dev.vars` in your project root. Open it and fill in the values.

## 2. Where to find the values

### Stripe API Keys
1.  Log in to your [Stripe Dashboard](https://dashboard.stripe.com/).
2.  Toggle **Test Mode** (orange toggle) in the top right if you are testing.
3.  Go to **Developers** > **API keys**.
4.  Copy **Secret key** (starts with `sk_test_` or `sk_live_`) -> Paste into `STRIPE_SECRET_KEY`.

### Stripe Webhook Secret
1.  Go to **Developers** > **Webhooks**.
2.  Click **Add Endpoint**.
3.  Use your local URL (e.g., `http://localhost:8788/api/stripe/webhook`) or production URL.
4.  Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
5.  After creating, click "Reveal" on the **Signing secret** (starts with `whsec_`) -> Paste into `STRIPE_WEBHOOK_SECRET`.

### Product Price IDs
You need to create 3 Products in Stripe for your tiers:
1.  Go to **Product Catalog**.
2.  **Create Product**: "Starter" -> Price: $9.00 / month.
    *   Copy the **API ID** for the price (starts with `price_` or `plan_`).
    *   Paste into `STRIPE_PRICE_ID_STARTER`.
3.  **Create Product**: "Growth" -> Price: $19.00 / month.
    *   Copy Price ID -> Paste into `STRIPE_PRICE_ID_GROWTH`.
4.  **Create Product**: "Pro" -> Price: $39.00 / month.
    *   Copy Price ID -> Paste into `STRIPE_PRICE_ID_PRO`.

### Supabase Keys
1.  Log in to Supabase > Project Settings > API.
2.  Copy **Project URL** -> `SUPABASE_URL`.
3.  Copy **service_role** secret -> `SUPABASE_SERVICE_ROLE_KEY`.
4.  Copy **anon** public key -> `SUPABASE_ANON_KEY`.

## 3. Deploying
When you deploy to Cloudflare Pages, you must add these same variables in the Cloudflare Dashboard:
*   **Settings** > **Environment variables** > **Production** (and Preview).
