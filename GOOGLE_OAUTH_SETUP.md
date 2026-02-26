# Google OAuth Setup for Artwalls

## Overview
Google Sign-In has been integrated into the Artwalls login flow. Users can now sign up and sign in using their Google account.

## Setup Checklist

### 1. Google Cloud Console — Authorized Redirect URIs

Go to [Google Cloud Console → Credentials → OAuth 2.0 Client ID](https://console.cloud.google.com/apis/credentials) and ensure these **Authorized redirect URIs** are listed:

```
https://<YOUR_SUPABASE_PROJECT>.supabase.co/auth/v1/callback
```

> **Only the Supabase callback URL goes in Google Console.** The `redirectTo` in app
> code tells Supabase where to send the user *after* it finishes the token exchange.

### 2. Supabase Dashboard — Auth Settings

Go to [Supabase Dashboard → Authentication → URL Configuration](https://app.supabase.com/):

| Setting | Value |
|---------|-------|
| **Site URL** | `https://artwalls.space` |
| **Additional Redirect URLs** | `https://artwalls.space/auth/callback`, `http://localhost:5173/auth/callback`, `http://localhost:3000/auth/callback` |

Then go to **Authentication → Providers → Google**:
- Enable Google provider
- Paste your **Client ID** and **Client Secret** from Google Cloud Console
- Save

### 3. Test Google Sign-In

1. Go to the login page
2. Select "Artist" or "Venue" role
3. Click "Sign in with Google"
4. You'll be redirected to Google login
5. After authentication, the app processes the callback at `/auth/callback`
6. New users see a role selection screen (Artist or Venue)
7. You'll be logged in and redirected to your dashboard

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

1. Verify Google Cloud Console has the Supabase callback URI:
   - `https://<YOUR_PROJECT>.supabase.co/auth/v1/callback`

2. Verify Supabase Dashboard → Auth → URL Configuration:
   - Site URL: `https://artwalls.space`
   - Additional Redirect URLs includes: `https://artwalls.space/auth/callback`

3. Test in production environment before going live

4. Monitor authentication failures in Supabase logs
