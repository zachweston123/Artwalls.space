# Production Deployment Guide

## 🚀 Quick Start for Production Launch

This guide walks you through deploying Artwalls to production with proper security and configuration.

## Prerequisites

- [ ] Stripe account (live mode enabled)
- [ ] Supabase project (production)
- [ ] Cloudflare account (for Workers and Pages)
- [ ] Domain configured (e.g., artwalls.space)
- [ ] SSL certificates (automatic with Cloudflare)

## Step 1: Generate Secure Admin Password

**CRITICAL:** Never use the default development password in production.

```bash
# Generate a strong random password (macOS/Linux)
openssl rand -base64 24

# Or use a password manager to generate:
# - Minimum 16 characters
# - Mix of uppercase, lowercase, numbers, symbols
# - Example: K9$mP#2nQ@7xR!5wL&8uT
```

Save this password securely - you'll need it for both frontend and backend configuration.

## Step 2: Configure Environment Variables

### Frontend (.env for Vite)

Create `.env.production` file:

```env
# API Backend
VITE_API_BASE_URL=https://api.artwalls.space

# Supabase (Frontend)
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

# Stripe (Frontend - Publishable Key)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_PUBLISHABLE_KEY

# Admin Access (use password generated in Step 1)
VITE_ADMIN_PASSWORD=YOUR_SECURE_ADMIN_PASSWORD_HERE

# Optional: Error Tracking
# VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
```

### Backend (Server)

Create `server/.env.production` file:

```env
# Server Configuration
NODE_ENV=production
PORT=4242
APP_URL=https://artwalls.space
CORS_ORIGIN=https://artwalls.space

# Stripe (Live Keys)
STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_live_YOUR_WEBHOOK_SECRET

# Stripe Subscription Price IDs (Live Mode)
STRIPE_SUB_PRICE_STARTER=price_live_starter
STRIPE_SUB_PRICE_GROWTH=price_live_growth
STRIPE_SUB_PRICE_PRO=price_live_pro
STRIPE_SUB_PRICE_ELITE=price_live_elite

# Supabase (Service Role - Backend Only)
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

# Admin Access (same password as frontend)
ADMIN_PASSWORD=YOUR_SECURE_ADMIN_PASSWORD_HERE

# Optional: Admin Email Allowlist (comma-separated)
ADMIN_EMAILS=admin@artwalls.space,support@artwalls.space

# Checkout URLs
CHECKOUT_SUCCESS_URL=https://artwalls.space/#/purchase-success
CHECKOUT_CANCEL_URL=https://artwalls.space/#/purchase-cancel
SUB_SUCCESS_URL=https://artwalls.space/#/artist-dashboard?sub=success
SUB_CANCEL_URL=https://artwalls.space/#/artist-dashboard?sub=cancel
CONNECT_REFRESH_URL=https://artwalls.space/#/dashboard

# Platform Fees (basis points: 10000 = 100%)
FEE_BPS_FREE=2000
FEE_BPS_STARTER=1500
FEE_BPS_PRO=1000
FEE_BPS_ELITE=500

# Optional: Email (SMTP)
# SMTP_HOST=smtp.sendgrid.net
# SMTP_PORT=587
# SMTP_USER=apikey
# SMTP_PASS=YOUR_SENDGRID_API_KEY
# SMTP_FROM=noreply@artwalls.space
```

### Cloudflare Worker

Set secrets via Wrangler CLI:

```bash
cd worker

# Stripe
wrangler secret put STRIPE_SECRET_KEY
# Paste: sk_live_YOUR_SECRET_KEY

wrangler secret put STRIPE_WEBHOOK_SECRET
# Paste: whsec_live_YOUR_WEBHOOK_SECRET

# Supabase
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Paste: YOUR_SERVICE_ROLE_KEY

# Optional: Twilio (for SMS notifications)
wrangler secret put TWILIO_ACCOUNT_SID
wrangler secret put TWILIO_AUTH_TOKEN
wrangler secret put TWILIO_FROM_NUMBER
```

Update `worker/wrangler.toml`:

```toml
[vars]
API_BASE_URL = "https://api.artwalls.space"
SUPABASE_URL = "https://YOUR_PROJECT_REF.supabase.co"
PAGES_ORIGIN = "https://artwalls.space"
```

## Step 3: Configure Stripe for Production

### Switch to Live Mode

1. Go to https://dashboard.stripe.com
2. Toggle from "Test mode" to "Live mode" (top right)

### Create Products and Prices

Create subscription products:

```
Product: Starter Plan
- Price: $29/month
- Copy the Price ID: price_live_xxx
- Set in STRIPE_SUB_PRICE_STARTER

Product: Growth Plan
- Price: $79/month
- Copy the Price ID: price_live_xxx
- Set in STRIPE_SUB_PRICE_GROWTH

Product: Pro Plan
- Price: $149/month
- Copy the Price ID: price_live_xxx
- Set in STRIPE_SUB_PRICE_PRO

Product: Elite Plan
- Price: $299/month
- Copy the Price ID: price_live_xxx
- Set in STRIPE_SUB_PRICE_ELITE
```

### Configure Webhooks

1. Go to Developers → Webhooks
2. Add endpoint: `https://api.artwalls.space/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `account.updated` (for Connect)
4. Copy the webhook signing secret → `STRIPE_WEBHOOK_SECRET`

### Enable Connect

1. Go to Connect → Settings
2. Set brand colors and logo
3. Configure onboarding
4. Test with a demo venue account

## Step 4: Configure Supabase

### Run Migrations

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your production project
supabase link --project-ref YOUR_PROJECT_REF

# Run all migrations
supabase db push
```

### Verify Tables

Required tables:
- `artists`
- `venues`
- `artworks`
- `wallspaces`
- `orders`
- `bookings`
- `notifications`
- `stripe_events`
- `venue_schedules`

### Enable Row Level Security (RLS)

Verify RLS is enabled on all tables:

```sql
-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

All tables should have `rowsecurity = true`.

### Configure Auth

1. Go to Authentication → Providers
2. Enable Email provider
3. Configure redirect URLs:
   - Site URL: `https://artwalls.space`
   - Redirect URLs: `https://artwalls.space/**`
4. Set email templates (optional)

## Step 5: Deploy to Cloudflare

### Deploy Frontend (Cloudflare Pages)

```bash
# Build the frontend
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy dist --project-name=artwalls

# Or connect GitHub repo for auto-deployment
# Go to Cloudflare Dashboard → Pages → Create Project
# Connect your GitHub repo
# Set build command: npm run build
# Set build output directory: dist
```

Set environment variables in Cloudflare Pages:
- `VITE_API_BASE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `VITE_ADMIN_PASSWORD`

### Deploy Worker

```bash
cd worker
npx wrangler deploy
```

This deploys to `api.artwalls.space` (configured in wrangler.toml).

### Deploy Backend Server

Option A: **Render.com** (Recommended)

1. Create new Web Service
2. Connect GitHub repo
3. Build command: `cd server && npm install`
4. Start command: `cd server && node index.js`
5. Add environment variables from `.env.production`

Option B: **Railway** or **Heroku**

Similar process - connect repo, set environment variables, deploy.

## Step 6: Configure DNS

In Cloudflare DNS:

```
Type    Name    Target                          Proxy
A       @       [Cloudflare Pages IP]           Yes
A       api     [Worker/Server IP]              Yes
CNAME   www     artwalls.space                  Yes
```

## Step 7: Testing Checklist

### User Flows

- [ ] Artist signup and login
- [ ] Venue signup and login
- [ ] Upload artwork
- [ ] Create venue profile
- [ ] Submit artwork application
- [ ] Approve/reject application
- [ ] Purchase subscription (use real card in test)
- [ ] Access billing portal
- [ ] Purchase artwork (use test card first)
- [ ] Generate QR code
- [ ] Schedule install/pickup
- [ ] Receive notifications
- [ ] Admin login with new password

### Payment Testing

Test with Stripe test cards first:
- `4242 4242 4242 4242` - Success
- `4000 0000 0000 9995` - Declined

Then test with real card (refund after):
- Complete actual subscription purchase
- Verify webhook processing
- Check database updates

### Security Testing

- [ ] Admin access requires correct password
- [ ] Legacy dev credentials no longer grant access
- [ ] JWT authentication working
- [ ] CORS properly configured
- [ ] No sensitive data in frontend
- [ ] API endpoints require authentication
- [ ] Webhook signatures verified

## Step 8: Monitoring Setup

### Error Tracking (Recommended: Sentry)

```bash
npm install @sentry/react @sentry/vite-plugin

# Add to vite.config.ts
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig({
  plugins: [
    sentryVitePlugin({
      org: "your-org",
      project: "artwalls"
    })
  ]
});
```

### Uptime Monitoring

Options:
- UptimeRobot (free)
- Pingdom
- StatusCake

Monitor:
- `https://artwalls.space`
- `https://api.artwalls.space/api/health`

### Stripe Monitoring

1. Go to Developers → Webhooks
2. Monitor webhook deliveries
3. Set up email alerts for failures

## Step 9: Post-Launch

### First 24 Hours

- [ ] Monitor error logs continuously
- [ ] Check Stripe webhook deliveries
- [ ] Verify email notifications sending
- [ ] Monitor database connection
- [ ] Watch for 404s or broken links
- [ ] Check mobile responsiveness

### First Week

- [ ] Review user feedback
- [ ] Monitor performance metrics
- [ ] Check database growth
- [ ] Verify billing cycles working
- [ ] Review admin activity logs
- [ ] Backup database

## Rollback Plan

If critical issues occur:

1. **Immediate**: Switch Cloudflare Pages to previous deployment
2. **Database**: Restore from Supabase backup
3. **Stripe**: Keep webhooks active (they'll retry)
4. **Communication**: Notify users via status page

## Security Best Practices

### Passwords

- ✅ Use password manager (1Password, Bitwarden)
- ✅ Different passwords for each service
- ✅ Enable 2FA everywhere possible
- ✅ Rotate passwords quarterly
- ❌ Never commit passwords to git
- ❌ Never share passwords in plain text

### API Keys

- ✅ Use separate keys for dev/staging/production
- ✅ Restrict API key permissions
- ✅ Monitor API key usage
- ✅ Rotate keys if compromised
- ❌ Never expose secret keys in frontend
- ❌ Never commit keys to git

### Admin Access

- ✅ Use strong unique password
- ✅ Limit admin emails to trusted staff
- ✅ Log all admin actions
- ✅ Review admin access monthly
- ❌ Never share admin credentials
- ❌ Never use default passwords

## Troubleshooting

### "Admin password incorrect"

1. Verify `VITE_ADMIN_PASSWORD` set correctly
2. Check for typos or extra spaces
3. Ensure environment variable loaded (restart dev server)
4. Check browser console for errors

### Stripe webhooks failing

1. Verify webhook secret matches
2. Check webhook URL is correct
3. Ensure server is publicly accessible
4. Review webhook logs in Stripe dashboard

### Supabase connection errors

1. Verify service role key is correct
2. Check RLS policies
3. Ensure migrations ran successfully
4. Review Supabase logs

### CORS errors

1. Verify `CORS_ORIGIN` matches frontend URL
2. Check for trailing slashes
3. Ensure preflight requests allowed
4. Review browser console for exact error

## Support

- **Stripe Issues**: https://support.stripe.com
- **Supabase Issues**: https://supabase.com/support
- **Cloudflare Issues**: https://www.cloudflare.com/support

## Checklist Summary

Before going live:

- [ ] Admin password changed from default
- [ ] All environment variables set
- [ ] Stripe in live mode
- [ ] Supabase migrations run
- [ ] DNS configured
- [ ] SSL certificates active
- [ ] All tests passing
- [ ] Monitoring configured
- [ ] Backup strategy in place
- [ ] Rollback plan documented

🎉 **Ready to launch!**
