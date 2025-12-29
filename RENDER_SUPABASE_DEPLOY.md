# Deploy Artwalls on Render + Supabase (GitHub)

This repo contains:
- Frontend (Vite/React) at `/` (static build)
- Backend (Node/Express + Stripe Connect) at `/server`
- Supabase schema at `/supabase/migrations/001_init.sql`
- A Render Blueprint at `render.yaml`

## 1) Create a Supabase project
1. In Supabase, create a new project.
2. Copy these values (Project Settings → API):
   - Project URL → `SUPABASE_URL`
   - Service Role key → `SUPABASE_SERVICE_ROLE_KEY` (server-only)
3. In Supabase SQL Editor, run `supabase/migrations/001_init.sql`.

Optional (storage): create a bucket `artworks` if you want to upload images to Supabase Storage.

## 2) Put the code on GitHub
1. Create a new GitHub repo.
2. Upload the code (or `git init` + push).

## 3) Create services on Render (the easy way: Blueprint)
1. In Render Dashboard → **New +** → **Blueprint**.
2. Select your GitHub repo.
3. Render will create:
   - `artwalls-api` (web service)
   - `artwalls-web` (static site)

## 4) Set environment variables on Render
In `artwalls-api` → Environment:
- Required:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `STRIPE_SUB_PRICE_STARTER`, `STRIPE_SUB_PRICE_PRO`, `STRIPE_SUB_PRICE_ELITE` (if you use subscriptions day one)
- Already set by the blueprint (adjust if needed):
  - `APP_URL`, `CORS_ORIGIN`, redirect URLs

In `artwalls-web` → Environment:
- `VITE_API_BASE_URL` = your API URL (e.g. `https://api.artwalls.space`)

## 5) Add custom domains
In Render:
- `artwalls-web` → Settings → Custom Domains
  - Add: `artwalls.space` (Render will also offer `www.artwalls.space`)
- `artwalls-api` → Settings → Custom Domains
  - Add: `api.artwalls.space`

## 6) Point your DNS to Render
At your domain registrar / DNS provider:
- Remove any existing **AAAA** records for these hostnames.
- For the root domain `artwalls.space`:
  - Preferred: ALIAS/ANAME to the Render hostname shown in the Render custom domain screen.
  - If ALIAS/ANAME isn’t available: add an **A** record for `@` → `216.24.57.1`
- For `www.artwalls.space`:
  - Add a **CNAME** record `www` → the Render hostname for the *static site* (e.g. `xxxxx.onrender.com`)
- For `api.artwalls.space`:
  - Add a **CNAME** record `api` → the Render hostname for the *API service* (e.g. `yyyyy.onrender.com`)

Wait for DNS to propagate, then refresh the domain status in Render until it shows verified + TLS issued.

## 7) Configure Stripe webhooks (production)
1. In Stripe Dashboard (live mode): Developers → Webhooks → **Add endpoint**.
2. Endpoint URL: `https://api.artwalls.space/api/stripe/webhook`
3. Events to send (minimum):
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the webhook signing secret into Render → `STRIPE_WEBHOOK_SECRET`.

## 8) Smoke test
- Open `https://artwalls.space`
- Check API health: `https://api.artwalls.space/api/health`
- Onboard a test artist + venue to Stripe Connect
- Create a listing
- Purchase (test mode first), confirm:
  - order status becomes paid
  - transfers created (artist + venue)

