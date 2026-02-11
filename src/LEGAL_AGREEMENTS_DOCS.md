# @deprecated — Internal documentation. Moved to project wiki.
---

## Pages Implemented

### 1. Policies & Agreements Landing Page
**Route:** `policies`  
**Component:** `PoliciesLanding.tsx`

**Features:**
- Grid of policy/agreement cards
- Artist Agreement card (blue accent)
- Venue Agreement card (green accent)
- Privacy Policy placeholder
- Terms of Service placeholder
- Contact information block
- Last updated date display

**Design:**
- 2-column grid on desktop, stacked on mobile
- Hover effects with shadow transitions
- Icon-based visual hierarchy
- Role-colored accents (blue/green)

---

### 2. Artist Agreement Page
**Route:** `artist-agreement`  
**Component:** `ArtistAgreement.tsx`

**Features:**
- Full legal agreement text (12 sections)
- Desktop: Sticky right sidebar TOC (table of contents)
- Mobile: Collapsible "On this page" accordion
- Smooth scroll-to-section navigation
- Accept agreement card at bottom with:
  - Checkbox: "I have read and agree"
  - Full name input field
  - Auto-filled date (today's date)
  - "Accept Agreement" button (blue)
  - "Download PDF" button (placeholder)
  - Validation (requires checkbox + name)
- Success toast on acceptance
- Back to policies button
- Last updated date: December 25, 2024

**Sections:**
1. Parties
2. Program Overview
3. Ownership and Responsibility
4. Artwork Readiness Requirements
5. Installation and Pickup
6. Display Risk; Damage, Loss, or Theft
7. Sales and "All Sales Final"
8. Payments and Split (80/10/10)
9. Prohibited Content and Conduct
10. Account Actions and Removal
11. Limitation of Platform Responsibility
12. Contact and Notices

**Design:**
- Max-width content column (optimal reading width)
- Blue accent color throughout
- Non-binding summary at top (blue box)
- Clear section headings with IDs
- Bulleted lists for sub-items
- Responsive typography
- Sticky TOC on desktop (hidden <lg)
- Mobile accordion TOC

---

### 3. Venue Agreement Page
**Route:** `venue-agreement`  
**Component:** `VenueAgreement.tsx`

**Features:**
- Full legal agreement text (12 sections)
- Desktop: Sticky right sidebar TOC
- Mobile: Collapsible "On this page" accordion
- Smooth scroll-to-section navigation
- Accept agreement card at bottom with:
  - Checkbox: "I have read and agree"
  - Full name/venue representative input field
  - Auto-filled date (today's date)
  - "Accept Agreement" button (green)
  - "Download PDF" button (placeholder)
  - Validation (requires checkbox + name)
- Success toast on acceptance
- Back to policies button
- Last updated date: December 25, 2024

**Sections:**
1. Parties
2. Program Overview
3. Wallspace Listings and Accuracy
4. Wallspace Safety Requirements (Duty of Care)
5. Scheduling: Weekly Install/Pickup Window
6. Handling, Moving, and Removal
7. Damage, Loss, or Theft Reporting
8. Sales and Revenue Share (80/10/10)
9. Customer Sales Policy
10. Prohibited Conduct
11. Limitation of Platform Responsibility
12. Contact and Notices

**Design:**
- Max-width content column
- Green accent color throughout
- Non-binding summary at top (green box)
- Clear section headings with IDs
- Bulleted lists for sub-items
- Responsive typography
- Sticky TOC on desktop
- Mobile accordion TOC

---

## Supporting Components

### Agreement Banner
**Component:** `AgreementBanner.tsx`

**Features:**
- Shows at top of all pages (except legal pages themselves)
- Only displays if user hasn't accepted agreement
- Role-specific colors (blue for artist, green for venue)
- Alert icon
- Clear call-to-action: "Review & Accept Agreement"
- Dismissible by accepting the agreement

**Usage:**
```tsx
<AgreementBanner 
  role={currentUser.role as 'artist' | 'venue'} 
  onNavigate={handleNavigate}
/>
```

**Design:**
- Full-width alert bar
- Role-colored background (blue-50 / green-50)
- Action button matches role color
- Responsive padding
- Clear visual hierarchy

---

### Footer
**Component:** `Footer.tsx`

**Features:**
- Four-column grid on desktop, stacked on mobile
- Sections:
  - Brand & tagline
  - For Artists links
  - For Venues links
  - Legal & Support links
- Footer links include:
  - Policies & Agreements
  - Artist Agreement
  - Venue Agreement
  - Contact Support
- Bottom bar with copyright and secondary links
- Responsive grid layout

**Navigation Links:**
- All footer links use `onNavigate` prop
- Works for both authenticated and unauthenticated users
- External links (email) use `mailto:` hrefs

---

## Navigation Integration

### Mobile Sidebar
Added to both artist and venue navigation:
- "Policies & Agreements" link in main navigation list

### Footer
Available on all authenticated pages:
- Appears at bottom of every page
- Quick access to both agreements
- Support contact link

### Desktop Navigation
Can be accessed through:
- Footer links
- Mobile sidebar
- Direct navigation from banner CTA

---

## Agreement Acceptance Flow

### Initial State (Not Accepted)
1. User logs in
2. Banner appears at top of dashboard
3. Banner shows: "Please accept the [Artist/Venue] Agreement to continue"
4. User clicks "Review & Accept Agreement"
5. Navigates to appropriate agreement page

### Agreement Review
1. User reads full agreement
2. Can use TOC to jump to specific sections
3. Scrolls to bottom to "Accept Agreement" card

### Acceptance Process
1. User checks "I have read and agree" checkbox
2. User enters full name in text field
3. Date is auto-populated (read-only)
4. User clicks "Accept Agreement" button (disabled until checkbox + name)
5. Success toast appears: "Agreement accepted successfully!"
6. After 2 seconds, redirects back to policies page
7. Banner no longer appears on dashboard/pages

### State Management
```tsx
const [hasAcceptedAgreement, setHasAcceptedAgreement] = useState(false);

// In agreement component
onAccept={() => setHasAcceptedAgreement(true)}
```

---

## Design System Compliance

### Colors
- **Artist (Blue):**
  - Primary: `bg-blue-600`, `text-blue-600`
  - Background: `bg-blue-50`
  - Border: `border-blue-200`
  - Hover: `hover:bg-blue-700`

- **Venue (Green):**
  - Primary: `bg-green-600`, `text-green-600`
  - Background: `bg-green-50`
  - Border: `border-green-200`
  - Hover: `hover:bg-green-700`

### Typography
- Page title: `text-3xl` (h1)
- Section headings: `text-xl` (h2)
- Body text: `text-neutral-700`, `leading-relaxed`
- Labels: `text-sm text-neutral-700`
- Helper text: `text-xs text-neutral-500`

### Spacing
- Card padding: `p-6 sm:p-8`
- Section spacing: `space-y-8`
- List item spacing: `space-y-2`
- Input spacing: `space-y-4`

### Components
- Cards: `bg-white rounded-xl border border-neutral-200`
- Buttons: `rounded-lg px-6 py-3`
- Inputs: `rounded-lg border border-neutral-300`
- Lists: `list-disc list-inside`

### Responsive Breakpoints
- Mobile: default (< 640px)
- Tablet: `sm:` (≥ 640px)
- Desktop: `lg:` (≥ 1024px)

---

## Legal Content Structure

### Artist Agreement Key Points
- 80% artist payout
- 10% venue commission
- 10% Artwalls fee
- Artist retains ownership until sale
- All sales final
- Installation/pickup coordination
- Display risk acknowledgment
- No-show policy
- Content moderation

### Venue Agreement Key Points
- 10% venue commission
- Wallspace safety requirements
- Weekly install/pickup window requirement
- Duty of care for artwork
- Damage/loss/theft reporting (48 hours)
- No moving artwork without permission
- Revenue share transparency
- No interference with QR codes

---

## Edge Cases & States

### Empty States
- No policies yet (placeholders for Privacy/Terms)
- Agreement not yet published (coming soon badges)

### Error States
- Name field required validation
- Checkbox must be checked
- Disabled accept button until both complete

### Success States
- Toast notification on acceptance
- Redirect after acceptance
- Banner disappears post-acceptance

### Mobile Experience
- Bottom sheet behavior for modals
- Collapsible TOC accordion
- Stacked form fields
- Full-width buttons
- Touch-friendly tap targets

---

## Files Created

### Components
```
/components/legal/
├── PoliciesLanding.tsx          # Landing page with all policies
├── ArtistAgreement.tsx          # Full artist agreement page
├── VenueAgreement.tsx           # Full venue agreement page
└── AgreementBanner.tsx          # Alert banner for acceptance

/components/
└── Footer.tsx                    # Site-wide footer
```

### Documentation
```
/LEGAL_AGREEMENTS_DOCS.md         # This file
```

---

## Testing the Legal System

### As Artist:
1. Login with artist credentials
2. See agreement banner on dashboard
3. Click "Review & Accept Agreement"
4. Review artist agreement (scroll, use TOC)
5. Check agreement checkbox
6. Enter name
7. Click "Accept Agreement"
8. Verify success toast
9. Verify redirect to policies
10. Verify banner no longer appears

### As Venue:
1. Login with venue credentials
2. See agreement banner on dashboard
3. Click "Review & Accept Agreement"
4. Review venue agreement (scroll, use TOC)
5. Check agreement checkbox
6. Enter name
7. Click "Accept Agreement"
8. Verify success toast
9. Verify redirect to policies
10. Verify banner no longer appears

### Footer Navigation:
1. Scroll to bottom of any page
2. Click "Policies & Agreements"
3. Verify navigation works
4. Click individual agreement links
5. Verify direct navigation to agreements

### Mobile:
1. Test on mobile viewport (< 640px)
2. Verify TOC is accordion (not sidebar)
3. Verify single-column layout
4. Verify form fields stack vertically
5. Verify buttons are full-width
6. Verify footer stacks properly

---

## Future Enhancements

Possible additions for production:
- PDF generation for download button
- Email copy of accepted agreement
- Agreement version tracking
- Re-acceptance on version updates
- Digital signature canvas
- Agreement history in user profile
- Admin panel for agreement management
- Multi-language support
- Acceptance audit trail
- Legal export functionality

---

## Technical Notes

- All legal text is hardcoded (not CMS-managed)
- Acceptance state is client-side only (MVP)
- No database persistence (would be needed in production)
- No email notification on acceptance
- PDF download is placeholder only
- Smooth scrolling uses native `scrollIntoView`
- Date formatting uses `toLocaleDateString`
- TOC auto-generated from section array
- Role-specific colors via conditional classes

---

## Accessibility

- Semantic HTML (section, nav, header, footer)
- Proper heading hierarchy (h1 → h2)
- Form labels with htmlFor
- Keyboard navigation support
- Focus states on interactive elements
- Sufficient color contrast
- ARIA labels where needed
- Screen reader friendly text

---

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS Grid for layout
- Flexbox for components
- Smooth scrolling (progressive enhancement)
- Responsive design (all viewport sizes)

---

## Performance

- No external dependencies for legal pages
- Minimal JavaScript for accordion/scroll
- Static content (no API calls)
- Fast page transitions
- Optimized for bundle size
