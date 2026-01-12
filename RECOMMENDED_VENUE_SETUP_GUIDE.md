# Recommended Venue Setup Flow - Implementation Guide

## Overview

This implementation provides a complete "Recommended Venue Setup" flow that guides venues through an optimal onboarding experience, with the ability to customize everything later in the Venue Portal.

## Architecture

### Components Created

#### 1. **VenueSetupWizard.tsx** - Main Setup Flow
- 5-step interactive wizard with progress tracking
- Pre-filled with recommended defaults
- Save & Exit functionality to resume later
- Each step clearly indicates "You can change this later"

**Steps:**
1. **Confirm Venue Basics** - Name, address, hours, website, Instagram
2. **Add Photos** - Minimum 3 photos required (logo optional)
3. **Configure Wall** - Wall type, dimensions, display spots
4. **Categorize Venue** - 2-4 categories for discovery
5. **Signage & Launch** - QR placement strategy and staff talking points

**Features:**
- Progress bar with step indicator
- Save & Exit with draft recovery
- Error handling and validation
- UX: Every step shows "Why recommended" and "You can change this later" notes

#### 2. **VenuePartnerKitEmbedded.tsx** - In-App Partner Kit
Complete guide embedded directly in the application with:
- Interactive, collapsible sections
- Setup checklist (8-step checklist)
- QR placement best practices with location-specific guidance
- Economics breakdown (consistent: 4.5% platform fee, 15% venue, 60-85% artist)
- Hosting policy and best practices
- Staff talking points with scripts
- PDF download capability

**Content Sections:**
- Quick navigation table of contents
- Setup checklist with impact metrics
- QR placement strategy (entrance, counter, restroom, etc.)
- Economics examples and artist tier breakdown
- Hosting policy guidelines
- Staff training scripts and talking points

#### 3. **SetupHealthChecklist.tsx** - Setup Progress Tracker
Dashboard widget showing:
- 6-item completion checklist
- Progress bar and percentage
- Direct navigation links to each section
- Status messages (in progress vs. complete)
- Pro tips and metrics

**Tracked Items:**
1. Photos Added (📸)
2. Profile Published (✨)
3. Wall Configured (🖼️)
4. QR Assets Downloaded (📥)
5. QR Placement Confirmed (📍)
6. Shared Venue Page (🔗)

### Routes Added

```
/venue/setup           - VenueSetupWizard
/venue/partner-kit     - VenuePartnerKitEmbedded
/venue/dashboard       - VenueDashboard (unchanged, displays health checklist)
/venue/profile         - VenueProfile (for customization)
/venue/walls           - VenueWalls (for detailed wall settings)
/venue/settings        - VenueSettings (for additional customization)
```

## Database Schema Requirements

### New Tables Needed

#### `venue_setup_drafts`
```sql
CREATE TABLE venue_setup_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id),
  current_step INTEGER DEFAULT 1,
  draft_data JSONB,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

#### `venue_status_tracking`
```sql
CREATE TABLE venue_status_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id),
  status TEXT DEFAULT 'draft', -- draft, pending_review, approved, live, paused
  photos_added BOOLEAN DEFAULT false,
  profile_published BOOLEAN DEFAULT false,
  wall_configured BOOLEAN DEFAULT false,
  qr_downloaded BOOLEAN DEFAULT false,
  qr_placement_confirmed BOOLEAN DEFAULT false,
  shared_venue_page BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Add venue status column if not exists
ALTER TABLE venues ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
```

### Venue Profile Updates

```sql
-- Ensure venues table has these fields
ALTER TABLE venues ADD COLUMN IF NOT EXISTS wall_type TEXT DEFAULT 'single';
ALTER TABLE venues ADD COLUMN IF NOT EXISTS display_spots INTEGER DEFAULT 1;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS wall_dimensions TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS categories TEXT[]; -- PostgreSQL array
ALTER TABLE venues ADD COLUMN IF NOT EXISTS qr_placement TEXT[];
ALTER TABLE venues ADD COLUMN IF NOT EXISTS staff_one_liners TEXT[];
```

## API Endpoints Needed

### 1. Save Setup Draft
```
POST /api/venues/setup-draft
Body: {
  venueId: string
  draftData: Partial<VenueSetupData>
  currentStep: number
}
Response: { success: boolean, draftId: string }
```

### 2. Complete Setup
```
POST /api/venues/complete-setup
Body: {
  venueId: string
  setupData: VenueSetupData
}
Response: { 
  success: boolean
  venueId: string
  status: 'draft' | 'pending_review'
}
```

### 3. Get Setup Draft
```
GET /api/venues/:venueId/setup-draft
Response: {
  draftData: Partial<VenueSetupData>
  currentStep: number
  lastUpdated: timestamp
}
```

### 4. Get Setup Status
```
GET /api/venues/:venueId/setup-status
Response: {
  status: 'draft' | 'pending_review' | 'approved' | 'live' | 'paused'
  completionPercentage: number
  checklist: {
    photosAdded: boolean
    profilePublished: boolean
    wallConfigured: boolean
    qrDownloaded: boolean
    qrPlacementConfirmed: boolean
    sharedVenuePage: boolean
  }
}
```

### 5. Generate PDF
```
POST /api/venues/:venueId/generate-partner-kit-pdf
Response: Blob (PDF file)
```

## User Flow

### New Venue After Signup

```
1. User completes OAuth signup
2. User selects "Venue" role
3. Auto-redirect to /venue/setup (or show modal)
4. Wizard walks through 5 steps
5. On completion → Draft status created
6. Admin review (can auto-approve based on tier)
7. Once approved → Status = "live"
8. Venue appears in discovery (/find-art)
```

### Returning Venue to Portal

```
VenueDashboard shows:
├── SetupHealthChecklist (widget at top)
├── Quick actions for incomplete items
├── Link to /venue/partner-kit for reference
└── Link to customize sections:
    ├── /venue/profile (edit basics, photos)
    ├── /venue/walls (edit wall config)
    └── /venue/settings (edit categories, etc.)
```

## Recommended Defaults

These are suggested starting points but can be changed anytime:

```typescript
const RECOMMENDED_DEFAULTS = {
  displaySpots: 1,              // Start with 1 wall, scale up
  wallType: 'single',           // Better for management
  categories: ['Contemporary', 'Local Artists'],
  qrPlacement: ['entrance', 'counter'],
};
```

## Consistency Requirements

All economics references must use these exact figures:

| Component | Figure | Notes |
|-----------|--------|-------|
| Platform Fee | 4.5% | Covers payments, hosting, support |
| Venue Commission | 15% | Every sale, all artist tiers |
| Artist Earnings | 60-85% | Depends on tier (Free/Starter/Pro) |

Example breakdown for $200 artwork:
- Platform: -$9 (4.5%)
- Venue: +$30 (15%)
- Artist: $120-$162 (60-85%)

## Implementation Checklist

### Phase 1: Core Components ✅
- [x] VenueSetupWizard.tsx
- [x] VenuePartnerKitEmbedded.tsx
- [x] SetupHealthChecklist.tsx
- [x] App.tsx routing updates

### Phase 2: Backend Integration
- [ ] Create database schema
- [ ] Implement API endpoints
- [ ] Setup draft save/restore logic
- [ ] PDF generation service

### Phase 3: Integration with Existing Pages
- [ ] Add SetupHealthChecklist to VenueDashboard
- [ ] Update VenueProfile for customization
- [ ] Update VenueSettings for tier management
- [ ] Add navigation links in sidebar

### Phase 4: Polish & Testing
- [ ] E2E testing of wizard flow
- [ ] Draft recovery testing
- [ ] Mobile responsiveness
- [ ] PDF generation testing
- [ ] Analytics/tracking

## Usage Examples

### Triggering Setup for New Venue

```tsx
// In VenueDashboard or onboarding flow
if (venue.status === 'draft' && !setupCompleted) {
  onNavigate?.('venue-setup');
}
```

### Displaying Health Checklist

```tsx
// In VenueDashboard
<SetupHealthChecklist
  photosAdded={venue.photos?.length >= 3}
  profilePublished={venue.status === 'live'}
  wallConfigured={venue.display_spots > 0}
  qrDownloaded={venue.qr_assets_downloaded}
  qrPlacementConfirmed={venue.qr_placement_confirmed}
  sharedVenuePage={venue.shared_page_viewed}
  onNavigate={handleNavigate}
/>
```

### Accessing Partner Kit

```tsx
// Navigation option in venue sidebar
<button onClick={() => onNavigate('venue-partner-kit')}>
  📚 Partner Kit & Setup Guide
</button>
```

## Customization After Setup

The wizard creates a "draft" profile. All settings can be customized later:

### In VenueProfile:
- Update name, address, hours, links
- Add/remove photos
- Edit description

### In VenueWalls:
- Add multiple walls
- Configure dimensions
- Change rotation preferences

### In VenueSettings:
- Update categories
- Modify QR placement strategy
- Change staff talking points
- Manage commission preferences

### Reset to Recommended

Each section should have a "Reset to Recommended" button:

```tsx
<button onClick={resetToRecommended}>
  ↻ Reset to Recommended Settings
</button>
```

## Status States

Venues move through these states:

```
draft
  ↓ (wizard completion)
pending_review
  ↓ (admin approval)
approved
  ↓ (published)
live
  ↕ (pause/unpause)
paused
```

Only "live" venues appear in discovery.

## Key Features

✅ **Guided First-Time Setup** - 5-step wizard with best practices
✅ **Flexibility** - Every setting changeable later
✅ **Transparency** - Clear "You can change this" messaging
✅ **Education** - Built-in Partner Kit with training materials
✅ **Progress Tracking** - Health checklist shows completion
✅ **Draft Recovery** - Save and resume setup later
✅ **Mobile Friendly** - Responsive design
✅ **Consistent Economics** - All displays match (15% venue, 4.5% platform, 60-85% artist)

## Future Enhancements

1. **Onboarding Emails** - Remind about incomplete setup
2. **A/B Testing** - Test different recommended defaults
3. **QR Code Generation** - Real print-ready assets
4. **PDF Customization** - Branded PDFs with venue details
5. **Setup Progress Notifications** - Email when status changes
6. **Analytics** - Track which steps get abandoned
7. **Personalized Recommendations** - Based on venue type
8. **Video Tutorials** - For each setup step

## Testing Checklist

- [ ] Complete wizard flow end-to-end
- [ ] Save draft and resume on next session
- [ ] Verify all navigation links work
- [ ] Test mobile responsiveness
- [ ] Verify all economics figures are correct
- [ ] Test with slow network (large photo uploads)
- [ ] Verify database records created correctly
- [ ] Test admin approval flow
- [ ] Verify draft → live transitions
- [ ] Test health checklist updates

## Notes

- All "recommended" defaults are suggestions, not requirements
- Venues can publish before completing all steps
- Admin can view setup progress from user management page
- Partner Kit content should be searchable/printable
- QR codes are placeholder - integrate with actual QR service later
