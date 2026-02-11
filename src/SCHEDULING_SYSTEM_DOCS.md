# @deprecated — Internal documentation. Moved to project wiki.
## Key Features Implemented

### 1. Venue Settings - Install & Pickup Window Configuration
**Location:** Venue → Settings

**Features:**
- Day-of-week selector (Monday-Sunday)
- Start and end time pickers
- Automatic timezone detection
- Duration validation (recommended 1-3 hours)
- Real-time preview of schedule
- Success toast notification on save
- Empty state warning if schedule not configured

**Component:** `VenueSettingsWithEmptyState.tsx`

---

### 2. Venue Current Artwork - Scheduling Management
**Location:** Venue → Current Artwork

**Features:**
- Display scheduling status for each artwork:
  - "Install scheduled: Thu 4:30 PM"
  - "Pickup scheduled: Thu 5:15 PM"
  - "Not scheduled yet"
- Action buttons:
  - **Schedule Install** - For approved but not installed art
  - **Schedule Pickup** - For sold artworks
  - **Confirm Installed** - Mark install as complete
  - **Confirm Picked Up** - Mark pickup as complete
  - **Reschedule** - Change existing time slot
  - **Mark as Sold** - Change artwork status
  - **End Display** - Remove artwork from display
- Status badges: Active, Sold, Ending Soon, Needs Pickup, Ended
- Filter tabs for easy navigation
- Confirmation modals for destructive actions

**Component:** `VenueCurrentArtWithScheduling.tsx`

---

### 3. Artist Applications - Post-Approval Scheduling
**Location:** Artist → Applications

**Features:**
- Approved applications show:
  - Venue's weekly install window
  - "Choose an Install Time" button
  - Scheduling confirmation state with scheduled time
- Pending applications show "Awaiting venue review"
- Rejected applications show rejection status
- Install rules accordion for approved applications
- Ability to reschedule after initial booking

**Component:** `ArtistApplicationsWithScheduling.tsx`

---

### 4. Time Slot Picker Modal
**Features:**
- Shows venue's weekly window prominently
- Generates 30-minute time slots within window
- Large, tappable buttons for mobile
- Bottom sheet on mobile, centered modal on desktop
- Preview of selected time
- Confirm/Cancel actions
- Used for both install and pickup scheduling

**Component:** `TimeSlotPicker.tsx`

---

### 5. Install Rules Component
**Features:**
- Accordion pattern on mobile for space efficiency
- Card pattern on desktop for visibility
- Four key rules:
  - Arrive within scheduled window (30-60 minutes)
  - Check in with venue staff
  - Bring own hanging hardware
  - Pickup during same weekly window if sold
- Info icon with blue accent color

**Component:** `InstallRules.tsx`

---

### 6. Notification System
**Location:** Bell icon in navigation → Notifications page

**Features:**
- Unread count badge on bell icon
- Grouped notifications (Today / Earlier)
- Notification types:
  - Application approved - schedule install
  - Install scheduled (with time)
  - Install reminder (24h and 2h before)
  - Artwork sold - schedule pickup
  - Pickup scheduled
  - Pickup reminder
- CTA buttons for actionable notifications
- Timestamp formatting (relative time)
- Visual indicators for different notification types

**Component:** `NotificationsList.tsx`

---

### 7. Empty States & Edge Cases

**Empty States Implemented:**
- Venue hasn't set install window (yellow warning banner)
- No current artwork on display
- Sold awaiting pickup (orange info card with next steps)
- No slots left for the week (suggests next week)
- No notifications (all caught up message)
- No applications yet

**Components:** 
- `EmptyStates.tsx`
- Built into each page component

---

## Data Model Extensions

### New Interfaces in `mockData.ts`:

```typescript
export interface InstalledArtwork {
  // ... existing fields
  scheduledInstall?: string; // "Thu 4:30 PM"
  scheduledPickup?: string; // "Thu 5:15 PM"
  installConfirmed?: boolean;
  pickupConfirmed?: boolean;
}

export interface VenueScheduleConfig {
  dayOfWeek: string; // "Thursday"
  startTime: string; // "16:00"
  endTime: string; // "18:00"
  timezone: string; // "PST"
}

export interface Notification {
  id: string;
  type: 'application-approved' | 'install-scheduled' | 'install-reminder' | 'artwork-sold' | 'pickup-scheduled' | 'pickup-reminder';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  ctaLabel?: string;
  ctaAction?: string;
  artworkId?: string;
}
```

---

## User Flows

### Venue Setup Flow:
1. Venue logs in
2. Goes to Settings
3. Sees empty state warning
4. Configures weekly install/pickup window
5. Saves and sees success toast

### Artist Application & Install Flow:
1. Artist applies to venue
2. Venue approves application
3. Artist receives notification "Application Approved"
4. Artist views application, sees install window and "Choose Install Time"
5. Artist selects time slot from picker
6. Install scheduled confirmation shown
7. Artist receives reminder notifications (24h, 2h before)
8. Venue confirms install when artist arrives
9. Artwork goes live

### Artwork Sale & Pickup Flow:
1. Artwork sells via QR code
2. Both artist and venue receive "Artwork Sold" notification
3. Venue marks artwork as sold in Current Artwork
4. Venue or artist schedules pickup during weekly window
5. Pickup reminder notifications sent
6. Venue confirms pickup when complete
7. Artwork status updated to "Ended"

---

## Mobile Responsiveness

All scheduling components are fully mobile-responsive:
- Time slot picker uses bottom sheet on mobile
- Install rules use accordion on mobile, card on desktop
- Notifications stack nicely on mobile
- Settings form uses full-width inputs on mobile
- Current Artwork cards stack vertically on mobile

---

## Design Consistency

- **Colors:** Blue accents for artist actions, green for venue actions
- **Typography:** Consistent with existing design system
- **Spacing:** Maintains 4/8px grid system
- **Cards:** White backgrounds, rounded-xl corners, subtle shadows
- **Buttons:** Consistent padding, hover states, transition animations
- **Status badges:** Color-coded by status type
- **Empty states:** Centered, with icons and helpful messaging

---

## Components Overview

### Scheduling Components (`/components/scheduling/`)
- `TimeSlotPicker.tsx` - Modal for selecting install/pickup times
- `InstallRules.tsx` - Rules display (accordion/card variants)
- `EmptyStates.tsx` - Reusable empty state components

### Venue Components (`/components/venue/`)
- `VenueSettingsWithEmptyState.tsx` - Settings with schedule config
- `VenueCurrentArtWithScheduling.tsx` - Current artwork with scheduling
- `VenueWalls.tsx` - Wall space management with photos
- `VenueApplications.tsx` - Artist application review
- `VenueDashboard.tsx` - Venue overview
- `VenueSales.tsx` - Sales tracking

### Artist Components (`/components/artist/`)
- `ArtistApplicationsWithScheduling.tsx` - Applications with scheduling
- `ArtistVenues.tsx` - Browse venues with wall photos
- `ArtistArtworks.tsx` - Artwork management
- `ArtistDashboard.tsx` - Artist overview
- `ArtistSales.tsx` - Earnings tracking

### Notification Components (`/components/notifications/`)
- `NotificationsList.tsx` - Full notifications page

### Navigation Components (`/components/`)
- `Navigation.tsx` - Top nav with bell icon
- `MobileSidebar.tsx` - Mobile drawer navigation

---

## Testing the Scheduling System

1. **Login as Venue:**
   - Email: `venue@example.com`, Password: `password`
   
2. **Configure Schedule:**
   - Go to Settings
   - Set weekly install window (e.g., Thursday 4-6 PM)
   - Save and verify success toast

3. **View Current Artwork:**
   - Go to Current Artwork
   - See scheduling status on each piece
   - Try scheduling a pickup for a sold item
   - Confirm pickup when done

4. **Login as Artist:**
   - Email: `artist@example.com`, Password: `password`

5. **View Approved Application:**
   - Go to Applications
   - Find approved application
   - Click "Choose an Install Time"
   - Select time slot
   - Verify confirmation

6. **Check Notifications:**
   - Click bell icon (shows unread count)
   - View notification list
   - See different notification types

---

## Future Enhancements

Possible additions for production:
- Email/SMS notifications for reminders
- Calendar integration (iCal export)
- Rescheduling policies (max 1 free reschedule)
- Multiple windows per week for busy venues
- Artist availability preferences
- Auto-confirmation system
- No-show tracking
- Integration with venue calendar systems

---

## Technical Notes

- All scheduling logic is client-side for MVP demonstration
- Time slot generation handles half-hour increments
- Timezone is shown but currently static (PST)
- Validation ensures end time > start time
- Recommended duration: 1-3 hours for practical scheduling
- Mock data includes examples of all scheduling states
- Toast notifications auto-dismiss after 3 seconds

---

## Design Files

All components follow the existing Artwalls design system:
- Desktop layout unchanged from original
- Mobile uses hamburger + sidebar pattern
- Consistent spacing, colors, typography
- MVP-buildable, no complex animations
- Production-ready component architecture
