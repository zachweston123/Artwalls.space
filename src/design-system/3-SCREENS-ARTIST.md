# @deprecated — Internal documentation. Moved to project wiki.

## 1. Artist Dashboard (`/artist/dashboard`)

### Layout Structure

**Desktop (1280px)**
```
┌─────────────────────────────────────────────────────┐
│ [Navigation Bar]                                    │
├─────────────────────────────────────────────────────┤
│  [Page Title + CTA]                                 │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐     │
│  │ KPI Card 1 │ │ KPI Card 2 │ │ KPI Card 3 │     │
│  └────────────┘ └────────────┘ └────────────┘     │
│                                                      │
│  ┌──────────────────────────┐ ┌──────────────────┐ │
│  │ Active Displays (3 cols) │ │ Recent Activity  │ │
│  │                          │ │ (List)           │ │
│  └──────────────────────────┘ └──────────────────┘ │
│                                                      │
│  [Quick Actions Section]                            │
├─────────────────────────────────────────────────────┤
│ [Footer]                                            │
└─────────────────────────────────────────────────────┘
```

**Mobile (390px)**
```
┌─────────────────────┐
│ [Navigation Bar]    │
├─────────────────────┤
│ Page Title + CTA    │
│ ┌─────────────────┐ │
│ │ KPI Card 1      │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ KPI Card 2      │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ KPI Card 3      │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ Active Displays │ │
│ │ (1 col stack)   │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ Recent Activity │ │
│ └─────────────────┘ │
│ [Quick Actions]     │
├─────────────────────┤
│ [Footer]            │
└─────────────────────┘
```

### Components

#### Page Header
```tsx
<h1>Dashboard</h1>
<Button variant="artist-primary">+ Add Artwork</Button>

// Desktop: flex row, space-between
// Mobile: stack vertically, gap: 16px
```

#### KPI Cards (3 cards)

**Card 1: Total Artworks**
```tsx
Icon: Frame (blue)
Value: "24"
Label: "Total Artworks"
Change: "+3 this month"
```

**Card 2: Active Displays**
```tsx
Icon: MapPin (blue)
Value: "3"
Label: "Active Displays"
Change: "At 2 venues"
```

**Card 3: Total Sales**
```tsx
Icon: DollarSign (green)
Value: "$2,450"
Label: "Total Sales"
Change: "+$850 this month"
```

**Card Spec:**
- Background: var(--surface)
- Border: 1px solid var(--border-subtle)
- Border-radius: 12px
- Padding: 24px
- Icon: 48px circle background (artist-surface), 24px icon
- Value: text-3xl (30px) semibold
- Label: text-sm (14px) text-secondary
- Change: text-xs (12px) text-tertiary

**Desktop Grid:** 3 columns, gap: 24px
**Mobile Stack:** 1 column, gap: 16px

#### Active Displays Section

**Title:** "Active Displays" (h2)

**Empty State (if no displays):**
```tsx
Icon: Frame (neutral, 48px)
Title: "No active displays"
Description: "Your artwork isn't on display yet"
CTA: "Browse Venues" (artist-primary button)
```

**Display Cards (if has displays):**
- Grid: 3 columns desktop, 1 column mobile
- Gap: 24px desktop, 16px mobile

**Display Card Spec:**
```tsx
Image: Artwork thumbnail (aspect-ratio: 4/3, object-fit: cover)
Title: Artwork title (text-lg semibold)
Venue: Venue name (text-sm text-secondary)
Duration: "30 days remaining" (text-xs badge)
Status: "On Display" (success badge)
CTA: "View Details" (ghost button)
```

#### Recent Activity Panel

**Title:** "Recent Activity" (h3)

**Activity Items (5 items):**
```tsx
Icon: Based on activity type (20px)
Message: "Urban Sunset sold for $850"
Time: "2 hours ago" (text-tertiary)
```

**Activity Types:**
- Sale: DollarSign icon (green)
- Display started: Frame icon (blue)
- Invitation received: Mail icon (neutral)
- Application accepted: CheckCircle icon (green)

**Empty State:**
```tsx
Icon: Activity (neutral)
Message: "No recent activity"
```

---

## 2. My Artworks (`/artist/artworks`)

### Layout Structure

**Desktop:**
```
┌─────────────────────────────────────────────────────┐
│ [Navigation Bar]                                    │
├─────────────────────────────────────────────────────┤
│  My Artworks               [+ Add Artwork] [Filter] │
│                                                      │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐              │
│  │ Art 1│ │ Art 2│ │ Art 3│ │ Art 4│              │
│  └──────┘ └──────┘ └──────┘ └──────┘              │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐              │
│  │ Art 5│ │ Art 6│ │ Art 7│ │ Art 8│              │
│  └──────┘ └──────┘ └──────┘ └──────┘              │
│                                                      │
│  [Load More Button]                                 │
├─────────────────────────────────────────────────────┤
│ [Footer]                                            │
└─────────────────────────────────────────────────────┘
```

**Mobile:** Stack 1 column, gap: 16px

### Components

#### Page Header with Actions
```tsx
<h1>My Artworks</h1>
<div> // Button group
  <Button variant="artist-primary">+ Add Artwork</Button>
  <Button variant="secondary">
    <Filter icon /> Filters
  </Button>
</div>
```

#### Filter Panel (Collapsible)
```tsx
Filters:
- Status: All | Available | On Display | Sold
- Price Range: Slider (min-max)
- Style: Dropdown (Abstract, Modern, Traditional, etc.)
- Sort: Dropdown (Newest, Oldest, Price: Low-High, Price: High-Low)

[Clear Filters] [Apply]
```

#### Artwork Card

```tsx
┌──────────────────┐
│  [Image]         │ // aspect-ratio: 4/3
│                  │
├──────────────────┤
│ Title            │ // text-lg semibold, truncate
│ $850             │ // text-2xl text-primary
│ • Available      │ // Status badge (small)
├──────────────────┤
│ [Edit] [Delete]  │ // Action buttons (small)
└──────────────────┘

Hover: shadow-lg, transform: translateY(-4px)
```

**Grid:**
- Desktop: 4 columns, gap: 24px
- Tablet: 3 columns, gap: 16px
- Mobile: 1 column, gap: 16px

**Status Badges:**
- Available: Blue badge
- On Display: Green badge
- Sold: Neutral badge

#### Empty State (No Artworks)
```tsx
Icon: Frame (80px circle, neutral)
Title: "No artworks yet"
Description: "Add your first artwork to get started"
CTA: "+ Add Artwork" (artist-primary button)
```

#### Loading State
```tsx
Grid of skeleton cards (12 cards)
Each: Rectangle for image, 2 text lines
```

---

## 3. Find Venues (`/artist/discover-venues`)

### Layout Structure

**Desktop:**
```
┌─────────────────────────────────────────────────────┐
│ [Navigation Bar]                                    │
├─────────────────────────────────────────────────────┤
│  Find Venues                                        │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │ [Search] [City Filter] [Style Filter] [Sort]   │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐     │
│  │  Venue 1   │ │  Venue 2   │ │  Venue 3   │     │
│  └────────────┘ └────────────┘ └────────────┘     │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐     │
│  │  Venue 4   │ │  Venue 5   │ │  Venue 6   │     │
│  └────────────┘ └────────────┘ └────────────┘     │
├─────────────────────────────────────────────────────┤
│ [Footer]                                            │
└─────────────────────────────────────────────────────┘
```

### Components

#### Search & Filters Bar
```tsx
<SearchInput placeholder="Search venues by name or city..." />
<Select label="City">
  <option>All Cities</option>
  <option>Portland</option>
  <option>Seattle</option>
</Select>
<Select label="Venue Type">
  <option>All Types</option>
  <option>Café</option>
  <option>Gallery</option>
  <option>Restaurant</option>
</Select>
<Select label="Sort">
  <option>Newest First</option>
  <option>Most Active</option>
  <option>Alphabetical</option>
</Select>
```

#### Venue Card

```tsx
┌──────────────────────────┐
│  [Cover Image]           │ // aspect-ratio: 16/9
├──────────────────────────┤
│ Venue Name              ⭐│ // Title + featured badge
│ Portland, OR             │ // Location (MapPin icon)
│ Café • 3 wall spaces     │ // Type + capacity
│                          │
│ "Modern, minimalist..."  │ // Description (2 lines, truncate)
│                          │
│ [View Profile] [Invite]  │ // CTAs
└──────────────────────────┘

[Invite] button: artist-primary
[View Profile]: secondary
```

**Grid:**
- Desktop: 3 columns, gap: 24px
- Mobile: 1 column, gap: 16px

#### Empty State
```tsx
Icon: Building (neutral)
Title: "No venues found"
Description: "Try adjusting your filters"
CTA: "Clear Filters"
```

---

## 4. Invitations Inbox (`/artist/invitations`)

### Layout Structure

**Desktop:**
```
┌─────────────────────────────────────────────────────┐
│ [Navigation Bar]                                    │
├─────────────────────────────────────────────────────┤
│  Invitations                    [Filter: All ▾]    │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │ From: Brew & Palette Café        [2d ago]   │  │
│  │ "We'd love to display your work..."         │  │
│  │ Wall: Main Dining Area • 30 days            │  │
│  │ [Accept] [Decline] [View Details]           │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  [More invitation cards...]                         │
├─────────────────────────────────────────────────────┤
│ [Footer]                                            │
└─────────────────────────────────────────────────────┘
```

### Components

#### Tabs
```tsx
All | Pending | Accepted | Declined

Active tab: border-bottom: 2px solid artist-primary
```

#### Invitation Card

```tsx
┌────────────────────────────────────────────┐
│ From: [Venue Name]        [Timestamp]      │
│ [Venue Badge]                              │
│                                            │
│ Message: "[Invitation message preview...]" │
│                                            │
│ Wall Space: Main Dining Area               │
│ Duration: 30 days                          │
│ Install Window: Mon-Fri 10am-12pm          │
│                                            │
│ [Accept (green)] [Decline] [View Details]  │
└────────────────────────────────────────────┘

Pending: Border-left: 4px solid blue
Accepted: Border-left: 4px solid green
Declined: Border-left: 4px solid neutral
```

#### Empty State
```tsx
Icon: Mail (neutral)
Title: "No invitations"
Description: "Venues will send you invitations to display your artwork"
CTA: "Browse Venues"
```

---

## 5. Artist Profile (`/artist/profile`)

### Layout Structure

**Desktop:**
```
┌─────────────────────────────────────────────────────┐
│ [Navigation Bar]                                    │
├─────────────────────────────────────────────────────┤
│  ┌────────────┐  Sarah Chen                        │
│  │  [Avatar]  │  Artist • Portland, OR             │
│  │   (120px)  │  Member since June 2023            │
│  └────────────┘  [Edit Profile]                    │
│                                                      │
│  About                                              │
│  ┌──────────────────────────────────────────────┐  │
│  │ "Contemporary artist focusing on urban..."   │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  Portfolio (24 artworks)                            │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐              │
│  │ Art  │ │ Art  │ │ Art  │ │ Art  │              │
│  └──────┘ └──────┘ └──────┘ └──────┘              │
├─────────────────────────────────────────────────────┤
│ [Footer]                                            │
└─────────────────────────────────────────────────────┘
```

### Components

#### Profile Header

```tsx
┌────────────┐  Sarah Chen
│  Avatar    │  Artist Badge (blue)
│  120x120   │  Portland, OR (MapPin icon)
│  (rounded) │  Member since June 2023 (Calendar icon)
└────────────┘  
               [Edit Profile] button (secondary)

Desktop: flex row, gap: 24px
Mobile: flex column, avatar centered, text centered
```

#### Stats Row
```tsx
Grid: 3 columns desktop, 3 columns mobile (smaller)

┌──────────┐ ┌──────────┐ ┌──────────┐
│    24    │ │    3     │ │  $2,450  │
│ Artworks │ │ Displays │ │  Sales   │
└──────────┘ └──────────┘ └──────────┘
```

#### About Section
```tsx
<h3>About</h3>
<p>{bio}</p> // Max 500 chars, text-base

[Empty: "Add a bio to tell venues about your work"]
```

#### Portfolio Grid
```tsx
<h3>Portfolio ({artworkCount} artworks)</h3>

Grid: 4 columns desktop, 2 columns mobile
[Same artwork cards as "My Artworks" page]
```

---

## 6. Sales Dashboard (`/artist/sales`)

### Layout Structure

**Desktop:**
```
┌─────────────────────────────────────────────────────┐
│ [Navigation Bar]                                    │
├─────────────────────────────────────────────────────┤
│  Sales                        [Date Range Filter]   │
│                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  Total   │ │  This    │ │ Artist   │           │
│  │  Sales   │ │  Month   │ │ Earnings │           │
│  └──────────┘ └──────────┘ └──────────┘           │
│                                                      │
│  Transactions                                       │
│  ┌──────────────────────────────────────────────┐  │
│  │ [Table: Date | Artwork | Buyer | Amount]     │  │
│  │                                               │  │
│  └──────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│ [Footer]                                            │
└─────────────────────────────────────────────────────┘
```

### Components

#### Summary Cards
```tsx
Total Sales: "$2,450" (large, green)
This Month: "$850" (+18% vs last month)
Artist Earnings: "$1,960" (80% after fees)
```

#### Transactions Table

**Columns:**
- Date (MM/DD/YYYY)
- Artwork (thumbnail + name)
- Venue
- Amount ($)
- Your Earnings (80%)
- Status (badge)

**Desktop:** Full table
**Mobile:** Card-based list

**Row Actions:** "View Receipt" button

#### Empty State
```tsx
Icon: DollarSign
Title: "No sales yet"
Description: "Sales will appear here once customers purchase your artwork"
```

---

## 7. Applications (`/artist/applications`)

### Layout Structure

Similar to Invitations, but shows applications the artist submitted.

### Components

#### Tabs
```tsx
All | Pending | Accepted | Rejected
```

#### Application Card

```tsx
┌────────────────────────────────────────────┐
│ Applied to: [Venue Name]    [Timestamp]    │
│ [Venue Badge]                              │
│                                            │
│ Artwork: "Urban Sunset"                    │
│ Status: Pending Review (orange badge)      │
│                                            │
│ [View Details] [Withdraw Application]      │
└────────────────────────────────────────────┘

Status Colors:
- Pending: Orange
- Accepted: Green
- Rejected: Red
```

---

## Mobile-Specific Patterns

### Bottom Sheet for Filters (Mobile)
When "Filters" button clicked, slide up bottom sheet with filter controls.

### Card Actions (Mobile)
Use overflow menu (•••) for secondary actions to save space.

### Sticky CTAs (Mobile)
On detail pages, sticky bottom bar with primary CTA:
```tsx
position: fixed
bottom: 0
width: 100%
padding: 16px
background: var(--surface)
border-top: 1px solid var(--border-subtle)
box-shadow: var(--shadow-lg)

[Primary CTA Button - Full width]
```

---

## Responsive Breakpoints

```css
/* Mobile first */
.grid {
  grid-template-columns: 1fr;
  gap: 16px;
}

/* Tablet (768px+) */
@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
}

/* Desktop (1280px+) */
@media (min-width: 1280px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }
}

/* Wide (artwork grid 4 cols) */
@media (min-width: 1280px) {
  .artwork-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

---

## Dark Mode Examples

### Artist Dashboard (Dark)
```css
Background: #171717 (neutral-900)
KPI Cards: #262626 (neutral-800), border: #404040
Text Primary: #FAFAFA (neutral-50)
Text Secondary: #D4D4D4 (neutral-300)
Artist Blue Badge: #3B82F6 bg, #DBEAFE text (adjusted for contrast)
```

### Artwork Card (Dark)
```css
Card background: #262626
Border: #404040
Image: No change (images work in both modes)
Title: #FAFAFA
Price: #22C55E (green, adjusted)
Available badge: #1E3A8A bg (blue-900), #60A5FA text (blue-400)
```

---

All artist screens follow these specifications with consistent component usage, spacing, and responsive behavior across light and dark modes.
