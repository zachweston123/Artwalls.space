# Cloudflare Workers + Stripe (Webhook)

## Important security note

If you pasted your Stripe secret key anywhere public (chat, issues, screenshots), assume it’s compromised.

- Rotate/revoke the key in Stripe Dashboard **now** (Developers → API keys).
- Create a new secret key and store it only as a Cloudflare Worker secret.

This repo will **not** store your keys.

---

## What you need to connect Stripe to a Worker

1) A Worker route that Stripe can POST events to (a webhook endpoint)
2) A webhook signing secret (`STRIPE_WEBHOOK_SECRET`, starts with `whsec_...`) to verify Stripe’s signature

### Your webhook URL

Use:

- `https://<your-worker-domain>/api/stripe/webhook`

(Do not “test” this by opening it in a browser — Stripe sends POST requests with a signature header.)

---

## Step 1 — Add Worker secrets

Cloudflare Dashboard → Workers → your Worker → Settings → Variables:

- Secret: `STRIPE_WEBHOOK_SECRET` = `whsec_...` (from Stripe webhook endpoint)

If you also call Stripe APIs from the Worker (create Checkout Sessions, etc.), also add:

- Secret: `STRIPE_SECRET_KEY` = `sk_live_...` or `sk_test_...`

---

## Step 2 — Add webhook handler code

This repo includes a ready-to-drop-in Worker example:

- [worker/index.ts](worker/index.ts)
- [worker/stripeWebhook.ts](worker/stripeWebhook.ts)

It verifies the signature using the **raw request body** (required for Stripe).

If you already have a Worker, copy the `/api/stripe/webhook` route and the `verifyAndParseStripeEvent()` helper.

---

## Step 3 — Configure the webhook in Stripe

Stripe Dashboard → Developers → Webhooks → Add endpoint

- Endpoint URL: `https://<your-worker-domain>/api/stripe/webhook`
- Events (minimum for this app’s current behavior):
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

Copy the signing secret (`whsec_...`) into your Worker as `STRIPE_WEBHOOK_SECRET`.

---

## Step 4 — Test

- Use Stripe Dashboard → Webhooks → your endpoint → **Send test event**
- Watch Worker logs in Cloudflare (Logs / Tail)

---

## Common gotchas

- You must verify using the **raw** request bytes; do not `await request.json()` before verifying.
- Make your handler idempotent: Stripe retries events.
- Webhook secret is **not** your Stripe API secret key. Webhook secret starts with `whsec_...`.
