# Persistent Google OAuth Implementation Guide

## Overview

This document describes the implementation of persistent email and phone number storage for Google OAuth sign-ins. Users who sign in with Google and provide their phone number will have that information automatically pre-filled on subsequent sign-ins, eliminating the need to provide it again.

## User Flow

### First-Time Google Sign-In
1. User clicks "Sign in with Google" button
2. User selects their role (Artist or Venue)
3. Google OAuth completes successfully
4. **NEW**: Profile Completion screen appears, auto-populated with:
   - Google email (read-only display)
   - Name from Google profile (read-only display)
   - Phone number field (empty, required input)
5. User enters phone number and clicks "Continue"
6. Phone is stored in `user_metadata` in Supabase auth
7. User proceeds to dashboard

### Subsequent Google Sign-Ins
1. User clicks "Sign in with Google" button
2. User selects their role
3. Google OAuth completes
4. Phone number is already in `user_metadata` (from previous sign-in)
5. **NEW**: Profile Completion screen is skipped
6. User goes directly to dashboard

## Technical Implementation

### Components

#### ProfileCompletion.tsx (NEW)
**Location**: `src/components/ProfileCompletion.tsx`

A dedicated component that appears after Google OAuth role selection if phone number is missing.

**Features**:
- Auto-displays user's email and name (from Google OAuth)
- Collects phone number with validation
- "Skip for now" option for users who want to provide phone later
- Styled consistently with the app's design system
- Loading states for async operations

**Props**:
```typescript
interface ProfileCompletionProps {
  email: string;              // User's email from Google OAuth
  userName: string;           // User's name from Google OAuth
  onComplete: (phoneNumber: string) => void;  // Called when phone is submitted
  onSkip: () => void;         // Called when user skips
  isLoading?: boolean;        // Loading state during submission
}
```

### Data Storage Architecture

#### Tier 1: Supabase Auth Metadata
**Table**: `auth.users`
**Field**: `user_metadata` (JSONB)

**Stored Data**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "5551234567",
  "role": "artist",
  "avatar_url": "https://..."
}
```

**Access Method**:
```typescript
const user = await supabase.auth.getUser();
const phone = user.user_metadata?.phone;
const email = user.user_metadata?.email;
```

#### Tier 2: Profile Database Tables
**Tables**: `artists`, `venues`
**Fields**: `phone_number`, `email`, `user_id`

Phone number is also written to the profile table during profile provisioning for:
- Direct database queries without auth round-trip
- Historical data backup
- Profile completeness tracking

### Code Changes

#### 1. App.tsx

**New State Variables**:
```typescript
const [showProfileCompletion, setShowProfileCompletion] = useState(false);
const [pendingPhoneNumber, setPendingPhoneNumber] = useState<string | null>(null);
```

**Updated Function: handleGoogleRoleSelection()**
- Now checks if phone exists in `googleUser.user_metadata?.phone`
- If phone is missing: shows ProfileCompletion component
- If phone exists: skips to dashboard directly

**New Function: handleProfileCompletionSubmit()**
- Receives phone number from ProfileCompletion component
- Updates `user_metadata` via `supabase.auth.updateUser()`
- Calls profile provision API with phone number
- Transitions to dashboard on success
- Shows form again on error for retry

**New Function: handleProfileCompletionSkip()**
- Allows users to skip providing phone number
- Proceeds to dashboard without phone
- User can provide phone later in profile settings

**Conditional Rendering**:
```typescript
if (showProfileCompletion && googleUser) {
  return <ProfileCompletion ... />;
}
```

#### 2. Login.tsx

**Updated Import**:
```typescript
import { useState, useEffect } from 'react';
```

**New useEffect Hook**:
```typescript
useEffect(() => {
  const loadPrefillData = async () => {
    const { supabase } = await import('../lib/supabase');
    const { data } = await supabase.auth.getSession();
    
    if (data.session?.user) {
      if (user.email) setEmail(user.email);
      if (user.user_metadata?.phone) setPhone(user.user_metadata.phone);
      if (user.user_metadata?.name) setName(user.user_metadata.name);
    }
  };
  loadPrefillData();
}, []);
```

This effect:
- Runs once when Login component mounts
- Fetches current user session from Supabase
- Pre-fills email/phone/name fields from `user_metadata`
- Allows users returning for email/password login to see their previous data
- Silently fails if user is not authenticated (normal case)

### API Changes

#### Profile Provision Endpoint
**Endpoint**: `POST /api/profile/provision`

**Updated Request Body**:
```typescript
{
  phoneNumber?: string;  // NEW: Optional phone number to store
}
```

**Behavior**:
- If `phoneNumber` provided: stores in both metadata and profile table
- If omitted: uses existing phone from metadata or leaves blank

### Data Flow Diagram

```
First Google Sign-In:
┌─────────────────────────────────────────────────────────┐
│ User Clicks Google Sign-In Button                        │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│ Google OAuth Flow                                        │
│ ✓ Email, Name retrieved from Google account             │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│ Role Selection (Artist/Venue)                            │
│ ✓ Role + Name stored in user_metadata                   │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│ Check: Phone in user_metadata?                           │
│ NO ───────────────────────────────────────────┐          │
└──────────────┬──────────────────────────────────────────┘
               │ YES
               ▼ (Skip to Dashboard)
         ┌─────────────────────────────────────────────┐
         │ Profile Completion Component               │
         │ ✓ Show email (auto-filled)                 │
         │ ✓ Show name (auto-filled)                  │
         │ ✓ Request phone number                     │
         └──────────┬──────────────────────────────────┘
                    │
              ┌─────┴──────┐
              │            │
         Continue      Skip for Now
              │            │
              ▼            ▼
        ┌──────────┐  (Go to Dashboard)
        │ Save Phone in:               │
        │ - user_metadata              │
        │ - profile table (via API)    │
        └──────────┬──────────────────┘
                   │
                   ▼
        Go to Dashboard (Artist/Venue)


Subsequent Google Sign-In:
┌─────────────────────────────────────────────────────────┐
│ User Clicks Google Sign-In Button                        │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│ Google OAuth Flow                                        │
│ ✓ Email, Name, Phone retrieved from user_metadata       │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│ Role Selection (Artist/Venue)                            │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│ Check: Phone in user_metadata?                           │
│ YES ─────────────────────────────────────────┐           │
└──────────────┬──────────────────────────────────────────┘
               │ NO
               ▼
        Profile Completion Component
        ✓ Show email (auto-filled)
        ✓ Show name (auto-filled)
        ✓ Request phone number


Go directly to Dashboard (Artist/Venue)
```

## User Experience Improvements

### Before
1. User signs in with Google
2. Completes role selection
3. Goes directly to empty profile
4. Has to manually fill email/phone in profile settings later
5. On next sign-in, fields are still empty in signup form

### After
1. User signs in with Google
2. Completes role selection  
3. **NEW**: Quick phone number collection (30 seconds)
4. Complete profile info ready immediately
5. On next sign-in:
   - Email/phone fields auto-filled in login form
   - Profile completion skipped entirely if phone exists
   - No friction for returning users

## Testing Checklist

### First-Time User Flow
- [ ] Google sign-in button works
- [ ] Role selection appears after OAuth
- [ ] Profile completion screen shows correct email/name
- [ ] Phone number validation works (requires 10+ digits)
- [ ] "Continue" button saves phone to user_metadata
- [ ] User reaches dashboard after phone entry
- [ ] "Skip for now" button goes to dashboard without phone

### Returning User Flow
- [ ] Second sign-in with same Google account
- [ ] Profile completion screen is skipped (phone exists)
- [ ] User goes directly to dashboard
- [ ] Email/phone fields pre-filled if returning to login form

### Data Persistence
- [ ] Phone persists in user_metadata after sign-out/sign-in
- [ ] Phone appears in profile settings/editing
- [ ] Phone stored in both user_metadata and profile table

### Edge Cases
- [ ] User signs in with Google, skips phone, updates later in profile
- [ ] User changes phone number in settings, reflected on next sign-in
- [ ] Profile completion accessible if phone manually deleted from metadata
- [ ] Error handling if profile provision API fails

## Future Enhancements

1. **Email Verification**: Add email verification step for Google OAuth users
2. **Profile Completeness Score**: Show progress toward complete profile
3. **Optional Fields**: Make some fields (like bio, address) optional but encouraged
4. **Bulk Update**: Allow users to update multiple profile fields from completion screen
5. **Two-Factor Auth**: Collect phone for optional 2FA setup
6. **Admin Override**: Allow admins to force profile completion for specific users

## Security Considerations

1. **Data Privacy**: Phone numbers stored in user_metadata are part of user account data
2. **No Share**: Phone is never shared publicly without explicit user consent
3. **Encryption**: Supabase encrypts user_metadata at rest
4. **Access Control**: Phone visible only to authenticated user and admin (if enabled)
5. **GDPR Compliance**: Users can request deletion of phone via data export/deletion tools

## API Integration Notes

### Supabase Auth Methods

```typescript
// Get current user with metadata
const { data: { user } } = await supabase.auth.getUser();
const phone = user?.user_metadata?.phone;

// Update user metadata
await supabase.auth.updateUser({
  data: {
    phone: '5551234567',
    // ... other metadata
  }
});

// Get session
const { data: { session } } = await supabase.auth.getSession();
```

### Profile Provision API

```typescript
// Call from App.tsx after role selection
await apiPost('/api/profile/provision', {
  phoneNumber: '5551234567'
});
```

## Monitoring & Analytics

Track these metrics to measure feature effectiveness:

1. **Completion Rate**: % of users completing phone entry vs skipping
2. **Return User Friction**: Time to dashboard on subsequent sign-ins
3. **Profile Completeness**: % of users with phone vs without
4. **Abandonment**: Users who skip phone and never fill it later
5. **Support Tickets**: Phone-related profile or login issues

## Troubleshooting

### Issue: Phone not persisting
- Check Supabase user_metadata is updating
- Verify API call to profile provision includes phoneNumber
- Check browser console for errors in handleProfileCompletionSubmit

### Issue: ProfileCompletion not showing
- Verify showProfileCompletion state is true
- Check googleUser object has metadata
- Verify handleGoogleRoleSelection is checking phone correctly

### Issue: Pre-fill not working
- Check useEffect in Login.tsx is running
- Verify user session exists (user is logged in)
- Check user_metadata contains email/phone fields

### Issue: Fields clearing on page reload
- This is expected for first-time users (no session)
- Logged-in users should see pre-fill from useEffect
- Check localStorage isn't interfering

## Deployment Notes

1. New component added: `ProfileCompletion.tsx`
2. Modified components: `App.tsx`, `Login.tsx`
3. No database migrations required (uses existing user_metadata)
4. No new API endpoints (uses existing /api/profile/provision)
5. Backwards compatible: existing users unaffected
6. Optional: users can skip phone entry without impact

## Related Files

- [App.tsx](./App.tsx) - Main orchestration, OAuth handlers
- [ProfileCompletion.tsx](./ProfileCompletion.tsx) - New completion component  
- [Login.tsx](./Login.tsx) - Login form with pre-fill logic
- [lib/api.ts](./lib/api.ts) - API call utility
- [lib/supabase.ts](./lib/supabase.ts) - Supabase client
