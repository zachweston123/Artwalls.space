# Production Deployment - Demo Data Removal

## Overview
This guide covers the steps to remove all demo/test data from your Artwalls database and prepare the system for live production accounts.

## What Was Changed

### 1. Database Migration Created
**File:** `supabase/migrations/20260108_remove_demo_data.sql`

This migration removes:
- Demo artist: Sarah Chen (`11111111-1111-1111-1111-111111111111`)
- Demo venues: Brew & Palette Café, The Artisan Lounge, Sunrise Bistro, Corner Grind
- All demo artworks, bookings, notifications, and orders associated with these accounts

### 2. Mock Data Cleared
**File:** `src/data/mockData.ts`

All mock data arrays have been cleared and set to empty arrays:
- `mockArtworks`
- `mockVenues`
- `mockWallSpaces`
- `mockApplications`
- `mockSales`
- `mockInstalledArtworks`
- `mockNotifications`

These were only used for frontend development/testing and are now ready for production where real data from the database will be used.

## Deployment Steps

### Step 1: Apply the Database Migration

#### Option A: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `supabase/migrations/20260108_remove_demo_data.sql`
4. Paste and run the SQL in the editor
5. Verify the demo data is removed by running:
   ```sql
   SELECT COUNT(*) FROM public.artists;
   SELECT COUNT(*) FROM public.venues;
   SELECT COUNT(*) FROM public.artworks;
   ```

#### Option B: Using Supabase CLI
```bash
# Make sure you're logged in to Supabase CLI
supabase login

# Link your project (if not already linked)
supabase link --project-ref your-project-ref

# Apply all pending migrations
supabase db push

# Or apply this specific migration
supabase migration up
```

### Step 2: Deploy Frontend Changes
```bash
# Build the production version
npm run build

# Deploy to your hosting platform
# Example for Vercel:
vercel --prod

# Example for Netlify:
netlify deploy --prod

# Example for Render (if using render.yaml):
git push origin main
```

### Step 3: Verify Production Environment

1. **Check Database is Clean:**
   - Verify no demo accounts exist
   - Confirm database tables are empty and ready for real users

2. **Test New User Registration:**
   - Create a test artist account
   - Create a test venue account
   - Verify they can log in and access their dashboards

3. **Test Core Flows:**
   - Artist can create/upload artwork
   - Venue can browse and approve artwork
   - Booking system works for installs/pickups
   - Stripe integration works for payments

### Step 4: Environment Variables Check

Ensure all production environment variables are set:

```bash
# Required for Supabase
VITE_SUPABASE_URL=your-production-supabase-url
VITE_SUPABASE_ANON_KEY=your-production-anon-key

# Required for Stripe (if using)
VITE_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

# Application URLs
VITE_APP_URL=https://your-production-domain.com
```

## What Happens to New Accounts

### New Artist Accounts
- Artists can now register and create real accounts
- No demo data will interfere with their experience
- All subscriptions, artworks, and sales will be real

### New Venue Accounts  
- Venues can register and set up their profiles
- Browse real artist portfolios
- Book real artwork installations
- Process real transactions

## Rollback (If Needed)

If you need to restore demo data for testing:
```sql
-- Re-run the original seed migration
-- File: supabase/migrations/006_seed_demo_data.sql
```

Or manually revert by checking out the previous version:
```bash
git checkout HEAD~1 src/data/mockData.ts
git checkout HEAD~1 supabase/migrations/
```

## Database Backup

**Important:** Always backup your database before running migrations:

```bash
# Using Supabase CLI
supabase db dump -f backup_before_demo_removal.sql

# Or from Supabase Dashboard:
# Settings > Database > Database Backups
```

## Monitoring After Deployment

1. **Watch for Errors:**
   - Monitor application logs
   - Check Supabase logs for database errors
   - Review Stripe dashboard for payment issues

2. **Track User Signups:**
   - Monitor new artist registrations
   - Monitor new venue registrations
   - Ensure activation emails are being sent

3. **Database Health:**
   ```sql
   -- Check for any orphaned records
   SELECT COUNT(*) FROM artworks WHERE artist_id NOT IN (SELECT id FROM artists);
   SELECT COUNT(*) FROM bookings WHERE venue_id NOT IN (SELECT id FROM venues);
   ```

## Support

If you encounter any issues:
1. Check the application logs
2. Verify all environment variables are set
3. Confirm the migration ran successfully
4. Test with a fresh user account

## Status

- ✅ Demo data removal migration created
- ✅ Mock data arrays cleared
- ✅ No hardcoded demo IDs in components
- ⏳ Ready to deploy to production

---

**Last Updated:** January 6, 2026  
**Migration File:** `20260108_remove_demo_data.sql`
