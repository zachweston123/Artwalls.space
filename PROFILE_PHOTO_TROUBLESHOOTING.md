# Profile Photo Upload - Troubleshooting Guide

## Common Error Messages & Fixes

### Error 1: "Upload failed" (no detail)
**What it means**: The upload function was called but got an error from Supabase
**Most likely cause**: Storage bucket doesn't exist
**Fix**:
1. Go to Supabase → Storage
2. Create `artist-profiles` bucket (set to Public)
3. Create `venue-profiles` bucket (set to Public)
4. Refresh browser and try again

---

### Error 2: "404 - Bucket not found"
**What it means**: The storage bucket name is wrong or doesn't exist
**Most likely cause**: Bucket was never created
**Fix**:
1. Go to Supabase → Storage dashboard
2. Check if you see these buckets:
   - `artworks`
   - `wallspaces`
   - `artist-profiles` ← Create if missing
   - `venue-profiles` ← Create if missing
3. Make sure names are EXACTLY lowercase with hyphens (not underscores)
4. Refresh browser

---

### Error 3: "Permission denied" or "403 Forbidden"
**What it means**: You don't have permission to upload
**Most likely causes**:
- Not logged in with a valid session
- Bucket is not set to public
**Fix**:
1. Log out completely
2. Clear browser cache: Cmd+Shift+Delete (Mac) or Ctrl+Shift+Delete (Windows)
3. Log back in
4. Try again
5. If still fails, check Supabase dashboard:
   - Click each bucket
   - Make sure "Public" toggle is ON

---

### Error 4: "File size must be less than 5MB" or "...10MB"
**What it means**: Your image file is too large
**Most likely cause**: Trying to upload a high-resolution image
**Fix**:
1. Compress image before uploading
2. Or choose a smaller image file
3. Limits:
   - Artist profile: 5MB max
   - Venue cover: 10MB max

---

### Error 5: "Only JPG, PNG, and WebP images are allowed"
**What it means**: File format not supported
**Most likely cause**: Uploading a GIF, BMP, or other format
**Fix**:
1. Convert image to JPG, PNG, or WebP
2. On Mac: Open in Preview → File → Export → Choose PNG/JPG
3. On Windows: Open in Paint → File → Save As → Choose PNG/JPG

---

### Error 6: "Not signed in"
**What it means**: No valid auth session when trying to upload
**Most likely cause**: Session expired or not logged in
**Fix**:
1. Make sure you're logged in
2. If logged in, try logging out and back in
3. Check browser console for auth errors

---

### Error 7: Photo uploads but doesn't display
**What it means**: Upload succeeded but image URL isn't working
**Most likely cause**: Bucket is private instead of public
**Fix**:
1. Go to Supabase → Storage
2. Click the bucket name (e.g., `artist-profiles`)
3. Look for "Settings" or visibility toggle
4. Make sure bucket is marked as "Public"
5. Save changes
6. Refresh browser

---

### Error 8: "Bucket policy missing" (in Supabase logs)
**What it means**: Bucket exists but doesn't have proper permissions
**Fix**: Contact Supabase support or check bucket policies in Supabase dashboard

---

## Debug Checklist

Go through these in order:

- [ ] **Are buckets created?**
  - Go to Supabase → Storage
  - Do you see `artist-profiles` and `venue-profiles`?
  - If NO: Create them (both should be Public)

- [ ] **Are buckets public?**
  - Click each bucket
  - Is there a Public/Private toggle?
  - Make sure it shows "Public"
  - If NO: Toggle it to Public

- [ ] **Are you logged in?**
  - Check if you see username/profile in top right
  - Try logging out and back in

- [ ] **Is the image valid?**
  - Image format: JPG, PNG, or WebP? (not GIF, BMP, etc)
  - File size: Less than 5MB (artist) or 10MB (venue)?

- [ ] **Is the browser cache cleared?**
  - Cmd+Shift+Delete (Mac) or Ctrl+Shift+Delete (Windows)
  - Or use Incognito/Private mode to test

- [ ] **Is the server running?**
  - For most features, the backend isn't needed for photo upload
  - But if other things are broken, check server is running

---

## How Photo Upload Works

```
1. User selects file
   ↓
2. Frontend validates:
   - File type (JPG/PNG/WebP)
   - File size (<5MB or <10MB)
   - User is logged in
   ↓
3. Frontend uploads to Supabase Storage
   - Bucket: `artist-profiles` or `venue-profiles`
   - Path: {userId}/{timestamp}_{filename}
   ↓
4. Supabase checks:
   - Does bucket exist?
   - Is bucket public?
   - Is user authenticated?
   ↓
5. If OK: Returns public URL
   - Example: https://your-project.supabase.co/storage/v1/object/public/artist-profiles/abc123/profile_1704787200_photo.jpg
   ↓
6. Frontend displays image using URL
```

**If ANY step fails, you get an error**

---

## Testing Photo Upload Step-by-Step

1. **Open Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project
   - Click Storage

2. **Verify buckets exist**
   - Should see: `artworks`, `wallspaces`, `artist-profiles`, `venue-profiles`
   - If missing any: Create them and mark as Public

3. **Refresh your app browser**
   - Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

4. **Log in to your app**
   - Use your venue or artist account

5. **Try uploading a photo**
   - Click profile/settings
   - Find "Upload Photo" button
   - Select a JPG or PNG file (less than 5MB)
   - Watch for:
     - Loading spinner → File uploading
     - Photo preview → Upload successful ✅
     - Error message → Something failed ❌

6. **If successful:**
   - Go back to Supabase Storage
   - Click `artist-profiles` or `venue-profiles`
   - You should see your uploaded file there!

7. **If failed:**
   - Check browser console (F12 → Console tab)
   - Look for error message
   - Match error to list above
   - Follow the fix

---

## Still Can't Figure It Out?

Send me:
1. Screenshot of Supabase Storage dashboard (showing all buckets)
2. Browser console error (F12 → Console tab, copy error message)
3. What type of file you're trying to upload (JPG/PNG/etc)
4. What role you're logged in as (artist/venue)
5. The error message you see

Then I can help debug!
