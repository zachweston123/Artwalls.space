# Admin Tier Management Feature

**Status**: ✅ Complete  
**Date Implemented**: January 9, 2026

---

## Overview

Admin users can now read and change any artist's subscription tier directly from the admin panel. This allows admins to:
- View current tier for each artist
- Change tier instantly without Stripe
- Test different tier levels
- Correct tier assignments if needed
- Grant free upgrades or manage manual subscriptions

---

## Features Implemented

### 1. Admin Users List (AdminUsers.tsx)

**Feature**: Display tier for all users

- **Column**: "Plan" column shows subscription tier for each artist
- **Color Coding**:
  - Free: Gray (default)
  - Starter: Blue (accent color)
  - Growth: Blue variant
  - Pro: Green with crown icon
- **Real-time Updates**: Refreshes when tier is changed

**Location**: [src/components/admin/AdminUsers.tsx](src/components/admin/AdminUsers.tsx#L88-L92)

```tsx
plan: (a.subscriptionTier || 'free').toString().replace(/^(.)/, (m: string) => m.toUpperCase()),
```

---

### 2. Admin User Detail (AdminUserDetail.tsx)

**Feature**: View and edit individual user's tier

#### Display
- Shows current tier with color badge
- Pro tier displays crown icon (👑)
- Status badge shows subscription status (Active/Suspended)

#### Edit Interface
- Click "Change" button next to tier badge
- Dropdown selector with all 4 tier options: Free, Starter, Growth, Pro
- "Save" button to confirm change
- "Cancel" button to discard

#### Implementation
- **File**: [src/components/admin/AdminUserDetail.tsx](src/components/admin/AdminUserDetail.tsx)
- **Lines 59-102**: Tier edit UI and handler
- **State**: `isEditingTier`, `selectedTier`, `isSavingTier`
- **Function**: `handleTierChange()` - sends API request and updates local state

```tsx
{!isEditingTier ? (
  <div className="flex items-center gap-2">
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${tierBadgeColor}`}>
      {selectedTier.replace(/^(.)/, (m: string) => m.toUpperCase())} {selectedTier === 'pro' && <Crown className="w-3 h-3 inline ml-1" />}
    </span>
    <button onClick={() => setIsEditingTier(true)}>Change</button>
  </div>
) : (
  <div className="flex items-center gap-2">
    <select value={selectedTier} onChange={(e) => setSelectedTier(e.target.value as SubscriptionTier)}>
      <option value="free">Free</option>
      <option value="starter">Starter</option>
      <option value="growth">Growth</option>
      <option value="pro">Pro</option>
    </select>
    <button onClick={handleTierChange}>Save</button>
  </div>
)}
```

---

### 3. Backend API Endpoint

**Endpoint**: `POST /api/admin/users/:id/tier`

**File**: [server/index.js](server/index.js#L1734-L1762)

**Auth Required**: Admin authentication via `requireAdmin()`

**Request Body**:
```json
{
  "tier": "starter"
}
```

**Valid Tiers**: `free`, `starter`, `growth`, `pro` (case-insensitive)

**Response**:
```json
{
  "success": true,
  "message": "Tier updated to starter",
  "user": {
    "id": "user-uuid",
    "subscriptionTier": "starter",
    "subscriptionStatus": "active",
    ...
  }
}
```

**Error Responses**:
- `400 Bad Request` - Missing userId or invalid tier
- `404 Not Found` - Artist not found
- `403 Forbidden` - Insufficient admin privileges
- `500 Server Error` - Database error

**Side Effects**:
- Sets `subscriptionStatus` to `active` automatically
- Updates database immediately
- No Stripe API calls needed

---

## User Flow

### For Admin Users:

**Viewing Tiers**:
1. Go to Admin → Users
2. View "Plan" column for each artist
3. Click "View" button for more details

**Changing Tier**:
1. Click "View" on any artist row
2. In detail page, see tier badge with "Change" button
3. Click "Change" to reveal dropdown
4. Select new tier from: Free, Starter, Growth, Pro
5. Click "Save" to apply
6. Toast confirmation appears: "Tier updated to [tier]"
7. Tier changes immediately in database
8. Artist's capabilities update on next API call

**For Test Artists**:
1. You can grant Pro tier instantly for testing
2. Artists see all Pro features enabled
3. Protect against accidental downgrade with confirmation

---

## Database Impact

When tier is changed via admin:

**Before**:
```sql
artists.subscription_tier = 'free'
artists.subscription_status = 'inactive'
```

**After** (example: upgrade to Growth):
```sql
artists.subscription_tier = 'growth'
artists.subscription_status = 'active'
```

**Immediate Changes**:
- Display limits update (1 → 10 for Growth)
- Artwork limits update (1 → 30 for Growth)
- Analytics access enabled (for Growth+)
- Search visibility updates

**Next Request**:
- API calls see new tier via `getPlanLimitsForArtist()`
- Features gate based on new tier
- No page refresh required for users

---

## UI Components

### Tier Badge Colors

| Tier | Color Class | Appearance |
|------|-------------|-----------|
| Free | Gray | bg-[var(--surface-3)] text-[var(--text-muted)] |
| Starter | Blue | bg-[var(--surface-3)] text-[var(--accent)] |
| Growth | Blue | bg-[var(--blue-muted)] text-[var(--blue)] |
| Pro | Green | bg-[var(--green-muted)] text-[var(--green)] + Crown Icon 👑 |

### Change Button Behavior

- **Disabled**: While tier is being saved (`isSavingTier === true`)
- **Shows**: "Save" text while saving
- **Loading State**: Button opacity reduced, not clickable

### Cancel Button
- Reverts dropdown to previous value
- Closes edit interface
- No data loss

---

## Security

### Admin Authentication
- Requires `requireAdmin()` middleware
- Checks for:
  1. Valid Supabase JWT token
  2. Admin role in user metadata OR
  3. Email in ADMIN_EMAILS allowlist OR
  4. ADMIN_PASSWORD header (dev only)

### Validation
- Tier value validated against whitelist: `['free', 'starter', 'growth', 'pro']`
- Rejects unknown tiers with 400 error
- Ensures only valid tiers in database

### No Stripe Bypass
- Tier changed directly in artists table
- Bypasses Stripe entirely (intentional for admin override)
- Useful for:
  - Testing without payment
  - Manual subscription corrections
  - Free trial upgrades

---

## Testing Checklist

```
[ ] Admin Users List
    [ ] View artist with Free tier (gray badge)
    [ ] View artist with Starter tier (blue badge)
    [ ] View artist with Growth tier (blue badge)
    [ ] View artist with Pro tier (green badge with crown)

[ ] Admin User Detail - View Mode
    [ ] Tier badge displays current tier
    [ ] "Change" button visible
    [ ] Can click "Change" to enter edit mode

[ ] Admin User Detail - Edit Mode
    [ ] Dropdown selector shows all 4 tiers
    [ ] Can select each tier
    [ ] "Save" button is enabled/disabled correctly
    [ ] "Cancel" reverts selection
    [ ] Click "Cancel" exits edit mode

[ ] Tier Change
    [ ] Click "Save" sends API request
    [ ] "Saving..." state displays while loading
    [ ] Toast appears: "Tier updated to [tier]"
    [ ] Tier badge updates to new tier
    [ ] New tier persists after refresh
    [ ] subscription_status set to 'active'

[ ] API Endpoint
    [ ] POST /api/admin/users/:id/tier with valid tier works
    [ ] Returns success response
    [ ] Invalid tier returns 400 error
    [ ] Missing tier returns 400 error
    [ ] Non-existent user returns 404 error
    [ ] Non-admin returns 403 error

[ ] Feature Gating
    [ ] Free → Pro upgrade enables all features
    [ ] Logout/login not required (works immediately on API)
    [ ] Features available on next page load
```

---

## Troubleshooting

### Issue: Tier doesn't update
**Solution**: 
- Check admin authentication is working
- Verify user ID is correct
- Check console for API errors

### Issue: Tier shows as "—" for some users
**Solution**:
- Happens for venue users (venues don't have tiers)
- Only artists have tiers
- Check user.role is 'artist'

### Issue: Can't see Change button
**Solution**:
- Click "View" on the user row in admin list
- You're viewing AdminUserDetail component
- Change button should appear next to tier badge

### Issue: Toast doesn't appear
**Solution**:
- Toast auto-dismisses after 2 seconds
- Check browser console for errors
- Verify apiPost is configured correctly

---

## Future Enhancements

1. **Bulk Tier Updates**
   - Select multiple artists
   - Apply tier change to all
   - Confirmation dialog

2. **Tier Change History**
   - Log all tier changes
   - Show who changed it and when
   - Revert to previous tier

3. **Scheduled Tier Changes**
   - Set tier to expire on date
   - Auto-downgrade after free trial
   - Send warning email before expiry

4. **Tier Override Duration**
   - Allow admin to set expiry for override
   - Automatically revert to previous tier
   - Useful for limited-time test grants

5. **Tier Change Notifications**
   - Email artist when tier changes
   - Show in artist's dashboard
   - Highlight new available features

---

## Files Modified

### Backend
- [server/index.js](server/index.js#L1734-L1762) - Added `POST /api/admin/users/:id/tier` endpoint

### Frontend
- [src/components/admin/AdminUserDetail.tsx](src/components/admin/AdminUserDetail.tsx#L1-102) - Added tier edit UI and handlers
- [src/components/admin/AdminUsers.tsx](src/components/admin/AdminUsers.tsx) - Already displays tier (no changes needed)

### No Database Changes Required
- Existing `subscription_tier` column used
- No migrations needed

---

## Summary

✅ **Admins can now**:
- View artist subscription tier in user list
- Click to view detailed tier information
- Change tier via simple dropdown interface
- Instantly update database without Stripe
- See confirmation on success

✅ **Features automatically adjust**:
- Display limits
- Artwork limits
- Analytics access
- Search visibility
- All tier-gated features

✅ **Fully integrated** with existing:
- Admin authentication
- Tier-based access control
- Database schema
- API responses
