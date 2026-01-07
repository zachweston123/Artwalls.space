# Profile Photo Display Fix - Quick Action Guide

## What Was Wrong
Photos uploaded successfully but didn't show in the profile circle. They were only in temporary memory (React state), not saved to the database.

## What's Fixed
✅ Photos now save to the database  
✅ Photos load from database on page refresh  
✅ Photos display in profile circle everywhere  

## One-Time Setup Required

### Step 1: Add Database Columns

Go to Supabase SQL Editor and run this:

```sql
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS profile_photo_url text;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS cover_photo_url text;

CREATE INDEX IF NOT EXISTS artists_profile_photo_url_idx ON public.artists(profile_photo_url);
CREATE INDEX IF NOT EXISTS venues_cover_photo_url_idx ON public.venues(cover_photo_url);
```

**Time**: 30 seconds

### Step 2: Refresh Browser

Hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)

**Time**: 5 seconds

### Step 3: Test It!

**For Artists:**
1. Go to Artist Profile
2. Click "Edit Profile"
3. Click "Upload Photo"
4. Pick any image
5. Click "Save"
6. Refresh (Cmd+Shift+R)
7. ✅ Photo should still be there!

**For Venues:**
1. Go to Venue Profile
2. Click "Edit Profile"
3. Click to upload cover photo
4. Pick any image
5. Click "Save Changes"
6. Refresh (Cmd+Shift+R)
7. ✅ Photo should still be there!

## Files Changed
- `src/components/artist/ArtistProfile.tsx` - Load & save from database
- `src/components/venue/VenueProfile.tsx` - Load & save from database
- `supabase/migrations/20260107_add_profile_photos.sql` - Schema migration

## Done! 🎉

Profile photos now persist and display everywhere the user sees their account.
