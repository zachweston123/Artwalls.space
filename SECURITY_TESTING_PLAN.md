# Artwalls.space — Security Testing Plan

---

## 1. Unit Tests (Auth & Validation Guards)

These tests verify the Worker's security logic in isolation. Use `vitest` with `miniflare` for Cloudflare Worker testing.

### 1.1 `requireAdmin()` Guard

| Test | Input | Expected |
|------|-------|----------|
| No auth header | `GET /api/admin/metrics` (no Bearer) | 401 `AUTH_REQUIRED` |
| Valid non-admin token | Bearer token for regular user | 403 `ADMIN_REQUIRED` |
| Valid admin token | Bearer token for user in `ADMIN_EMAILS` | 200, `__adminUser` set on request |
| Spoofed `user_metadata.isAdmin` | User sets `isAdmin: true` in their metadata | 403 (server-side check ignores client metadata) |

### 1.2 Ownership Enforcement

| Test | Endpoint | Input | Expected |
|------|----------|-------|----------|
| Own stats | `GET /api/stats/artist?id=<own-id>` | Valid Bearer | 200 |
| Other's stats | `GET /api/stats/artist?id=<other-id>` | Valid Bearer (non-admin) | 403 |
| Admin reads other's stats | `GET /api/stats/artist?id=<other-id>` | Admin Bearer | 200 |
| Unauthenticated stats | `GET /api/stats/artist?id=<any>` | No Bearer | 401 |
| Own profile upsert | `POST /api/artists` body `{id: own-id}` | Valid Bearer | 200 |
| Impersonation upsert | `POST /api/artists` body `{id: other-id}` | Valid Bearer (non-admin) | 403 |
| Own artwork link | `GET /api/artworks/<own-artwork>/link` | Valid Bearer | 200 |
| Other's artwork link | `GET /api/artworks/<other-artwork>/link` | Valid Bearer (non-admin) | 403 |

### 1.3 Input Validation

| Test | Endpoint | Input | Expected |
|------|----------|-------|----------|
| Invalid UUID | `GET /api/stats/artist?id=not-a-uuid` | Valid Bearer | 400 |
| Missing required field | `POST /api/admin/referrals/grant` body `{}` | Admin Bearer | 400 `referralId required` |
| Invalid status value | `PATCH /api/admin/support/messages/<id>/status` body `{status:"hacked"}` | Admin Bearer | 400 |

### 1.4 Security Headers

| Test | Request | Expected Headers |
|------|---------|-----------------|
| Normal response | `GET /api/health` | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` |
| CORS preflight | `OPTIONS /api/health` | Same security headers + CORS headers |
| CSP present | Any response | `Content-Security-Policy: default-src 'self'` |

---

## 2. Integration Tests (Stripe & Supabase)

### 2.1 Stripe Webhook Verification

| Test | Input | Expected |
|------|-------|----------|
| Valid signature | POST with correct `Stripe-Signature` header | 200, event processed |
| Invalid signature | POST with tampered `Stripe-Signature` | 400 `Invalid signature` |
| Missing signature | POST with no `Stripe-Signature` header | 400 |
| Replay attack (>5 min) | Valid signature but timestamp >5 minutes old | 400 `Webhook timestamp too old` |
| Duplicate event | Same `stripe_event_id` sent twice | 200 (idempotent, second is no-op) |

### 2.2 Stripe Connect Payouts

| Test | Scenario | Expected |
|------|----------|----------|
| Artist `payouts_enabled = true` | Transfer after sale | Transfer succeeds |
| Artist `payouts_enabled = false` | Transfer after sale | Transfer skipped, logged as warning |
| Venue `payouts_enabled = true` | Transfer after sale | Transfer succeeds |
| Venue `payouts_enabled = false` | Transfer after sale | Transfer skipped, logged as warning |

### 2.3 RLS Policy Verification

Run as different Supabase roles:

| Test | Role | Query | Expected |
|------|------|-------|----------|
| Public artwork read | `anon` | `SELECT * FROM artworks WHERE status='available'` | Returns only public, non-archived artworks |
| Draft artwork hidden | `anon` | `SELECT * FROM artworks WHERE status='draft'` | 0 rows |
| Own artwork visible | `authenticated` (artist) | `SELECT * FROM artworks WHERE artist_id = auth.uid()` | Returns all own artworks |
| Webhook events hidden | `authenticated` | `SELECT * FROM stripe_webhook_events` | Permission denied |
| Support message insert | `anon` | `INSERT INTO support_messages (email, message) VALUES (...)` | Succeeds |
| Support message read | `authenticated` (non-admin) | `SELECT * FROM support_messages` | 0 rows (service-only) |
| Audit log read | `authenticated` | `SELECT * FROM admin_audit_log` | Permission denied |
| Artists public read | `anon` | `SELECT * FROM artists WHERE is_public=false` | 0 rows |
| `is_admin()` as regular user | `authenticated` | `SELECT is_admin()` | `false` |
| `is_admin()` spoofed metadata | `authenticated` (metadata `isAdmin: true`) | `SELECT is_admin()` | `false` |

---

## 3. Manual Test Script

### 3.1 Frontend Bundle Verification

```bash
# Build the frontend
npm run build

# Check for leaked secrets in the bundle
echo "=== Checking for secrets in dist/ ==="
grep -rn 'ADMIN_EMAILS\|sk_live\|sk_test\|service_role\|ADMIN_PASSWORD' dist/
echo "Expected: 0 hits"

# Check for hardcoded admin emails
grep -rn 'zweston8136\|sdsu\.edu' dist/
echo "Expected: 0 hits"
```

### 3.2 API Endpoint Auth Verification

```bash
BASE="https://YOUR-WORKER.workers.dev"

echo "=== 1. Unauthenticated stats (should 401) ==="
curl -s -o /dev/null -w "%{http_code}" "$BASE/api/stats/artist?id=00000000-0000-0000-0000-000000000000"

echo "=== 2. Unauthenticated analytics (should 401) ==="
curl -s -o /dev/null -w "%{http_code}" "$BASE/api/analytics/artist?id=00000000-0000-0000-0000-000000000000"

echo "=== 3. Unauthenticated profile upsert (should 401) ==="
curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/artists" \
  -H "Content-Type: application/json" \
  -d '{"id":"00000000-0000-0000-0000-000000000000","name":"hacker"}'

echo "=== 4. Unauthenticated artwork link (should 401) ==="
curl -s -o /dev/null -w "%{http_code}" "$BASE/api/artworks/00000000-0000-0000-0000-000000000000/link"

echo "=== 5. Non-admin verify (should 403) ==="
# Replace with a valid non-admin Bearer token
curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/admin/verify" \
  -H "Authorization: Bearer <NON_ADMIN_TOKEN>"

echo "=== 6. Security headers present ==="
curl -sI "$BASE/api/health" | grep -iE 'x-frame|x-content-type|referrer-policy|content-security-policy'

echo "=== 7. CORS preflight headers ==="
curl -sI -X OPTIONS "$BASE/api/health" \
  -H "Origin: https://artwalls.space" \
  -H "Access-Control-Request-Method: GET" \
  | grep -iE 'x-frame|x-content-type|referrer-policy|access-control'
```

### 3.3 Admin Audit Log Verification

```sql
-- After performing admin actions, verify entries appear:
SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT 10;

-- Expected columns: admin_user_id, action, target_table, target_id, meta, created_at
-- Expected actions: 'admin_verify', 'referral_grant', 'support_message_status'
```

### 3.4 RLS Quick Verification

```sql
-- As anon role:
SET ROLE anon;
SELECT count(*) FROM artworks WHERE status = 'draft'; -- should be 0
SELECT count(*) FROM stripe_webhook_events; -- should error
SELECT count(*) FROM support_messages; -- should be 0
SELECT count(*) FROM admin_audit_log; -- should error
RESET ROLE;
```

---

## 4. CI/CD Integration Recommendations

1. **Pre-commit hook**: `grep -rn 'sk_live\|sk_test\|service_role' src/ worker/` → fail if hits
2. **GitHub Actions secret scanning**: Enable in repo Settings → Code security
3. **Bundle size check**: Alert if `dist/` contains patterns matching secret formats
4. **Supabase migration test**: Run migrations against a test database in CI
5. **Worker smoke test**: Deploy to staging, run curl checks from §3.2 above

---

*Last updated: 2025-01-18 — Security Audit Phase*
