# Troubleshooting: "Select Plan" Button Not Working

## Issue
When clicking "Select Plan", the Stripe checkout page doesn't launch.

---

## Quick Diagnostic Steps

### Step 1: Check Browser Console (MOST IMPORTANT!)

1. Open your browser's Developer Tools:
   - **Chrome/Edge:** Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
   - **Firefox:** Press `F12`
   - **Safari:** Enable Developer menu first, then press `Cmd+Option+I`

2. Click the **Console** tab

3. Click "Select Plan" button again

4. Look for error messages (they'll be in red)

### Common Errors You Might See:

#### Error 1: Network/CORS Error
```
Access to fetch at 'https://api.artwalls.space' has been blocked by CORS policy
```
**OR**
```
Failed to fetch
```

**Solution:** Backend server is not running or CORS not configured
- Check if backend is running: Visit https://api.artwalls.space/api/health
- Should return `{"ok":true}`

---

#### Error 2: Authentication Error
```
Please sign in to purchase a subscription plan.
```
**OR**
```
401 Unauthorized
Missing Authorization bearer token
```

**Solution:** You need to be logged in
1. Go to your login page
2. Sign in as an artist
3. Then try "Select Plan" again

---

#### Error 3: Price ID Error
```
Invalid tier or missing subscription price ID (env or settings)
```

**Solution:** Environment variables not loaded in Cloudflare Workers
1. Go to Cloudflare Dashboard → Workers & Pages
2. Find your **api** worker (not the Pages deployment)
3. Click Settings → Variables
4. Verify these are set:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_SUB_PRICE_STARTER`
   - `STRIPE_SUB_PRICE_GROWTH`
   - `STRIPE_SUB_PRICE_PRO`
5. Click "Deploy" to apply changes

---

#### Error 4: Backend Not Responding
```
Network error: Failed to fetch
```

**Solution:** 
Check if your Cloudflare Worker is deployed:
1. Visit: https://api.artwalls.space/api/health
2. Should return: `{"ok":true}`
3. If 404 or timeout → Worker not deployed
4. If CORS error → CORS_ORIGIN not configured

---

## Step 2: Test Backend Endpoint Directly

Open a new terminal and run:

```bash
# Test if backend is running
curl https://api.artwalls.space/api/health

# Expected: {"ok":true}
```

If you get an error, your backend worker is not deployed or not running.

---

## Step 3: Check Cloudflare Workers Deployment

### Verify API Worker Exists

1. Go to: https://dash.cloudflare.com
2. Click **Workers & Pages**
3. Look for your **api** worker (usually named `api` or `artwalls-api`)

### Check if Variables Are Set

1. Click on your **api** worker
2. Go to **Settings** → **Variables**
3. Verify ALL these are set:

```
✅ STRIPE_SECRET_KEY (should start with sk_live_ or sk_test_)
✅ STRIPE_WEBHOOK_SECRET (should start with whsec_)
✅ STRIPE_SUB_PRICE_STARTER (should start with price_)
✅ STRIPE_SUB_PRICE_GROWTH (should start with price_)
✅ STRIPE_SUB_PRICE_PRO (should start with price_)
✅ SUPABASE_URL
✅ SUPABASE_SERVICE_ROLE_KEY
```

**IMPORTANT:** After adding variables, you MUST click **"Deploy"** or **"Save and Deploy"**

### Check Deployment Status

1. In Cloudflare Workers dashboard
2. Check **Deployments** tab
3. Latest deployment should be "Active"
4. Check deployment date (should be recent)

---

## Step 4: Check if You're Logged In

The subscription endpoint requires authentication.

### Verify Login Status in Browser Console:

```javascript
// Paste this in browser console (F12)
const { supabase } = await import('https://artwalls.space/src/lib/supabase.ts');
const { data } = await supabase.auth.getSession();
console.log('User:', data.session?.user?.email);
console.log('Token:', data.session?.access_token ? 'Present' : 'Missing');
```

**Expected:**
```
User: your-email@example.com
Token: Present
```

**If Token is Missing:**
1. Go to login page
2. Sign in
3. Return to pricing page
4. Try again

---

## Step 5: Test API Call Manually

In browser console (F12), paste this:

```javascript
// Test subscription endpoint
const API_BASE = 'https://api.artwalls.space';

// Get auth token
const { supabase } = await import('https://artwalls.space/src/lib/supabase.ts');
const { data } = await supabase.auth.getSession();
const token = data.session?.access_token;

if (!token) {
  console.error('❌ Not logged in!');
} else {
  console.log('✅ Logged in as:', data.session.user.email);
  
  // Test API call
  try {
    const response = await fetch(`${API_BASE}/api/stripe/billing/create-subscription-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        tier: 'starter',
        artistId: data.session.user.id
      })
    });
    
    const result = await response.json();
    console.log('Response:', result);
    
    if (result.url) {
      console.log('✅ Success! Checkout URL:', result.url);
      // Uncomment to redirect:
      // window.location.href = result.url;
    } else {
      console.error('❌ No URL returned:', result);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}
```

**What to look for:**

✅ **Success Response:**
```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```
→ If you see this, the backend is working! The issue is in the frontend.

❌ **Error Response:**
```json
{
  "error": "Invalid tier or missing subscription price ID (env or settings)"
}
```
→ Environment variables not set in Cloudflare Workers

❌ **401 Error:**
```json
{
  "error": "Missing Authorization bearer token"
}
```
→ Not logged in

---

## Step 6: Check Frontend Environment Variables

Your frontend might be pointing to the wrong backend URL.

### Check VITE_API_BASE_URL

1. Look at your `.env` file (or `.env.local`)
2. Should have:
   ```
   VITE_API_BASE_URL=https://api.artwalls.space
   ```

3. In browser console, check:
   ```javascript
   console.log('API Base:', import.meta.env.VITE_API_BASE_URL);
   ```
   
   Should show: `https://api.artwalls.space`

---

## Step 7: Check Cloudflare Workers Logs

Real-time logs can show what's happening:

1. Go to Cloudflare Dashboard → Workers & Pages
2. Click your **api** worker
3. Click **Logs** tab (or **Real-time logs**)
4. Keep this open
5. Click "Select Plan" button
6. Watch for errors in logs

---

## Most Likely Causes (In Order)

### 1. ⚠️ Not Logged In (90% of cases)
**Fix:** Sign in to your account first

### 2. ⚠️ Environment Variables Not Set in Cloudflare Workers
**Fix:** 
1. Cloudflare Dashboard → Workers → api worker
2. Settings → Variables
3. Add all Stripe variables
4. Click "Deploy"

### 3. ⚠️ Backend Worker Not Deployed
**Fix:**
1. Push your code to GitHub
2. Cloudflare should auto-deploy
3. Or manually deploy via wrangler: `wrangler deploy`

### 4. ⚠️ Wrong API Base URL
**Fix:** Check `.env` file has correct backend URL

### 5. ⚠️ CORS Issue
**Fix:** Backend needs CORS_ORIGIN environment variable set

---

## Quick Fix Checklist

Run through these in order:

- [ ] Browser console open (F12)
- [ ] Logged in to the platform (check console for token)
- [ ] Backend responding: `curl https://api.artwalls.space/api/health`
- [ ] Cloudflare Workers variables set (all 7 variables)
- [ ] Cloudflare Workers deployed recently
- [ ] Click "Select Plan" and check console for errors
- [ ] Run manual API test from console (Step 5 above)

---

## What to Report

If still not working, copy this info:

1. **Browser Console Errors:** (screenshot or copy error messages)
2. **Backend Health Check:** Result of `curl https://api.artwalls.space/api/health`
3. **Login Status:** Are you logged in? What's your user email?
4. **Cloudflare Variables:** Are they all set? (don't share actual values)
5. **Manual API Test Result:** (from Step 5 above)

---

## Next Steps

After identifying the issue:

1. **If authentication issue:** Sign in first
2. **If environment variables issue:** Set them in Cloudflare Workers and deploy
3. **If backend not running:** Deploy your worker
4. **If still stuck:** Share console errors and we'll debug further

---

**Most likely fix:** You need to sign in to your account before clicking "Select Plan"!
