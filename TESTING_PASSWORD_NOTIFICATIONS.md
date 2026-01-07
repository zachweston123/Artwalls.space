# Password & Security + Notification Preferences - Testing Guide

## Quick Test

### Artist Profile Test
1. Log in as artist
2. Click Profile → Edit Profile (or go to Artist Profile)
3. Scroll down to "Account Settings"
4. Click **"Password & Security"**
   - Change your password
   - Toggle back to profile
5. Click **"Notification Preferences"**
   - Toggle email notifications off/on
   - Notice sub-options disable when parent is off
   - Click Save
   - Refresh page - settings should persist
   - Click back to profile

### Venue Profile Test
1. Log in as venue
2. Click Profile → go to Venue Profile
3. Scroll down to "Account Settings"
4. Click **"Password & Security"**
   - Same as artist test
5. Click **"Notification Preferences"**
   - Toggle different notification types
   - Application alerts, artist inquiries, etc.
   - Save and verify persist

## Testing Checklist

### Password & Security Page
- [ ] Back button returns to profile
- [ ] Current password field validates
- [ ] New password requires 6+ characters
- [ ] Confirm password must match
- [ ] Can't use same password as current
- [ ] Show/hide toggles work
- [ ] Success message appears on change
- [ ] Form clears after success
- [ ] Error messages are helpful
- [ ] Security tips display correctly
- [ ] Account status shows "Active"

### Notification Preferences Page
- [ ] Back button returns to profile
- [ ] All toggles work
- [ ] Dependent toggles disable properly
  - Sale Alerts disabled when Email off
  - Application Updates disabled when Email off
  - Weekly Digest disabled when Email off
- [ ] Save button appears when changes made
- [ ] Cancel button reverts changes
- [ ] Success message appears on save
- [ ] Preferences persist after refresh
- [ ] Settings load on page mount
- [ ] Email frequency info displays
- [ ] Help sidebar content shows

### Navigation
- [ ] Buttons in profile navigate correctly
- [ ] Back buttons return to profile
- [ ] Can navigate between pages
- [ ] Page titles are correct
- [ ] Breadcrumb/header shows context

### UI/UX
- [ ] Responsive on mobile
- [ ] Responsive on tablet
- [ ] Responsive on desktop
- [ ] Icons display correctly
- [ ] Colors match design system
- [ ] Toggle switches work smoothly
- [ ] Loading states appear
- [ ] Error boxes are visible
- [ ] Success messages clear after 3s
- [ ] Form inputs clear properly

### Edge Cases
- [ ] Try wrong current password
- [ ] Try too-short new password
- [ ] Try non-matching confirmation
- [ ] Try toggling preferences rapidly
- [ ] Try navigating away without saving
- [ ] Try saving with no changes
- [ ] Try accessing without auth (should redirect)

## Expected Behavior

### Password Change Success
1. User enters valid passwords
2. Click "Update Password"
3. Button shows "Updating..."
4. Success message appears (green)
5. Form fields clear
6. Message disappears after 3 seconds

### Password Change Failure
1. User enters invalid password
2. Button shows "Updating..."
3. Error message appears (red) with reason
4. Form fields retain values (except password)
5. User can retry

### Notification Preferences Save
1. User toggles switches
2. Save button appears
3. Click "Save Preferences"
4. Button shows "Saving..."
5. Success message appears (green)
6. Message disappears after 3 seconds
7. Refresh page - settings persist

### Notification Preferences Cancel
1. User toggles switches
2. Click "Cancel"
3. All toggles revert to saved state
4. Save button disappears

## Browser DevTools Check

Open browser DevTools (F12) and check:
- No TypeScript errors in Console
- No React warnings
- Network: API calls succeed
- Application → localStorage has notification preferences
- Application → Supabase user metadata updated

## Files to Check

If tests fail, verify these files exist and are imported:
- ✅ `src/components/artist/PasswordSecurity.tsx`
- ✅ `src/components/artist/NotificationPreferences.tsx`
- ✅ `src/components/venue/VenuePasswordSecurity.tsx`
- ✅ `src/components/venue/VenueNotificationPreferences.tsx`
- ✅ `src/App.tsx` has imports and routing

## Common Issues

**Buttons don't navigate:**
- Check `onNavigate` prop is passed correctly
- Verify page names match exactly: `artist-password-security`, `artist-notifications`, etc.

**Preferences don't save:**
- Check browser DevTools → Application → localStorage
- Verify `notificationPreferences` key exists
- Check Supabase user metadata in dashboard

**Show/hide password doesn't work:**
- Check `showCurrent`, `showNew`, `showConfirm` state is toggling
- Verify eye/eye-off icons are from lucide-react

**Toggles don't disable:**
- Check `disabled={!settings.emailNotifications}` in the JSX
- Verify conditional opacity/cursor styles apply

**Messages don't appear:**
- Check `message` state is being set
- Verify timeout is clearing message after 3000ms
- Look for console errors

## Performance Notes

- Pages use lazy loading for preferences
- localStorage is synchronous (fast)
- Supabase sync is async (handles offline gracefully)
- No unnecessary re-renders with proper state management

---

**All tests pass?** ✅ Ready for production!
