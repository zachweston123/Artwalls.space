# Applications & QR Code Consolidation

## Summary
Successfully consolidated the "Approved & QR" functionality into the "Applications" section. Artists can now manage both their applications/invitations AND their approved artworks with QR code management in a unified component with tabbed navigation.

## Changes Made

### 1. Updated ApplicationsAndInvitations.tsx
- **Added tab navigation** for artist view:
  - **Tab 1: Applications** - Shows pending, approved, and rejected applications
  - **Tab 2: Approved & QR** - Shows approved artworks with QR code management
  
- **Integrated QR functionality** from ApprovedListings:
  - `toggleQrVisibility(id)` - Show/hide QR code preview
  - `copyQrUrl(id)` - Copy QR URL to clipboard
  - `downloadQrCode(id)` - Download QR code as PNG
  - QR state management (qrStates, copyStates)

- **Integrated approved artworks fetching**:
  - Queries Supabase for artworks with `approval_status = 'approved'`
  - Displays venue name and install time option
  - Shows in grid layout matching applications tab styling

- **Added Artwork interface**:
  ```typescript
  interface Artwork {
    id: string;
    title: string;
    image_url: string;
    approval_status: 'approved';
    venue_id: string;
    venue_name: string;
    install_time_option?: 'quick' | 'standard' | 'flexible';
    created_at: string;
  }
  ```

- **QR code section UI**:
  - Eye icon to toggle visibility
  - QR preview in white box
  - Copy URL button with "Copied!" confirmation
  - Download QR Code button (PNG)
  - Install time option display

### 2. Updated App.tsx
- **Removed import**: Deleted `import { ApprovedListings } from './components/artist/ApprovedListings'`
- **Updated routing for 'artist-approved'**:
  - Changed from: `{currentPage === 'artist-approved' && <ApprovedListings />}`
  - Changed to: `{currentPage === 'artist-approved' && <ApplicationsAndInvitations userRole="artist" onBack={() => handleNavigate('artist-dashboard')} />}`

### 3. Navigation Structure
No changes needed - Navigation.tsx already shows both navigation items:
- "Approved & QR" (links to artist-approved route)
- "Applications" (links to artist-applications route)

Both now point to the same component with tabbed navigation to switch between views.

## Component Architecture

### Unified Component (ApplicationsAndInvitations)
- Single component handles both artist and venue roles
- For artists: Shows applications tab + approved & QR tab
- For venues: Shows application review list with filters
- Props: `userRole: 'artist' | 'venue'`, `onBack: () => void`

### Artist View
**Applications Tab:**
- Grid layout of applications (pending/approved/rejected)
- Filter by status
- Schedule install times for approved applications
- Show approval details and duration

**Approved & QR Tab:**
- Grid layout of approved artworks
- Venue name display
- Install time option (quick/standard/flexible)
- QR code management:
  - Toggle visibility
  - Copy URL to clipboard
  - Download as PNG image

### Venue View
- List layout of artist applications
- Filter buttons (all, pending, approved, rejected)
- Approval modal for accepting applications
- Wall space and duration selection
- Install time option selection

## Data Flow

```
User clicks 'Approved & QR' or 'Applications' 
  ↓
App.tsx routes to 'artist-applications' or 'artist-approved'
  ↓
ApplicationsAndInvitations component renders
  ↓
Tab state determines what content to show:
  - 'applications': Shows applications (pending/approved/rejected)
  - 'approved': Fetches approved artworks from Supabase, shows QR controls
```

## Files Modified
1. `src/components/shared/ApplicationsAndInvitations.tsx` - Enhanced with tabs and QR functionality
2. `src/App.tsx` - Updated routing and removed ApprovedListings import

## Files Not Modified
- `src/components/artist/ApprovedListings.tsx` - Still exists but no longer used (can be removed later)
- `src/components/Navigation.tsx` - Already configured correctly
- Database schema - No changes needed
- API endpoints - Uses existing endpoints

## API Endpoints Used
- `/api/artworks/{id}/qrcode.png` - Downloads QR code as PNG
- `/api/artworks/{id}/qrcode.svg` - Displays QR code inline

## State Management
New state in ApplicationsAndInvitations:
- `activeTab: 'applications' | 'approved'` - Controls which tab is displayed
- `approvedArtworks: Artwork[]` - Stores fetched approved artworks
- `qrStates: { [key: string]: boolean }` - Tracks QR visibility per artwork
- `copyStates: { [key: string]: boolean }` - Tracks copy confirmation state

## User Experience
1. Artists navigate to either "Applications" or "Approved & QR" from the sidebar
2. Both routes now show the same component with tab navigation
3. Switching tabs is instant and intuitive
4. QR codes can be viewed, copied, or downloaded without leaving the page
5. All styling matches existing design system

## Testing Checklist
- [x] No compilation errors
- [x] Tab navigation works
- [x] Applications tab shows pending/approved/rejected items
- [x] Approved & QR tab fetches and displays approved artworks
- [x] QR toggle shows/hides QR code preview
- [x] Copy button copies URL and shows confirmation
- [x] Download button fetches QR code PNG
- [x] Back button works from both tabs
- [x] Dark mode styling applied to all elements
- [x] Both 'artist-applications' and 'artist-approved' routes work
