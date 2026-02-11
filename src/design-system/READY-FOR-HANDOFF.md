# @deprecated — Internal documentation. Moved to project wiki.

## Deliverables Summary

### 📄 Documentation Files (6 files)

1. ✅ **0-FOUNDATIONS.md** - Design tokens, components, accessibility specs
2. ✅ **1-ARTIST.md** - Artist screens (desktop + mobile)
3. ✅ **2-VENUE.md** - Venue screens (desktop + mobile)
4. ✅ **3-ADMIN.md** - Admin Console screens
5. ✅ **4-FLOWS.md** - End-to-end user flows with prototypes
6. ✅ **READY-FOR-HANDOFF.md** - This checklist

---

## 0-FOUNDATIONS ✅

### Design Tokens
- ✅ Semantic color system (Light + Dark modes)
  - Background, surface, text, borders
  - Interactive states (default, hover, active, disabled)
  - Artist brand (blue)
  - Venue brand (green)
  - Platform brand (purple)
  - Feedback colors (success, error, warning, info)
  - **QR-specific tokens** (active, expired, replaced)
  - **Print-specific tokens** (high contrast black/white)

- ✅ Typography scale (8 sizes, 4 weights)
  - Font families (sans, mono, print)
  - **Print typography** (optimized for 4×6" and 8.5×11")

- ✅ Spacing system (8px base grid)
- ✅ Border radius scale (7 values)
- ✅ Shadow scale (5 levels, light + dark)
- ✅ Focus ring specification (2px solid, 2px offset, AA contrast)
- ✅ Breakpoints (390px, 768px, 1280px, 1920px)
- ✅ **Print breakpoints** (4×6" label, 8.5×11" sheet)

### Components (13 components)
- ✅ Buttons (6 variants with all states)
  - Primary, Artist Primary, Venue Primary, Secondary, Danger, Ghost
  - States: Default, Hover, Active, Focus, Disabled, Loading
  
- ✅ Inputs (5 types with validation states)
  - Text, Search, Select, Textarea, Checkbox, Radio, Toggle
  - States: Default, Focus, Error, Success, Disabled
  
- ✅ Cards (4 variants)
  - Base, Elevated, Outlined, Clickable
  - **Listing card** (artwork + venue/artist + status)
  
- ✅ Badges (7 types)
  - Status, Role (Artist/Venue), **QR Status** (Active/Expired/Replaced)
  
- ✅ Tables (with empty/loading states)
- ✅ Tabs (with keyboard navigation)
- ✅ Modals/Dialogs (with focus trap, animations)
- ✅ Dropdown Menus (with keyboard nav)
- ✅ Toasts (4 variants: success, error, warning, info)
- ✅ Skeleton Loaders (5 variants)
- ✅ Error Banners (page-level + inline)
- ✅ Empty States (with icons, CTAs)
- ✅ Forms (grouped, validated, accessible)

### Print & QR Specifications
- ✅ **QR Code Technical Specs**
  - Format, error correction (High 30%)
  - Minimum/maximum size (1.5" - 3")
  - Quiet zone requirement (4 modules)
  - Black/white only (no gradients)
  - 300 DPI minimum
  
- ✅ **QR URL Pattern**: `https://art.wls/[6-char]`
- ✅ **QR Status States**: Active, Expired, Replaced, Sold
  
- ✅ **Print Kit Templates**
  - 4×6" label template (detailed layout)
  - 8.5×11" sheet template (detailed layout)
  - Test scan checklist
  - Print settings guidelines
  - Placement tips

### Payment UX Specifications
- ✅ **Customer Landing Page** (QR destination)
  - Performance requirements (< 2s load)
  - Layout structure (mobile-first)
  - Hero image, pricing, availability
  - "BUY NOW" CTA positioning
  - Apple Pay conditional hint
  - Payment breakdown component
  
- ✅ **Stripe Checkout Integration**
  - Session configuration
  - Payment methods (card, Apple Pay, Google Pay)
  - Success/cancel URLs
  
- ✅ **Post-Purchase States**
  - Success page
  - Sold/unavailable states
  - QR redirect logic

### Accessibility Standards
- ✅ WCAG AA contrast validation (all color pairs tested)
- ✅ Focus ring specification (3:1 minimum contrast)
- ✅ Keyboard navigation patterns (modals, dropdowns, tabs, tables)
- ✅ Semantic HTML requirements
- ✅ Screen reader support guidelines
- ✅ Minimum touch target size (44×44px)

---

## 1-ARTIST Screens ✅

### Screens Designed (8 screens)
- ✅ **Onboarding Checklist** (`/artist/onboarding`)
  - 3-step guided setup
  - Progress bar, checklist cards
  - Connect payout, create artwork, request listing
  
- ✅ **Artworks Manager** (`/artist/artworks`)
  - Grid view (4 columns desktop, 1 mobile)
  - Create/edit artwork
  - Search & filters
  - Status badges
  - Empty/loading states
  
- ✅ **Create/Edit Artwork** (`/artist/artworks/new`, `/artist/artworks/:id/edit`)
  - Image upload with preview
  - Form: Title, price, description, medium, dimensions
  - Inventory type: Unique vs Editions
  - Validation (real-time, on submit)
  
- ✅ **Listing Requests** (`/artist/listing-requests`)
  - Create request modal
  - Track pending/approved/rejected
  - Tabs for filtering
  - Request cards with status
  - Withdraw/view details actions
  
- ✅ **Approved Listings** (`/artist/approved-listings`)
  - **QR generation CTA** (primary feature)
  - QR status badges
  - Short URL display (copyable)
  - Stats: Scans, views, sold status
  - **QR Print Kit modal** with options
  
- ✅ **Subscription Plans** (`/artist/subscription`)
  - 4 tiers (Free, Starter, Growth, Pro)
  - **Revenue split shown per tier**
  - Interactive split calculator
  - Upgrade/downgrade CTAs
  
- ✅ **Sales Dashboard** (`/artist/sales`)
  - Summary cards (total, this month, earnings)
  - Transaction table
  - **Payment breakdown modal** (80/10/10 split)
  - Payout status
  
- ✅ **Settings** (`/artist/settings`)
  - Profile, payout account, notifications, theme
  - Payout connection flow
  - Theme toggle (light/dark/system)

### Desktop + Mobile
- ✅ Desktop layouts (1280px)
- ✅ Mobile layouts (390px)
- ✅ Responsive grid patterns
- ✅ Mobile-specific UI (bottom sheets, sticky CTAs)

### States Coverage
- ✅ Empty states (no artworks, no requests, no sales)
- ✅ Loading states (skeleton grids, spinners)
- ✅ Error states (form validation, network errors, upload failures)
- ✅ Success states (toasts, confirmations)
- ✅ Light mode (all screens)
- ✅ Dark mode (all screens, semantic tokens)

---

## 2-VENUE Screens ✅

### Screens Designed (7 screens)
- ✅ **Onboarding Checklist** (`/venue/onboarding`)
  - Connect payout, set commission, approve first listing
  - Commission rate explanation modal
  
- ✅ **Listing Approval Inbox** (`/venue/listing-requests`)
  - Request cards (pending/approved/rejected tabs)
  - **Detailed approval modal** (core feature)
  - Placement field (wall/zone name)
  - **Commission override** per listing
  - Approval duration options
  - Rejection modal with reason
  
- ✅ **Active Listings Manager** (`/venue/active-listings`)
  - Track artwork on walls
  - QR status display
  - Stats (scans, views)
  - Mark as sold/removed actions
  - Duration warnings (< 14 days)
  
- ✅ **Venue Dashboard** (`/venue/dashboard`)
  - KPI cards (requests, active, sales)
  - Quick actions
  - Recent activity, earnings panel
  
- ✅ **Sales & Commissions** (`/venue/sales`)
  - Summary cards (sales, commission, artworks sold)
  - Transaction table
  - **Commission breakdown** (10% highlighted)
  - Payout status
  
- ✅ **Settings** (`/venue/settings`)
  - Profile, payout, **commission slider**, notifications
  - Default commission rate (slider 0-25%)
  - Commission calculator example
  
- ✅ **Display Spaces** (optional) (`/venue/spaces`)
  - Track physical walls/zones
  - Assign artwork to spaces

### Desktop + Mobile
- ✅ Desktop layouts (1280px)
- ✅ Mobile layouts (390px)
- ✅ Responsive patterns

### States Coverage
- ✅ Empty states (no requests, no listings, no sales)
- ✅ Loading states
- ✅ Error states
- ✅ Warning states (listing ending soon, no payout)
- ✅ Light/Dark modes

---

## 3-ADMIN Screens ✅

### Screens Designed (7 screens)
- ✅ **Admin Dashboard** (`/admin/dashboard`)
  - 7 KPI cards (artists, venues, listings, orders, GMV, revenue, payouts)
  - Quick actions
  - Recent activity, system health
  
- ✅ **Users Management** (`/admin/users`)
  - Search & filter
  - User table (name, role, email, tier, status, payout)
  - User detail page (6 tabs)
  
- ✅ **User Detail** (`/admin/users/:id`)
  - Tabs: Overview, Artworks, Listings, Orders, Payouts, Notes
  - Quick actions (suspend, force logout, reset password)
  - Role-specific stats
  
- ✅ **Subscription Tiers Setup** (`/admin/subscription-tiers`)
  - **Platform fee configuration** (critical feature)
  - Table: Tier → Artist% / Venue% / Platform%
  - Split calculator examples
  - Edit tier modal
  
- ✅ **Platform Settings** (`/admin/platform-settings`)
  - General (name, short URL domain, support email)
  - Fee settings (venue commission range, Stripe fee handling)
  - Featured content
  
- ✅ **Orders Management** (`/admin/orders`)
  - Order table with filters
  - **Order detail drawer** with split breakdown
  - Stripe session/charge IDs
  - Refund action
  
- ✅ **Artworks & Listings** (global view)
  - All artworks across platform
  - All listings (pending/approved/active)
  - Moderation flags

### Admin-Specific Patterns
- ✅ Sidebar navigation (256px fixed)
- ✅ Neutral color scheme (not artist blue or venue green)
- ✅ Role badges preserved (Artist=blue, Venue=green)
- ✅ Monospace fonts (IDs, codes, timestamps)
- ✅ Desktop-first (mobile functional)

### States Coverage
- ✅ Empty states
- ✅ Loading states
- ✅ Error/success states
- ✅ Light/Dark modes

---

## 4-FLOWS (End-to-End Prototypes) ✅

### Core Flows (5 flows)

**✅ Flow 1: Artist Requests Listing → Venue Approves → Listing Active**
- 7 steps fully spec'd
- Artist creates artwork
- Requests venue listing
- Venue receives, reviews, approves
- Listing becomes active with QR
- Success state defined

**✅ Flow 2: Artist Generates & Prints QR Kit**
- 7 steps with detailed modal UI
- Print options (4×6" / 8.5×11", PDF/PNG)
- Live preview
- **Test scan checklist included**
- Placement instructions

**✅ Flow 3: Customer Scans QR → Purchases**
- 9 steps end-to-end
- QR scan → Landing page (< 2s load)
- Buy CTA → Stripe Checkout
- Payment complete → Webhook processing
- **Split calculation** (80/10/10)
- Success page
- Artist sees sale, Venue sees commission

**✅ Flow 4: Sold/Unavailable Behavior**
- 3 scenarios:
  - After artwork sold (shows "Sold" page)
  - Listing removed/expired ("Not Available")
  - QR replaced ("QR Code Updated")
- No buy button after sale
- Proper redirects

**✅ Flow 5: Unauthorized / Not Found Routes**
- 3 scenarios:
  - Artist tries venue route → 401
  - Invalid listing ID → 404
  - Not logged in → Redirect to login
- **CRITICAL:** Never show fallback/wrong data

### Prototyping Specifications
- ✅ Figma prototype connections mapped
- ✅ Hover/click/focus states
- ✅ Loading states
- ✅ Success feedback (toasts)
- ✅ Edge cases documented (5 scenarios)

### Engineering Handoff Notes
- ✅ Short URL system implementation
- ✅ Stripe Checkout metadata structure
- ✅ Payment split calculation logic
- ✅ Apple Pay detection (conditional)
- ✅ QR code generation (server-side, high error correction)
- ✅ PDF print kit generation
- ✅ Webhook state handling (paid, refunded, disputed)
- ✅ Role-based access middleware

### Testing Checklist
- ✅ Manual testing scenarios (15 items)
- ✅ Automated testing examples

---

## System Consistency Requirements ✅

### Navigation
- ✅ Role-aware navigation (no dead links)
- ✅ Desktop + mobile nav parity
- ✅ Footer only shows accessible links per role
- ✅ Admin uses sidebar (not top nav)

### Dark Mode
- ✅ 100% coverage (all screens, all components)
- ✅ Semantic tokens (no hardcoded colors)
- ✅ AA contrast validated (light + dark)
- ✅ Print always uses high contrast (unaffected by theme)

### Responsive Design
- ✅ Desktop-first (1280px)
- ✅ Mobile-optimized (390px)
- ✅ Tablet breakpoint (768px)
- ✅ All grids use Auto Layout
- ✅ Mobile-specific patterns (bottom sheets, sticky CTAs, card lists)

---

## Core Concept Verification ✅

### QR Code Workflow
- ✅ Venue approves listing → QR generated
- ✅ Each listing = unique QR code
- ✅ QR encodes short URL (art.wls/xxxxxx)
- ✅ Printable templates (4×6" and 8.5×11")
- ✅ Test scan checklist provided
- ✅ QR status badges (Active/Expired/Replaced/Sold)
- ✅ Post-sale behavior (QR shows "Sold" page)

### Payment & Splits
- ✅ Customer scans QR → Stripe Checkout
- ✅ Apple Pay shown when eligible (not guaranteed)
- ✅ Revenue splits based on artist subscription tier:
  - Free: 70% Artist / 15% Venue / 15% Platform
  - Starter: 75% / 12% / 13%
  - Growth: 80% / 10% / 10%
  - Pro: 85% / 8% / 7%
- ✅ Venue can override commission per listing
- ✅ Breakdown shown to customer on landing page
- ✅ Order detail shows split to all parties

### Payout Accounts
- ✅ Artists must connect Stripe account (onboarding step 2)
- ✅ Venues must connect Stripe account (onboarding step 1)
- ✅ Connection status shown in settings
- ✅ Payout schedule displayed (e.g., Jan 31)

---

## What Was Delivered

### Design System
✅ Complete token system (100+ tokens)
✅ 13 component specifications with all states
✅ Accessibility standards (WCAG AA)
✅ Print & QR specifications (detailed)
✅ Payment UX specifications (performance + layout)

### Artist Screens
✅ 8 screens (desktop + mobile)
✅ Onboarding, artworks, listings, QR generation, sales, settings
✅ Empty/loading/error states
✅ Light + dark modes

### Venue Screens
✅ 7 screens (desktop + mobile)
✅ Onboarding, approval inbox, active listings, sales, settings
✅ Commission management (slider + calculator)
✅ All states, light + dark

### Admin Screens
✅ 7 screens (desktop-optimized, mobile-functional)
✅ Users, orders, subscription tier setup, platform settings
✅ Neutral admin color scheme
✅ All states, light + dark

### User Flows
✅ 5 end-to-end flows fully prototyped
✅ QR generation flow
✅ Customer purchase flow
✅ Sold/unavailable behavior
✅ Error flows (401, 404)

### Technical Specifications
✅ Short URL system design
✅ QR code generation (libraries, settings)
✅ PDF print kit generation
✅ Stripe Checkout integration
✅ Webhook handling
✅ Payment split calculation
✅ Role-based access control

---

## Handoff Notes for Engineering

### Stripe Payment Implementation

**Three-Way Split Options:**

**Option 1: Stripe Connect (Recommended for Production)**
```tsx
// Requires:
- Artist has Stripe Connect account
- Venue has Stripe Connect account
- Platform uses Stripe Connect to split payments

// Benefits:
- Automated splits on every transaction
- Artists/venues get paid directly
- Platform handles compliance

// Implementation:
- Use Stripe Connect onboarding for artists/venues
- Create Checkout Session with transfers
- Splits happen automatically
```

**Option 2: Payment Links (MVP Alternative)**
```tsx
// Simpler approach:
- Collect full payment to platform
- Calculate splits in database
- Schedule manual payouts via Stripe Transfers API

// Limitations:
- Manual payout scheduling
- Platform holds funds temporarily
- More operational overhead

// Good for:
- MVP/beta
- Low transaction volume
```

### Apple Pay Conditional Display

```tsx
// Don't promise Apple Pay will always appear
// Show hint only when supported:

const [applePayAvailable, setApplePayAvailable] = useState(false)

useEffect(() => {
  if (window.ApplePaySession && 
      ApplePaySession.canMakePayments()) {
    setApplePayAvailable(true)
  }
}, [])

// In UI:
{applePayAvailable && (
  <span className="text-sm text-success">
    🍎 Apple Pay available
  </span>
)}
```

**Stripe handles actual presentation** - you just enable it in Checkout Session config.

### QR Code Best Practices

**Server-Side Generation (Recommended)**
```tsx
// Reasons:
- Consistent quality
- Can cache/store QR images
- Security (no client-side short code exposure)

// Library: qrcode (Node.js)
npm install qrcode

import QRCode from 'qrcode'

const url = `https://art.wls/${shortCode}`
const qrDataURL = await QRCode.toDataURL(url, {
  errorCorrectionLevel: 'H', // 30% damage tolerance
  margin: 4, // Quiet zone
  width: 450, // 1.5" @ 300 DPI
  color: { dark: '#000000', light: '#FFFFFF' }
})
```

### Short URL Redirect Logic

```tsx
// Backend route
app.get('/api/short/:code', async (req, res) => {
  const listing = await db.listings.findByShortCode(req.params.code)
  
  if (!listing) {
    return res.redirect('/listings/not-found')
  }
  
  if (listing.status === 'sold') {
    return res.redirect(`/listings/${listing.id}?sold=true`)
  }
  
  if (listing.status === 'expired') {
    return res.redirect('/listings/not-found')
  }
  
  if (listing.status === 'replaced') {
    return res.redirect('/listings/qr-replaced')
  }
  
  // Active listing
  return res.redirect(`/listings/${listing.id}`)
})
```

### Webhook Idempotency

```tsx
// Critical: Store Stripe event IDs to prevent duplicate processing

app.post('/api/stripe/webhook', async (req, res) => {
  const event = req.body
  
  // Check if already processed
  const exists = await db.stripeEvents.findOne({ 
    eventId: event.id 
  })
  
  if (exists) {
    return res.json({ received: true }) // Already processed
  }
  
  // Process event
  if (event.type === 'checkout.session.completed') {
    await processPayment(event.data.object)
  }
  
  // Store event ID
  await db.stripeEvents.create({ eventId: event.id })
  
  res.json({ received: true })
})
```

---

## Implementation Priority

### Phase 1: Foundation (Week 1)
- [ ] Set up design tokens (CSS variables)
- [ ] Implement base components (Button, Input, Card)
- [ ] Set up routing (React Router or Next.js)
- [ ] Implement dark mode toggle
- [ ] Set up Stripe account + API keys

### Phase 2: Artist Core (Week 2)
- [ ] Artist onboarding flow
- [ ] Artwork creation/management
- [ ] Listing request system
- [ ] Connect Stripe for artists (Connect onboarding)

### Phase 3: Venue Core (Week 3)
- [ ] Venue onboarding flow
- [ ] Listing approval inbox
- [ ] Active listings manager
- [ ] Connect Stripe for venues

### Phase 4: QR & Payments (Week 4)
- [ ] QR code generation (server-side)
- [ ] PDF print kit generation
- [ ] Short URL redirect system
- [ ] Customer landing pages
- [ ] Stripe Checkout integration
- [ ] Webhook handling

### Phase 5: Sales & Payouts (Week 5)
- [ ] Sales dashboards (artist + venue)
- [ ] Payment split calculation
- [ ] Payout scheduling
- [ ] Transaction history
- [ ] Subscription tiers

### Phase 6: Admin & Polish (Week 6)
- [ ] Admin console
- [ ] User management
- [ ] Subscription tier configuration
- [ ] Platform settings
- [ ] Error handling
- [ ] Loading states
- [ ] Empty states
- [ ] Accessibility audit

---

## Final Checklist

✅ **Design System Foundations** - Complete
✅ **Artist Screens** - 8 screens designed (desktop + mobile)
✅ **Venue Screens** - 7 screens designed (desktop + mobile)
✅ **Admin Screens** - 7 screens designed
✅ **User Flows** - 5 flows prototyped end-to-end
✅ **Print & QR Specs** - Templates, guidelines, checklists
✅ **Payment UX** - Landing page, Stripe integration, splits
✅ **Dark Mode** - 100% coverage
✅ **Accessibility** - WCAG AA standards
✅ **Responsive** - Desktop (1280) + Mobile (390)
✅ **States** - Empty, loading, error, success for all screens
✅ **Engineering Notes** - Implementation guidance included

---

## 🚀 READY FOR ENGINEERING IMPLEMENTATION

This design system provides everything needed to build Artwalls Marketplace:
- Complete visual specifications
- Interactive component states
- End-to-end user flows
- Technical implementation notes
- Print-ready QR code templates
- Payment integration guidance

**All screens, flows, and edge cases have been designed, spec'd, and documented for engineering handoff.**
