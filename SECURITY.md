# Security Policy – Artwalls.space

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public GitHub issue.
2. Email **security@artwalls.space** with a description and reproduction steps.
3. We will respond within 48 hours.

## Current Protections

| Layer | Protection |
|-------|-----------|
| Auth | Supabase JWT + RLS on all tables |
| Admin | SHA-256 password hash verified server-side (`POST /api/admin/verify`) |
| CORS | Allowlisted origins only (`artwalls.space`, `www.artwalls.space`, `localhost`) |
| Rate limiting | Per-route, per-IP and per-user counters (KV-backed in prod) |
| Secrets | All API keys and service-role keys are Cloudflare Worker secrets; **never** in frontend bundles |
| Webhooks | Stripe `whsec_` verification on every event (`verifyAndParseStripeEvent`) |
| RLS | Row-Level Security enabled on every Supabase table with `service_role_only` on sensitive tables |

## Secrets Handling

- **`.dev.vars`** and **`.env`** are in `.gitignore` and must **never** be committed.
- If you accidentally commit a secret, rotate it immediately in the provider dashboard and run `git filter-branch` or BFG to purge it from history.
- The admin password referenced in legacy docs (`StormBL26`) was a development placeholder. In production the admin password is set as a Cloudflare Worker secret `ADMIN_PASSWORD` and verified via SHA-256 hash comparison server-side.

## Checklist Before Deploy

- [ ] No `sk_live_`, `sk_test_`, `whsec_`, or `service_role` strings in `src/` or `worker/` source files.
- [ ] `.dev.vars` and `.env` are **not** tracked (`git ls-files | grep -E '\.env$|\.dev\.vars$'` returns 0).
- [ ] `VITE_ADMIN_PASSWORD` does not appear anywhere — admin auth goes through the Worker, not the frontend.
- [ ] All Stripe price IDs are set as Worker secrets, not hardcoded.
- [ ] CSP headers are configured (Content-Security-Policy set in Worker responses).
