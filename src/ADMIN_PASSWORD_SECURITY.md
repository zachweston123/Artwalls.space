# @deprecated — Internal documentation. Moved to project wiki.
## How to Access Admin Console

### Method 1: Keyboard Shortcut (Recommended)
1. On the login page, press **Ctrl+Shift+A** (Windows) or **Cmd+Shift+A** (Mac)
2. A password prompt modal will appear
3. Enter the admin password: **`StormBL26`**
4. Click "Verify" to access the admin dashboard

### Method 2: Direct Admin User Creation
If you're testing through code, you can create an admin user that requires password verification:
```tsx
// Attempting to login as admin will trigger password prompt
handleLogin({
  id: 'admin-1',
  name: 'Admin User',
  email: 'admin@artwalls.com',
  role: 'admin'
})
```

## Key Security Features

### 1. **Password-Protected Access**
   - Admin login requires a password prompt
   - Password: `artwalls-admin-2024`
   - Password field has show/hide toggle
   - All password entries are cleared after verification (success or failure)

### 2. **Removed Demo Button**
   - The "Sign in as Admin" button from the login demo panel has been removed
   - Only the "View Customer Purchase Page" demo button remains for testing QR flows

### 3. **Hidden Access Route**
   - Admin access is only triggered via keyboard shortcut: **Ctrl+Shift+A**
   - Not visible in the UI, must be known/documented

### 4. **Password Verification State**
   - Password is verified before admin user can access the console
   - Password state is cleared after login or cancellation
   - Prevents accidental admin access

## Components Added

### AdminPasswordPrompt Component
**Location:** `/src/components/admin/AdminPasswordPrompt.tsx`

Features:
- Clean modal dialog with lock icon
- Password input with show/hide toggle
- Error messages for incorrect passwords
- Dark mode support
- ESC key to cancel
- Loading state during verification
- 500ms verification delay (simulates server check)

## Production Configuration

### Before deploying to production:

1. **Change the default password**
   ```tsx
   // In AdminPasswordPrompt.tsx
   const ADMIN_PASSWORD = 'StormBL26'; // Change this
   ```

2. **Move password to environment variable**
   ```tsx
   const ADMIN_PASSWORD = process.env.REACT_APP_ADMIN_PASSWORD || 'artwalls-admin-2024';
   ```

3. **Add to `.env.production`**
   ```
   REACT_APP_ADMIN_PASSWORD=your-secure-password-here
   ```

4. **Consider backend authentication**
   - Validate admin password on server
   - Implement JWT or session-based admin authentication
   - Add rate limiting on password attempts
   - Log admin access attempts

## Testing Checklist

- [ ] Keyboard shortcut (Ctrl+Shift+A) opens password prompt
- [ ] Correct password allows access to admin dashboard
- [ ] Incorrect password shows error message
- [ ] Password field clears after failed attempt
- [ ] ESC key closes the password prompt
- [ ] Show/hide password toggle works
- [ ] Dark mode styling works in password prompt
- [ ] Demo admin button is no longer visible
- [ ] QR code demo button still appears
- [ ] Non-admin logins work normally (no password required)

## User Flow

```
Login Page
    ↓
User presses Ctrl+Shift+A
    ↓
AdminPasswordPrompt modal appears
    ↓
User enters password
    ↓
Correct? → Yes → Admin Dashboard
           ↓
           No → Show error, clear password, prompt again
```

## Security Notes

1. This implementation provides **UI-level protection** against casual access
2. For production, implement **server-side authentication** for admin roles
3. Store passwords securely (hashed, never in code)
4. Consider implementing:
   - Two-factor authentication (2FA)
   - IP whitelisting
   - Admin activity logging
   - Password expiration policies
   - Rate limiting on failed attempts
