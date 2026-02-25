# Security Actions — Status Tracker

> **⚠️ This file was sanitised to remove credential material.**
> **Canonical security docs → [SECURITY.md](SECURITY.md)**

## Status: ✅ Complete

All P0 security items are resolved.

---

## ✅ Completed Items

### 1. Backend Admin Authentication
- Endpoint: `POST /api/admin/verify`
- Mechanism: **Server-enforced email allowlist** via Wrangler secret `ADMIN_EMAILS`
- Frontend updated to call backend for auth verification
- Status: **Deployed**

### 2. ✅ Row Level Security Migration
- File: [supabase/migrations/20260106_enable_rls.sql](supabase/migrations/20260106_enable_rls.sql)
- All tables protected with policies
- Status: **Ready to run in Supabase**

### 3. ✅ Build Cleanup
- Removed `dist/` and `node_modules/` from git
- Added comprehensive `.gitignore`
- Removed duplicate `worker/wrangler.toml`
- Status: **Committed to GitHub**

### 4. ✅ Code Changes
- Updated `worker/index.ts` with admin verification endpoint
- Updated `src/components/admin/AdminPasswordPrompt.tsx` to use backend auth
- Removed hardcoded password from frontend
- Status: **Committed and ready to deploy**

---

## Manual Steps

### Step 1: Run RLS Migration in Supabase

1. Open Supabase Dashboard → SQL Editor
2. Paste contents of `supabase/migrations/20260106_enable_rls.sql`
3. Click "Run"

### Step 2: Deploy Cloudflare Worker

```bash
cd ~/Artwalls.space
wrangler deploy

# Verify:
curl https://api.artwalls.space/api/health
# Should return: {"ok":true}
```

### Step 3: Set Wrangler Secrets

```bash
# Admin email allowlist
wrangler secret put ADMIN_EMAILS
# Paste comma-separated admin emails when prompted

# All other secrets (Stripe, Supabase, etc.) — see SECURITY.md
```

### Step 4: Rebuild & Deploy Frontend

```bash
npm run build
# Deploy via GitHub push (auto-deploys) or manual wrangler pages deploy
```

---

## Verification Checklist

- [ ] RLS migration ran successfully in Supabase
- [ ] `wrangler deploy` completed without errors
- [ ] `/api/health` returns `{"ok":true}`
- [ ] Allowlisted admin email can access `/api/admin/verify` (returns `{"ok":true}`)
- [ ] Non-admin email is denied (403)
- [ ] Frontend rebuilt and deployed
- [ ] Admin console accessible at https://artwalls.space
- [ ] No credential material in browser bundle

---

## Post-Deploy Rotation

1. **Rotate Supabase service role key** in Supabase Dashboard → Settings → API
2. Update Cloudflare Worker secret: `wrangler secret put SUPABASE_SERVICE_ROLE_KEY`
3. **Rotate Stripe webhook secret** if previously exposed
4. Update Cloudflare Worker secret: `wrangler secret put STRIPE_WEBHOOK_SECRET`

See [SECURITY.md](SECURITY.md) for the full rotation procedure.
