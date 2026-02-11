# @deprecated — Internal documentation. Moved to project wiki.

## User Journey

### 1. Venue Signup → Approval → Setup

```
Signup (VenueApplication)
    ↓
Admin Review
    ↓
Approved (status: 'approved')
    ↓
Dashboard shows Setup Health Checklist
    ↓
Click "Begin Setup" or individual items
    ↓
Setup Wizard (5 steps)
    ↓
Draft Created (status: 'draft')
    ↓
Admin Final Review (optional)
    ↓
Live (status: 'live')
    ↓
Appears in /find-art discovery
```

## Routes

### Public Routes
- `/venues-apply` - VenueApplication (pre-existing)
- `/venues-partner-kit` - VenuePartnerKit (public marketing)
- `/find-art` - FindArtHub (discovery page)

### Venue Portal Routes
- `/venue/dashboard` - VenueDashboard (main hub)
- `/venue/setup` - VenueSetupWizard (guided setup)
- `/venue/partner-kit` - VenuePartnerKitEmbedded (in-app reference)
- `/venue/settings` - VenueSettings (customization)
- `/venue/profile` - VenueProfile (advanced settings)

## Components

### 1. VenueSetupWizard
**File**: `src/components/venue/VenueSetupWizard.tsx`

5-step guided setup with recommended defaults:

**Step 1: Confirm Venue Basics**
- Venue name (required)
- Address (required)
- Hours of operation (required)
- Website (optional)
- Instagram (optional)
- Status: All fields pre-filled from profile if available
- Help text: "Complete info helps customers find you"

**Step 2: Add Photos**
- Minimum 3 photos required
- Maximum 5 photos
- Recommended types: space overview, wall area, ambiance
- Show count: "X of 3+ photos uploaded"
- Help text: "Great photos increase discoverability"

**Step 3: Configure Wall**
- Wall type: single / multiple / rotating (radio buttons)
- Display spots: 1-20 input
- Dimensions: optional text field
- Recommended default: single wall, 1 display spot
- Help text: "Helps artists understand space constraints"

**Step 4: Categorize Venue**
- Multi-select from predefined categories
- Available: Modern Art, Street Art, Photography, Sculpture, Digital Art, Mixed Media, Prints, Installation
- Recommended default: Contemporary, Local Artists
- Help text: "Makes venue discoverable to matching artists"

**Step 5: Signage & Launch**
- Display QR placement recommendations
- Show staff one-liner with copy button
- Checklist of next steps
- Not interactive, just informational
- Help text: "Download QR assets from Partner Kit"

**Features:**
- Progress bar at top
- Previous/Next buttons
- "Save & Exit" at any step
- "You can change this later in your Venue Portal" on every step
- Submit creates draft status

### 2. SetupHealthChecklist
**File**: `src/components/venue/SetupHealthChecklist.tsx`

Shows at top of VenueDashboard until 100% complete:

**Items:**
1. ✓ Photos Added (3+ required)
2. ✓ Profile Published (status: live/approved)
3. ✓ Wall Configured (display spots set)
4. ✓ QR Assets Downloaded (optional manual flag)
5. ✓ QR Placement Confirmed (optional manual flag)
6. ○ Shared Venue Page (optional)

**Features:**
- Shows completion percentage
- Individual items clickable to relevant settings
- Green checkmark when complete
- Gray circle when pending
- Optional items marked with "Optional" badge
- Shows congratulations message at 100%

### 3. VenuePartnerKit (Enhanced)
**File**: `src/components/venue/VenuePartnerKit.tsx`

Comprehensive partner guide with:
- 4-step process overview
- Economics breakdown with consistent numbers
- Artist tier details
- QR placement best practices (4 scenarios)
- Hosting policy summary
- Staff one-liner
- Setup checklist (8 items)
- FAQs (4 common questions)
- Download PDF button
- Economics guarantee notice

**Used in:**
- Public route: `/venues-partner-kit`
- Embedded in portal: `/venue/partner-kit` (VenuePartnerKitEmbedded)

### 4. VenuePartnerKitEmbedded
**File**: `src/components/venue/VenuePartnerKitEmbedded.tsx`

Wraps VenuePartnerKit with:
- Tab navigation (Dashboard | Partner Kit | Settings)
- Sticky header
- Context of being in venue portal

## Status States

Venues progress through these states:

```
draft
  ↓ (manual save in wizard)
pending_review
  ↓ (admin approval)
approved
  ↓ (auto-publish or manual)
live
  ↓ (if disabled)
paused
```

- **Draft**: Setup wizard completed, pending admin review
- **Pending Review**: Admin queue
- **Approved**: Admin approved, ready to publish
- **Live**: Appears in discovery, visible to artists
- **Paused**: Manually disabled by venue or admin

## Economics Consistency

All pages reference consistent economics from `src/types/venueSetup.ts`:

```typescript
ECONOMICS = {
  BUYER_FEE: 0.045,           // 4.5%
  VENUE_COMMISSION: 0.15,      // 15%
  ARTIST_TIERS: {
    free: 0.6,    // 60%
    starter: 0.7, // 70%
    pro: 0.85,    // 85%
  }
}
```

**All pages showing economics must import and use these constants:**
- VenuePartnerKit
- VenuePartnerKitEmbedded
- SetupWizard (step 5 description)
- VenueDashboard (optional, if showing earnings)
- Admin pages (for verification)

**Every economics display must show the same numbers across the app.**

## Backend Requirements

### POST /api/venues/setup
**Request:**
```json
{
  "basics": {
    "name": "...",
    "address": "...",
    "hours": "...",
    "website": "...",
    "instagram": "..."
  },
  "photos": ["url1", "url2", "url3"],
  "wall": {
    "type": "single|multiple|rotating",
    "displaySpots": 1,
    "dimensions": "..."
  },
  "categories": ["Contemporary", "Local Artists"],
  "qrAssets": {
    "generated": false,
    "placement": ""
  },
  "status": "draft"
}
```

### POST /api/venues/setup/complete
**Request:** Same as above with status: "pending_review"

### GET /api/venues/:id
**Response:**
```json
{
  "id": "...",
  "name": "...",
  "address": "...",
  "hours": "...",
  "website": "...",
  "instagram": "...",
  "photos": ["..."],
  "wallType": "single|multiple|rotating",
  "wallDimensions": "...",
  "displaySpots": 1,
  "categories": ["..."],
  "status": "draft|pending_review|approved|live|paused",
  "qrDownloaded": false,
  "qrPlaced": false,
  "createdAt": "...",
  "updatedAt": "..."
}
```

## Integration Checklist

- [ ] VenueSetupWizard component created
- [ ] SetupHealthChecklist component created
- [ ] VenuePartnerKit enhanced with full content
- [ ] VenuePartnerKitEmbedded component created
- [ ] Types in venueSetup.ts created
- [ ] Routes added to App.tsx
- [ ] VenueDashboard integrated with health checklist
- [ ] Backend endpoints created
- [ ] Analytics events added (optional)
- [ ] Email notifications added (optional)
- [ ] Admin approval workflow configured
- [ ] QR code generation service (if not existing)
- [ ] PDF generation for partner kit (if needed)

## Testing Scenarios

### Scenario 1: Fresh Venue Signup
1. Complete VenueApplication
2. Admin approves
3. See SetupHealthChecklist on dashboard (0%)
4. Click "Begin Setup"
5. Complete 5 steps
6. Status changes to "draft"
7. Admin approves
8. Status changes to "live"
9. Appears in /find-art
10. Checklist remains visible until all items complete

### Scenario 2: Resume Interrupted Setup
1. Begin setup, complete steps 1-2
2. Click "Save & Exit"
3. Return to dashboard
4. See "Setup 40% complete"
5. Click specific item or "Resume Setup"
6. Resume from step 3

### Scenario 3: Later Customization
1. Setup complete, venue is live
2. Go to /venue/settings
3. Edit profile, photos, wall config
4. Each section shows "Recommended" badge
5. Can reset to recommended defaults
6. Changes saved without re-approval

## UX Copy Standards

### "You can change this later" message
Every step should include:
```
"You can change any of these settings later in your Venue Portal."
```

### "Why recommended" explanations
Each step has a help icon with:
- 1-2 sentence explanation
- Business benefit to venue
- Artist benefit if applicable

### Progress language
- "X of Y complete"
- "X% setup complete"
- "Keep going!" (at 0-99%)
- "You're all set!" (at 100%)

## File Structure

```
src/
├── components/
│   └── venue/
│       ├── VenueSetupWizard.tsx
│       ├── SetupHealthChecklist.tsx
│       ├── VenuePartnerKit.tsx
│       ├── VenuePartnerKitEmbedded.tsx
│       └── VenueDashboard.tsx (updated)
├── types/
│   └── venueSetup.ts
└── docs/
    ├── SETUP_FLOW_GUIDE.md (this file)
    └── CHECKLIST_INTEGRATION.md
```

## Next Steps

1. **API Development**
   - Create /api/venues/setup endpoints
   - Add status field to venues table
   - Create migrations for new fields

2. **Admin Workflow**
   - Add "Setup Status" filter to admin users list
   - Add "Approve Setup" action in admin detail view
   - Email notifications for venue on approval

3. **Analytics** (optional)
   - Track: setup starts, completions, drops
   - Track: which steps take longest
   - Track: customizations after setup

4. **Polish** (optional)
   - Add setup success celebration (confetti, etc.)
   - Email reminder if setup abandoned
   - In-app notifications for admin approvals
   - Referral link in partner kit

## Questions & Edge Cases

**Q: What if venue completes setup but doesn't download QR codes?**
A: Checklist shows incomplete until manually marked. Can send reminder email after 3 days.

**Q: Can venue restart setup?**
A: Yes, clicking "Setup Wizard" from dashboard always allows re-entry. Overwrites previous answers if submitted again.

**Q: What happens if venue changes photos count after setup?**
A: Checklist updates automatically when venue data is reloaded. Changes reflected on next dashboard load.

**Q: Are all fields required in setup?**
A: Yes, except: Website, Instagram, Wall dimensions, are optional.

**Q: What if admin rejects setup?**
A: Status reverts to 'approved', venue can re-submit from dashboard with feedback.
