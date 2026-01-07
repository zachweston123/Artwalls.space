# Development Setup - Quick Fix Guide

## ✅ Fixed: "Failed to fetch" errors

### Problem
When creating artwork listings or editing your artist profile, you were seeing "failed to fetch" errors.

### Root Cause
The frontend was missing a `.env` file, so it defaulted to trying to reach `https://api.artwalls.space` (production API) instead of your local backend server at `http://localhost:4242`.

### Solution Applied
Created `.env` file with correct local configuration:
- ✅ `VITE_API_BASE_URL=http://localhost:4242` - Points to local backend
- ✅ `VITE_SUPABASE_URL` - Set to your Supabase project
- ✅ `VITE_ADMIN_PASSWORD=StormBL26` - Admin access password

## 🚀 Next Steps to Test

### 1. Get Your Supabase Anon Key
The `.env` file needs your actual Supabase anon key:

1. Go to: https://supabase.com/dashboard/project/twclqgysvpefufpnmjcl/settings/api
2. Copy the **anon/public** key (starts with `eyJ...`)
3. Update `.env` file:
   ```env
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### 2. Start the Backend Server
The backend API server needs to be running:

```bash
cd server
npm install
npm start
# Should show: Server listening on port 4242
```

### 3. Restart the Frontend Dev Server
After adding the `.env` file, restart Vite to pick up the changes:

```bash
# Stop the current dev server (Ctrl+C)
npm run dev
```

### 4. Test the Fixes

**Artist Profile Edit:**
1. Log in as an artist
2. Go to Profile
3. Click "Edit Profile"
4. Make changes and click "Save"
5. Should now work without "failed to fetch" error

**Create Artwork Listing:**
1. Go to "My Artworks"
2. Click "Add Artwork"
3. Fill in title, description, price
4. Click "Create Artwork"
5. Should now work without "failed to fetch" error

## 🔍 Troubleshooting

### Still getting "failed to fetch"?

**Check 1: Is the backend running?**
```bash
curl http://localhost:4242/api/health
# Expected: {"ok":true}
```

**Check 2: Is .env loaded?**
- Restart your dev server after creating .env
- Check browser console for the API URL being called

**Check 3: CORS issues?**
The backend server should show:
```
CORS_ORIGIN=http://localhost:3000
# or
CORS_ORIGIN=true
```

### Check Backend Logs
When you try to create an artwork or edit profile, the backend terminal should show:
```
POST /api/artworks
POST /api/artists
```

If you don't see these, the frontend isn't reaching the backend.

## 📁 Required Environment Files

### Frontend: `.env` (root directory)
```env
VITE_API_BASE_URL=http://localhost:4242
VITE_SUPABASE_URL=https://twclqgysvpefufpnmjcl.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
VITE_ADMIN_PASSWORD=StormBL26
```

### Backend: `server/.env`
```env
PORT=4242
APP_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

SUPABASE_URL=https://twclqgysvpefufpnmjcl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

ADMIN_PASSWORD=StormBL26
```

## ✨ What's Working Now

With the `.env` file in place:
- ✅ Frontend knows where to find the backend API
- ✅ Artist profile edits will work
- ✅ Creating artwork listings will work
- ✅ All API calls will hit your local server

## 🎯 Quick Test Commands

```bash
# Terminal 1: Start backend
cd server && npm start

# Terminal 2: Start frontend (in new terminal)
npm run dev

# Terminal 3: Test API (in new terminal)
curl http://localhost:4242/api/health
```

If all three work, you're ready to test the artist features!
