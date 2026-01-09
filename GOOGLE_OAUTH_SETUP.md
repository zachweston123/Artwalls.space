# Google OAuth Setup for Artwalls

## Overview
Google Sign-In has been integrated into the Artwalls login flow. Users can now sign up and sign in using their Google account.

## Setup Steps

### 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable Google+ API:
   - Search for "Google+ API" in the search bar
   - Click Enable
4. Create OAuth 2.0 credentials:
   - Go to "Credentials" in the left sidebar
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Choose "Web application"
   - Add authorized redirect URIs (both development and production):
     - `http://localhost:3000/auth/v1/callback` (development)
     - `http://localhost:5173/auth/v1/callback` (Vite dev)
     - `https://artwalls.app/auth/v1/callback` (production)
     - `https://your-supabase-project.supabase.co/auth/v1/callback` (Supabase)
   - Copy the Client ID and Client Secret

### 2. Configure Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your Artwalls project
3. Go to Authentication → Providers
4. Find "Google" and click to expand
5. Enable Google provider
6. Paste your Google OAuth credentials:
   - Client ID
   - Client Secret
7. Save

### 3. Test Google Sign-In

1. Go to the login page
2. Select "Artist" or "Venue" role
3. Click "Sign in with Google"
4. You'll be redirected to Google login
5. After authentication, you'll be asked to select your role (Artist or Venue)
6. You'll be logged in and redirected to your dashboard

## How It Works

### Sign-Up Flow
1. User clicks "Sign in with Google"
2. Redirected to Google login (if not already signed in)
3. Google redirects back to app with OAuth token
4. Supabase exchanges token for session
5. App detects new user without role metadata
6. Shows role selection modal (Artist or Venue)
7. User selects role → profile is provisioned → redirected to dashboard

### Sign-In Flow
1. User clicks "Sign in with Google"
2. If already signed in with Google, directly returns to app
3. Supabase validates session
4. User is logged in with their existing role

## Integration Details

### Frontend Changes
- **[src/components/Login.tsx](src/components/Login.tsx)**
  - Added `handleGoogleSignIn()` function
  - Added Google Sign-In button with divider
  - Uses `supabase.auth.signInWithOAuth({ provider: 'google' })`

- **[src/App.tsx](src/App.tsx)**
  - Enhanced `onAuthStateChange` to detect new Google users
  - Added `handleGoogleRoleSelection()` for role assignment
  - Added role selection modal that appears after Google sign-up
  - Automatically calls `/api/profile/provision` after role selection

### Backend
No backend changes required - Supabase handles OAuth token exchange automatically.

## Environment Variables
No new environment variables needed. All configuration is done in Supabase dashboard.

## Troubleshooting

### "Redirect URI mismatch" Error
- Ensure the redirect URI in Google Cloud Console matches your app's domain
- Include `https` for production URLs
- Development URLs can be `http://localhost`

### User not getting role selection modal
- Check browser console for auth state change events
- Verify Supabase is returning user without role metadata
- Check that `showGoogleRoleSelection` state is being set to true

### "Unauthorized client" Error
- Verify Client ID and Client Secret are correctly pasted in Supabase
- Check that Google+ API is enabled in Google Cloud Console
- Make sure OAuth consent screen is configured

## Testing Checklist

- [ ] Can sign in with Google (existing account)
- [ ] Can sign up with Google (new account)
- [ ] Role selection modal appears after Google sign-up
- [ ] Can select "Artist" role
- [ ] Can select "Venue" role
- [ ] Profile is provisioned after role selection
- [ ] Redirected to correct dashboard (artist/venue)
- [ ] Can sign in with email/password (still works)
- [ ] Can switch between roles (sign out and sign in as different role)

## Production Deployment

1. Update Google Cloud Console with production redirect URIs:
   - `https://artwalls.app/auth/v1/callback`
   - Your Supabase project URL

2. Test in production environment before going live

3. Monitor authentication failures in Supabase logs
