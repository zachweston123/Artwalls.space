# Why Profile Photos Weren't Displaying - Technical Explanation

## The Problem

User reported: *"The image was successfully added but did not show as the profile photo in the circle above"*

### Root Cause
The photo upload flow was incomplete:

1. ✅ Photo uploaded to Supabase Storage → Got public URL
2. ✅ URL stored in React state → Shows in edit form
3. ❌ URL NOT saved to database → **Lost on page refresh**
4. ❌ URL NOT loaded from database → **Doesn't display on page load**

## The Broken Flow

### Artist Profile (Before)
```
User uploads photo
    ↓
uploadProfilePhoto() uploads to Storage
    ↓
Supabase returns public URL
    ↓
setAvatar(url) → Shows in React state
    ↓
Page refreshes...
    ↓
setAvatar loaded from auth metadata (not database)
    ↓
Photo URL lost ❌
```

### Venue Profile (Before)
```
User uploads photo in edit modal
    ↓
uploadProfilePhoto() uploads to Storage
    ↓
Supabase returns public URL
    ↓
formData.coverPhoto = url → Shows in form state
    ↓
User clicks "Save Changes"
    ↓
handleSave() called BUT...
    ↓
coverPhoto NOT sent to database ❌
    ↓
handleSave() saves name, type, email, labels... but NOT coverPhoto
    ↓
Photo URL lost ❌
```

## The Fix

### What Changed

#### Artist Profile
**Before:**
```tsx
// Load from auth metadata (temporary)
setAvatar((user.user_metadata?.avatar as string) || '');

// After upload
const url = await uploadProfilePhoto(userId, fileToUpload, 'artist');
setAvatar(url); // Only in state, not saved!

// On refresh: No photo ❌
```

**After:**
```tsx
// Load from database (persistent)
setAvatar((row?.profile_photo_url as string) || '');

// After upload
const url = await uploadProfilePhoto(userId, fileToUpload, 'artist');

// NEW: Save to database!
const { error: updateErr } = await supabase
  .from('artists')
  .update({ profile_photo_url: url })
  .eq('id', userId);

setAvatar(url); // Show immediately

// On refresh: Photo loads from database ✅
```

#### Venue Profile
**Before:**
```tsx
// handleSave doesn't include coverPhoto
await apiPost('/api/venues', {
  name: data.name,
  type: data.type,
  labels: data.labels,
  phoneNumber: data.phoneNumber,
  email: data.email,
  city: data.city,
  // Missing: coverPhoto! ❌
});
```

**After:**
```tsx
// NEW: Save coverPhoto to database
if (data.coverPhoto) {
  await supabase
    .from('venues')
    .update({ cover_photo_url: data.coverPhoto })
    .eq('id', userId);
}

// Also pass to edit modal
<VenueProfileEdit
  initialData={{ 
    name: profile.name, 
    type: profile.type,
    // ... other fields
    coverPhoto: profile.coverPhoto  // NEW!
  }}
  onSave={handleSave}
  onCancel={() => setIsEditing(false)}
/>
```

## The Database Part

### Schema
```sql
-- Before: No columns for photo URLs
CREATE TABLE artists (
  id uuid PRIMARY KEY,
  email text,
  name text,
  -- ... other fields ...
  -- Missing photo_photo_url! ❌
);

-- After: Add photo URL columns
ALTER TABLE public.artists 
  ADD COLUMN profile_photo_url text;

ALTER TABLE public.venues 
  ADD COLUMN cover_photo_url text;
```

### Data Flow (After Fix)

**Artist Profile:**
```
React Component
    ↓
Page mounts
    ↓
useEffect() runs
    ↓
Query database: SELECT profile_photo_url FROM artists WHERE id = ?
    ↓
Load URL into state: setAvatar(row.profile_photo_url)
    ↓
Display in UI: <img src={avatar} />  ✅
    ↓
User uploads new photo
    ↓
uploadProfilePhoto() uploads to Storage
    ↓
UPDATE artists SET profile_photo_url = url WHERE id = ?  ✅
    ↓
setAvatar(url) shows preview
    ↓
Page refreshes
    ↓
Query database: SELECT profile_photo_url
    ↓
Photo displays ✅
```

## Key Insight: Three Tiers of State

1. **Supabase Storage** ← Actual file (never lost)
2. **Database** ← Photo URL metadata (persistent) ← **MISSING BEFORE**
3. **React State** ← Temporary in-memory (lost on refresh)

Before the fix:
- Storage: ✅ Had the file
- Database: ❌ No URL link
- React state: ✅ Showed photo while editing

Result: Photo visible only while editing, lost on refresh.

After the fix:
- Storage: ✅ Has the file
- Database: ✅ Stores URL link
- React state: ✅ Loads from database on mount

Result: Photo persistent and displays everywhere.

## Implementation Details

### Artist Profile Changes
- Lines 69, 79: Load `profile_photo_url` from database row
- Lines 127-130: Save `profile_photo_url` to database after upload
- Line 195: Display photo in profile circle (check if avatar exists)
- Lines 340-347: Clear `profile_photo_url` from database when deleting

### Venue Profile Changes
- Line 24: Add `coverPhoto` to profile state
- Lines 50-62: Load `cover_photo_url` from database in useEffect
- Lines 88-91: Save `cover_photo_url` to database in handleSave
- Lines 135-142: Display photo in profile circle
- Line 333: Pass `coverPhoto` to edit modal initialData

## Testing Verification

**Before Fix:**
1. Upload photo → Shows in edit form ✅
2. Save profile ❌ Photo lost
3. Refresh page ❌ No photo

**After Fix:**
1. Upload photo → Shows in edit form ✅
2. Save profile → Photo saved to database ✅
3. Refresh page → Photo loads from database ✅
4. Navigate away and back → Photo still there ✅

## Files That Know About Photos

**Frontend:**
- `src/components/artist/ArtistProfile.tsx`
  - `profile_photo_url` field (database column)
  - Loaded in useEffect
  - Saved after upload
  - Displayed in profile circle

- `src/components/venue/VenueProfile.tsx`
  - `cover_photo_url` field (database column)
  - Loaded in useEffect
  - Saved in handleSave
  - Displayed in profile circle
  - Passed to edit modal

**Storage:**
- `src/lib/storage.ts` - `uploadProfilePhoto()` uploads file and returns URL

**Database:**
- `supabase/migrations/20260107_add_profile_photos.sql`
  - Adds `profile_photo_url` to artists table
  - Adds `cover_photo_url` to venues table

## Why This Matters

This is the complete cycle for persistent data:
1. **Capture** (upload file)
2. **Store** (Supabase Storage)
3. **Reference** (save URL to database)
4. **Retrieve** (load URL on page mount)
5. **Display** (show to user)

Without step 3, the data is orphaned - we have the file but no way to find it again.
