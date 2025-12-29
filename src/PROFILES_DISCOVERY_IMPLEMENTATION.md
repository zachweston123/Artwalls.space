# Artwalls Profiles & Discovery System - Complete Implementation

## 🎨 Overview

This update adds comprehensive profile pages, discovery features, and a structured invitation system to the Artwalls marketplace, enabling venues to find and invite artists, and artists to discover suitable venues.

## ✅ Components Created

### 1. Reusable Components

#### **LabelChip** (`/components/LabelChip.tsx`)
- Selectable chip component with role-aware accent colors
- Props: `label`, `selected`, `onClick`, `role` (artist/venue), `size` (sm/md)
- States: Default (neutral), Selected (blue for artists, green for venues)
- Used across profiles, discovery pages, and edit modals

### 2. Artist Profile System

#### **ArtistProfileView** (`/components/artist/ArtistProfileView.tsx`)
- **Profile Header**: Avatar, name, location, "Open to new placements" status badge
- **About Section**: Multi-line bio
- **Art Types**: Selectable chips (Painter, Photographer, Illustrator, Digital, Mixed Media, Printmaker, Collage, Sculptor, etc.)
- **Portfolio Grid**: Artwork thumbnails with status badges
- **Quick Stats**: Active displays, total sales
- **CTAs**: 
  - For artist viewing own profile: "Edit Profile"
  - For venues: "Invite to Apply"
  - For everyone: Report link

#### **ArtistProfileEdit** (`/components/artist/ArtistProfileEdit.tsx`)
- **Upload Profile Photo**: With preview and size guidance
- **Edit Display Name**: Text input
- **Edit Bio**: Textarea with 500 character limit and counter
- **Select Art Types**: Multi-select chips with selection counter
- **Toggle**: "Open to new placements" switch with explanation
- **Actions**: Save Changes / Cancel
- Modal with sticky header, scrollable content

### 3. Venue Profile System

#### **VenueProfileView** (`/components/venue/VenueProfileView.tsx`)
- **Header**: Cover photo, name, location, verification badge
- **Established**: Founded year display with years in business calculation
- **About Section**: Multi-line bio
- **Venue Highlights**: Label chips (Locally owned, LGBTQ+ friendly, Women-owned, Black-owned, Veteran-owned, Student-friendly, Family-friendly, Dog-friendly, etc.)
- **Installation Schedule**: Read-only display of install/pickup window with calendar icon
- **Wall Spaces Gallery**: Grid of wall spaces with photos, dimensions, availability status
- **Quick Stats**: Total wall spaces, current artists
- **CTAs**:
  - For venue viewing own profile: "Edit Profile", "Find Artists to Invite"
  - For artists: "View Open Wallspaces"
  - For everyone: Report link

#### **VenueProfileEdit** (`/components/venue/VenueProfileEdit.tsx`)
- **Upload Cover Photo**: Large format with preview and recommended dimensions
- **Edit Venue Name**: Text input
- **Edit Bio**: Textarea with 600 character limit and counter
- **Founded Year**: Dropdown selector with years in business calculation
- **Select Venue Highlights**: Multi-select chips with selection counter
- **Info Box**: Tip about profile completeness
- **Actions**: Save Changes / Cancel
- Modal with sticky header, scrollable content

### 4. Discovery Pages

#### **FindArtists** (for Venues) (`/components/venue/FindArtists.tsx`)
- **Search Bar**: Search by artist name/keyword
- **Filters Panel** (collapsible):
  - Neighborhood dropdown (all Portland neighborhoods)
  - Art type multi-select chips
  - "Only show artists open to new placements" toggle
  - Active filters counter badge
  - Clear all filters button
- **Results Count**: "X artists found"
- **Artist Cards**:
  - Avatar, name, location
  - "Open to new placements" status
  - Top 3 art type chips
  - Bio snippet (2 lines)
  - Portfolio count
  - Actions: "View Profile", "Invite to Apply" (green)
- **Empty State**: With clear filters CTA
- **Responsive**: Grid layout (1 col mobile, 2 cols desktop)

#### **FindVenues** (for Artists) (`/components/artist/FindVenues.tsx`)
- **Search Bar**: Search by venue name/keyword
- **Filters Panel** (collapsible):
  - Neighborhood dropdown
  - Venue labels multi-select chips
  - "Only show venues with available wall spaces" toggle
  - Active filters counter badge
  - Clear all filters button
- **Results Count**: "X venues found"
- **Venue Cards**:
  - Cover photo with hover zoom effect
  - Name with verification badge
  - Location, established year, years in business
  - Top 3 venue label chips
  - Bio snippet (2 lines)
  - Wall space count and availability
  - Actions: "View Profile", "View Wallspaces" (blue)
- **Empty State**: With clear filters CTA
- **Responsive**: Grid layout (1 col mobile, 2 cols desktop)

### 5. Invitation System

#### **InviteToApplyModal** (`/components/venue/InviteToApplyModal.tsx`)
- **Header**: Shows artist name being invited
- **Wall Space Selection**:
  - Option 1: "General Invitation" (let artist choose)
  - Options 2+: Specific wall spaces with photos, dimensions, location
  - Radio button style selection
- **Display Duration Selector**: 30 / 90 / 180 days (grid layout with labels)
- **Personal Message**: 
  - Optional textarea (300 char max)
  - "Use template" button that pre-fills professional invitation
  - Character counter
- **Info Box**: Explains what happens after sending
- **Actions**: Cancel / Send Invitation (green)
- **Mobile Responsive**: Desktop modal, mobile bottom sheet styling

#### **ArtistInvites** (Inbox) (`/components/artist/ArtistInvites.tsx`)
- **New Invitations Section**:
  - Count badge in heading
  - Highlighted cards (blue border)
  - Venue photo, name, location
  - Wall space details (if specified)
  - Duration badge
  - Message preview (2 lines)
  - Timestamp (relative: "2h ago", "Yesterday")
  - Actions: "View Details", "Decline", "Apply with Artwork" (blue)
- **Previous Invitations Section**:
  - Compact list view
  - Status badges (Applied / Declined)
  - Collapsed format
- **Detail Modal**:
  - Full venue info
  - Complete message display
  - All invitation details
  - Same action buttons
- **Empty State**: 
  - "No invites yet"
  - Prompt to complete profile
  - CTA to profile page
- **Status Management**: Updates in real-time when responded to

## 🎨 Design Patterns Used

### Color System (Role-Aware)
```css
/* Artist Blue */
- Primary: bg-blue-600 dark:bg-blue-500
- Hover: bg-blue-700 dark:bg-blue-400
- Light bg: bg-blue-50 dark:bg-blue-900/30
- Text: text-blue-700 dark:text-blue-300
- Border: border-blue-500 dark:border-blue-400

/* Venue Green */
- Primary: bg-green-600 dark:bg-green-500
- Hover: bg-green-700 dark:bg-green-400
- Light bg: bg-green-50 dark:bg-green-900/30
- Text: text-green-700 dark:text-green-300
- Border: border-green-500 dark:border-green-400
```

### Label Chips
- Selected state has role accent border-2
- Unselected state has neutral colors with hover effect
- Size variants: sm (text-xs, compact) and md (text-sm, default)
- Disabled state available for read-only displays

### Modal Pattern
- Sticky header with title and close button
- Scrollable content area
- Sticky action bar at bottom (Cancel / Primary CTA)
- Dark overlay backdrop
- Responsive: Full screen on mobile, centered on desktop

### Status Badges
- "Open to new placements": Green with pulse dot
- Verified: Green checkmark icon
- Availability: Green (available) / Neutral (occupied/full)
- Invite status: Green (applied) / Neutral (declined)

## 📱 Mobile Considerations

All components are fully responsive:
- **Navigation**: Existing hamburger → drawer pattern maintained
- **Discovery Pages**: Single column on mobile, 2 cols on desktop
- **Profile Pages**: Stacked layout on mobile
- **Modals**: Full screen on mobile, centered on desktop
- **Filter Panels**: Collapse by default on mobile
- **Label Chips**: Wrap naturally on small screens

## 🌓 Dark Mode

All components fully support light and dark modes:
- Surface colors: white → neutral-800
- Background alternates: neutral-50 → neutral-900
- Borders: neutral-200 → neutral-700
- Text hierarchy maintained with proper contrast
- Role accent colors optimized for both modes
- Status badges use semi-transparent backgrounds in dark mode

## 📊 Data Structures

### Artist Profile
```typescript
{
  id: string;
  name: string;
  avatar: string;
  location: string;
  bio: string;
  artTypes: string[];
  openToNew: boolean;
  activeDisplays: number;
  totalSales: number;
}
```

### Venue Profile
```typescript
{
  id: string;
  name: string;
  coverPhoto: string;
  location: string;
  bio: string;
  labels: string[];
  foundedYear: number;
  wallSpaces: number;
  currentArtists: number;
  installWindow: string;
  verified: boolean;
}
```

### Invitation
```typescript
{
  id: string;
  venueName: string;
  venuePhoto: string;
  venueLocation: string;
  wallspaceName?: string;
  wallspaceSize?: string;
  duration: number; // 30, 90, or 180
  message: string;
  timestamp: string;
  status: 'pending' | 'accepted' | 'declined';
}
```

## 🔗 Integration Points

### Required Navigation Updates
Add these pages to the navigation system:

**Artist Navigation**:
- `artist-profile` → ArtistProfileView
- `artist-find-venues` → FindVenues
- `artist-invites` → ArtistInvites

**Venue Navigation**:
- `venue-profile` → VenueProfileView
- `venue-find-artists` → FindArtists

### Notification Badge
Update notification count to include unread invites for artists:
```typescript
const unreadInvites = invites.filter(i => i.status === 'pending').length;
```

### Integration with Existing Components
- **Artwork Detail**: Link from portfolio grid
- **Wall Spaces**: Link from venue profile gallery
- **Application Flow**: "Apply with Artwork" from invites triggers existing application modal
- **Profile Settings**: Link Edit Profile from user menu

## 🎯 Key Features Summary

### For Artists
✅ Create rich profile with bio and art types
✅ Toggle "Open to new placements" status
✅ Showcase portfolio with status badges
✅ Discover venues by location and characteristics
✅ Receive invitations from interested venues
✅ Apply or decline invitations easily
✅ View invitation history

### For Venues
✅ Create detailed venue profile with highlights
✅ Display establishment history and wall spaces
✅ Show installation schedule
✅ Discover artists by art type and location
✅ Send structured invitations (not chat)
✅ Specify wall space and duration
✅ Include personal message
✅ Track invitation responses

### MVP Approach
✅ No full chat system (structured invitations only)
✅ No price range filters (excluded per requirements)
✅ Notification-based communication
✅ Simple accept/decline workflow
✅ Template messages for efficiency

## 🚀 Next Steps for Implementation

1. **Add to App.tsx routing**:
   - Map page IDs to components
   - Update navigation links
   
2. **Connect to data layer**:
   - Replace mock data with API calls
   - Implement save handlers
   
3. **Add to notification system**:
   - Badge for unread invites
   - Push notification integration (optional)
   
4. **Testing checklist**:
   - Profile creation and editing
   - Discovery filters
   - Invitation send/receive flow
   - Mobile responsiveness
   - Dark mode consistency
   - Empty states
   - Long content handling (bios, messages)

## 📸 Visual Hierarchy

### Profile Pages
1. Hero section (photo, name, status)
2. About/Bio
3. Labels/Categories
4. Portfolio/Gallery
5. Actions

### Discovery Pages
1. Search bar (prominent)
2. Filters (collapsible)
3. Results count
4. Card grid (consistent spacing)
5. Empty states

### Invitation Flow
1. Clear recipient
2. Wall space selection (visual)
3. Duration (grid of options)
4. Message (optional but encouraged)
5. Confirmation info
6. Primary CTA

All components maintain the existing Artwalls design language with warm neutrals, role-specific accent colors, and a clean, professional aesthetic suitable for both artists and business owners.
