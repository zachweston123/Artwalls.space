# Artwalls.space — Security Audit Report

**Date**: 2025-01-18  
**Scope**: Full-stack (Vite/React SPA + Supabase + Cloudflare Workers + Stripe)  
**Status**: All code fixes applied — ready for PR review

---

## Vulnerability Report

| # | Severity | Component | Vulnerability | Exploit Scenario | Fix Applied | File(s) |
|---|----------|-----------|--------------|------------------|-------------|---------|
| 1 | **CRITICAL** | Frontend | Hardcoded `ADMIN_EMAILS` array in `App.tsx` shipped in JS bundle | Attacker inspects bundle → discovers admin email → crafts targeted phishing or credential-stuffing attack | Removed array; admin role now sourced from server-set `user_metadata.role` | `src/App.tsx` |
| 2 | **CRITICAL** | Worker | `/api/stats/artist`, `/api/stats/venue` had **no authentication** | Anyone calls `GET /api/stats/artist?id=<UUID>` → reads private revenue, payout, subscriber data of any user | Added `getUser()` + ownership check; admins exempt | `worker/index.ts` |
| 3 | **CRITICAL** | Worker | `/api/analytics/artist`, `/api/analytics/venue` had **no authentication** | Attacker enumerates UUIDs → scrapes every user's private analytics | Added `getUser()` + `artist_id/venue_id === user.id` ownership check | `worker/index.ts` |
| 4 | **CRITICAL** | Worker | `POST /api/artists` and `POST /api/venues` accepted arbitrary `id` in body without auth | Attacker POSTs `{id: victim_uuid, ...}` → overwrites any profile (name, Stripe account, etc.) | Require auth; enforce `body.id === user.id` (admins exempt) | `worker/index.ts` |
| 5 | **CRITICAL** | Worker + SQL | `user_metadata.isAdmin` trusted for privilege escalation | User calls `supabase.auth.updateUser({data:{isAdmin:true}})` → gains admin in Worker & RLS | Worker: replaced with server-side `isAdminUser()`; SQL: `is_admin()` now checks email list + `app_metadata.role` only | `worker/index.ts`, `20260218_security_hardening.sql` |
| 6 | **HIGH** | Worker | Artwork `/link` endpoint updates DB with **no auth** | Attacker calls `GET /api/artworks/<id>/link` → overwrites `purchase_url` and `qr_svg` on any artwork | Added auth + ownership (artwork `artist_id === user.id`) | `worker/index.ts` |
| 7 | **HIGH** | Worker | Artist Stripe transfers missing `payouts_enabled` check | Platform attempts transfer to artist without onboarded Stripe → fails, money stuck | Added `stripe_payouts_enabled` guard matching venue's existing check | `worker/index.ts` |
| 8 | **HIGH** | RLS | `artworks_read_all` policy used `USING (true)` | Any authenticated user or anon query reads every artwork including drafts, archived, and unlisted | Replaced with scoped `artworks_public_read` (status=available, is_public, not archived) + owner + venue policies | `20260218_security_hardening.sql` |
| 9 | **HIGH** | RLS | `artists` table had no public-read filter | Anon could read all artist rows including non-live, non-public profiles | Added `artists_public_read`: only `is_public=true AND is_live=true` | `20260218_security_hardening.sql` |
| 10 | **HIGH** | Frontend | `StripePaymentSetup.tsx` had placeholder keys resembling live keys (`pk_live_...`, `sk_live_...`) | Keys appear in source, confuse devs into thinking real secrets are hardcoded; could mask actual leaks in code review | Replaced with empty string defaults | `src/components/admin/StripePaymentSetup.tsx` |
| 11 | **MEDIUM** | Worker | No security headers on responses (CSP, X-Frame-Options, etc.) | Clickjacking, MIME sniffing, referrer leakage | Added `applySecurityHeaders()` with CSP, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy | `worker/index.ts` |
| 12 | **MEDIUM** | Worker | CORS preflight (OPTIONS) responses lacked security headers | Inconsistent header coverage | Added X-Content-Type-Options, X-Frame-Options, Referrer-Policy to OPTIONS handler | `worker/index.ts` |
| 13 | **MEDIUM** | Config | `.env.example` referenced `VITE_ADMIN_PASSWORD` | Encouraged hardcoding admin password as frontend env var | Removed line; added "Do NOT add any sensitive keys" comment | `.env.example` |
| 14 | **MEDIUM** | RLS | `stripe_webhook_events` lacked RLS | Authenticated users could query/modify webhook event dedup table | Added `service_role_only` policies for all operations | `20260218_security_hardening.sql` |
| 15 | **MEDIUM** | RLS | `support_messages` had no row-level security | Any user could read all support messages | Added: public insert (for contact form), service-only read/update/delete | `20260218_security_hardening.sql` |
| 16 | **MEDIUM** | Audit | No admin action audit trail | No visibility into who did what from admin panel | Created `admin_audit_log` table + `logAdminAction()` helper; wired into referral grant, support status, admin verify | `worker/index.ts`, `20260218_security_hardening.sql` |
| 17 | **LOW** | Git | `server/.env` committed to repo (placeholder values only) | Bad practice; future devs may paste real secrets here | Document in checklist: `git rm --cached server/.env` | — |
| 18 | **INFO** | Storage | Storage bucket policies properly enforce `auth.uid()` ownership | Upload, update, delete restricted to owner's folder prefix (`split_part(name,'/',1) = auth.uid()::text`) | No fix needed — already secure ✅ | `003_storage_buckets_and_policies.sql` |
| 19 | **INFO** | Stripe | Webhook signature verification already implemented | HMAC-SHA256 with timing-safe compare + 5-min replay window | No fix needed — already secure ✅ | `worker/stripeWebhook.ts` |
| 20 | **INFO** | Worker | Rate limiting already comprehensive | KV-backed fixed-window with per-route presets and in-memory fallback | No fix needed — already secure ✅ | `worker/rateLimit.ts` |

---

## Summary of Changes

### Files Modified

| File | Changes |
|------|---------|
| `worker/index.ts` | Security headers, 6 endpoint auth fixes, isAdmin hardening, audit log helper, artist transfer guard |
| `src/App.tsx` | Removed `ADMIN_EMAILS` hardcoding |
| `src/components/admin/StripePaymentSetup.tsx` | Removed placeholder `pk_live_`/`sk_live_` keys |
| `.env.example` | Removed `VITE_ADMIN_PASSWORD` reference |

### Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/20260218_security_hardening.sql` | Comprehensive RLS migration (12 policy groups + audit table + `is_admin()` rewrite) |
| `SECURITY_AUDIT_REPORT.md` | This report |
| `SECURITY_CHECKLIST.md` | Go-live checklist |
| `SECURITY_TESTING_PLAN.md` | Testing plan |

---

## Architecture Notes

- **Admin identity**: Verified server-side via `isAdminUser()` which checks `ADMIN_EMAILS` env var in Worker secrets (never sent to client)
- **RLS defense-in-depth**: Even if Worker is bypassed, Postgres RLS blocks unauthorized reads/writes
- **Stripe webhook**: Already has HMAC verification + idempotency (no changes needed)
- **Storage buckets**: Already enforce `auth.uid()` folder prefix ownership (no changes needed)
- **Rate limiting**: Already covers all major endpoints with KV-backed fixed-window (no changes needed)
