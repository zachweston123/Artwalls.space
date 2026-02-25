# server/ — DEPRECATED (Legacy Express Backend)

> **⚠️ DO NOT USE — This directory is kept for reference only.**
>
> All API routes have been fully migrated to the **Cloudflare Worker** at
> [`worker/index.ts`](../worker/index.ts). The Worker serves all traffic
> from `api.artwalls.space` via Wrangler.

## Status

| Aspect | Detail |
|---|---|
| **Current status** | Deprecated — `server/index.js` throws on startup |
| **Replacement** | `worker/index.ts` (Cloudflare Worker) |
| **Production URL** | `https://api.artwalls.space/*` |
| **When to delete** | After the migration is fully verified in production |

## What was here

This was a minimal **production-starter** Express.js backend for a multi-vendor marketplace where:

- **Artists** and **venues** onboard to Stripe Connect Express (KYC + bank via Stripe-hosted onboarding).
- Artists create listings -> the server auto-creates a Stripe **Product** + **Price**.
- Buyers pay via Stripe **Checkout**.
- **Splits are automated day one** using **Separate Charges and Transfers**:
  - The buyer is charged on the **platform**.
  - After payment succeeds (webhook), the platform creates two Transfers:
    - a transfer to the **artist** connected account
    - a transfer to the **venue** connected account
  - The platform keeps the remainder as the **Artwalls fee**.

## Why Separate Charges + Transfers?
Use this flow when **multiple connected accounts** need to receive money from one payment (artist + venue). Stripe explicitly supports transferring funds to multiple connected accounts with this charge type.

## Local run

```bash
cd server
cp .env.example .env
npm i
npm run dev
```

## Webhooks
Use Stripe CLI:

```bash
stripe listen --forward-to localhost:4242/api/stripe/webhook
```

Put the printed webhook secret into `STRIPE_WEBHOOK_SECRET`.

## Endpoints (important)

### Onboarding (Artist)
- `POST /api/stripe/connect/artist/create-account`
- `POST /api/stripe/connect/artist/account-link`
- `POST /api/stripe/connect/artist/login-link`
- `GET  /api/stripe/connect/artist/status?artistId=...`

### Onboarding (Venue)
- `POST /api/stripe/connect/venue/create-account`
- `POST /api/stripe/connect/venue/account-link`
- `POST /api/stripe/connect/venue/login-link`
- `GET  /api/stripe/connect/venue/status?venueId=...`

### Artist subscription (platform fee tier)
- `POST /api/stripe/billing/create-subscription-session` body: `{ artistId, tier }`

**Important (match artwalls.space pricing without redeploying):**
If you add metadata on the Stripe **Billing Price** for each tier, the server will automatically sync it
and use it to compute the Artwalls fee at checkout:

- `tier`: `starter` | `pro` | `elite`
- `platform_fee_bps`: e.g. `1500` for 15%

When the subscription is active, the server stores the resolved `platformFeeBps` on the artist record,
so future purchases use the correct fee even if the default env values change.

### Listings
- `POST /api/artworks` body: `{ artistId, title, description, price, currency, imageUrl, venueId, venueFeeBps? }`

### Checkout
- `POST /api/stripe/create-checkout-session` body: `{ artworkId, buyerEmail? }`

### Submission fees (Calls for Art)
- `POST /api/calls` (venue)
- `GET /api/calls` (public, open calls)
- `POST /api/calls/:id/apply` (artist)
- Webhook: `checkout.session.completed` with metadata `paymentType=submission_fee`

### Returns & Disputes
- Not supported. All sales are final.

### Analytics
- `POST /api/events` (qr_scan, view_artwork, start_checkout, purchase)
- `GET /api/analytics/artist?artistId=...`
- `GET /api/analytics/venue?venueId=...`

### Webhook
- `POST /api/stripe/webhook`

## Next steps for real production
- Move from `store.json` to Postgres.
- Add real auth + roles (artist, venue, admin).
- Implement refund/dispute flows:
  - reverse transfers on refunds
  - pause payouts on disputes

## Env vars (additions)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PAGES_ORIGIN`

## Storage buckets
- `call-applications` (optional application images)

## Manual QA checklist
- Creating artwork requires dimensions, condition, edition info, shipping estimate, and 3+ photos
- Venue creates call for art; artist applies (paid and free)
- Analytics shows scans even without sales
