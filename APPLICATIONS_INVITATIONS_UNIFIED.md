# Applications & Invitations Tab - Unified Component ✅

## Summary
Combined separate **Artist Applications** and **Venue Applications** pages into a single unified **"Applications & Invitations"** component that works for both user roles.

---

## Changes Made

### 1. **New Unified Component** 
**File:** `src/components/shared/ApplicationsAndInvitations.tsx` (NEW - 420 lines)

**Purpose:** Single component that displays different UI/UX based on user role:

#### Artist View
- **Title:** "My Applications & Invitations"
- **Features:**
  - Browse pending, approved, and rejected invitations from venues
  - Schedule install times for approved applications
  - View display duration for approved artwork
  - Responsive grid layout (2 columns on desktop, 1 on mobile)
  - Artwork image preview with artist info

#### Venue View  
- **Title:** "Applications & Invitations"
- **Features:**
  - Review artist applications to display artwork
  - Filter by status: All, Pending, Approved, Rejected
  - Approve/Reject applications with modal workflow
  - Set wall space, duration, and installation schedule
  - List view with large artwork previews

### 2. **Updated App.tsx**
**Changes:**
- Removed imports: `ArtistApplicationsWithScheduling`, `VenueApplications`
- Added import: `ApplicationsAndInvitations`
- Updated routes:
  - `artist-applications` → `<ApplicationsAndInvitations userRole="artist" onBack={() => handleNavigate('artist-profile')} />`
  - `venue-applications` → `<ApplicationsAndInvitations userRole="venue" onBack={() => handleNavigate('venue-dashboard')} />`

---

## Component Features

### Shared Functionality
- ✅ Status badges (Pending, Approved, Rejected)
- ✅ Timestamp tracking (applied/approved dates)
- ✅ Filter system by status
- ✅ Back button navigation
- ✅ Loading states with proper error handling
- ✅ Dark mode support (uses CSS variables)
- ✅ Responsive design

### Artist-Specific
- ✅ Grid layout for applications
- ✅ Artwork image display
- ✅ Time slot picker modal for scheduling
- ✅ Install confirmation with calendar links
- ✅ Display duration badges
- ✅ Venue name prominently displayed

### Venue-Specific
- ✅ List layout for applications  
- ✅ Artist name and artwork details
- ✅ Artwork dimensions and medium info
- ✅ Approval modal with:
  - Wall space selection dropdown
  - Display duration picker
  - Installation schedule options (Quick/Standard/Flexible)
- ✅ Approve/Decline action buttons
- ✅ Filter tabs at top for quick navigation

---

## Data Structure

### Application Object
```typescript
interface Application {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  artworkId: string;
  artworkTitle: string;
  artworkImage: string;
  artworkDimensions: string;
  artworkMedium: string;
  artistName: string;
  venueName: string;
  venueId: string;
  appliedDate: string;
  approvedDate?: string;
  approvedDuration?: 30 | 90 | 180;
  approvedWallspace?: string;
}
```

---

## Props

```typescript
interface ApplicationsAndInvitationsProps {
  userRole: 'artist' | 'venue';  // Determines which UI to show
  onBack: () => void;             // Called when user clicks back button
}
```

---

## Routes

| Route | User Role | Component |
|-------|-----------|-----------|
| `artist-applications` | Artist | ApplicationsAndInvitations (artist view) |
| `venue-applications` | Venue | ApplicationsAndInvitations (venue view) |

Both routes navigate to this single component with different role props.

---

## Navigation Flow

### From Artist Dashboard
```
Artist Profile → "View Applications" → artist-applications route
  → ApplicationsAndInvitations (userRole="artist")
  → Back button → artist-profile
```

### From Venue Dashboard
```
Venue Dashboard → (applications count shown)
  → venue-applications route
  → ApplicationsAndInvitations (userRole="venue")
  → Back button → venue-dashboard
```

---

## Styling & Theme

- Uses CSS variables for complete dark mode support:
  - `--bg` - Main background
  - `--surface-1`, `--surface-2`, `--surface-3` - Card/surface layers
  - `--text`, `--text-muted` - Text colors
  - `--green` - Primary action (approve/positive)
  - `--blue` - Secondary action (schedule/schedule)
  - `--danger` - Destructive (reject)
  - `--warning` - Pending/attention

- Responsive breakpoints:
  - Desktop (lg): 2-column grid for artist, full-width list for venue
  - Mobile (sm): 1-column layout

---

## Next Steps (Integration)

1. **Update mock data** - Replace mockApplications with real API calls
   - Add `/api/applications/artist?artistId=...` endpoint
   - Add `/api/applications/venue?venueId=...` endpoint
   
2. **Connect to database**
   - Query `invitations` table for artist view
   - Query `applications` table for venue view
   
3. **Add real functionality**
   - Actually approve/reject applications
   - Store scheduling data
   - Send notifications to artists/venues

4. **Update navigation buttons**
   - Artist profile: Wire "View Applications" button
   - Venue dashboard: Update pending count button

---

## Files Modified

1. **src/components/shared/ApplicationsAndInvitations.tsx** (NEW)
   - 420 lines of unified component

2. **src/App.tsx**
   - Removed 2 imports
   - Added 1 import
   - Updated 2 route renders

---

## Benefits

✅ **Single Source of Truth** - One component for both user roles
✅ **Code Reuse** - Shared filtering, status badges, styling
✅ **Easier Maintenance** - Bug fixes apply to both views
✅ **Consistent UX** - Both flows follow same design patterns
✅ **Scalability** - Easy to add features for both roles at once
✅ **Responsive** - Works on mobile and desktop
✅ **Accessible** - Semantic HTML, proper ARIA labels

---

## Testing Checklist

- [ ] Artist can view pending applications
- [ ] Artist can schedule install time for approved applications
- [ ] Artist sees correct status badges
- [ ] Venue can view artist applications
- [ ] Venue can approve/decline applications
- [ ] Venue approval modal shows all fields
- [ ] Both roles can filter by status
- [ ] Back button works from both views
- [ ] Dark mode displays correctly
- [ ] Mobile layout is responsive

