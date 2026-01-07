# Password & Security + Notifications - Quick Reference

## What's Now Live

✅ **Password & Security Pages** - Change password with validation  
✅ **Notification Preferences Pages** - Manage email, push, in-app notifications  
✅ **Artist & Venue versions** - Both user types fully supported  
✅ **Dark mode** - Matches existing design system  

## Where to Find Them

### Artist
Profile → Account Settings → Pick one:
- "Password & Security" → password change form
- "Notification Preferences" → toggle notifications

### Venue
Profile → Account Settings → Pick one:
- "Password & Security" → password change form
- "Notification Preferences" → toggle notifications

## Features at a Glance

| Feature | What It Does |
|---------|--------------|
| **Change Password** | Updates auth password with validation |
| **Show/Hide Password** | Toggle visibility of password input |
| **Email Notifications** | Receive updates via email |
| **Sale Alerts** | Artist only - notified when artwork sells |
| **Application Updates** | Get updates about applications/invites |
| **Push Notifications** | Real-time browser notifications |
| **In-App Messages** | Notifications in app notification center |
| **Persistent Storage** | Preferences saved to localStorage + Supabase |

## Page Routes

```
Artist Routes:
  artist-password-security → PasswordSecurity component
  artist-notifications → NotificationPreferences component

Venue Routes:
  venue-password-security → VenuePasswordSecurity component
  venue-notifications → VenueNotificationPreferences component
```

## File Locations

```
src/components/
├── artist/
│   ├── PasswordSecurity.tsx ............ Change password
│   └── NotificationPreferences.tsx ..... Manage notifications
└── venue/
    ├── VenuePasswordSecurity.tsx ....... Change password
    └── VenueNotificationPreferences.tsx. Manage notifications

src/App.tsx ............................ Routing and imports
```

## Technical Details

### Password Updates
- Uses `supabase.auth.updateUser()`
- Minimum 6 characters
- Must match confirmation
- Can't reuse current password
- Real-time error messages

### Notification Preferences
- Stored in localStorage
- Also synced to Supabase metadata
- Dependent toggles (some require parent to be on)
- Load preferences on mount
- Persist across sessions

## Notification Types

### Artist
- Email Notifications (parent toggle)
  - Sale Alerts
  - Application Updates
  - Weekly Digest
- Push Notifications
- In-App Notifications

### Venue
- Email Notifications (parent toggle)
  - Application Alerts
  - Artist Inquiries
  - Wallspace Updates
  - Monthly Report
- Push Notifications
- In-App Notifications

## UI/UX Highlights

- ✅ Responsive design (mobile-friendly)
- ✅ Dark mode support
- ✅ Loading states
- ✅ Success/error notifications
- ✅ Inline validation
- ✅ Help sidebars
- ✅ Back buttons for navigation
- ✅ Disabled states for dependent toggles
- ✅ Clear error messages

## How to Test

1. Navigate to Artist or Venue Profile
2. Scroll to "Account Settings"
3. Click either button
4. Test the features (change password or toggle notifications)
5. Verify back button returns to profile
6. For notifications: refresh page and verify settings persisted

## Code Quality

- ✅ TypeScript with full types
- ✅ React hooks (useState, useEffect)
- ✅ Proper error handling
- ✅ Accessibility features
- ✅ Responsive CSS
- ✅ Design system integration
- ✅ No external dependencies added
- ✅ localStorage for offline support

## Performance

- Lazy loading of preferences
- Async Supabase sync
- Efficient re-renders
- No blocking operations
- Handles offline gracefully

## Browser Support

Works on:
- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers

## Security Notes

- Passwords sent to Supabase Auth (not stored locally)
- Show/hide toggles are UX only
- Preferences stored in localStorage (not sensitive)
- No API keys exposed
- Standard Supabase security practices

---

**Ready to go!** Just navigate to Profile → Account Settings → choose an option.
