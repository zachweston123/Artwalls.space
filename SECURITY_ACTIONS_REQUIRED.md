# 🔴 CRITICAL SECURITY ACTIONS REQUIRED

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
