# Profile Photo Upload - Setup Guide

## Issue
Profile photo uploads are failing because the required Supabase Storage buckets don't exist or aren't configured properly.

## Required Storage Buckets

Your app needs **4 storage buckets**:
1. ✅ `artworks` - artwork images (should already exist)
2. ✅ `wallspaces` - wall space photos (should already exist)
3. ❌ `artist-profiles` - **MISSING** - artist profile photos
4. ❌ `venue-profiles` - **MISSING** - venue profile photos

## Solution: Create Missing Buckets

### Step 1: Create Storage Buckets in Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click **Storage** in the left sidebar
4. Click **Create a new bucket** (or the "+" button)

### Step 2: Create "artist-profiles" Bucket

1. **Bucket name**: `artist-profiles`
2. **Make it public**: Toggle **Public bucket** ON
3. Click **Create bucket**

### Step 3: Create "venue-profiles" Bucket

1. **Bucket name**: `venue-profiles`
2. **Make it public**: Toggle **Public bucket** ON
3. Click **Create bucket**

### Step 4: Verify Bucket Policies (if still not working)

For each bucket:
1. Click the bucket name
2. Click **Policies** tab
3. Should show at least:
   - `public` for SELECT (reading public files)
   - `authenticated` for INSERT/UPDATE (uploading)

If not present, add them:

**Public SELECT Policy:**
```sql
CREATE POLICY "public access"
ON storage.objects FOR SELECT
USING (bucket_id = 'artist-profiles' OR bucket_id = 'venue-profiles');
```

**Authenticated INSERT Policy:**
```sql
CREATE POLICY "authenticated upload"
ON storage.objects FOR INSERT
WITH CHECK (
  (bucket_id = 'artist-profiles' OR bucket_id = 'venue-profiles')
  AND auth.role() = 'authenticated'
);
```

## Quick Test

After creating the buckets:

1. Refresh your browser (Cmd+Shift+R or Ctrl+Shift+R)
2. Try uploading a profile photo again
3. Should now work!

## Troubleshooting

### "Upload failed" with no detail
- **Check**: Are the buckets public? (Check Supabase Storage dashboard)
- **Fix**: Toggle "Make public" ON for both buckets

### "404 - Bucket not found"
- **Check**: Did you create both `artist-profiles` and `venue-profiles` buckets?
- **Fix**: Create missing buckets following Step 2-3 above

### "Permission denied" or "403 Forbidden"
- **Check**: Are you logged in? Do you have a valid auth session?
- **Fix**: Log out and log back in to refresh auth token

### Upload works but photo doesn't display
- **Check**: Is the URL being generated correctly?
- **Fix**: Check browser Network tab → see if image URL returns 404
- **Solution**: Verify bucket is public in Supabase dashboard

### More detailed troubleshooting?
See [PROFILE_PHOTO_TROUBLESHOOTING.md](PROFILE_PHOTO_TROUBLESHOOTING.md) for comprehensive error guide

## Quick Checklist

See [STORAGE_BUCKETS_QUICKSTART.md](STORAGE_BUCKETS_QUICKSTART.md) for 5-minute setup guide

## Code Reference

The upload function in `src/lib/storage.ts`:

```typescript
export async function uploadProfilePhoto(userId: string, file: File, userType: 'artist' | 'venue'): Promise<string> {
  const filename = `profile_${Date.now()}_${sanitizeFilename(file.name)}`;
  const path = `${userId}/${filename}`;
  const bucket = userType === 'artist' ? 'artist-profiles' : 'venue-profiles';
  
  // Upload to appropriate bucket
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || `application/octet-stream`,
  });
  
  if (error) throw error;
  
  // Return public URL for displaying image
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
```

## File Structure in Storage

Once working, your storage will look like:

```
artist-profiles/
  ├── {user-id}/
  │   ├── profile_1704787200000_photo.jpg
  │   └── profile_1704787800000_selfie.png
  └── {another-user-id}/
      └── profile_1704788000000_headshot.png

venue-profiles/
  ├── {venue-id}/
  │   ├── profile_1704787000000_storefront.jpg
  │   └── profile_1704787400000_interior.png
  └── {another-venue-id}/
      └── profile_1704788200000_gallery.jpg
```

## Security Notes

- ✅ Photos are organized by user ID (can't access other users' photos without guessing UUID)
- ✅ Files are named with timestamp (can't overwrite others' files)
- ✅ Only authenticated users can upload
- ✅ Everyone can view (images are public, but unguessable URLs)

## Complete Verification Checklist

- [ ] Created `artist-profiles` bucket
- [ ] Created `venue-profiles` bucket
- [ ] Both buckets are set to **Public**
- [ ] Refreshed browser (Cmd+Shift+R)
- [ ] Logged out and back in
- [ ] Tried uploading profile photo
- [ ] Photo appears in preview
- [ ] Check Storage dashboard shows uploaded files

Once all checked, profile photo upload should work!
