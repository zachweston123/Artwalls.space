# Setup Flow Implementation - Quick Reference

## Status: FRAMEWORK COMPLETE ✅

All components, types, and documentation are ready. Backend development needed next.

## Files Created/Modified

### Components ✅
- `src/components/venue/VenueSetupWizard.tsx` - 5-step wizard
- `src/components/venue/SetupHealthChecklist.tsx` - Progress checklist
- `src/components/venue/VenuePartnerKit.tsx` - ENHANCED with full content
- `src/components/venue/VenuePartnerKitEmbedded.tsx` - Portal wrapper
- `src/App.tsx` - Routes added

### Types ✅
- `src/types/venueSetup.ts` - Complete type definitions + ECONOMICS constant

### Documentation ✅
- `IMPLEMENTATION_SUMMARY.md` - Executive overview
- `src/docs/SETUP_FLOW_GUIDE.md` - Complete implementation guide
- `src/docs/CHECKLIST_INTEGRATION.md` - Dashboard integration
- `src/docs/CUSTOMIZATION_AFTER_SETUP.md` - Portal customization

## What's Working Now

1. **Setup Wizard** - Full 5-step flow
   - Venue basics, photos, wall config, categories, signage
   - Save & exit at any point
   - "You can change this later" on every step

2. **Health Checklist** - Progress tracking
   - 6 items (Photos, Profile, Wall, QR Download, QR Placement, Share)
   - Completion percentage
   - Clickable navigation

3. **Partner Kit** - Enhanced guidance
   - Process overview, economics, artist tiers
   - QR placement best practices
   - Hosting policy, staff one-liner, setup checklist
   - FAQ and PDF download button

4. **Types & Constants** - Single source of truth
   - ECONOMICS object (4.5% buyer fee, 15% venue commission, 60-85% artist take-home)
   - All wizard steps defined
   - Helper functions

5. **Routes** - Navigation ready
   - /venue/setup → VenueSetupWizard
   - /venue/partner-kit → VenuePartnerKitEmbedded
   - Ready to use in App.tsx

## What Needs Backend Work

### Phase 1 (CRITICAL)
```
- Create API endpoints
  POST /api/venues/setup
  POST /api/venues/setup/complete
  GET /api/venues/:id
  PATCH /api/venues/:id/settings
  GET /api/venues/:id/defaults
  POST /api/venues/:id/settings/reset

- Database fields
  status (draft|pending_review|approved|live|paused)
  photos (array)
  wallType, displaySpots, wallDimensions
  categories (array)
  qrDownloaded, qrPlaced (booleans)

- Admin approval workflow
  Draft → Review → Approved → Live
```

### Phase 2 (CRITICAL)
```
- Dashboard integration
  Import SetupHealthChecklist
  Load venue data
  Show checklist if < 100%

- Settings pages
  Profile, wall, categories customization
  "Reset to recommended" buttons
  "Recommended" vs "Customized" badges
```

### Phase 3 (NICE-TO-HAVE)
```
- PDF generation for Partner Kit
- Email notifications
- Analytics events
- Admin dashboard updates
```

## Key Principles

1. **Recommended but Flexible**
   - Defaults guide best practices
   - Can customize everything later

2. **Consistent Economics**
   - All pages use ECONOMICS constant
   - No contradictions across app
   - Single source of truth

3. **Clear Communication**
   - "You can change this later" on every step
   - "Why recommended" explanations
   - State indicators (recommended/customized)

4. **Progressive Disclosure**
   - Simple setup wizard
   - Advanced customization in portal
   - Full context in partner kit

## Economics Reference

```typescript
// From src/types/venueSetup.ts
BUYER_FEE: 0.045           // 4.5%
VENUE_COMMISSION: 0.15      // 15%
ARTIST_TIERS: {
  free: 0.6,    // 60%
  starter: 0.7, // 70%
  pro: 0.85,    // 85%
}
```

**Every page showing economics must:**
1. Import ECONOMICS from src/types/venueSetup.ts
2. Use the constants (never hardcode)
3. Show all tiers if applicable
4. Include the guarantee notice

## Routes Ready

```
Public:
  /venues-partner-kit        VenuePartnerKit (marketing)
  /find-art                  FindArtHub (discovery)

Portal:
  /venue/dashboard           VenueDashboard (main)
  /venue/setup               VenueSetupWizard (wizard)
  /venue/partner-kit         VenuePartnerKitEmbedded (in-app guide)
  /venue/settings            VenueSettings (customization)
```

## Setup Wizard Details

### Step 1: Basics
- Venue name, address, hours (required)
- Website, Instagram (optional)
- "Why: Helps customers find you"

### Step 2: Photos
- Min 3, max 5 photos
- Show count: "2 of 3+"
- "Why: Great photos increase discoverability"

### Step 3: Wall
- Type: single/multiple/rotating
- Display spots: 1-20
- Dimensions: optional
- "Why: Helps artists understand constraints"

### Step 4: Categories
- Multi-select from 8 options
- Recommended: Contemporary, Local Artists
- "Why: Makes venue discoverable to artists"

### Step 5: Signage
- QR placement guides (4 scenarios)
- Staff one-liner (copy button)
- Next steps checklist (8 items)
- "Why: Ready to launch"

## Health Checklist Items

1. ✓ Photos Added (3+ required)
2. ✓ Profile Published (status: live/approved)
3. ✓ Wall Configured (display spots set)
4. ✓ QR Assets Downloaded (manual flag)
5. ✓ QR Placement Confirmed (manual flag)
6. ○ Shared Venue Page (optional)

Shows completion %, clickable items, congratulations at 100%

## Dev Quick Start

### 1. Backend First
```bash
# Create migrations
- Add status field to venues table
- Add photos, wallType, displaySpots, wallDimensions, categories
- Add qrDownloaded, qrPlaced booleans

# Create API endpoints (3-5 endpoints)
# Create admin approval workflow
```

### 2. Dashboard Integration
```bash
# See CHECKLIST_INTEGRATION.md for exact code
- Import SetupHealthChecklist
- Load venue data with useEffect
- Calculate completion percentage
- Show checklist if < 100%
```

### 3. Settings Pages
```bash
# See CUSTOMIZATION_AFTER_SETUP.md for code example
- Profile customization section
- Wall customization section
- Categories section
- Add "Reset to recommended" buttons
```

### 4. Testing
```bash
# See SETUP_FLOW_GUIDE.md for scenarios
- Fresh signup → setup → live
- Resume interrupted setup
- Edit settings after setup
- Reset to recommended
- Admin approval workflow
```

## File Reference

| File | Purpose | Status |
|------|---------|--------|
| VenueSetupWizard.tsx | 5-step wizard | ✅ Complete |
| SetupHealthChecklist.tsx | Progress tracking | ✅ Complete |
| VenuePartnerKit.tsx | Partner guide | ✅ Enhanced |
| VenuePartnerKitEmbedded.tsx | Portal integration | ✅ Complete |
| venueSetup.ts | Types & constants | ✅ Complete |
| App.tsx | Routes | ✅ Updated |
| SETUP_FLOW_GUIDE.md | Implementation guide | ✅ Complete |
| CHECKLIST_INTEGRATION.md | Dashboard how-to | ✅ Complete |
| CUSTOMIZATION_AFTER_SETUP.md | Portal how-to | ✅ Complete |
| IMPLEMENTATION_SUMMARY.md | Project overview | ✅ Complete |

## Next Steps

1. **Read Documentation** (30 min)
   - Start: IMPLEMENTATION_SUMMARY.md
   - Then: SETUP_FLOW_GUIDE.md

2. **Backend Development** (1-2 weeks)
   - Create 6 API endpoints
   - Update database schema
   - Implement approval workflow

3. **Dashboard Integration** (3-4 days)
   - Add checklist to dashboard
   - Load venue data
   - Show progress

4. **Settings Pages** (1 week)
   - Create customization UI
   - Add reset buttons
   - Show state indicators

5. **Testing** (3-4 days)
   - Test all user flows
   - Test edge cases
   - Admin workflow

**Estimated Total**: 3-4 weeks for full implementation

## Support

All questions answered in documentation:
- Architecture questions → IMPLEMENTATION_SUMMARY.md
- Implementation questions → SETUP_FLOW_GUIDE.md
- Dashboard integration → CHECKLIST_INTEGRATION.md
- Portal customization → CUSTOMIZATION_AFTER_SETUP.md
- Code examples → Each documentation file
- API specs → SETUP_FLOW_GUIDE.md "Backend Requirements"

---

**Framework Status**: ✅ COMPLETE
**Ready for**: Backend Development Phase
