# Development Setup - Quick Fix Guide

## ✅ Issue: "Network error: Failed to fetch"

### Problem
The backend API server is not running, so the frontend can't create artwork or edit profiles.

### Root Cause
1. ❌ Backend server not started
2. ❌ Backend missing `.env` file with Supabase credentials

### Solution: Start the Backend Server

## 🚀 QUICK START (Do This Now!)

### Step 1: Add Your Supabase Service Role Key

1. Go to: https://supabase.com/dashboard/project/twclqgysvpefufpnmjcl/settings/api
2. Copy the **service_role** key (NOT the anon key - this is the secret one)
3. Open `~/Artwalls.space/server/.env`
4. Replace `YOUR_SERVICE_ROLE_KEY_HERE` with your actual key

The line should look like:
```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3Y2xxZ3lzdnBlZnVmcG5tamNsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzAzODY2MiwiZXhwIjoyMDgyNjE0NjYyfQ...
```

### Step 2: Start the Backend Server

Open a **new terminal** and run:

```bash
cd ~/Artwalls.space/server
npm start
```

You should see:
```
Artwalls server running on http://localhost:4242
```

⚠️ **Keep this terminal open!** The server must stay running.

### Step 3: Test It Works

In another terminal:
```bash
curl http://localhost:4242/api/health
```

Expected response:
```json
{"ok":true}
```

### Step 4: Test Your Artist Features

**Artist Profile Edit:**
1. Log in as an artist
2. Go to Profile
3. Click "Edit Profile"
4. Make changes and click "Save"
5. Should now work without "failed to fetch" error
"Network error: Failed to fetch"

**1. Backend not running?**
```bash
# Check if backend is running
curl http://localhost:4242/api/health
# If this fails, start the backend:
cd ~/Artwalls.space/server && node index.js
```

**2. Missing Supabase Service Role Key?**
Check `~/Artwalls.space/server/.env`:
- Line should NOT say `YOUR_SERVICE_ROLE_KEY_HERE`
- Should be a long JWT token starting with `eyJ...`
- Get it from: https://supabase.com/dashboard/project/twclqgysvpefufpnmjcl/settings/api

**3. Wrong port?**
Frontend .env should have:
```env
VITE_API_BASE_URL=http://localhost:4242
```

**4. Check backend logs**
When you try to create artwork, the backend terminal should show:
```
POST /api/artworks
```

### "Error: Missing SUPABASE_URL"

This means the backend `.env` file is not loaded or incomplete.

**Fix:**
```bash
# Check the file exists
ls -la ~/Artwalls.space/server/.env

# Verify it has both these lines:
grep SUPABASE ~/Artwalls.space/server/.env
```
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
