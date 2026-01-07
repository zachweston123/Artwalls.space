# ⚡ FIX PROFILE PHOTO UPLOAD - RIGHT NOW

## The Problem
You can't upload profile photos because the storage buckets don't exist.

## The Solution (5 minutes)
Create 2 storage buckets in Supabase. That's it!

---

## STEP-BY-STEP INSTRUCTIONS

### STEP 1: Open Supabase Dashboard
Click this link: https://app.supabase.com

### STEP 2: Select Your Project
Look for your Artwalls project and click it

### STEP 3: Go to Storage
In the left sidebar, click **Storage**

You should see a list of buckets:
- `artworks`
- `wallspaces`

### STEP 4: Create First Bucket
1. Look for a **"Create a new bucket"** button (top right or "+" icon)
2. Click it
3. **Name**: `artist-profiles` (lowercase, exact spelling)
4. **Make it public**: Toggle the **Public** switch ON
5. Click **Create bucket**

### STEP 5: Create Second Bucket
1. Click **"Create a new bucket"** again
2. **Name**: `venue-profiles` (lowercase, exact spelling)
3. **Make it public**: Toggle the **Public** switch ON
4. Click **Create bucket**

### STEP 6: Verify
You should now see 4 buckets:
```
✅ artworks          [Public]
✅ wallspaces        [Public]
✅ artist-profiles   [Public]  ← NEW
✅ venue-profiles    [Public]  ← NEW
```

### STEP 7: Test It
1. Refresh your app browser: **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (Windows)
2. Log in
3. Go to Edit Profile
4. Try uploading a photo
5. It should work! ✅

---

## THAT'S IT! 🎉

Your profile photo upload feature now works!

---

## Troubleshooting

**"Still doesn't work?"**

1. Make sure both buckets say **[Public]**
   - If not, click bucket → toggle Public ON

2. Clear browser cache:
   - Cmd+Shift+Delete (Mac) or Ctrl+Shift+Delete (Windows)

3. Log out completely and back in

4. Try again

---

## Need More Help?

- **General questions**: See [PROFILE_PHOTO_STATUS.md](PROFILE_PHOTO_STATUS.md)
- **Error messages**: See [PROFILE_PHOTO_TROUBLESHOOTING.md](PROFILE_PHOTO_TROUBLESHOOTING.md)
- **Detailed setup**: See [PROFILE_PHOTO_SETUP.md](PROFILE_PHOTO_SETUP.md)
- **How it works**: See [PROFILE_PHOTO_IMPLEMENTATION.md](PROFILE_PHOTO_IMPLEMENTATION.md)

---

## Before You Ask...

**Q: "Will I lose anything?"**
A: No. You're just creating new storage buckets. Your data is safe.

**Q: "Do I need to change any code?"**
A: No. Code is already done.

**Q: "Will this break anything else?"**
A: No. These are new buckets. Other features use different buckets.

**Q: "How long does this take?"**
A: 5 minutes to create buckets, 1 minute to test.

---

## One More Time - The Quick Version

1. Go to Supabase → Storage
2. Create `artist-profiles` bucket (Public) ✅
3. Create `venue-profiles` bucket (Public) ✅
4. Refresh browser
5. Test upload
6. Done! 🎉
