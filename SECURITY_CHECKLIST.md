# Artwalls.space — Security Go-Live Checklist

Run through this checklist before every production deployment. Target: **≤ 30 minutes**.

---

## Pre-Deploy (Local / CI)

- [ ] **No secrets in source** — Run: `grep -rn 'sk_live\|sk_test\|whsec_\|service_role' src/ worker/ --include='*.ts' --include='*.tsx'` → should return 0 hits
- [ ] **No `.env` / `.dev.vars` tracked** — Run: `git ls-files | grep -E '\.env$|\.dev\.vars$'` → should return 0. If any hit, run `git rm --cached <file>` and add to `.gitignore`
- [ ] **`.gitignore` includes**: `.env`, `.dev.vars`, `server/.env`, `node_modules/`, `.wrangler/`
- [ ] **No `VITE_ADMIN_PASSWORD`** in any file — `grep -rn 'VITE_ADMIN_PASSWORD' .` → 0 hits
- [ ] **No hardcoded admin emails in frontend** — `grep -rn 'ADMIN_EMAILS' src/` → 0 hits
- [ ] **StripePaymentSetup has no key placeholders** — `grep -n 'pk_live_\|sk_live_' src/components/admin/StripePaymentSetup.tsx` → 0 hits

## Supabase / Database

- [ ] **RLS enabled on all tables** — `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT IN (SELECT tablename FROM pg_tables t JOIN pg_class c ON c.relname=t.tablename WHERE c.relrowsecurity);` → 0 rows
- [ ] **Run security migration** — `supabase db push` or apply `20260218_security_hardening.sql` manually
- [ ] **Verify `is_admin()` function** — `SELECT is_admin();` as a non-admin user → should return `false`
- [ ] **`artworks_read_all` policy dropped** — `SELECT * FROM pg_policies WHERE policyname='artworks_read_all';` → 0 rows
- [ ] **`stripe_webhook_events` is service-only** — Attempt `SELECT * FROM stripe_webhook_events` as anon → should fail
- [ ] **Storage buckets**: `artworks` and `wallspaces` are `public=true` for reads, uploads scoped to `auth.uid()` folder prefix

## Cloudflare Worker

- [ ] **All secrets set** — Run these for your Worker:
  ```sh
  wrangler secret list --name artwalls-space
  ```
  Must include: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAILS`
- [ ] **ADMIN_EMAILS** set as Worker secret (comma-separated emails), NOT in `wrangler.toml`
- [ ] **Security headers present** — `curl -sI https://artwalls-space.YOUR_SUBDOMAIN.workers.dev/api/health | grep -i 'x-frame-options\|x-content-type\|referrer-policy'` → all 3 present
- [ ] **Stats endpoints require auth** — `curl -s https://…/api/stats/artist?id=<any-uuid>` → `401` (no Bearer token)
- [ ] **Profile upsert requires auth** — `curl -X POST https://…/api/artists -d '{"id":"any"}' -H 'Content-Type: application/json'` → `401`
- [ ] **Artwork link requires auth** — `curl -s https://…/api/artworks/<id>/link` → `401`
- [ ] **Deploy** — `wrangler deploy`

## Stripe

- [ ] **Webhook endpoint configured** in Stripe Dashboard → `https://YOUR_WORKER/api/stripe/webhook`
- [ ] **Webhook signing secret** matches `STRIPE_WEBHOOK_SECRET` Worker secret
- [ ] **Test webhook** — Use Stripe CLI: `stripe trigger checkout.session.completed --webhook-endpoint=<url>` → 200
- [ ] **Connect Express** accounts have `payouts_enabled` checked before transfers (verify in Stripe Dashboard for active artists/venues)

## Frontend Build

- [ ] **Build succeeds** — `npm run build` → no errors
- [ ] **Bundle inspection** — `grep -r 'ADMIN_EMAILS\|sk_live\|sk_test\|service_role' dist/` → 0 hits
- [ ] **Admin panel** only renders when `user_metadata.role === 'admin'` (set by server via `/api/admin/verify`)

## Post-Deploy Smoke Test

- [ ] Visit site → loads without console errors
- [ ] Sign in as regular user → cannot access `/admin` routes
- [ ] Sign in as admin → admin panel renders, `/api/admin/verify` returns `{ok:true}`
- [ ] Submit a test artwork → upload works, QR link generates (only for owner)
- [ ] Check `admin_audit_log` table → verify admin actions are logged

## Git Hygiene

- [ ] **Remove tracked secrets from history** (if any were ever committed with real values):
  ```sh
  # Install git-filter-repo: brew install git-filter-repo
  git filter-repo --path .env --path .dev.vars --path server/.env --invert-paths
  git push --force-with-lease
  ```
- [ ] **Rotate any exposed keys** — Supabase service role key, Stripe secret key, webhook secret
- [ ] **Enable branch protection** on `main` — require PR review before merge

---

*Last updated: 2025-01-18 — Security Audit Phase*
