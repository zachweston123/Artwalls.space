# Artwalls - Navigation & Information Architecture

## Complete Route Map

### Public Routes (No Authentication Required)

| Route | Screen | Desktop | Mobile | Description |
|-------|--------|---------|--------|-------------|
| `/` | Landing Page | ✓ | ✓ | Marketing homepage |
| `/login` | Login | ✓ | ✓ | Sign in / Sign up |
| `/signup` | Sign Up | ✓ | ✓ | Create account (role selection) |
| `/purchase/:artworkId` | Customer Purchase Page | ✓ | ✓ | QR code artwork purchase flow |
| `/policies` | Policies Landing | ✓ | ✓ | Legal policies index |
| `/policies/artist-agreement` | Artist Agreement | ✓ | ✓ | Artist terms of service |
| `/policies/venue-agreement` | Venue Agreement | ✓ | ✓ | Venue terms of service |
| `/policies/privacy` | Privacy Policy | ✓ | ✓ | Privacy policy |
| `/policies/terms` | Terms of Service | ✓ | ✓ | General terms |

---

## Artist Routes (Authenticated, Role = Artist)

### Primary Navigation (Desktop Nav + Mobile Menu)

| Route | Screen | Desktop Nav | Mobile Menu | Description |
|-------|--------|-------------|-------------|-------------|
| `/artist/dashboard` | Artist Dashboard | ✓ Dashboard | ✓ Dashboard | Overview, quick stats, recent activity |
| `/artist/artworks` | My Artworks | ✓ Artworks | ✓ Artworks | Portfolio management, add/edit artworks |
| `/artist/discover-venues` | Find Venues | ✓ Find Venues | ✓ Find Venues | Browse venues, send invitations |
| `/artist/invitations` | Invitations Inbox | ✓ Invitations | ✓ Invitations | View venue invites, accept/decline |
| `/artist/applications` | Applications | ✓ Applications | ✓ Applications | Track submitted applications |
| `/artist/sales` | Sales | ✓ Sales | ✓ Sales | Sales dashboard, transaction history |
| `/artist/profile` | My Profile | ✓ Profile | ✓ Profile | View/edit public artist profile |
| `/artist/settings` | Settings | — | ✓ Settings | Account settings, notifications |
| `/artist/notifications` | Notifications | Bell icon | ✓ Notifications | Activity notifications |

### Secondary Routes (Not in main nav)

| Route | Screen | Access Method | Description |
|-------|--------|---------------|-------------|
| `/artist/artworks/new` | Add Artwork | Button on Artworks page | Create new artwork |
| `/artist/artworks/:id/edit` | Edit Artwork | Button on artwork card | Edit existing artwork |
| `/artist/artworks/:id` | Artwork Detail | Click on artwork | View single artwork details |
| `/venue/:id` | Venue Profile (Artist View) | Click from Find Venues | View venue public profile |
| `/artist/plans-pricing` | Plans & Pricing | Footer / Upgrade CTA | Subscription plan selection |

---

## Venue Routes (Authenticated, Role = Venue)

### Primary Navigation (Desktop Nav + Mobile Menu)

| Route | Screen | Desktop Nav | Mobile Menu | Description |
|-------|--------|-------------|-------------|-------------|
| `/venue/dashboard` | Venue Dashboard | ✓ Dashboard | ✓ Dashboard | Overview, display status, quick actions |
| `/venue/walls` | Wall Spaces | ✓ Walls | ✓ Walls | Manage display spaces |
| `/venue/discover-artists` | Find Artists | ✓ Find Artists | ✓ Find Artists | Browse artists, send invitations |
| `/venue/invitations` | Invitations Sent | ✓ Invitations | ✓ Invitations | Track sent invitations |
| `/venue/applications` | Applications | ✓ Applications | ✓ Applications | Review artist applications |
| `/venue/current-art` | Current Displays | ✓ Current Art | ✓ Current Art | Active artwork displays, scheduling |
| `/venue/sales` | Sales | ✓ Sales | ✓ Sales | Sales generated at venue |
| `/venue/profile` | Venue Profile | ✓ Profile | ✓ Profile | View/edit public venue profile |
| `/venue/settings` | Settings | — | ✓ Settings | Operating hours, install windows |
| `/venue/notifications` | Notifications | Bell icon | ✓ Notifications | Activity notifications |

### Secondary Routes (Not in main nav)

| Route | Screen | Access Method | Description |
|-------|--------|---------------|-------------|
| `/venue/walls/new` | Add Wall Space | Button on Walls page | Create new wall space |
| `/venue/walls/:id/edit` | Edit Wall Space | Button on wall card | Edit wall space details |
| `/artist/:id` | Artist Profile (Venue View) | Click from Find Artists | View artist public profile |
| `/venue/plans-pricing` | Plans & Pricing | Footer / Upgrade CTA | Subscription plan selection |

---

## Admin Routes (Authenticated, Role = Admin)

### Admin Sidebar Navigation

| Route | Screen | Sidebar Item | Description |
|-------|--------|--------------|-------------|
| `/admin/dashboard` | Admin Dashboard | ✓ Dashboard | Platform KPIs, quick actions, system status |
| `/admin/users` | Users List | ✓ Users | Search and manage all users |
| `/admin/users/:id` | User Detail | — | View user profile, actions, history |
| `/admin/orders` | Orders & Payments | ✓ Orders & Payments | Transaction management |
| `/admin/orders/:id` | Order Detail | — | View order details, timeline |
| `/admin/announcements` | Announcements | ✓ Announcements | Manage platform announcements |
| `/admin/announcements/new` | Create Announcement | — | Create new announcement |
| `/admin/announcements/:id/edit` | Edit Announcement | — | Edit announcement |
| `/admin/promo-codes` | Promo Codes | ✓ Promo Codes | Manage subscription promo codes |
| `/admin/promo-codes/new` | Create Promo Code | — | Create new promo code |
| `/admin/activity-log` | Activity Log | ✓ Activity Log | Audit trail of admin actions |
| `/admin/settings` | Admin Settings | ✓ Settings | Platform settings (placeholder) |

### Admin-Only Access

Admin users **cannot** access artist or venue routes. They have a completely separate interface with the admin sidebar layout.

---

## Shared/Common Routes (All Authenticated Users)

| Route | Screen | All Roles | Description |
|-------|--------|-----------|-------------|
| `/notifications` | Notifications List | ✓ | Unified notifications |
| `/plans-pricing` | Plans & Pricing | ✓ | Subscription plans (not applicable to Admin) |

---

## Navigation Component Mapping

### Desktop Navigation Bar (Artist/Venue)

**Position:** Top of page, sticky
**Layout:** Horizontal

```
Logo | Dashboard | [Role-specific links] | Notifications (🔔) | Profile (Avatar) ▾
```

**Artist Links:**
- Dashboard
- Artworks
- Find Venues
- Invitations
- Applications
- Sales
- Profile

**Venue Links:**
- Dashboard
- Walls
- Find Artists
- Invitations
- Applications
- Current Art
- Sales
- Profile

### Mobile Navigation (Artist/Venue)

**Trigger:** Hamburger menu icon (☰) top-right
**Layout:** Slide-in drawer from right

**Contains:**
- All primary desktop nav links
- Settings (mobile-only)
- Notifications
- Sign Out

### Admin Sidebar (Desktop)

**Position:** Left side, fixed
**Layout:** Vertical

```
[Admin Badge]
─────────────
Dashboard
Users
Orders & Payments
Announcements
Promo Codes
Activity Log
Settings
─────────────
[Admin User Info]
```

**Mobile:** Collapsible hamburger menu (same pattern as artist/venue)

---

## Footer Navigation (Role-Aware)

The footer appears on all authenticated pages and adapts based on user role.

### Footer Links (All Roles)

```
About | How It Works | Policies | Contact | Help Center
```

### Footer Legal Links

```
Artist Agreement (artists only) | Venue Agreement (venues only) | Privacy Policy | Terms of Service
```

**Implementation Rules:**
1. Do NOT show links to screens the user cannot access
2. Artist users see "Artist Agreement" link
3. Venue users see "Venue Agreement" link
4. Admin users see generic "Policies" link

---

## Role-Based Access Control Matrix

| Route Pattern | Artist | Venue | Admin | Public |
|---------------|--------|-------|-------|--------|
| `/` | ✓ | ✓ | ✓ | ✓ |
| `/login` | — | — | — | ✓ |
| `/signup` | — | — | — | ✓ |
| `/purchase/:id` | ✓ | ✓ | — | ✓ |
| `/policies/*` | ✓ | ✓ | ✓ | ✓ |
| `/artist/*` | ✓ | ✗ | ✗ | ✗ |
| `/venue/*` | ✗ | ✓ | ✗ | ✗ |
| `/admin/*` | ✗ | ✗ | ✓ | ✗ |

**Legend:**
- ✓ = Allowed
- ✗ = Forbidden (show "Not Authorized" screen)
- — = Redirect to role-specific dashboard

---

## Error & Edge Case Routes

### Authentication Guards

| Scenario | Behavior | Screen |
|----------|----------|--------|
| Not logged in → protected route | Redirect to `/login` | Login page |
| Wrong role → route | Show error screen | "Not Authorized" (401) |
| Invalid route | Show error screen | "Page Not Found" (404) |
| Network error | Show error banner | Retry CTA |

### 404 Not Found Screen

**Route:** Catch-all `*`
**Layout:** Centered error message
**CTA:** "Go to Dashboard" (role-specific)

### 401 Not Authorized Screen

**Route:** Accessed when user tries to access wrong role's routes
**Layout:** Centered error message
**CTA:** "Return to My Dashboard" (role-specific)

---

## Deep Linking & Route Parameters

### Dynamic Routes (Must Handle)

```tsx
// Artwork detail
/artist/artworks/:artworkId

// Venue detail (artist view)
/venue/:venueId

// Artist detail (venue view)
/artist/:artistId

// User detail (admin)
/admin/users/:userId

// Order detail (admin)
/admin/orders/:orderId

// Purchase page (public)
/purchase/:artworkId
```

**Implementation Requirements:**
1. All `:id` parameters must be validated
2. If ID is invalid/not found, show "Not Found" screen
3. Do NOT fall back to showing wrong data
4. Support browser back/forward buttons
5. URL must be shareable (deep linkable)

---

## Breadcrumb Navigation

Breadcrumbs appear on detail pages to show navigation hierarchy.

### Examples

```
Artist Dashboard > Artworks > Urban Sunset
Venue Dashboard > Find Artists > Sarah Chen
Admin Dashboard > Users > User Detail: Sarah Chen
```

**Pattern:**
```tsx
Home > Parent > Current Page
```

---

## Search & Filter State in URL

For pages with filters (Find Artists, Find Venues, Users List), preserve filter state in URL query parameters.

### Example

```
/artist/discover-venues?city=portland&style=modern&sort=newest
/admin/users?role=artist&plan=growth&status=active
```

**Benefits:**
- Shareable filtered views
- Browser back/forward works correctly
- Bookmarkable searches

---

## Mobile Navigation Patterns

### Bottom Tab Bar (Alternative - Not Currently Used)

If implementing bottom tab navigation on mobile:

```
[Dashboard] [Browse] [Add] [Activity] [Profile]
```

Currently using **hamburger drawer** pattern for consistency with desktop.

---

## Keyboard Navigation Map

### Global Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl/Cmd + K` | Open search |
| `Esc` | Close modal/drawer |
| `Tab` | Focus next element |
| `Shift + Tab` | Focus previous element |
| `Enter` | Activate focused element |
| `Space` | Toggle checkbox/switch |

### Navigation Keyboard Support

| Element | Keys | Behavior |
|---------|------|----------|
| Dropdown menu | `↑` `↓` | Navigate items |
| Dropdown menu | `Enter` | Select item |
| Dropdown menu | `Esc` | Close menu |
| Tabs | `←` `→` | Switch tabs |
| Modal | `Esc` | Close modal |
| Table rows | `↑` `↓` | Navigate rows |
| Table rows | `Enter` | Open row detail |

---

## Screen Transition Animations

### Page Transitions
```tsx
duration: 300ms
easing: ease-in-out
effect: fade + slight slide
```

### Modal Transitions
```tsx
duration: 200ms
easing: ease-out
effect: fade + scale from 96% to 100%
```

### Drawer Transitions
```tsx
duration: 300ms
easing: ease-in-out
effect: slide from edge
```

---

## Navigation Checklist

- ✅ All routes defined with clear purpose
- ✅ Role-based access control implemented
- ✅ Desktop and mobile navigation expose same destinations
- ✅ Footer links are role-aware (no broken links)
- ✅ Admin sidebar maps to real screens
- ✅ Deep linking works for all detail pages
- ✅ Invalid IDs show "Not Found" (not wrong data)
- ✅ Breadcrumbs on nested pages
- ✅ Filter state preserved in URL
- ✅ Keyboard navigation fully supported
- ✅ Focus management in modals/drawers
- ✅ 404 and 401 error screens designed
- ✅ Browser back/forward buttons work correctly

---

This navigation architecture ensures every route is accounted for, accessible, and properly gated by role with no dead links or inaccessible screens.
