# PHASE 1-3 QUICK REFERENCE

## 📂 File Structure

```
src/
├── api/
│   ├── venues-setup.ts          ← Public endpoints (8)
│   └── admin-approvals.ts       ← Admin endpoints (5)
├── components/
│   ├── VenueDashboard.tsx       ← Main dashboard (enhanced)
│   ├── VenueSettings.tsx        ← 5 settings pages
│   ├── AdminVenueApprovals.tsx  ← Admin UI
│   ├── VenueSetupWizard.tsx     ← 5-step wizard (already exists)
│   ├── SetupHealthChecklist.tsx ← Progress tracker (already exists)
│   └── VenuePartnerKit.tsx      ← Partner guide (already exists)
├── services/
│   ├── setup-emails.ts          ← Email templates + service
│   └── setup-analytics.ts       ← Event tracking
├── styles/
│   ├── venue-dashboard.css
│   ├── venue-settings.css
│   └── admin-approvals.css
├── db/
│   └── migrations/
│       └── add_venue_setup.sql  ← Database schema
└── types/
    └── index.ts                 ← venueSetup.ts (already exists)
```

---

## 🔌 API ENDPOINTS

### Public Endpoints (venues-setup.ts)
```
POST   /api/venues/setup                    → Save draft
POST   /api/venues/setup/complete           → Submit for review
GET    /api/venues/:id                      → Fetch venue
PATCH  /api/venues/:id/settings             → Update settings
GET    /api/venues/:id/defaults             → Get recommended defaults
POST   /api/venues/:id/settings/reset       → Reset to recommended
```

### Admin Endpoints (admin-approvals.ts)
```
GET    /api/admin/venues/pending            → List pending
GET    /api/admin/venues/:id/details        → Detailed review
POST   /api/admin/venues/:id/approve        → Approve venue
POST   /api/admin/venues/:id/reject         → Reject venue
GET    /api/admin/approvals/stats           → Dashboard stats
```

---

## 📧 EMAIL TEMPLATES

1. **Setup Submitted** - Confirmation when user submits
2. **Setup Approved** - Welcome & next steps (→ status: approved)
3. **Setup Rejected** - Feedback & resubmit instructions (→ status: draft)

All templates include rich HTML styling and call-to-action buttons.

---

## 📊 ANALYTICS EVENTS

Events to log:
```
setup_started              → User begins wizard
setup_step_completed       → User completes a step
setup_saved_draft          → User saves progress
setup_submitted            → User submits for review
setup_approved             → Admin approves
setup_rejected             → Admin rejects
setup_resumed              → User resumes after interruption
partner_kit_viewed         → User views partner resources
qr_downloaded              → User downloads QR code
qr_printed                 → User prints QR code
settings_updated           → User updates venue settings
venue_live                 → Venue goes live
first_artwork_received     → First artwork submitted
first_sale                 → First artwork sold
```

All functions: `logEventName(venueId, ...)`

---

## 🎨 COMPONENTS

### VenueDashboard
**Purpose**: Main venue dashboard with setup progress
**Tabs**: Overview, Setup Progress, Partner Kit, Settings
**Features**: Status alerts, metrics, quick actions, health checklist

**Usage**:
```typescript
<Route path="/venue/dashboard" element={<VenueDashboard />} />
```

### VenueSettings
**Purpose**: 5-part settings customization
**Sections**: 
1. Basic (name, address, hours, social)
2. Wall Config (type, spots, dimensions)
3. Categories (art types)
4. Photos (upload 3-5)
5. QR Setup (download/print)

**Usage**:
```typescript
<Route path="/venue/settings" element={<VenueSettings />} />
```

### AdminVenueApprovals
**Purpose**: Admin approval queue and review interface
**Components**: 
- `AdminVenueApprovals` - Queue list
- `AdminVenueApprovalDetail` - Detailed review & approve/reject

**Usage**:
```typescript
<Route path="/admin/approvals" element={<AdminVenueApprovals />} />
<Route path="/admin/approvals/:venueId" element={<AdminVenueApprovalDetail />} />
```

---

## 💾 DATABASE

### New Tables
1. **admin_approvals** - Track approvals/rejections
2. **setup_activity_log** - Audit trail
3. **setup_emails** - Email tracking
4. **analytics_events** - Event analytics

### New Columns on venues
```
status: enum (draft, pending_review, approved, live, paused)
photos: TEXT[]
wall_type, display_spots, wall_dimensions
categories: TEXT[]
qr_downloaded, qr_placed: BOOLEAN
website, instagram
setup_completed_at: TIMESTAMP
setup_notes
```

**Setup**: Run SQL migrations file against Supabase

---

## 🔑 KEY FLOWS

### User Setup Flow
```
1. User fills VenueSetupWizard (5 steps)
   ↓
2. Data saved to database (POST /api/venues/setup)
   ↓
3. User submits (POST /api/venues/setup/complete)
   ↓
4. Status → "pending_review"
   ↓
5. Email sent: "Setup Submitted"
   ↓
6. Analytics logged: "setup_submitted"
   ↓
7. Dashboard shows pending status
```

### Admin Approval Flow
```
1. Admin views pending queue (/admin/approvals)
   ↓
2. Admin clicks venue to review details
   ↓
3. Admin reviews all info (photos, wall config, etc)
   ↓
4. Admin clicks "Approve" or "Reject"
   ↓
5. If Approve:
   - Status → "approved"
   - Email sent: "Setup Approved"
   - Analytics logged: "setup_approved"
   
   OR If Reject:
   - Status → "draft"
   - Email sent: "Please Review"
   - Analytics logged: "setup_rejected"
```

### Dashboard Integration
```
VenueDashboard
├── Tab: Overview
│   ├── Metrics (setup %, artworks, revenue)
│   └── Quick actions
│
├── Tab: Setup Progress
│   └── SetupHealthChecklist (integrated)
│
├── Tab: Partner Kit
│   └── VenuePartnerKitEmbedded
│
└── Tab: Settings
    └── Link to /venue/settings
```

---

## 🚀 QUICK START CHECKLIST

- [ ] Copy SQL migrations to Supabase
- [ ] Add routes to App.tsx
- [ ] Register API routes in Express
- [ ] Implement API endpoints (use stubs as template)
- [ ] Configure email provider
- [ ] Add photo upload handler
- [ ] Add QR generation handler
- [ ] Wire components to API
- [ ] Test full workflow
- [ ] Deploy!

---

## 🔧 MOST IMPORTANT THINGS TO KNOW

1. **Database is ready** - Just run the SQL file
2. **API structure is set** - Just fill in the database calls
3. **Components are complete** - Just wire them to API
4. **Email templates exist** - Just integrate with email provider
5. **Analytics ready** - Just call the functions

All TODO items marked in code with `// TODO:` comments.

---

## 📞 COMMON TASKS

### To add a new field to venue setup:
1. Add column to `add_venue_setup.sql` migration
2. Add to `VenueSetupData` type in `types/index.ts`
3. Add form field to `VenueSetupWizard.tsx` or `VenueSettings.tsx`
4. Add to SETUP_STEPS configuration in `types/venueSetup.ts`

### To add a new email:
1. Create `generateNewEmail()` function in `setup-emails.ts`
2. Add method to `SetupEmailService` class
3. Call from API endpoint where needed

### To track a new event:
1. Add event name to `SetupEventName` type in `setup-analytics.ts`
2. Create `logNewEvent()` function
3. Call from API endpoint or component

### To add admin approval reason:
1. Add option to rejection reason select in `AdminVenueApprovalDetail`
2. Add reason text to rejection email template
3. Query and display in approval history

---

## 🎯 IMPLEMENTATION PRIORITY

**Must do first:**
1. Database migrations
2. API endpoints
3. Component API wiring

**Then:**
4. Email setup
5. Photo/QR uploads
6. Analytics integration

**Polish:**
7. Testing
8. Error handling
9. Performance optimization

---

## 📈 METRICS TO MONITOR

After launch, track:
- Setup completion rate (%)
- Approval rate on first submission (%)
- Time to approve (hours)
- Email open rate (%)
- QR code scans
- Revenue per venue ($)
- User satisfaction (NPS)

---

## 🔐 Security Notes

All components have:
- ✅ RLS policies defined
- ✅ Admin middleware required
- ✅ Input validation structure ready
- ✅ Activity logging for audit trail
- ✅ Sensitive data handling

Implementation: Ensure all are activated in your deployment.

---

## 📚 FILES TO READ FIRST

1. `PHASE_1_3_IMPLEMENTATION_COMPLETE.md` - What was built
2. `PHASE_1_3_IMPLEMENTATION_GUIDE.md` - How to implement
3. `src/api/venues-setup.ts` - Endpoint structure
4. `src/db/migrations/add_venue_setup.sql` - Database schema
5. `src/services/setup-emails.ts` - Email templates

---

## ✨ YOU'RE READY!

All framework is in place. Implementation is straightforward:
1. Run database migrations
2. Implement API endpoints (mostly database calls)
3. Configure email provider
4. Wire components to API
5. Test and deploy

Estimated time: 2-3 weeks
Team size: 1-2 developers

Let's ship it! 🚀
