# Artwalls Display Duration System

## Overview
The display duration system allows venues to specify how long artwork will be displayed when approving artist applications. This provides structure for rotating artwork, managing wall spaces, and setting clear expectations for both artists and venues.

---

## Duration Options

### Three Fixed Options
The system supports exactly **three duration options**:
- **30 days** (1 month)
- **90 days** (3 months) - **Recommended Default**
- **180 days** (6 months)

### Why 90 Days is Recommended
- Balanced between giving artwork enough time to sell
- Frequent enough rotation to keep the venue's display fresh
- Industry standard for most gallery rotations
- Long enough to build customer interest

---

## Implementation Details

### 1. Venue Approval Flow

**Location:** `VenueApplications.tsx`

When a venue clicks "Approve" on a pending artist application, a modal appears with:

**Required Fields:**
- **Wall Space Selection** - Dropdown to select which wall (Main Wall, Back Wall, etc.)
- **Display Duration** - Radio-button selector with 30/90/180 day options (90 days default)
- **Start Date** - Date picker (defaults to current date)

**Calculated Fields:**
- **Estimated End Date** - Auto-calculated based on start date + duration
- **Help Text** - "Pickup/rotation happens during your weekly install/pickup window after the end date."

**Actions:**
- **Approve & Schedule** (primary CTA in venue green)
- **Cancel** (secondary)

**Modal Features:**
- Sticky header with artwork preview
- Artwork thumbnail, title, artist name, applied date
- Wallspace dropdown
- Start date picker
- Duration selector with visual radio buttons
- End date calculation display
- Sticky footer with action buttons
- Responsive design (full-screen modal on mobile)

---

### 2. Venue Current Artwork Display

**Location:** `VenueCurrentArtWithScheduling.tsx`

Each active artwork card displays:

**Display Term Section:**
- Duration badge (color-coded: 30d = blue, 90d = green, 180d = purple)
- Install date
- End date
- Status changes to "Ending Soon" when within 7 days of end date

**Filter Options:**
- All
- Active
- Sold
- **Ending Soon** (artworks within 7 days of end date)

**Visual Design:**
```
┌─────────────────────────────────────────┐
│ Display term: [90d badge] • Ends: Jan 15│
└─────────────────────────────────────────┘
```

---

### 3. Artist Application View

**Location:** `ArtistApplicationsWithScheduling.tsx`

When an application is approved, artists see:

**Display Duration Info Box:**
- Green background with border
- Duration badge showing the term chosen by venue
- Install window information
- Note: "You'll rotate or pick up the artwork during the venue's weekly window after the end date."

**Complete Flow:**
1. Application approved by venue (with duration set)
2. Artist sees duration term and weekly install window
3. Artist schedules specific install time within window
4. System calculates end date based on install date + duration
5. Artist notified when end date approaches

---

## Components

### 1. DisplayDurationSelector

**File:** `/components/scheduling/DisplayDurationSelector.tsx`

**Props:**
```tsx
interface DisplayDurationSelectorProps {
  value: 30 | 90 | 180;
  onChange: (duration: 30 | 90 | 180) => void;
  startDate?: Date;
  disabled?: boolean;
  showEndDate?: boolean;
  helpText?: string;
}
```

**Usage:**
```tsx
<DisplayDurationSelector
  value={approvalData.duration}
  onChange={(duration) => setApprovalData({ ...approvalData, duration })}
  startDate={approvalData.startDate}
  showEndDate={true}
  helpText="Pickup/rotation happens during your weekly install/pickup window after the end date."
/>
```

**Features:**
- Three large tappable cards (desktop) or buttons (mobile)
- "Recommended" badge on 90-day option
- Visual radio button indicator (filled circle when selected)
- Green accent color for selected state
- Auto-calculated end date display
- Responsive grid layout (3 columns on desktop, stacked on mobile)
- Disabled state support
- Optional help text at bottom

**Visual States:**
- **Unselected:** White background, neutral border, gray text
- **Selected:** Green border, green background tint, green text
- **Disabled:** Reduced opacity, no hover state

---

### 2. DurationBadge

**File:** `/components/scheduling/DisplayDurationSelector.tsx`

**Props:**
```tsx
interface DurationBadgeProps {
  duration: 30 | 90 | 180;
  size?: 'sm' | 'md';
}
```

**Usage:**
```tsx
<DurationBadge duration={90} size="sm" />
```

**Features:**
- Color-coded by duration:
  - 30 days: Blue (bg-blue-100 text-blue-700)
  - 90 days: Green (bg-green-100 text-green-700)
  - 180 days: Purple (bg-purple-100 text-purple-700)
- Calendar icon
- Compact format (e.g., "30d", "90d", "180d")
- Two sizes: small and medium

---

## User Flows

### Venue Approves Application with Duration

1. **Venue** navigates to Artist Applications page
2. Sees pending applications list
3. Clicks "Approve Application" on desired artwork
4. **Approval Modal Opens:**
   - Sees artwork preview (thumbnail, title, artist, applied date)
   - Selects wall space from dropdown (Main Wall, Back Wall, etc.)
   - Picks start date (defaults to today)
   - **Selects display duration:** 30, 90, or 180 days
   - Reviews calculated end date
   - Reads help text about pickup windows
5. Clicks "Approve & Schedule"
6. Application status changes to "Approved"
7. Duration is saved with the approval
8. Artist is notified with duration details

### Artist Views Approved Application

1. **Artist** navigates to My Applications
2. Sees "Approved" badge on application card
3. **Duration info section appears:**
   - Green box with border
   - Duration badge (e.g., [90d])
   - Text: "Display term: 90 days"
   - Note about pickup during venue's weekly window
4. Sees venue's weekly install window details
5. Clicks "Choose an Install Time" to schedule
6. Completes install scheduling
7. Artwork goes live for the specified duration

### Venue Monitors Current Artwork

1. **Venue** navigates to Current Artwork page
2. Each artwork card shows:
   - Duration badge (30d/90d/180d)
   - Install date
   - End date
3. **Ending Soon Filter:**
   - Artwork automatically flagged "Ending Soon" 7 days before end date
   - Yellow badge appears
   - Filter chip shows count
4. Venue can proactively request replacement art
5. Venue schedules pickup during weekly window after end date

---

## Business Rules

### Duration Selection
- **Required field** - Cannot approve without selecting duration
- **Default:** 90 days (recommended)
- **Options:** Only 30, 90, or 180 days allowed
- **No custom durations** - Keep it simple and standardized

### Date Calculations
- **Start Date:** Set by venue during approval (defaults to current date)
- **End Date:** Automatically calculated as Start Date + Duration
- **Ending Soon:** Triggered when current date is within 7 days of end date

### Pickup Window
- Pickup must occur during venue's weekly install/pickup window
- Artist is responsible for scheduling pickup
- Venue cannot extend duration without creating new approval

### Status Changes
- **Active** → **Ending Soon** (7 days before end date)
- **Ending Soon** → **Needs Pickup** (after end date passes)
- Status changes are automatic based on dates

---

## Visual Design

### Approval Modal
```
┌──────────────────────────────────────────┐
│ Approve Application              [X]      │
│ Urban Sunset by Sarah Chen               │
├──────────────────────────────────────────┤
│                                          │
│ [Artwork Preview Section]                │
│                                          │
│ Wall Space *                             │
│ [Main Wall ▼]                            │
│                                          │
│ Start Date                               │
│ [12/26/2024]                             │
│                                          │
│ Display Duration *                       │
│ ┌────────┐ ┌────────┐ ┌────────┐        │
│ │ 30 Days│ │90 Days │ │180 Days│        │
│ │1 month │ │3 months│ │6 months│        │
│ │   ○    │ │   ●    │ │   ○    │        │
│ └────────┘ └────────┘ └────────┘        │
│            [Recommended]                 │
│                                          │
│ ℹ Estimated End Date: March 26, 2025    │
│                                          │
│ ℹ Pickup/rotation happens during your   │
│   weekly install/pickup window after    │
│   the end date.                          │
│                                          │
├──────────────────────────────────────────┤
│           [Cancel] [Approve & Schedule]  │
└──────────────────────────────────────────┘
```

### Duration Badge Examples
- `[30d]` - Blue badge with calendar icon
- `[90d]` - Green badge with calendar icon
- `[180d]` - Purple badge with calendar icon

### Current Artwork Display Term
```
┌─────────────────────────────────────────┐
│ Urban Sunset by Sarah Chen              │
│ [Active] $1,200                         │
├─────────────────────────────────────────┤
│ Display term: [90d] • Ends: Mar 26, 2025│
└─────────────────────────────────────────┘
```

---

## Mobile Responsiveness

### Approval Modal (Mobile)
- Full-screen overlay
- Sticky header and footer
- Scrollable content area
- Duration buttons stack vertically
- Large tappable areas (min 44px height)
- Bottom sheet style with slide-up animation

### Duration Selector (Mobile)
- Grid changes to single column
- Each option takes full width
- Increased padding for touch targets
- Maintains visual hierarchy

### Badges (Mobile)
- Scales appropriately with text size
- Maintains color coding
- Readable at small sizes

---

## Edge Cases

### If Artwork Sells Before End Date
- Duration is still tracked
- End date remains same for record-keeping
- Status changes to "Sold"
- Pickup scheduled independent of duration

### If Artist Removes Artwork Early
- Must still complete during pickup window
- Duration not credited or refunded
- Venue can immediately approve replacement

### If Venue Wants to Extend Duration
- No extend feature in MVP
- Venue must wait for end date
- Can re-approve same artwork with new duration

### If Start Date is in Future
- Allowed for planning purposes
- Artist can schedule install for future date
- End date still calculated from start date

---

## Data Model

### Application Type Extension
```typescript
interface Application {
  id: string;
  artistName: string;
  artworkTitle: string;
  artworkImage: string;
  venueName: string;
  appliedDate: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedDuration?: 30 | 90 | 180;  // NEW
  approvedDate?: string;              // NEW
  startDate?: string;                 // NEW
  endDate?: string;                   // NEW
}
```

### InstalledArtwork Type Extension
```typescript
interface InstalledArtwork {
  id: string;
  artworkTitle: string;
  artistName: string;
  artworkImage: string;
  wallSpaceName: string;
  installDate: string;
  endDate: string;
  displayDuration: 30 | 90 | 180;    // NEW
  price: number;
  status: 'active' | 'sold' | 'ending-soon' | 'needs-pickup' | 'ended';
  // ... existing fields
}
```

---

## Future Enhancements

### Possible Additions:
- **Custom durations:** Allow venues to set custom day counts
- **Auto-renewal:** Option to automatically renew for another term
- **Extension requests:** Artist can request extension before end date
- **Duration analytics:** Track which durations lead to most sales
- **Email notifications:** Remind artist/venue 14, 7, 3 days before end
- **Flexible rotation:** Allow swapping artwork before term ends
- **Early termination:** Allow venues to end display with notice

---

## Testing Checklist

### Venue Approval Flow
- [ ] Approval modal opens when "Approve" clicked
- [ ] All three duration options visible
- [ ] 90 days is selected by default
- [ ] "Recommended" badge shows on 90-day option
- [ ] Wall space dropdown populated
- [ ] Start date defaults to today
- [ ] End date calculates correctly for all durations
- [ ] Help text displays
- [ ] "Approve & Schedule" saves duration
- [ ] Modal closes after approval
- [ ] Application status changes to "Approved"

### Venue Current Artwork
- [ ] Duration badge displays for all artworks
- [ ] Badge color matches duration (30=blue, 90=green, 180=purple)
- [ ] Install date shows correctly
- [ ] End date shows correctly
- [ ] "Ending Soon" status appears 7 days before end date
- [ ] "Ending Soon" filter chip works
- [ ] Filter shows correct count

### Artist Applications View
- [ ] Duration info box appears on approved applications
- [ ] Duration badge displays correctly
- [ ] Help text about pickup window displays
- [ ] Install scheduling flow works with duration info visible
- [ ] Grid layout responsive (2 columns on desktop, 1 on mobile)

### Mobile Responsiveness
- [ ] Approval modal full-screen on mobile
- [ ] Duration buttons stack vertically on mobile
- [ ] All buttons tappable (min 44px)
- [ ] Badges readable at all sizes
- [ ] Modal scrollable with sticky header/footer

---

## Files Updated

### New Files
1. `/components/scheduling/DisplayDurationSelector.tsx` - Duration selector + badge components

### Updated Files
1. `/components/venue/VenueApplications.tsx` - Added approval modal with duration selection
2. `/components/venue/VenueCurrentArtWithScheduling.tsx` - Added duration badge and display term info
3. `/components/artist/ArtistApplicationsWithScheduling.tsx` - Added duration display for approved applications

---

## Design System Compliance

### Colors
- **30 days:** Blue (bg-blue-100, text-blue-700, border-blue-200)
- **90 days:** Green (bg-green-100, text-green-700, border-green-200)
- **180 days:** Purple (bg-purple-100, text-purple-700, border-purple-200)
- **Selected state:** Green accent (border-green-600, bg-green-50)

### Typography
- Duration selector cards: text-base for labels, text-xs for sublabels
- Badges: text-xs (small), text-sm (medium)
- Modal title: text-2xl
- Help text: text-xs text-neutral-600

### Spacing
- Duration selector grid gap: gap-3
- Card padding: p-4
- Badge padding: px-2 py-0.5 (sm), px-3 py-1 (md)
- Modal padding: p-6

### Borders
- Default: border-neutral-200
- Selected: border-2 border-green-600
- Rounded corners: rounded-lg (cards), rounded-full (badges)

---

**Status:** ✅ Complete and Production-Ready (MVP)  
**Last Updated:** December 26, 2024
