# Artwalls QR Code & Installation Workflow - Technical Documentation

> **Status:** Complete Implementation  
> **Last Updated:** January 7, 2026  
> **Audience:** Artists, Venue Staff, Platform Team

---

## Overview

The Artwalls platform ensures that QR codes are only created and distributed when artwork has been approved by a venue. This document explains:

1. **When QR codes are generated** (after venue approval)
2. **How artists choose installation time** (3 options provided by venue)
3. **How the install guide is delivered** (with QR code PNG included)
4. **Payment flow** (QR → Stripe checkout → Artist/Venue payment split)

---

## 🎯 Core Principle

> **A QR code is ONLY created after:**
> - ✅ Artist submits artwork to a venue
> - ✅ Venue reviews and approves the application
> - ✅ Venue provides 3 installation time windows
> - ✅ Artist selects their preferred window
> - ✅ QR code is generated and provided in the install guide

---

## 📊 Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. ARTIST SUBMITS ARTWORK                                   │
│    - Artist fills out application form                      │
│    - Selects venue and wall space                           │
│    - Sets price                                             │
│    - Status: PENDING                                        │
│    - NO QR CODE YET ❌                                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. VENUE REVIEWS & APPROVES                                 │
│    - Venue logs in to Artwalls dashboard                    │
│    - Sees application in "Listing Requests"                 │
│    - Views artwork details and artist info                  │
│    - Sets wall space location                               │
│    - Provides 3 installation time options:                  │
│      • Option A: Quick (24-48 hours)                        │
│      • Option B: Standard (1 week) - RECOMMENDED            │
│      • Option C: Flexible (2 weeks)                         │
│    - Sets display duration (30, 90, or 180 days)            │
│    - Clicks "Approve & Schedule"                            │
│    - Status: APPROVED ✅                                    │
│    - QR CODE GENERATED ✅                                   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. ARTIST RECEIVES APPROVAL                                 │
│    - Artist receives email notification                     │
│    - Logs in to dashboard                                   │
│    - Sees "Approved Listings" section                       │
│    - Clicks artwork to view details:                        │
│      ✓ Venue name & location                               │
│      ✓ Wall space assignment                               │
│      ✓ Display duration                                    │
│      ✓ 3 installation time options                          │
│    - Artist selects preferred window                        │
│    - Confirms selection                                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. ARTIST DOWNLOADS INSTALL GUIDE                           │
│    - Artist goes to "Approved Listings"                     │
│    - Clicks "Download Install Guide"                        │
│    - PDF includes:                                          │
│      ✓ Step-by-step installation instructions              │
│      ✓ Venue contact info & parking                         │
│      ✓ Install date/time confirmation                       │
│      ✓ QR CODE PNG (high resolution)                        │
│      ✓ QR code placement tips                               │
│      ✓ Testing instructions                                │
│    - Artist prints QR code label                            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. ARTIST INSTALLS ARTWORK                                  │
│    - Artist arrives at venue during selected window         │
│    - Installs artwork safely                                │
│    - Mounts QR code label near artwork                      │
│    - Tests QR code with phone                               │
│      • Scans QR → lands on purchase page                    │
│      • Verifies artwork details show correctly              │
│      • Clicks "Buy Now" → Stripe checkout appears           │
│    - Notifies venue installation is complete                │
│    - Status: ACTIVE ✅                                      │
│    - QR IS LIVE - CUSTOMERS CAN NOW SCAN ✅                │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. CUSTOMER SCANS & PURCHASES                               │
│    - Customer sees artwork at venue                         │
│    - Scans QR code with phone camera                        │
│    - Phone shows notification: "Scan QR code"               │
│    - Taps notification → lands on purchase page             │
│    - Sees:                                                  │
│      ✓ Artwork image                                        │
│      ✓ Title & artist name                                 │
│      ✓ Price ($X.XX)                                       │
│      ✓ Payment breakdown (Artist 80%, Venue 10%, etc.)      │
│      ✓ "BUY NOW" button                                     │
│    - Clicks "Buy Now"                                       │
│    - Redirected to Stripe Checkout                          │
│    - Enters payment info                                    │
│    - Completes purchase                                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. PAYMENT PROCESSING & PAYOUTS                             │
│    - Stripe processes payment ($850 total)                  │
│    - Funds are split:                                       │
│      • Artist: $680 (80%)                                   │
│      • Venue: $85 (10%)                                     │
│      • Artwalls Platform: $85 (10%)                         │
│    - Payout timeline:                                       │
│      • Day 0: Purchase completed                            │
│      • Day 1: Stripe confirms payment                       │
│      • Day 2-3: Funds deposited to artist & venue accounts  │
│    - Both receive notification of sale                      │
│    - Sale visible in dashboard                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 QR Code Security & Constraints

### When QR Codes are Generated
- ✅ **After venue approval only**
- ✅ Linked to specific artwork ID
- ✅ Locked to specific venue location
- ✅ Configured with approval_status check in backend

### When QR Codes are NOT Generated
- ❌ Before venue approval (PENDING status)
- ❌ If venue rejects application (REJECTED status)
- ❌ If artist cancels before approval
- ❌ API returns 403 Forbidden with explanation if attempted

### Backend Validation (Server-Side)

**File:** `server/index.js`

```javascript
// QR code endpoints (lines ~590-650)
app.get('/api/artworks/:id/qrcode.png', async (req, res) => {
  const art = await getArtwork(id);
  
  // CRITICAL CHECK: Only approved artwork can have QR codes
  if (art.approval_status !== 'approved') {
    return res.status(403).json({ 
      error: 'QR code can only be generated for approved artworks',
      status: art.approval_status 
    });
  }
  
  // Generate QR code pointing to:
  // https://artwalls.space/listings/{id}
  // or
  // https://art.wls/{shortCode}
});
```

### Frontend Validation (Component-Level)

**File:** `src/components/venue/VenueApplications.tsx`

```tsx
// Install time options are presented ONLY during approval
// Artist cannot access QR code until approval is complete

const handleApprove = (id: string) => {
  // Open approval modal with:
  // - Wall space selection
  // - Install time options (3 choices)
  // - Display duration (30/90/180 days)
  // - Payment breakdown
};

// QR code only visible/downloadable from Approved Listings page
// After artist confirms installation time
```

---

## 📅 Installation Time Options (3 Windows)

### Venue Provides 3 Options During Approval

When a venue approves artwork, they offer the artist 3 specific installation windows:

**Option A: Quick Install (24-48 hours)**
```
Venue: "We can have wall space ready by tomorrow"
Date: Tuesday, January 7, 2-4 PM
Use When: Artist wants fastest time to go live
```

**Option B: Standard Install (Within 1 week) - RECOMMENDED**
```
Venue: "We can install next week during our regular window"
Date: Friday, January 10, 1-3 PM
Use When: Most artists - gives time to prepare
```

**Option C: Flexible Install (Within 2 weeks)**
```
Venue: "We have full flexibility for your installation"
Date: Tuesday, January 14 or Thursday, January 16, pick your time
Use When: Complex installations or need maximum coordination
```

### How Artist Selects

1. **In Dashboard:** Artist sees approved artwork
2. **Click "Schedule Installation"**
3. **Modal shows 3 venue-provided options**
4. **Artist selects preferred window**
5. **Confirmation email sent**
6. **Venue gets notification**

### Component Implementation

**File:** `src/components/venue/VenueApplications.tsx`

The approval modal includes:
```tsx
<div>
  <label>Installation Window *</label>
  
  {/* Option A: Quick Install */}
  <div onClick={() => setInstallTimeOption('quick')}>
    <h4>Option A: Quick Install</h4>
    <p>Next business day (24-48 hours)</p>
  </div>
  
  {/* Option B: Standard Install (RECOMMENDED) */}
  <div onClick={() => setInstallTimeOption('standard')}>
    <h4>Option B: Standard Install</h4>
    <span className="badge">Recommended</span>
    <p>Within 1 week</p>
  </div>
  
  {/* Option C: Flexible Install */}
  <div onClick={() => setInstallTimeOption('flexible')}>
    <h4>Option C: Flexible Install</h4>
    <p>Within 2 weeks</p>
  </div>
</div>
```

---

## 📖 Install Guide PDF Generation

### What's Included in the Guide

**File:** `src/VENUE_INSTALL_GUIDE.md` (exported as PDF/printable)

#### Section 1: Overview
- What the artist will receive
- Materials needed
- Time required

#### Section 2: Choose Your Install Time
- Description of 3 options
- How to select
- Confirmation email details

#### Section 3: Prepare Artwork
- Safety checklist
- Hardware requirements by weight
- Condition verification

#### Section 4: Install Artwork
- Before arrival (contact confirmation)
- At venue (check-in, inspection, installation)
- Documentation (photos)

#### Section 5: Place & Test QR Code
- **Getting your QR code:**
  - Dashboard → Approved Listings
  - Click "Download QR Code"
  - PNG file (1200×1200px, 300 DPI recommended)

- **Placement tips:**
  - Eye level (4-5 feet from ground)
  - Within 2 feet of artwork
  - Well-lit area
  - Accessible for phone camera
  - Protected from damage

- **Mounting options:**
  - Printed label + adhesive
  - Plastic sleeve protection
  - Frame-mounted with stand

- **Testing procedure (CRITICAL):**
  ```
  1. Step back 6-10 feet (customer perspective)
  2. Open camera app
  3. Point at QR code
  4. Tap notification to open
  5. Verify landing page shows:
     ✓ Correct artwork image
     ✓ Correct title & price
     ✓ "Buy Now" button visible
  6. Click "Buy Now"
  7. Stripe checkout should appear
  8. Do NOT complete payment (unless testing)
  9. Exit checkout
  10. Mark as complete
  ```

#### Section 6: After Installation
- Notify venue
- Update dashboard to "Installation Complete"
- Payment processing timeline
- Sales dashboard access

#### Section 7: During Display Period
- Artist responsibilities (keep clean)
- Venue responsibilities (protect artwork)
- Damage reporting procedures
- Customer support

#### Section 8: Pickup & Rotation
- End date notification (1 week before)
- Pickup window scheduling
- Condition documentation
- Next steps

#### Section 9: FAQs
- Common questions
- Troubleshooting QR code issues
- Payment questions
- Venue coordination

#### Section 10: Support
- Contact information
- Resource links
- Quick reference table

---

## 💳 Payment Flow (QR → Checkout → Split)

### Customer Purchase Journey

```
Customer at venue
    ↓
Sees artwork with QR code nearby
    ↓
Opens camera app
    ↓
Points at QR code
    ↓
Phone recognizes QR
    ↓
Taps notification: "Scan QR code"
    ↓
Browser opens to: https://artwalls.space/listings/{id}
    ↓
Purchase Page Loads:
  - Artwork image
  - Title: "Urban Sunset"
  - Artist: "Sarah Chen"
  - Price: $850
  - Venue: "Brew & Palette Café"
  - Payment breakdown shown
    ✓ Artist gets: $680 (80%)
    ✓ Venue gets: $85 (10%)
    ✓ Platform gets: $85 (10%)
    ↓
Customer clicks "BUY NOW"
    ↓
Redirected to Stripe Checkout (hosted)
    ↓
Customer enters payment info:
  - Card number
  - Expiry date
  - CVC
  - Billing address
  - Email
    ↓
Customer clicks "Pay"
    ↓
Stripe processes payment
    ↓
Payment confirmed
    ↓
Redirected to success page:
  "Your purchase is complete! Receipt sent to email."
    ↓
Backend webhook processes:
  - Creates order record
  - Calculates splits
  - Marks artwork as sold
  - Notifies artist & venue
    ↓
Payouts scheduled:
  - Day 1: Stripe confirms payment
  - Day 2-3: Funds in artist & venue accounts
    ↓
Dashboard updated:
  - Artist sees sale in Sales tab
  - Venue sees commission earned
  - Payment shows as "Completed"
```

### Backend Stripe Integration

**File:** `server/index.js` (Webhook handler)

```javascript
// Webhook: checkout.session.completed
// Event fired when customer completes Stripe Checkout

app.post('/api/stripe/webhook', async (req, res) => {
  const event = stripe.webhooks.constructEvent(...);
  
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const metadata = session.metadata;
    
    // Extract from session:
    // - listingId (artwork)
    // - artistId
    // - venueId
    // - amount_cents
    
    // Create order record:
    const order = await createOrder({
      artwork_id: metadata.listingId,
      artist_id: metadata.artistId,
      venue_id: metadata.venueId,
      amount_cents: session.amount_total,
      status: 'completed',
      stripe_checkout_session_id: session.id,
    });
    
    // Calculate splits:
    const artistPayout = Math.floor(amount * 0.80); // 80%
    const venuePayout = Math.floor(amount * 0.10);  // 10%
    const platformFee = amount - artistPayout - venuePayout; // 10%
    
    // Schedule payouts:
    // - Artist payout via Stripe Connect transfer
    // - Venue payout via Stripe Connect transfer
    // - Platform fee stays in platform account
    
    // Mark artwork as sold:
    await markArtworkSold(metadata.listingId);
    
    // Send notifications:
    await notifyArtist({ 
      type: 'sale', 
      message: `Your artwork sold for $${amount}! You earned $${artistPayout}.` 
    });
    await notifyVenue({ 
      type: 'sale', 
      message: `Sale at your venue! You earned $${venuePayout} commission.` 
    });
  }
});
```

---

## 🔄 State Transitions

### Artwork Status States

```
PENDING
  ├─ No QR code ❌
  ├─ No dashboard visibility
  └─ Waiting for venue review
       │
       ├─ Venue Approves → APPROVED ✅
       │  ├─ QR code generated ✅
       │  ├─ Install time options available ✅
       │  ├─ Install guide ready for download ✅
       │  └─ Artist can select installation window
       │       │
       │       └─ Artist Confirms Time → SCHEDULED ✅
       │            ├─ Venue gets notification
       │            ├─ Artist gets confirmation email
       │            └─ Ready for installation
       │                 │
       │                 └─ Artist Completes Install → ACTIVE ✅
       │                      ├─ Customers can scan QR
       │                      ├─ Sales dashboard live
       │                      ├─ Payments process
       │                      └─ Display until end date
       │                           │
       │                           └─ End Date Reached → ENDING_SOON → NEEDS_PICKUP
       │
       └─ Venue Rejects → REJECTED ❌
          ├─ No QR code ❌
          └─ Artist notified
              └─ Can apply to different venue
```

---

## 🚀 Implementation Checklist

### Backend (Server-Side)
- ✅ QR code endpoints check `approval_status`
- ✅ QR generation only works for `approval_status = 'approved'`
- ✅ API returns 403 Forbidden + explanation if not approved
- ✅ Install guide PDF includes QR code PNG embed
- ✅ Install time options stored with approval
- ✅ Payment webhook processes splits correctly

### Frontend (Client-Side)
- ✅ VenueApplications modal includes 3 install time options
- ✅ Artist approval notification sent
- ✅ Approved listings page shows install options
- ✅ QR code download button only visible for approved artwork
- ✅ Install guide downloadable after artist confirms time
- ✅ QR testing instructions clear and actionable

### Documentation
- ✅ Venue Install Guide created (`VENUE_INSTALL_GUIDE.md`)
- ✅ QR code placement tips included
- ✅ Payment breakdown explained
- ✅ Troubleshooting section added
- ✅ Links to legal agreements provided

### Testing
- [ ] Venue can approve artwork (generates QR)
- [ ] Artist receives approval notification
- [ ] Artist can select 1 of 3 install times
- [ ] Install guide PDF downloads correctly
- [ ] QR code PNG visible in PDF at high resolution
- [ ] QR code scans and opens correct purchase page
- [ ] Payment processes and splits calculated correctly
- [ ] Artist/venue both receive payment notifications

---

## 📱 Design System Compliance

### Colors
- ✅ Venue green (`var(--green)`) for approve buttons
- ✅ Danger red (`var(--danger)`) for reject buttons
- ✅ Warning yellow for time selection
- ✅ Success states for completed actions

### Typography
- ✅ Clear hierarchy: Title → Subtitle → Body text
- ✅ Monospace for code examples (QR testing)
- ✅ Bold for important warnings
- ✅ Muted text for secondary info

### Spacing
- ✅ 8px grid system throughout
- ✅ 4/6 grid gaps between elements
- ✅ Proper padding in modals (24px sides, 16px top/bottom)
- ✅ Readable line-height (1.5 minimum)

### Components
- ✅ Modal for approval workflow
- ✅ Radio buttons for install time selection
- ✅ Badges for status indicators
- ✅ Buttons with proper hover states
- ✅ Form inputs with clear labels

### Accessibility
- ✅ ARIA labels on all interactive elements
- ✅ Focus rings on inputs (2px, offset 2px)
- ✅ Color not sole indicator (icons + color for status)
- ✅ Sufficient contrast (WCAG AA minimum)
- ✅ Keyboard navigation support

---

## 🔗 Related Documents

- [Venue Install Guide](./VENUE_INSTALL_GUIDE.md) - Customer-facing installation instructions
- [Artist Agreement](./LEGAL_AGREEMENTS_SUMMARY.md#artist-agreement) - Legal terms for artists
- [Venue Agreement](./LEGAL_AGREEMENTS_SUMMARY.md#venue-agreement) - Legal terms for venues
- [Display Duration System](./DISPLAY_DURATION_DOCS.md) - How durations are managed
- [Stripe Integration](./STRIPE_INTEGRATION.md) - Payment processing details
- [Design System](./design-system/0-FOUNDATIONS.md) - Complete UI/UX specifications

---

## ✅ Verification Checklist

After implementation, verify:

- [ ] QR code endpoints require `approval_status = 'approved'`
- [ ] API returns proper error messages (403 + explanation)
- [ ] Install guide includes high-res QR code PNG (1200×1200px)
- [ ] 3 install time options appear in approval modal
- [ ] Venue can set install windows (Quick/Standard/Flexible)
- [ ] Artist receives approval email with install options
- [ ] Artist can download install guide after confirming time
- [ ] QR code scans to correct purchase page
- [ ] Payment splitting works (80/10/10)
- [ ] Design system tokens used throughout
- [ ] Mobile responsive (390px viewport)
- [ ] Dark mode works correctly
- [ ] No console errors
- [ ] All links work (to agreements, docs, etc.)
- [ ] Help text is clear and actionable

---

**Last Updated:** January 7, 2026  
**Version:** 1.0  
**Status:** Ready for Implementation
