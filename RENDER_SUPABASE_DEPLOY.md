# Deploy Artwalls on Cloudflare Pages + Workers + Supabase

This guide replaces Render-specific steps with Cloudflare:
- Frontend: Cloudflare Pages (builds Vite app to `dist`)
- Backend API: Cloudflare Workers (see [worker/wrangler.toml](worker/wrangler.toml) and [worker/index.ts](worker/index.ts))
- Database: Supabase (schema under [supabase/migrations](supabase/migrations))

## 1) Create a Supabase project
1. In Supabase, create a new project.
2. Copy these values (Project Settings → API):
   - Project URL → `SUPABASE_URL`
   - Service Role key → `SUPABASE_SERVICE_ROLE_KEY` (server/Worker only)
3. In Supabase SQL Editor, run [supabase/migrations/001_init.sql](supabase/migrations/001_init.sql).

Optional (storage): create a bucket `artworks` for uploads if needed.

## 2) Frontend on Cloudflare Pages
Follow [CLOUDFLARE_PAGES.md](.github/workflows/CLOUDFLARE_PAGES.md):
- Build command: `npm ci && npm run build`
- Output directory: `dist`
- Environment variables:
  - `VITE_API_BASE_URL` = `https://api.artwalls.space`
  - `VITE_SUPABASE_URL` = your Supabase URL
  - `VITE_SUPABASE_ANON_KEY` = Supabase anon key

## 3) Backend API on Cloudflare Workers
Wrangler config: [wrangler.toml](wrangler.toml)
- Name: matches your Worker (e.g. `artwalls-spacess`)
- Route: `api.artwalls.space/*` with `zone_name = "artwalls.space"`

Set Worker variables and secrets:
```sh
# From anywhere, targeting the root config
npx wrangler --config ~/Artwalls.space/wrangler.toml secret put STRIPE_SECRET_KEY
npx wrangler --config ~/Artwalls.space/wrangler.toml secret put STRIPE_WEBHOOK_SECRET
npx wrangler --config ~/Artwalls.space/wrangler.toml secret put SUPABASE_SERVICE_ROLE_KEY

# Optional vars (configure in wrangler.toml [vars] or via Dashboard)
# API_BASE_URL, SUPABASE_URL, PAGES_ORIGIN
```

Worker CORS: set `PAGES_ORIGIN` (e.g. `https://artwalls.space`) so responses include the correct `Access-Control-Allow-Origin`.

## 4) Domains
- In Cloudflare, add `artwalls.space` to your account (if not already).
- Pages custom domain: attach `artwalls.space` (and `www.artwalls.space`) to your Pages project.
- Worker route: ensure `api.artwalls.space/*` is active under the zone and resolves to your Worker.

## 5) Stripe webhooks (production)
1. In Stripe Dashboard (live mode): Developers → Webhooks → **Add endpoint**.
2. Endpoint URL: `https://api.artwalls.space/api/stripe/webhook`.
3. Events to send (minimum):
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the webhook Signing secret (`whsec_...`) to the Worker:
   ```sh
   npx wrangler --config ~/Artwalls.space/wrangler.toml secret put STRIPE_WEBHOOK_SECRET
   ```

## 6) Smoke test
- Open `https://artwalls.space`
- Check API health: `https://api.artwalls.space/api/health`
- Verify `/api/debug/env` reports Stripe vars present
- Test webhook with Stripe CLI:
  ```sh
  brew install stripe/stripe-cli/stripe
  stripe login
  stripe listen --forward-to https://api.artwalls.space/api/stripe/webhook
  stripe trigger payment_intent.succeeded
  ```

