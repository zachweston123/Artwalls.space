# Security Policy — Artwalls.space

> **This is the single source of truth** for secrets handling, admin access,
> and security practices. All other security docs reference this file.

---

## Reporting Vulnerabilities

1. **Do not** open a public GitHub issue.
2. Email **security@artwalls.space** with a description and reproduction steps.
3. We will respond within 48 hours.

---

## 1. Where Secrets Live

| Secret | Provider | How to set |
|--------|----------|-----------|
| `STRIPE_SECRET_KEY` | Cloudflare Worker secret | `wrangler secret put STRIPE_SECRET_KEY` |
| `STRIPE_WEBHOOK_SECRET` | Cloudflare Worker secret | `wrangler secret put STRIPE_WEBHOOK_SECRET` |
| `SUPABASE_URL` | Cloudflare Worker secret | `wrangler secret put SUPABASE_URL` |
| `SUPABASE_SERVICE_ROLE_KEY` | Cloudflare Worker secret | `wrangler secret put SUPABASE_SERVICE_ROLE_KEY` |
| `ADMIN_EMAILS` | Cloudflare Worker secret | `wrangler secret put ADMIN_EMAILS` (comma-separated) |
| `VITE_SUPABASE_URL` | GitHub Actions secret / Cloudflare Pages env | Non-sensitive (public anon endpoint) |
| `VITE_SUPABASE_ANON_KEY` | GitHub Actions secret / Cloudflare Pages env | Non-sensitive (public anon key) |
| `CLOUDFLARE_API_TOKEN` | GitHub Actions secret | Cloudflare dashboard → API Tokens |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub Actions secret | Cloudflare dashboard → Overview |
| Stripe price IDs | Cloudflare Worker secret | `wrangler secret put STRIPE_PRICE_ID_*` |

**Rules:**
- `.dev.vars` and `.env` are in `.gitignore` and must **never** be committed.
- `server/.env.example` contains only placeholder values (`REPLACE_ME`, `YOUR_*`).
- If you accidentally commit a secret, rotate it **immediately** in the provider
  dashboard and run BFG Repo-Cleaner to purge it from git history.

---

## 2. Admin Access Model

### Mechanism: Server-Enforced Email Allowlist

Admin access is **not** password-based. It uses a server-side email allowlist:

```
User authenticates (Supabase email/password or OAuth)
  ↓
Frontend calls POST /api/admin/verify (with Supabase JWT)
  ↓
Cloudflare Worker:
  1. Validates JWT → extracts user email
  2. Checks email against ADMIN_EMAILS secret (comma-separated list)
  3. If match → sets user_metadata.role = 'admin', returns { ok: true }
  4. If no match → returns 403 Forbidden
```

### Key Code Paths

| Location | Function |
|----------|----------|
| `worker/index.ts` — `isAdminUser()` | Checks email against `ADMIN_EMAILS` env var |
| `worker/index.ts` — `requireAdmin()` | Auth + admin gate; returns 401/403/500 or null (success) |
| `worker/index.ts` — `logAdminAction()` | Writes to `admin_audit_log` table |
| `src/components/admin/AdminPasswordPrompt.tsx` | Frontend modal that calls `/api/admin/verify` |

### Granting / Revoking Admin

```bash
# Grant: add email to the allowlist
wrangler secret put ADMIN_EMAILS
# Enter: existing@example.com,new-admin@example.com

# Revoke: remove email from the list and re-set the secret
wrangler secret put ADMIN_EMAILS
# Enter: existing@example.com
```

### What is NOT Used

- ~~Client-side password comparison~~ — removed.
- ~~`ADMIN_PASSWORD` / `ADMIN_PASSWORD_HASH` env vars~~ — not used by the Worker.
- ~~`VITE_ADMIN_PASSWORD`~~ — never ship secrets to the frontend.
- ~~`user_metadata.isAdmin`~~ — explicitly untrusted (user-editable). The Worker
  comment says: *"SECURITY: Never trust user_metadata.isAdmin"*.

---

## 3. Audit Trail

Every admin action writes to the `admin_audit_log` Supabase table:

| Column | Type | Description |
|--------|------|-------------|
| `admin_user_id` | uuid | Who performed the action |
| `action` | text | e.g. `admin_verify`, `suspend_user`, `update_tier` |
| `target_type` | text | Table name (e.g. `artists`, `venues`) |
| `target_id` | text | Row ID affected |
| `meta` | jsonb | Extra context |
| `created_at` | timestamptz | When |

---

## 4. Current Protections

| Layer | Protection |
|-------|-----------|
| Auth | Supabase JWT + RLS on all tables |
| Admin | Email-allowlist verified server-side (`requireAdmin()`) |
| CORS | Allowlisted origins only (`artwalls.space`, `www.artwalls.space`, `localhost`) |
| Rate limiting | Per-route, per-IP and per-user counters (KV-backed in prod) |
| Secrets | All API keys and service-role keys are Cloudflare Worker secrets; **never** in frontend bundles |
| Webhooks | Stripe `whsec_` verification on every event (`verifyAndParseStripeEvent`) |
| RLS | Row-Level Security enabled on every Supabase table |
| CI | Gitleaks + grep-based secret scanning on every PR (`.github/workflows/security.yml`) |

---

## 5. Secret Rotation Procedure

1. **Generate new value** in the provider dashboard (Stripe, Supabase, Cloudflare).
2. **Set the new secret** in Cloudflare:
   ```bash
   wrangler secret put <SECRET_NAME>
   ```
3. **Deploy the Worker** (if the secret name changed):
   ```bash
   cd worker && wrangler deploy
   ```
4. **Verify** the health endpoint returns `{"ok":true}`:
   ```bash
   curl https://api.artwalls.space/api/health
   ```
5. **Delete the old value** from the provider dashboard if applicable.
6. **Update local `.dev.vars`** for development.

---

## 6. Checklist Before Deploy

- [ ] No `sk_live_`, `sk_test_`, `whsec_`, or `service_role` JWT strings in source files.
- [ ] `.dev.vars` and `.env` are **not** tracked (`git ls-files | grep -E '\.env$|\.dev\.vars$'` returns 0).
- [ ] `VITE_ADMIN_PASSWORD` does not appear anywhere.
- [ ] All Stripe price IDs are set as Worker secrets, not hardcoded.
- [ ] CI secret-scan job passes (`security.yml`).
- [ ] `ADMIN_EMAILS` Wrangler secret is set and contains at least one email.
