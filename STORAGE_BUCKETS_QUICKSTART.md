# Storage Buckets Checklist

## Quick Setup (5 minutes)

### ✅ Buckets You Should Already Have
- `artworks` ← for artwork images (created during initial setup)
- `wallspaces` ← for wall space photos (created during initial setup)

### ❌ Buckets You Need to Create RIGHT NOW
- `artist-profiles` ← **CREATE THIS**
- `venue-profiles` ← **CREATE THIS**

## Step-by-Step Instructions

### 1. Go to Supabase Dashboard
```
https://app.supabase.com → Select your project → Storage
```

### 2. Click "Create a new bucket"
Button should be in the top right or visible as a "+" icon

### 3. Create FIRST bucket
- **Name**: `artist-profiles` (lowercase, no spaces)
- **Make it public**: YES ✅ (toggle the switch ON)
- Click **Create bucket**

### 4. Create SECOND bucket
- **Name**: `venue-profiles` (lowercase, no spaces)
- **Make it public**: YES ✅ (toggle the switch ON)
- Click **Create bucket**

### 5. Verify Both Buckets Exist
You should now see in Storage:
```
📦 artworks          [Public]
📦 wallspaces        [Public]
📦 artist-profiles   [Public]  ← NEW
📦 venue-profiles    [Public]  ← NEW
```

### 6. Refresh Browser & Test
- Refresh your browser: **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (Windows)
- Try uploading a profile photo
- Should work now! ✅

## Screenshot Guide

### What you're looking for:
1. Supabase dashboard with "Storage" sidebar item highlighted
2. List of buckets including the new `artist-profiles` and `venue-profiles`
3. Both new buckets should show "Public" badge

### If "Public" toggle is OFF:
- Click the bucket name
- Look for a toggle or settings to make it public
- Toggle it ON
- Save

## Troubleshooting

**Still not working?**

1. Clear browser cache: Cmd+Shift+Delete (Mac) or Ctrl+Shift+Delete (Windows)
2. Log out completely from the app
3. Close browser completely
4. Reopen browser and log back in
5. Try uploading again

**Can't find Storage in Supabase dashboard?**

- Make sure you're logged into Supabase
- Make sure you selected the correct project
- Look for **Storage** in the left sidebar (should be under Database/Tables)

**Still seeing "404 Bucket not found"?**

- Go back to Storage dashboard
- Verify bucket name is EXACTLY: `artist-profiles` or `venue-profiles` (lowercase)
- Verify both buckets exist and show [Public] badge

## That's it! 🎉

Once the buckets are created as public, profile photo uploads will work immediately.

No code changes needed - the app is already configured to use these buckets.
