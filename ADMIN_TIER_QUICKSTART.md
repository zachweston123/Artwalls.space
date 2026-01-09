# Admin Tier Management - Quick Start Guide

## How to Use

### View a User's Tier

1. **Go to Admin Dashboard**
   - Click Admin in navigation
   - Navigate to Users section

2. **Find the User**
   - Search by name, email, or ID
   - Look at the "Plan" column
   - Color indicates tier:
     - 🔘 Gray = Free
     - 🔵 Blue = Starter
     - 🔵 Blue = Growth  
     - 🟢 Green with 👑 = Pro

3. **View Details**
   - Click the "View" button on the right
   - Opens detailed user profile

### Change a User's Tier

1. **Open User Detail**
   - From Admin Users list, click "View" on any artist

2. **Edit Tier**
   - Next to tier badge, click "Change" button
   - Tier badge becomes a dropdown
   - Select new tier from dropdown (Free, Starter, Growth, Pro)
   - Click "Save" to apply

3. **Confirmation**
   - Toast message appears: "Tier updated to [tier]"
   - Tier badge updates immediately
   - Database is updated
   - Artist's features change on next API call

### What Happens When Tier Changes

| From | To | Result |
|------|----|---------:|
| Free | Starter | Can now create 10 artworks (was 1), display 4 (was 1) |
| Free | Growth | Can now create 30 artworks, display 10, see advanced analytics |
| Free | Pro | Unlimited artworks & displays, all Pro features enabled, 👑 badge |
| Any | Free | Limited back to 1 artwork, 1 display |

---

## API Endpoint

If using directly via API:

```bash
curl -X POST http://localhost:4242/api/admin/users/{userId}/tier \
  -H "Authorization: Bearer {adminToken}" \
  -H "Content-Type: application/json" \
  -d '{"tier": "growth"}'
```

**Response**:
```json
{
  "success": true,
  "message": "Tier updated to growth",
  "user": {
    "id": "...",
    "subscriptionTier": "growth",
    "subscriptionStatus": "active",
    "name": "...",
    ...
  }
}
```

---

## Common Tasks

### Give a Test Artist Pro Access
1. Open Admin → Users
2. Find test artist
3. Click View
4. Click Change next to tier
5. Select "Pro" from dropdown
6. Click Save
7. Test artist now has all Pro features

### Correct a Tier Assignment
1. Find artist in users list
2. Click View
3. Change tier to correct one
4. Save
5. Artist has correct features immediately

### Downgrade User (e.g., subscription canceled)
1. Find artist
2. Click View
3. Change tier to "Free"
4. Save
5. Artist limited to Free tier restrictions
6. Excess artworks/displays become inactive

---

## Admin Access

You need admin access to use this feature. Admin access requires:
- Admin role in Supabase auth metadata, OR
- Email in `ADMIN_EMAILS` environment variable (comma-separated), OR
- Valid `ADMIN_PASSWORD` header (dev only)

---

## Support

If tier isn't changing:
1. Check you're logged in as admin
2. Verify user exists (see error message)
3. Check browser console for errors
4. Refresh page and try again

If features aren't updating:
1. Artist needs to refresh page/make new API call
2. Or log out and back in
3. Features gate based on subscription_tier column
