# Bubble Integration Guide (Artwalls + Stripe)

You have two practical ways to use this UI with Bubble.

## Option A (recommended): Deploy this UI separately, use Bubble as the backend

1) Build and host this frontend (Vercel, Netlify, Cloudflare Pages, etc.)
2) In Bubble, expose:
   - Data API endpoints (Artworks, Venues, Applications, WallSpaces, etc.)
   - OR API Workflows for custom logic (approve application, schedule install, mark sold, etc.)
3) In this frontend, set:
   - `VITE_API_BASE_URL=https://your-bubble-app.com`

### Payments with Stripe
**Best no-backend approach:** Stripe Payment Links
- In Bubble, add fields on Artwork:
  - `checkoutUrl` (Stripe Payment Link)
  - optional `stripePriceId`
- When a user clicks “Buy This Artwork” the UI redirects to `checkoutUrl`.

**If you need dynamic sessions:** use Bubble API Workflows
- Create a backend workflow in Bubble that creates a Stripe Checkout Session and returns `url`
- Point this frontend’s `VITE_API_BASE_URL` at Bubble and implement:
  - POST `/api/stripe/create-checkout-session` (match the payload in `PurchasePage.tsx`)

## Option B: Embed the frontend inside Bubble

If you want Bubble pages to “contain” this UI:

- Deploy this frontend (same as Option A)
- In Bubble, add an **HTML element** with an iframe:
```html
<iframe
  src="https://your-frontend-domain.com"
  style="width:100%;height:100vh;border:0;border-radius:12px;"
></iframe>
```

This is the most stable “import” method since Bubble cannot directly run a React build pipeline.

## Webhooks

For a marketplace, you typically need a webhook to:
- mark an artwork as **sold**
- prevent double-purchase
- notify artist/venue
- generate receipts

You can do this in Bubble (Stripe plugin/webhooks) or with the `/server` starter.
