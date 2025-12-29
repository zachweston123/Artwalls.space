# Artwalls Marketplace - User Flows & Prototyping

## End-to-End Clickable Prototypes

---

## Flow 1: Artist Requests Listing → Venue Approves → Listing Active

### Step-by-Step

**1. Artist Creates Artwork**
- Route: `/artist/artworks/new`
- Upload image, set title, price ($850), medium, dimensions
- Click "Save & Continue"
- System: Creates artwork record, status = "Available"

**2. Artist Requests Venue Listing**
- Route: `/artist/listing-requests`
- Click "+ Request Listing"
- Modal opens:
  - Select artwork: "Urban Sunset"
  - Select venue: "Brew & Palette Café"
  - Duration: 90 days (radio)
  - Message: "Would love to display this piece..."
- Click "Submit Request"
- **System:** Creates listing request, sends notification to venue
- Toast: "Request sent to Brew & Palette Café"
- Redirect: `/artist/listing-requests`
- Card appears: "Urban Sunset" → Brew & Palette • [Pending]

**3. Venue Receives Notification**
- Venue user logs in
- Notification badge on "Listing Requests" nav item
- Navigate to `/venue/listing-requests`

**4. Venue Reviews Request**
- See card: "Urban Sunset" by Sarah Chen • [Pending]
- Click "View Details"
- Modal opens with:
  - Large artwork image
  - Artist details
  - Price: $850
  - Requested duration: 90 days
  - Artist message

**5. Venue Approves Listing**
- In modal, fill placement details:
  - Wall/Zone: "Main Dining Area" (dropdown)
  - Commission: 10% (default, not changed)
  - Approval duration: 90 days (radio)
  - Notes: "Excited to display this!"
- Click "Approve Listing"
- **System:**
  - Updates request status = "Approved"
  - Creates active listing record
  - Generates QR code + short URL (art.wls/a3f9k2)
  - Sends notification to artist
- Modal closes
- Toast: "Listing approved! Artist will be notified."

**6. Artist Receives Approval**
- Artist receives email notification
- Logs in, sees notification badge
- Navigate to `/artist/approved-listings`
- Card appears:
  - "Urban Sunset" at Brew & Palette Café
  - Placement: Main dining area
  - Duration: 90 days remaining
  - QR Status: [Active ✓]
  - Short URL: art.wls/a3f9k2

**7. Artist Generates QR Kit**
- Click "🖨️ Generate QR Kit"
- Modal opens with:
  - Size selection: 4×6" (selected)
  - Format: PDF (selected)
  - Live preview of print layout
- Click "Download"
- **System:** Generates PDF with QR code, artwork info
- File downloads: urban-sunset-qr-kit.pdf

**Success State:** Listing is active, QR code ready for printing.

---

## Flow 2: Artist Generates & Prints QR Kit

### Step-by-Step

**1. Access Approved Listing**
- Route: `/artist/approved-listings`
- Find listing card: "Urban Sunset" at Brew & Palette Café

**2. Open QR Generator**
- Click "🖨️ Generate QR Kit"
- Modal opens

**3. Select Print Options**
```tsx
┌────────────────────────────────────┐
│ Generate QR Print Kit              │
│                                    │
│ Artwork: "Urban Sunset"            │
│ Short URL: art.wls/a3f9k2          │
│                                    │
│ Print Size:                        │
│ (•) 4×6" Label                     │
│ ( ) 8.5×11" Full Sheet             │
│                                    │
│ Preview:                           │
│ ┌────────────────────────┐         │
│ │ [Artwork Image]        │         │
│ │ Urban Sunset           │         │
│ │ by Sarah Chen          │         │
│ │ $850                   │         │
│ │                        │         │
│ │ [QR Code 1.5×1.5"]     │         │
│ │                        │         │
│ │ art.wls/a3f9k2        │         │
│ │ At: Brew & Palette     │         │
│ │ Powered by Artwalls    │         │
│ └────────────────────────┘         │
│                                    │
│ Format:                            │
│ (•) PDF  ( ) PNG (300 DPI)         │
│                                    │
│ ☑ Include quiet zone guide        │
│ ☑ Include test scan checklist      │
│                                    │
│ [Download] [Print]                 │
└────────────────────────────────────┘
```

**4. Download PDF**
- Click "Download"
- **System:**
  - Generates PDF with:
    - 4×6" template
    - Artwork image (top)
    - Title, artist, price
    - QR code (1.5×1.5" with quiet zone)
    - Short URL
    - Venue name
    - "Powered by Artwalls" footer
  - Second page: Test scan checklist
- File saves to downloads folder

**5. Print Instructions (on PDF page 2)**
```
QR Code Print Checklist:

Before Printing:
☐ Printer set to 300 DPI or higher
☐ Paper: Matte or glossy cardstock
☐ Color: Black & white recommended
☐ Size: Do not scale (100%)

After Printing:
☐ QR code is sharp, not blurry
☐ White border (quiet zone) intact
☐ Scan with phone from 12" away
☐ URL opens correctly: art.wls/a3f9k2
☐ Landing page shows correct artwork

Placement Tips:
☐ Eye level (4-5 feet from ground)
☐ Well-lit area
☐ Near artwork (within 2 feet)
☐ Protected from damage
```

**6. Artist Prints & Delivers**
- Print on cardstock
- Test scan before delivery
- Deliver to venue with artwork

**7. Venue Places QR Code**
- Venue receives artwork + QR label
- Mounts QR near artwork on wall
- Customers can now scan

**Success State:** QR code printed, placed, scannable.

---

## Flow 3: Customer Scans QR → Purchases Artwork

### Step-by-Step

**1. Customer Scans QR Code**
- Customer at venue sees artwork on wall
- QR code label placed nearby
- Customer opens camera app
- Points at QR code
- Camera recognizes QR, shows link: art.wls/a3f9k2
- Customer taps link

**2. Landing Page Loads**
```
Route: /listings/a3f9k2 (redirects from short URL)

┌─────────────────────┐
│ [Artwork Hero Image]│ // Full-width, 16:9 ratio
│ 390×219px mobile    │
├─────────────────────┤
│ Urban Sunset        │ // h1, 30px bold
│ by Sarah Chen       │ // Artist link
│                     │
│ $850                │ // 36px bold, green
│ • Available         │ // Green badge
│                     │
│ [BUY NOW]          │ // Large, green CTA
│ 🍎 Apple Pay ready  │ // If supported
│                     │
├─────────────────────┤
│ About this artwork  │
│ [Description text]  │
│ Oil on canvas       │
│ 24×36 inches        │
│ Created 2024        │
│                     │
├─────────────────────┤
│ Currently at:       │
│ Brew & Palette Café │
│ Portland, OR        │
│ [Map icon] Directions│
│                     │
├─────────────────────┤
│ Where your $ goes:  │
│ ┌─────────────────┐ │
│ │ You pay: $850   │ │
│ │ Artist: $680    │ │ // Blue, 80%
│ │ Venue: $85      │ │ // Green, 10%
│ │ Artwalls: $85   │ │ // Purple, 10%
│ └─────────────────┘ │
│ (Growth tier split) │
└─────────────────────┘
```

**Performance:**
- Load time: < 2 seconds
- Hero image: Optimized WebP
- Lazy load description section
- No blocking scripts

**3. Customer Clicks "BUY NOW"**
- Client makes API call: Create Stripe Checkout Session
- **System:**
  - Validates listing is active
  - Creates Stripe session with line item
  - Calculates split (80/10/10 for Growth tier)
  - Returns session URL
- User redirected to Stripe Checkout

**4. Stripe Checkout**
```
https://checkout.stripe.com/pay/cs_test_...

[Stripe-hosted page]
┌────────────────────────┐
│ Complete your purchase │
│                        │
│ Urban Sunset           │
│ by Sarah Chen          │
│ $850.00                │
│                        │
│ Email:                 │
│ [____________]         │
│                        │
│ Payment:               │
│ [Card] [Apple Pay] ... │
│                        │
│ Card Number:           │
│ [____-____-____-____]  │
│                        │
│ [Pay $850.00]          │
└────────────────────────┘
```

**5. Customer Completes Payment**
- Enters card: 4242 4242 4242 4242 (test)
- Or taps Apple Pay (if available)
- Clicks "Pay $850.00"
- **System (Stripe):**
  - Processes payment
  - Sends webhook to Artwalls backend
  - Redirects to success URL

**6. Webhook Processing**
- **Backend receives:** `checkout.session.completed` event
- Extracts metadata:
  - Listing ID
  - Artist ID
  - Venue ID
  - Subscription tier
- Creates order record:
  - Total: $850
  - Artist share: $680 (80%)
  - Venue share: $85 (10%)
  - Platform share: $85 (10%)
- Updates listing status: "Sold"
- Updates QR redirect: Now shows "Sold" page
- Sends notifications to artist + venue

**7. Success Page**
```
Route: /purchase/success?session_id=cs_test_...

┌─────────────────────┐
│ ✓ Purchase Complete!│
│                     │
│ [Artwork Thumbnail] │
│                     │
│ "Urban Sunset"      │
│ by Sarah Chen       │
│                     │
│ You paid: $850.00   │
│                     │
│ Receipt sent to:    │
│ customer@email.com  │
│                     │
│ Next Steps:         │
│ • Coordinate pickup │
│   with venue        │
│ • Check your email  │
│   for receipt       │
│                     │
│ [Contact Venue]     │
│ [View Receipt]      │
└─────────────────────┘
```

**8. Artist Sees Sale**
- Navigate to `/artist/sales`
- New row in table:
  - Date: Jan 20, 2024
  - Artwork: Urban Sunset
  - Customer paid: $850
  - Your cut: $680 (80%)
  - Status: Paid ✓
  - Payout: Jan 31 (pending)

**9. Venue Sees Commission**
- Navigate to `/venue/sales`
- New row in table:
  - Date: Jan 20, 2024
  - Artwork: Urban Sunset
  - Artist: Sarah Chen
  - Sale: $850
  - Your commission: $85 (10%)
  - Payout: Jan 31 (pending)

**Success State:** Payment complete, order created, splits calculated, QR updated, all parties notified.

---

## Flow 4: Sold/Unavailable Behavior

### Scenario A: After Artwork Sold

**Customer scans same QR code after sale:**

```
Route: /listings/a3f9k2 (system checks status)

┌─────────────────────┐
│ [Artwork Image]     │ // Overlay: Semi-transparent gray
│ SOLD ✓              │
├─────────────────────┤
│ "Urban Sunset"      │
│ by Sarah Chen       │
│                     │
│ This artwork has    │
│ been sold.          │
│                     │
│ Interested in       │
│ similar pieces?     │
│                     │
│ [View Artist]       │
│ [Browse Venue]      │
└─────────────────────┘
```

**No "Buy" button**
**QR status in admin:** Sold (gray badge)

### Scenario B: Listing Removed/Expired

**Customer scans QR after listing removed:**

```
Route: /listings/a3f9k2 (system finds no active listing)

┌─────────────────────┐
│ ⚠️ Not Available    │
│                     │
│ This artwork is no  │
│ longer on display   │
│ at this venue.      │
│                     │
│ [Browse Available]  │
│ [Contact Support]   │
└─────────────────────┘
```

**QR status in admin:** Expired (gray badge)

### Scenario C: QR Replaced

**Artist generates new QR for same artwork:**

- Old URL: art.wls/a3f9k2 → Redirects to "Replaced" message
- New URL: art.wls/x7y4m9 → Active listing

```
Old QR scans to:

┌─────────────────────┐
│ ⚠️ QR Code Updated  │
│                     │
│ This QR code has    │
│ been replaced.      │
│                     │
│ Please scan the new │
│ code on the label.  │
│                     │
│ [Contact Venue]     │
└─────────────────────┘
```

**Venue action:** Replace physical QR label with new one

---

## Flow 5: Unauthorized / Not Found Routes

### Scenario A: Artist Tries to Access Venue Route

**Flow:**
1. Artist user logged in (role = artist)
2. Manually types URL: `/venue/listing-requests`
3. **System checks:** User role ≠ venue
4. Renders: 401 Unauthorized page

```tsx
Route: /venue/* (for non-venue users)

┌─────────────────────┐
│ 🔒 Access Denied    │
│                     │
│ You don't have      │
│ permission to       │
│ access this page.   │
│                     │
│ This page is for    │
│ venue users only.   │
│                     │
│ [Go to Dashboard]   │
└─────────────────────┘

"Go to Dashboard" → Redirects to /artist/dashboard
```

### Scenario B: Invalid Listing ID

**Flow:**
1. Customer scans corrupted QR or manually types
2. URL: `/listings/invalid123`
3. **System checks:** No listing found with ID "invalid123"
4. Renders: 404 Not Found

```tsx
Route: /listings/:id (invalid ID)

┌─────────────────────┐
│ 🔍 Not Found        │
│                     │
│ This listing        │
│ doesn't exist.      │
│                     │
│ The QR code may be  │
│ damaged or outdated.│
│                     │
│ [Browse Artworks]   │
│ [Contact Support]   │
└─────────────────────┘
```

**CRITICAL:** Never show fallback artwork or wrong data

### Scenario C: Public User Tries to Access Protected Route

**Flow:**
1. Not logged in
2. Types URL: `/artist/artworks`
3. **System checks:** No auth token
4. Redirects: `/login?redirect=/artist/artworks`

```tsx
Route: /login (with redirect param)

After successful login:
→ Redirect to original destination
```

---

## Interactive Prototyping Notes

### Figma Prototype Connections

**Artist Flow:**
```
/artist/artworks/new
  ↓ [Save & Continue]
/artist/artworks
  ↓ [+ Request Listing]
[Request Modal]
  ↓ [Submit Request]
/artist/listing-requests (pending card visible)
```

**Venue Flow:**
```
/venue/listing-requests (pending card)
  ↓ [View Details]
[Approval Modal]
  ↓ [Fill placement + Approve]
/venue/active-listings (approved listing visible)
```

**Customer Flow:**
```
[QR Code] (trigger)
  ↓ Scan action
/listings/:id (landing page)
  ↓ [BUY NOW]
[Stripe Checkout] (embed or screenshot)
  ↓ [Pay]
/purchase/success
```

**Error Flows:**
```
/venue/dashboard (as artist user)
  → 401 Unauthorized page

/listings/invalid
  → 404 Not Found page
```

### Prototype Interactions

**Hover States:**
- All buttons
- Card hovers (shadow + transform)
- Table row hovers

**Click States:**
- Button press (translateY, darker color)
- Active tabs (underline)
- Selected radio/checkbox

**Focus States:**
- Blue outline on all interactive elements
- 2px solid, 2px offset

**Loading States:**
- Skeleton screens on page load
- Spinner in submit buttons

**Success Feedback:**
- Toast notifications (slide in from right)
- Green checkmarks
- Success banners

---

## Edge Cases to Prototype

### 1. Multiple Listings Same Artwork
- Artist can list same artwork at multiple venues
- Each gets unique QR code
- If one sells, others remain active

### 2. Venue Changes Commission Mid-Listing
- Not allowed once approved
- Requires new listing request

### 3. Artist Cancels Listing
- Artist can withdraw pending request
- Cannot cancel approved listing (must contact venue)

### 4. Network Error During Purchase
- Show error message
- Stripe handles idempotency
- Don't double-charge

### 5. QR Code Doesn't Scan
- Checklist in print kit helps prevent
- Customer can manually type short URL
- Support contact available

---

## Handoff Notes for Engineering

### Critical Implementation Details

**1. Short URL System**
```tsx
// Backend route
GET /api/short/:code → Redirects to /listings/:listingId

// Generate short code
function generateShortCode(listingId: string): string {
  // Use base62 encoding of listing ID + random salt
  // Ensure 6 characters: [a-zA-Z0-9]
  // Store mapping in database
}

// Redirect logic
if (listing.status === 'sold') {
  redirect('/listings/:id?sold=true')
} else if (listing.status === 'expired') {
  redirect('/listings/not-found')
} else {
  redirect('/listings/:id')
}
```

**2. Stripe Checkout Session Metadata**
```tsx
// Include in Stripe session
metadata: {
  listingId: 'listing_123',
  artistId: 'artist_456',
  venueId: 'venue_789',
  tier: 'growth',
  artistSplit: '80',
  venueSplit: '10',
  platformSplit: '10'
}

// Use in webhook handler to calculate payouts
```

**3. Payment Splits**
```tsx
// Automated split requires Stripe Connect
// Artist and Venue need connected Stripe accounts

// Alternative for MVP:
// - Collect full payment to platform
// - Calculate splits
// - Schedule payouts manually or via Stripe Transfers API
```

**4. Apple Pay Detection**
```tsx
// Client-side check
if (window.ApplePaySession && 
    ApplePaySession.canMakePayments()) {
  showApplePayHint = true
}

// Don't promise it will always appear
// Stripe handles actual presentation
```

**5. QR Code Generation**
```tsx
// Server-side QR generation (recommended)
import QRCode from 'qrcode'

const url = `https://art.wls/${shortCode}`
const qrDataURL = await QRCode.toDataURL(url, {
  errorCorrectionLevel: 'H', // High (30%)
  margin: 4, // Quiet zone
  width: 450, // 1.5in @ 300 DPI
  color: {
    dark: '#000000',
    light: '#FFFFFF'
  }
})

// Include in PDF generation
```

**6. PDF Print Kit Generation**
```tsx
// Use library like PDFKit or jsPDF
// Template dimensions: 4×6" or 8.5×11"
// Resolution: 300 DPI minimum
// Include:
// - Artwork image (optimized)
// - Text (embedded fonts)
// - QR code (high-res)
// - Quiet zone guides
```

**7. Webhook States**
```tsx
// Stripe webhook events to handle
'checkout.session.completed' → Create order
'charge.refunded' → Update order status
'charge.dispute.created' → Flag for review
'payment_intent.payment_failed' → Notify user

// Idempotency: Store Stripe event ID to prevent duplicates
```

**8. Role-Based Access**
```tsx
// Middleware example
function requireRole(allowedRoles: string[]) {
  return (req, res, next) => {
    if (!req.user) return res.redirect('/login')
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(401).render('unauthorized')
    }
    next()
  }
}

// Usage
app.get('/venue/*', requireRole(['venue', 'admin']), ...)
```

---

## Testing Checklist

### Manual Testing

- [ ] Artist creates artwork → Success
- [ ] Artist requests listing → Venue receives notification
- [ ] Venue approves listing → QR generated
- [ ] Artist downloads QR kit → PDF valid
- [ ] Customer scans QR → Landing page loads < 2s
- [ ] Customer purchases → Payment succeeds
- [ ] Splits calculated correctly (80/10/10)
- [ ] Artist sees sale in dashboard
- [ ] Venue sees commission
- [ ] QR scan after sale → Shows "Sold" page
- [ ] Invalid QR → Shows 404, not fallback
- [ ] Artist tries venue route → 401 error
- [ ] Test all 3 dark mode (screens render correctly)

### Automated Testing

```tsx
// Example: Test listing approval flow
test('venue can approve listing request', async () => {
  const request = await createListingRequest()
  const approval = await approveRequest(request.id, {
    placement: 'Main Dining',
    commission: 10,
    duration: 90
  })
  
  expect(approval.status).toBe('approved')
  expect(approval.qrCode).toBeDefined()
  expect(approval.shortUrl).toMatch(/art\.wls\/[a-zA-Z0-9]{6}/)
})

// Example: Test QR redirect logic
test('sold listing redirects to sold page', async () => {
  const listing = await createListing({ status: 'sold' })
  const response = await fetch(`/${listing.shortCode}`)
  
  expect(response.url).toContain('?sold=true')
  expect(response.status).toBe(200)
})
```

---

These flows provide complete end-to-end prototypes covering the core QR-based marketplace workflow from listing creation through customer purchase.
