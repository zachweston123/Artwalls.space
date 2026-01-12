# Persistent Google OAuth - Quick Reference

## What Changed?

Users who sign in with Google will now:
1. ✅ Get prompted for their phone number right after role selection (if not already provided)
2. ✅ Have phone and email automatically stored in their account
3. ✅ See pre-filled email/phone fields on future sign-ins
4. ✅ Skip the phone prompt entirely if they already provided it

## Files Modified/Added

### New Files
- **ProfileCompletion.tsx** - Component that collects phone number after Google OAuth

### Modified Files  
- **App.tsx** - Added profile completion flow logic
- **Login.tsx** - Added pre-fill logic for form fields

### Documentation
- **PERSISTENT_OAUTH_IMPLEMENTATION.md** - Full technical documentation

## Key Functions

### App.tsx

```typescript
// Check if phone missing after role selection
handleGoogleRoleSelection(role)
  ├─ Updates metadata with role
  ├─ If phone missing → Show ProfileCompletion
  └─ If phone exists → Skip to dashboard

// Save phone when user enters it
handleProfileCompletionSubmit(phoneNumber)
  ├─ Updates user_metadata with phone
  ├─ Calls profile provision API
  └─ Navigates to dashboard

// Skip phone entry
handleProfileCompletionSkip()
  └─ Goes to dashboard without phone
```

### Login.tsx

```typescript
// Pre-fill form on component load
useEffect(() => {
  // Load email, phone, name from user_metadata
  // Auto-fills form fields
}, [])
```

## User Flows

### Scenario 1: First Google Sign-In
```
Google Sign-In 
  → Role Selection 
  → Profile Completion (Phone Entry)
  → Dashboard
```

### Scenario 2: Repeat Google Sign-In (Phone Already Provided)
```
Google Sign-In 
  → Role Selection 
  → Dashboard (Profile Completion Skipped)
```

### Scenario 3: Email/Password Login (After Google)
```
Login Form (Auto-Filled Email/Phone)
  → Sign In
  → Dashboard
```

## Testing Quick Checklist

```
[ ] First-time Google sign-in shows profile completion
[ ] Phone number gets saved to user_metadata
[ ] Second Google sign-in skips profile completion
[ ] Login form has email/phone pre-filled
[ ] Profile completion shows correct user info
[ ] Phone validation works (10+ digits)
[ ] Skip button works without phone
```

## Data Storage

**Where**: Supabase `auth.users.user_metadata`
**What**: 
```json
{
  "phone": "5551234567",
  "name": "User Name",
  "role": "artist|venue",
  "email": "user@example.com"
}
```

**How to Access**:
```typescript
const user = await supabase.auth.getUser();
const phone = user?.user_metadata?.phone;
```

## Component Integration

### ProfileCompletion Props
```typescript
<ProfileCompletion
  email={googleUser.email}
  userName={googleUser.user_metadata?.name}
  onComplete={(phone) => handleProfileCompletionSubmit(phone)}
  onSkip={() => handleProfileCompletionSkip()}
/>
```

## Common Questions

**Q: Can users skip providing phone?**  
A: Yes, they can click "Skip for now". They can add it later in profile settings.

**Q: Does this affect existing users?**  
A: No, only new Google sign-ins trigger the flow. Existing users are unaffected.

**Q: Where else is phone stored?**  
A: Also in the `artists` or `venues` database table via profile provision API.

**Q: What if user signs in with email/password?**  
A: Form fields auto-fill if they have phone in their metadata from a previous Google sign-in.

**Q: What about data privacy?**  
A: Phone is only visible to the user and stored securely in Supabase. Never shared publicly.

## Debugging

**Profile completion not showing?**
```typescript
// Check in browser console:
// 1. Google sign-in completes?
// 2. googleUser object populated?
// 3. Is phone in googleUser.user_metadata?.phone?
```

**Phone not persisting?**
```typescript
// Check Supabase:
// 1. Go to Supabase dashboard
// 2. Check auth.users table
// 3. Verify user_metadata has phone field
// 4. Check profile provision API response
```

**Form not pre-filling?**
```typescript
// Check in Login component:
// 1. useEffect running?
// 2. Session exists?
// 3. user_metadata populated in Supabase?
// 4. Email/phone fields have IDs matching setEmail/setPhone
```

## Deployment Notes

✅ No database migrations needed  
✅ Backwards compatible  
✅ Can be deployed immediately  
✅ No new environment variables required  
✅ Gradual rollout (only affects new OAuth flows)

## Performance Impact

- ✅ No additional database queries
- ✅ Uses existing Supabase auth metadata
- ✅ One additional API call to profile/provision (already happening)
- ✅ Minimal UI rendering overhead

## Browser Compatibility

Works on all modern browsers that support:
- ✅ ES2020+ JavaScript
- ✅ React 18+
- ✅ Supabase client
- ✅ localStorage (for state persistence)

## Related Documentation

See [PERSISTENT_OAUTH_IMPLEMENTATION.md](./PERSISTENT_OAUTH_IMPLEMENTATION.md) for:
- Complete technical details
- Data flow diagrams
- Testing procedures
- Future enhancements
- Troubleshooting guide
