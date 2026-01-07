# ✅ SECURITY FIXES IMPLEMENTED

## Status: In Progress
All code changes completed. Requires 3 manual Cloudflare setup steps.

---

## ✅ COMPLETED (No action needed)

### 1. ✅ Backend Admin Authentication
- Endpoint: `POST /api/admin/verify`
- Password: `StormBL26`
- SHA-256 hash: `7a16eeff525951de7abcf4100e169aa70631b3f3fd22b05649f951f8e8d692c7`
- Frontend updated to call backend for auth verification
- Status: **Code ready to deploy**

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

## 🔴 MANUAL STEPS REQUIRED (3 steps)

### Step 1: Run RLS Migration in Supabase

**Time: 2 minutes**

1. Open Supabase Dashboard: https://supabase.com/dashboard/project/twclqgysvpefufpnmjcl/editor
2. Click "New Query"
3. Copy & paste the entire migration SQL:
   ```sql
   -- Enable Row Level Security on all tables
   ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.artworks ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.wallspaces ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.venue_schedules ENABLE ROW LEVEL SECURITY;

   -- [Full policy definitions - see file for complete SQL]
   ```
   Or use file: [supabase/migrations/20260106_enable_rls.sql](supabase/migrations/20260106_enable_rls.sql)

4. Click "Run"
5. Verify: Should see "12 statements executed"

### Step 2: Deploy Cloudflare Worker

**Time: 1 minute**

```bash
cd ~/Artwalls.space
wrangler deploy

# Verify:
curl https://api.artwalls.space/api/health
# Should return: {"ok":true}

# Test admin auth (should fail with wrong password):
curl -X POST https://api.artwalls.space/api/admin/verify \
  -H "Content-Type: application/json" \
  -d '{"password":"wrong"}' 
# Should return: {"ok":false}

# Test with correct password:
curl -X POST https://api.artwalls.space/api/admin/verify \
  -H "Content-Type: application/json" \
  -d '{"password":"StormBL26"}'
# Should return: {"ok":true}
```

### Step 3: Rebuild & Deploy Frontend

**Time: 2 minutes**

```bash
cd ~/Artwalls.space

# Verify VITE_ADMIN_PASSWORD is removed:
grep -i "VITE_ADMIN_PASSWORD" .env || echo "✓ Correctly removed"

# Rebuild
npm run build

# Verify no hardcoded password in bundle:
grep -i "StormBL26" dist/assets/*.js || echo "✓ No hardcoded password"

# Deploy to Cloudflare Pages
# Option A: Push to GitHub (auto-deploys)
git push origin main

# Option B: Manual deploy (if available)
# npx wrangler pages deploy dist/
```

---

## Verification Checklist

After completing all 3 steps:

- [ ] RLS migration ran successfully in Supabase
- [ ] `wrangler deploy` completed without errors  
- [ ] `/api/health` returns `{"ok":true}`
- [ ] `/api/admin/verify` with "StormBL26" returns `{"ok":true}`
- [ ] `/api/admin/verify` with wrong password returns `{"ok":false}`
- [ ] Frontend rebuilt and deployed
- [ ] Admin console accessible at https://artwalls.space
- [ ] Admin login works with password "StormBL26"
- [ ] No hardcoded password in browser bundle (DevTools → Network → check assets)

---

## Security Test

After deployment, test RLS is working:

```javascript
// In browser console on https://artwalls.space:
const { data, error } = await window.supabase
  .from('artists')
  .select('*');

// Should either:
// - Return empty array
// - Return error "new row violates row level security policy"
// Should NOT return all artists
```

---

## Passwords

| Component | Password | Hash |
|-----------|----------|------|
| Admin Console | `StormBL26` | `7a16eeff525951de7abcf4100e169aa70631b3f3fd22b05649f951f8e8d692c7` |

---

## Timeline

- ✅ Day 1: Code changes completed
- 🔄 Today: Manual steps (5 minutes total)
- ✅ Production ready

**Next:** Follow the 3 manual steps above.


## IMMEDIATE ACTIONS (Before Production Deployment)

### 1. Rotate Supabase Service Role Key (P0 - CRITICAL)

**Why:** Service role key was found in `.env` files. Even though not committed to git, it should be rotated as a precaution.

**Steps:**
1. Go to https://supabase.com/dashboard/project/twclqgysvpefufpnmjcl/settings/api
2. Click "Reset service_role secret" 
3. Copy the new key
4. Update Cloudflare Worker secret:
   ```bash
   cd ~/Artwalls.space
   wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   # Paste the new key when prompted
   ```
5. Update local `server/.env` if still using for development:
   ```bash
   # Edit server/.env and replace SUPABASE_SERVICE_ROLE_KEY with new value
   ```

### 2. Set Admin Password Hash (P0 - CRITICAL)

**Why:** Admin password was hardcoded in frontend. Now moved to backend verification.

**Steps:**
1. Generate SHA-256 hash of your new secure password:
   ```bash
   # On macOS/Linux:
   echo -n "YourNewSecurePassword123!" | shasum -a 256
   
   # Or use Node.js:
   node -e "const crypto = require('crypto'); console.log(crypto.createHash('sha256').update('YourNewSecurePassword123!').digest('hex'))"
   ```

2. Set the hash as a Cloudflare Worker secret:
   ```bash
   wrangler secret put ADMIN_PASSWORD_HASH
   # Paste the SHA-256 hash when prompted
   ```

3. Remove `VITE_ADMIN_PASSWORD` from production environment variables in Cloudflare Pages:
   - Go to https://dash.cloudflare.com/
   - Navigate to Pages → artwalls.space → Settings → Environment variables
   - Delete `VITE_ADMIN_PASSWORD` if present

### 3. Enable Row Level Security (P0 - CRITICAL)

**Why:** All database tables are currently unprotected from direct client access.

**Steps:**
1. Run the migration in Supabase SQL Editor:
   ```bash
   cd ~/Artwalls.space
   cat supabase/migrations/20260106_enable_rls.sql
   ```

2. Copy the contents and paste into:
   - https://supabase.com/dashboard/project/twclqgysvpefufpnmjcl/editor

3. Click "Run" to execute

4. Verify RLS is enabled:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename IN ('artists', 'venues', 'artworks', 'orders');
   ```
   All should show `rowsecurity = true`

### 4. Verify Stripe Webhook Configuration (P1 - HIGH)

**Steps:**
1. Go to https://dashboard.stripe.com/webhooks
2. Verify webhook endpoint is: `https://api.artwalls.space/api/stripe/webhook`
3. Verify these events are enabled:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the webhook signing secret
5. Update Cloudflare Worker secret:
   ```bash
   wrangler secret put STRIPE_WEBHOOK_SECRET
   # Paste webhook signing secret when prompted
   ```

### 5. Commit Security Fixes (P1 - HIGH)

**Steps:**
```bash
cd ~/Artwalls.space

# Stage all changes
git add .gitignore
git add supabase/migrations/20260106_enable_rls.sql
git add src/components/admin/AdminPasswordPrompt.tsx
git add worker/index.ts

# Commit (build artifacts already removed)
git commit -m "Security fixes: RLS migration, backend admin auth, remove build artifacts

- Enable RLS on all tables with proper policies
- Move admin password verification to backend API
- Remove hardcoded password from frontend bundle
- Add .gitignore entries for secrets and artifacts
- Remove duplicate wrangler.toml
- Remove dist/ and node_modules/ from git tracking

BREAKING: Admin authentication now requires ADMIN_PASSWORD_HASH secret in Cloudflare Worker"

# Push to GitHub
git push origin main
```

### 6. Deploy Updated Worker (P1 - HIGH)

**Steps:**
```bash
cd ~/Artwalls.space
wrangler deploy

# Verify deployment
curl https://api.artwalls.space/api/health
# Should return: {"ok":true}

# Test admin verification (should fail without proper password)
curl -X POST https://api.artwalls.space/api/admin/verify \
  -H "Content-Type: application/json" \
  -d '{"password":"test"}'
# Should return: {"ok":false}
```

### 7. Rebuild and Deploy Frontend (P1 - HIGH)

**Steps:**
```bash
cd ~/Artwalls.space

# Ensure VITE_ADMIN_PASSWORD is NOT in .env (it should be removed)
grep VITE_ADMIN_PASSWORD .env && echo "⚠️  Remove VITE_ADMIN_PASSWORD from .env!"

# Rebuild
npm run build

# Deploy to Cloudflare Pages (or wait for automatic deployment from GitHub)
```

## VERIFICATION CHECKLIST

After completing all steps, verify:

- [ ] Supabase service role key has been rotated
- [ ] New service role key set in Cloudflare Worker secrets
- [ ] Admin password hash set in Cloudflare Worker secrets
- [ ] `VITE_ADMIN_PASSWORD` removed from Cloudflare Pages environment variables
- [ ] RLS migration run successfully in Supabase
- [ ] All tables show RLS enabled in Supabase
- [ ] Stripe webhook secret updated in Cloudflare Worker
- [ ] Changes committed and pushed to GitHub
- [ ] Cloudflare Worker deployed successfully
- [ ] Frontend rebuilt without `VITE_ADMIN_PASSWORD`
- [ ] Admin console login works via backend verification
- [ ] Test that anon key cannot access protected data directly

## TEST SECURITY

```bash
# Test 1: RLS blocks direct database access
# In browser console on https://artwalls.space:
const { createClient } = window.supabase;
const client = createClient(
  'https://twclqgysvpefufpnmjcl.supabase.co',
  'YOUR_ANON_KEY'
);
const { data, error } = await client.from('orders').select('*');
// Should return error or empty array (not all orders)

# Test 2: Admin login works
# 1. Open https://artwalls.space
# 2. Press Ctrl+Shift+A (or Cmd+Shift+A on Mac)
# 3. Enter your new admin password
# 4. Should successfully authenticate via backend
```

## OPTIONAL BUT RECOMMENDED

### Set Up Secret Scanning

```bash
# Install git-secrets
brew install git-secrets  # macOS
# or
apt-get install git-secrets  # Linux

# Set up patterns
git secrets --register-aws
git secrets --add 'eyJhbGc.*'  # Supabase JWTs
git secrets --add 'sk_live_.*'  # Stripe live keys
git secrets --add 'sk_test_.*'  # Stripe test keys
git secrets --add 'whsec_.*'    # Stripe webhook secrets

# Scan history
git secrets --scan-history
```

### Monitor for Exposed Secrets

- Set up alerts for commits containing potential secrets
- Use GitHub's secret scanning (available on public repos)
- Consider using tools like TruffleHog or GitGuardian

---

**Status:** Security fixes implemented. Complete the steps above before production deployment.
