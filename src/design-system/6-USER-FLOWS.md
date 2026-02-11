# @deprecated — Internal documentation. Moved to project wiki.

## Flow 1: Artist Onboarding & First Artwork

### Steps

1. **Landing Page** (`/`)
   - User clicks "Get Started" or "Sign Up"
   - Navigate to `/login`

2. **Sign Up** (`/login`)
   - User selects "I'm an Artist"
   - Fills in name, email, password
   - Submits form
   - **System:** Creates user account with role=artist
   - Navigate to `/artist/dashboard`

3. **Agreement Banner** (on dashboard)
   - Banner appears: "Please review and accept the Artist Agreement"
   - User clicks "Review Agreement"
   - Navigate to `/policies/artist-agreement`

4. **Accept Agreement** (`/policies/artist-agreement`)
   - User reads terms
   - Clicks "I Accept"
   - **System:** Sets hasAcceptedAgreement = true
   - Navigate back to `/artist/dashboard`

5. **Add First Artwork** (`/artist/dashboard`)
   - Dashboard shows empty state: "No artworks yet"
   - User clicks "+ Add Artwork" button
   - Navigate to `/artist/artworks/new`

6. **Create Artwork** (`/artist/artworks/new`)
   - Form fields:
     - Upload image (required)
     - Title (required)
     - Description (optional)
     - Price (required)
     - Medium (dropdown)
     - Dimensions
     - Style tags
   - User fills form and clicks "Save Artwork"
   - **System:** Creates artwork record
   - Navigate to `/artist/artworks`

7. **View Artwork** (`/artist/artworks`)
   - Grid shows new artwork card
   - Status: "Available"
   - User can edit, delete, or browse venues

**Success State:** Artist has account and first artwork ready to share

---

## Flow 2: Venue Sends Invitation to Artist

### Steps

1. **Browse Artists** (`/venue/discover-artists`)
   - Venue user navigates to "Find Artists"
   - Uses search/filters to find artists
   - Clicks on artist card to view profile

2. **View Artist Profile** (`/artist/:id`)
   - Views artist bio, portfolio, stats
   - Clicks "Send Invitation" button
   - Modal opens

3. **Send Invitation Modal**
   - Form fields:
     - Select wall space (dropdown)
     - Select artwork (dropdown of artist's available works)
     - Duration (30/90/180 days radio buttons)
     - Personal message (textarea)
     - Install window reminder (auto-filled from venue settings)
   - User clicks "Send Invitation"
   - **System:** Creates invitation record, sends email to artist
   - Modal closes, toast: "Invitation sent to Sarah Chen"

4. **Track Invitation** (`/venue/invitations`)
   - Navigate to "Invitations" page
   - See invitation card with "Pending" status
   - Can resend or cancel invitation

5. **Artist Receives Invitation** (`/artist/invitations`)
   - Artist logs in, sees notification badge
   - Navigates to "Invitations"
   - Sees invitation from venue

6. **Artist Accepts** (`/artist/invitations`)
   - Clicks "View Details" on invitation
   - Reviews wall space, duration, message
   - Clicks "Accept" button
   - **System:** Updates invitation status, creates display booking
   - Toast: "Invitation accepted!"

7. **Venue Notified**
   - Venue receives email notification
   - Invitation card updates to "Accepted" status (green)
   - Display appears in "Current Displays"

**Success State:** Artwork scheduled for display at venue

---

## Flow 3: Customer Purchases Artwork (QR Code Flow)

### Steps

1. **QR Code Scan** (Physical venue)
   - Customer scans QR code next to artwork
   - Opens URL: `/purchase/:artworkId`

2. **Purchase Page** (`/purchase/:artworkId`)
   - Shows artwork image, title, artist name, price
   - Artist protection plan badge (if active)
   - Description of artist
   - "Buy This Artwork" CTA button

3. **Stripe Checkout**
   - User clicks "Buy This Artwork"
   - **System:** Creates Stripe checkout session
   - Redirects to Stripe hosted checkout
   - User enters payment details
   - Completes purchase

4. **Confirmation**
   - Stripe redirects back to confirmation page
   - Shows: "Purchase complete! Receipt sent to email."
   - Artist and venue both receive notifications

5. **Backend Processing**
   - **System:** Receives Stripe webhook
   - Creates order record
   - Calculates splits: 80% artist, 10% venue, 10% platform
   - Marks artwork as "Sold"
   - Updates display status to "Sold"

6. **Artist View** (`/artist/sales`)
   - Artist sees new sale in sales dashboard
   - Transaction shows: $850 total, $680 artist earning

7. **Venue View** (`/venue/sales`)
   - Venue sees sale in their dashboard
   - Transaction shows: $850 total, $85 venue commission

**Success State:** Artwork sold, payment processed, everyone notified

---

## Flow 4: Artist Subscription Upgrade

### Steps

1. **View Pricing** (`/artist/dashboard`)
   - Artist sees upgrade CTA: "Upgrade to Growth Plan"
   - OR navigates via footer link: "Plans & Pricing"
   - Navigate to `/plans-pricing`

2. **Pricing Page** (`/plans-pricing`)
   - Shows 4 tiers: Free, Starter, Growth, Pro
   - Current plan highlighted: "Free (Current)"
   - Compares features in grid
   - Each paid tier has "Select Plan" button

3. **Select Plan**
   - User clicks "Select Plan" on "Growth" tier
   - **System:** Creates Stripe checkout session for subscription
   - Redirects to Stripe hosted checkout

4. **Enter Payment**
   - User enters payment details
   - Optional: Enters promo code (e.g., WELCOME15)
   - **System:** Applies discount if valid
   - User confirms subscription

5. **Subscription Active**
   - Stripe redirects back to app
   - **System:** Receives webhook, updates user subscription
   - Toast: "Welcome to Growth Plan!"
   - Navigate to `/artist/dashboard`

6. **Dashboard Updated**
   - Plan badge shows "Growth" instead of "Free"
   - New limits active: 10 active displays (was 1)
   - Display count shows: "3 / 10 displays"

**Success State:** Artist upgraded, new features unlocked

---

## Flow 5: Admin Moderates User

### Steps

1. **Search User** (`/admin/users`)
   - Admin uses search: "emma.liu@example.com"
   - Results show matching user
   - Clicks "View" button

2. **View User Detail** (`/admin/users/:id`)
   - Shows user profile: Emma Liu, Artist, Free plan
   - Notes tab shows previous support interactions
   - Admin reviews user's artworks and activity

3. **Suspend User**
   - Admin clicks "Suspend" button (red)
   - Confirmation modal: "Are you sure you want to suspend this user?"
   - Admin enters reason: "Violation of terms - inappropriate content"
   - Clicks "Confirm Suspension"

4. **System Actions**
   - **System:** Updates user status to "Suspended"
   - Logs action to activity log
   - Sends email to user
   - User can no longer log in

5. **Add Internal Note** (`/admin/users/:id` - Notes tab)
   - Admin switches to Notes tab
   - Tag: "Safety"
   - Note: "User uploaded inappropriate content. Artworks removed. Suspension upheld."
   - Clicks "Save Note"
   - **System:** Stores note with timestamp and author

6. **Activity Log** (`/admin/activity-log`)
   - Action appears: "admin@artwalls.com suspended user emma.liu@example.com"
   - Details: "Violation of terms"
   - Timestamp: 2024-01-22 14:45:30

**Success State:** User suspended, team notified, audit trail created

---

## Flow 6: Venue Manages Wall Spaces

### Steps

1. **Add Wall Space** (`/venue/walls`)
   - Venue clicks "+ Add Wall Space"
   - Form modal opens

2. **Wall Space Form**
   - Fields:
     - Name: "Main Dining Area"
     - Dimensions: 8ft × 6ft
     - Lighting: "Natural" (dropdown)
     - Visibility: "High Traffic" (dropdown)
     - Upload photo (optional)
   - Clicks "Save Wall Space"
   - **System:** Creates wall space record

3. **View Wall Spaces** (`/venue/walls`)
   - Grid shows new wall space card
   - Status: "Available" (no artwork assigned)
   - Can edit or delete wall space

4. **Schedule Artwork** (`/venue/dashboard`)
   - From dashboard, clicks "Browse Artists"
   - Finds artist, sends invitation (see Flow 2)
   - Artist accepts invitation

5. **Manage Display** (`/venue/current-art`)
   - Wall space now shows "On Display"
   - Shows artwork, artist, end date
   - Actions: Contact Artist, Mark as Sold, Extend

6. **Extend Display**
   - Display ending soon (15 days left)
   - Venue clicks "Extend" button
   - Modal: Select new duration (30/90/180 days)
   - **System:** Sends request to artist
   - Artist receives notification to accept/decline

**Success State:** Venue has organized wall spaces and manages displays efficiently

---

## Flow 7: Artist Applies to Venue Opportunity

### Steps

1. **Browse Venues** (`/artist/discover-venues`)
   - Artist uses filters: City=Portland, Type=Gallery
   - Sees "The Artisan Lounge" card
   - Clicks "View Profile"

2. **View Venue Profile** (`/venue/:id`)
   - Shows venue details, wall spaces, current displays
   - Shows "Open Call" badge (if venue has open opportunity)
   - Clicks "Send Application" button

3. **Application Modal**
   - Form:
     - Select artwork (dropdown)
     - Cover letter (textarea): "I'd love to display my work..."
     - Preferred wall space (if multiple)
     - Preferred duration
   - Clicks "Submit Application"
   - **System:** Creates application record

4. **Track Application** (`/artist/applications`)
   - Navigate to Applications page
   - Sees card: "Applied to The Artisan Lounge"
   - Status: "Pending Review" (orange)

5. **Venue Reviews** (`/venue/applications`)
   - Venue logs in, sees notification badge
   - Navigates to Applications
   - Sees application from artist

6. **Venue Accepts** (`/venue/applications`)
   - Reviews artist portfolio, application message
   - Clicks "Accept" button
   - Confirmation modal
   - Clicks "Confirm & Send Invitation"
   - **System:** Updates application status, creates invitation

7. **Artist Receives Invitation** (`/artist/invitations`)
   - Application status updates to "Accepted" (green)
   - New invitation appears in Invitations inbox
   - Artist accepts invitation (see Flow 2, step 6)

**Success State:** Artist's application accepted, display scheduled

---

## Error Flow: Invalid Artwork ID

### Steps

1. **Customer Scans QR Code**
   - URL: `/purchase/invalid-artwork-123`

2. **System Check**
   - **System:** Looks up artwork ID
   - No artwork found with that ID

3. **404 Error Page** (`/purchase/invalid-artwork-123`)
   - Shows: "Artwork Not Found"
   - Message: "This artwork doesn't exist or is no longer available"
   - **IMPORTANT:** Does NOT show fallback artwork or wrong artwork
   - CTA: "Browse All Artworks" (link to public gallery)

**Correct Behavior:** Never show wrong artwork as fallback

---

## Error Flow: Unauthorized Route Access

### Steps

1. **Artist Tries to Access Venue Route**
   - Artist user navigates to `/venue/dashboard`
   - **System:** Checks user role, sees role=artist

2. **401 Unauthorized Page**
   - Shows: "Access Denied"
   - Message: "You don't have permission to access this page"
   - CTA: "Return to My Dashboard" (navigates to `/artist/dashboard`)

3. **Correct Route**
   - User clicks CTA
   - Redirected to appropriate role dashboard

**Correct Behavior:** Role-based access control enforced

---

## Deep Linking Examples

### Valid Deep Links
```
/artist/artworks/art-123 → Shows artwork detail (if exists)
/venue/profile/venue-456 → Shows venue profile (if exists)
/admin/users/user-789 → Shows user detail (admin only)
/purchase/art-123 → Shows purchase page (public)
```

### Invalid Deep Links
```
/artist/artworks/invalid → Shows "Artwork not found" error
/venue/profile/deleted → Shows "Venue not found" error
/admin/users/fake → Shows "User not found" error
```

**Implementation:** All dynamic routes must validate IDs before rendering

---

## State Management Guidelines

### URL State (Query Parameters)

**Good:** Preserve filter state in URL
```
/artist/discover-venues?city=portland&sort=newest
/admin/users?role=artist&status=active&plan=growth
```

**Benefits:**
- Shareable filtered views
- Browser back button works
- Bookmarkable searches

### Form State

**Validation Timing:**
- Show error on blur (after user leaves field)
- Show error on submit attempt
- Clear error on valid input

**Loading States:**
- Disable submit button during submission
- Show spinner in button: "Submitting..."
- Prevent double-submission

### Optimistic Updates

**When to Use:**
- Like/favorite actions (instant feedback)
- Status badge changes (accept/decline)
- Simple toggles

**When NOT to Use:**
- Financial transactions
- User account changes
- Permanent deletions

---

## Keyboard Navigation Flows

### Modal Flow
1. Open modal: Focus moves to modal title
2. Tab: Cycles through interactive elements (inputs, buttons)
3. Shift+Tab: Cycles backward
4. Esc: Closes modal, focus returns to trigger button

### Dropdown Menu Flow
1. Click/Enter on trigger: Opens menu, focuses first item
2. Arrow Up/Down: Navigate menu items
3. Enter: Select focused item
4. Esc: Close menu, return focus to trigger

### Table Row Flow
1. Tab to table: Focuses first row
2. Arrow Up/Down: Navigate rows
3. Enter: Open row detail / activate primary action
4. Tab: Move to next interactive element in row

---

## Animation Timing Reference

```css
/* Page transitions */
300ms ease-in-out

/* Modal open/close */
200ms ease-out (enter)
150ms ease-in (exit)

/* Dropdown expand */
150ms ease-out

/* Button hover */
150ms ease-out

/* Skeleton shimmer */
1500ms infinite

/* Toast slide in */
300ms ease-out
```

---

## Handoff Notes for Engineering

### Critical Implementation Details

**1. Routing**
- Use proper router with real routes (React Router, Next.js App Router)
- Deep linking must work (direct URL access)
- Browser back/forward must work correctly
- No "string state" hacks like `currentPage === 'artist-dashboard'`

**2. Date Handling**
```tsx
// ❌ WRONG - Parsing issues across timezones
new Date('2024-01-15')

// ✅ CORRECT - Parse as UTC, convert to local
import { parseISO, format } from 'date-fns'
parseISO('2024-01-15T00:00:00Z')
```

**3. Time Window Duration**
```tsx
// ❌ WRONG - String subtraction doesn't work
duration = endTime - startTime // "14:00" - "10:00" = NaN

// ✅ CORRECT - Convert to minutes first
const parseTime = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}
duration = parseTime(endTime) - parseTime(startTime) // 240 minutes
```

**4. Fallback Data**
```tsx
// ❌ WRONG - Shows wrong artwork if ID invalid
const artwork = artworks.find(a => a.id === id) || artworks[0]

// ✅ CORRECT - Show error if not found
const artwork = artworks.find(a => a.id === id)
if (!artwork) return <NotFound />
```

**5. Package Imports**
```tsx
// ❌ WRONG - Version-specific imports
import { toast } from 'sonner@2.0.3'
import { useForm } from 'react-hook-form@7.55.0'

// ✅ CORRECT - Normal imports
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
```

**6. Role-Based Rendering**
```tsx
// ❌ WRONG - Shows footer links user can't access
<Link to="/artist/dashboard">Artist Dashboard</Link>

// ✅ CORRECT - Conditional based on role
{user.role === 'artist' && (
  <Link to="/artist/dashboard">Dashboard</Link>
)}
```

---

## Testing Checklist

### Manual Testing Flows

- [ ] Sign up as Artist → Accept agreement → Add artwork → Browse venues
- [ ] Sign up as Venue → Add wall space → Browse artists → Send invitation
- [ ] Artist accepts invitation → Venue sees updated status
- [ ] Customer scans QR → Purchases artwork → Artist/venue see sale
- [ ] Artist upgrades subscription → New limits apply
- [ ] Admin searches user → Suspends user → Checks activity log
- [ ] Test all error states (invalid ID, unauthorized access, network error)
- [ ] Test keyboard navigation (Tab, Arrow keys, Esc, Enter)
- [ ] Test with screen reader (headings, labels, focus management)
- [ ] Test dark mode on all screens
- [ ] Test mobile responsive on all screen sizes
- [ ] Test browser back/forward buttons
- [ ] Test deep links (paste URL directly)

### Automated Testing

```tsx
// Example: Test role-based access
test('artist cannot access venue routes', () => {
  loginAsArtist()
  visit('/venue/dashboard')
  expect(page).toContain('Access Denied')
})

// Example: Test invalid ID handling
test('shows error for invalid artwork ID', () => {
  visit('/purchase/invalid-id-123')
  expect(page).toContain('Artwork Not Found')
  expect(page).not.toContain('Buy This Artwork')
})
```

---

These flows cover the complete user journey from onboarding through key platform interactions, with proper error handling and accessibility throughout.
