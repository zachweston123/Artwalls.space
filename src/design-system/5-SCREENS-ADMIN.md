# Artwalls - Admin Console Screen Specifications

## Desktop Breakpoint: 1280px | Mobile Breakpoint: 390px

**Note:** Admin console is optimized for desktop use (internal staff tool). Mobile support is functional but desktop is primary.

---

## Layout Pattern (All Admin Screens)

### Desktop Layout
```
┌────────┬────────────────────────────────────────────┐
│        │                                            │
│ Admin  │  [Page Content]                            │
│ Side   │                                            │
│ bar    │                                            │
│ (256px)│                                            │
│        │                                            │
│        │                                            │
└────────┴────────────────────────────────────────────┘
```

**Sidebar:** Fixed left, 256px wide, full height
**Content:** Scrollable, padding: 32px

### Mobile Layout
```
┌─────────────────────┐
│ [Top Nav Bar]       │
│ ☰ Menu              │
├─────────────────────┤
│                     │
│ [Page Content]      │
│                     │
│                     │
└─────────────────────┘
```

**Sidebar:** Collapsible drawer (slide from left)
**Content:** Full width, padding: 16px

---

## Admin Sidebar Component

### Structure

```tsx
┌─────────────────────────┐
│ ┌──┐ Admin Console      │ // Admin badge section
│ │ 🛡│ Internal          │
│ └──┘                    │
├─────────────────────────┤
│ 📊 Dashboard            │ // Navigation items
│ 👥 Users                │
│ 🛒 Orders & Payments    │
│ 📢 Announcements        │
│ 🏷️  Promo Codes         │
│ 📜 Activity Log         │
│ ⚙️  Settings            │
├─────────────────────────┤
│ ┌──┐ Admin User         │ // User info at bottom
│ │AU│ admin@artwalls.com │
│ └──┘                    │
└─────────────────────────┘
```

### Sidebar Item States

```tsx
// Default
background: transparent
color: var(--text-secondary)
padding: 12px 16px
margin: 0 12px
border-radius: 8px

// Hover
background: var(--surface-elevated)
color: var(--text-primary)

// Active
background: var(--interactive-default) // Black
color: var(--text-inverse) // White

// Focus
outline: 2px solid var(--focus-ring)
outline-offset: -2px
```

**Icons:** 20px, left-aligned with 12px gap to text

---

## 1. Admin Dashboard (`/admin/dashboard`)

### Layout

```
┌─────────────────────────────────────────────────────┐
│ Dashboard                                           │
│ Overview of platform metrics and recent activity    │
│                                                      │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │
│ │Artists│ │Venues│ │Active│ │Pend. │ │  GMV │      │
│ │ 1,247 │ │  387 │ │ Disp.│ │Invite│ │$48.3k│      │
│ └──────┘ └──────┘ │  542 │ │  23  │ └──────┘      │
│                    └──────┘ └──────┘               │
│ ┌──────┐ ┌──────┐                                  │
│ │ Rev. │ │Suppor│                                  │
│ │$4.8k │ │Queue7│                                  │
│ └──────┘ └──────┘                                  │
│                                                      │
│ Quick Actions                                       │
│ [Create Announcement] [Create Promo] [Search User]  │
│                                                      │
│ ┌─────────────────────────┐ ┌──────────────────┐   │
│ │ Recent Activity (List)  │ │ System Status    │   │
│ │                         │ │                  │   │
│ │                         │ │ ✓ Stripe OK      │   │
│ │                         │ │ ✓ Supabase OK    │   │
│ │                         │ │ ✓ Email OK       │   │
│ └─────────────────────────┘ └──────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Components

#### KPI Cards (7 cards)

**Grid:** 4 columns on desktop (wraps to 3-2 layout), 1-2 columns on tablet, 1 column on mobile

**Card Structure:**
```tsx
┌─────────────────────────┐
│ ┌────┐                  │ // Color-coded icon circle
│ │ 👥 │  Total Artists   │
│ └────┘  1,247           │ // Large value
│         +32 this month  │ // Delta text
└─────────────────────────┘

Colors (Icon Backgrounds):
- Artists: blue-100 (light) / blue-900 (dark)
- Venues: green-100 / green-900
- Active Displays: purple-100 / purple-900
- Pending Invites: orange-100 / orange-900
- GMV: emerald-100 / emerald-900
- Revenue: cyan-100 / cyan-900
- Support Queue: red-100 / red-900 (if > 0)
```

#### Quick Actions (3 buttons)

```tsx
┌─────────────────────────────────────────┐
│ [+ Create Announcement] (neutral-900)   │
│ [+ Create Promo Code] (neutral-900)     │
│ [🔍 Search User] (neutral-900)          │
└─────────────────────────────────────────┘

Layout: Grid 3 columns desktop, stack mobile
Style: Secondary button variant
```

#### Recent Activity Panel

```tsx
┌──────────────────────────────────────┐
│ Recent Activity                      │
│                                      │
│ ✓ Payment completed: "Urban Sunset"  │ // Green icon
│   Sarah Chen • 5 min ago             │
│                                      │
│ ℹ️ New venue: The Artisan Lounge    │ // Blue icon
│   Michael Torres • 32 min ago        │
│                                      │
│ ⚠️ Dispute opened: Damaged artwork  │ // Orange icon
│   Emma Liu • 1 hour ago              │
│                                      │
│ [View all activity →]                │
└──────────────────────────────────────┘

Height: ~400px, scrollable
```

#### System Status Panel

```tsx
┌──────────────────────┐
│ System Status        │
│                      │
│ ✓ Stripe Webhooks    │
│   Operational        │
│   Last: 2 min ago    │
│                      │
│ ✓ Supabase Database  │
│   Operational        │
│   Last: 1 min ago    │
│                      │
│ ✓ Email Delivery     │
│   Operational        │
│   Last: 5 min ago    │
└──────────────────────┘

Status Badges:
- Operational: green-100 bg
- Degraded: orange-100 bg
- Outage: red-100 bg
```

---

## 2. Users List (`/admin/users`)

### Layout

```
┌─────────────────────────────────────────────────────┐
│ Users                                               │
│ Manage and support platform users                  │
│                                                      │
│ ┌──────────────────────────────────────┐           │
│ │ 🔍 Search users...    [Filters ▼][⬇]│           │
│ └──────────────────────────────────────┘           │
│                                                      │
│ [Filter Panel - Collapsible]                        │
│ Role: [All ▾] Plan: [All ▾] Status: [All ▾]        │
│ City: [All ▾] Agreement: [All ▾]                    │
│ [Clear Filters]                                     │
│                                                      │
│ 1,634 users found                                   │
│                                                      │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Name    │ Role │ Email │ Plan │ Status │ Actions││ │
│ ├─────────────────────────────────────────────────┤ │
│ │ Sarah   │Artist│sarah@ │Growth│Active  │View    ││ │
│ │ Brew&P. │Venue │owner@ │Pro   │Active  │View    ││ │
│ │ Marcus  │Artist│marcus@│Start │Active  │View    ││ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Components

#### Search & Filters Bar

```tsx
┌────────────────────────────────────────┐
│ 🔍 [Search by name, email, ID...]     │ // Full-width input
│ [Filters (Active)] [Export CSV]        │ // Buttons right-aligned
└────────────────────────────────────────┘

Filters button shows badge if filters active
```

#### Filter Panel (Collapsible)

```tsx
Grid: 5 columns on desktop, stack on mobile

[Role Dropdown] [Plan Dropdown] [Status Dropdown]
[City Dropdown] [Agreement Dropdown]

[Clear all filters] (text link, left-aligned)
```

#### Users Table

**Columns:**
1. Name (text + avatar)
2. Role (badge: Artist=blue, Venue=green)
3. Email
4. Plan (badge: color-coded)
5. Status (badge: Active=green, Suspended=red)
6. Last Active (relative time)
7. Actions (View, Suspend/Unsuspend)

**Row Hover:** background: surface-elevated

**Desktop:** Full table with all columns
**Mobile:** Card-based list with key info

#### Table Empty State

```tsx
┌─────────────────────────┐
│    👥 (80px icon)       │
│                         │
│ No users found          │
│ Try adjusting filters   │
│                         │
│ [Clear Filters]         │
└─────────────────────────┘
```

#### Loading State

```tsx
[Skeleton rows × 10]
Each row: Avatar circle + 4 text lines
```

---

## 3. User Detail (`/admin/users/:id`)

### Layout

```
┌─────────────────────────────────────────────────────┐
│ ← Back to Users                                     │
│                                                      │
│ Sarah Chen                                          │
│ [Artist Badge] [Growth Plan] [Active]               │
│ [Suspend] [Force Logout] [Reset Password]           │
│                                                      │
│ [Overview] [Placements] [Orders] [Subscriptions]    │
│ [Notes]                                             │
├─────────────────────────────────────────────────────┤
│ [Tab Content]                                       │
│                                                      │
│ [Identity Card]                                     │
│ [Stats Cards]                                       │
│ [Action Panels]                                     │
└─────────────────────────────────────────────────────┘
```

### Components

#### Page Header

```tsx
← Back to Users (link, text-secondary)

Sarah Chen (h1, text-4xl)
[Artist Badge] [Growth Badge] [Active Badge]

Actions Row (right-aligned on desktop):
[Suspend] (red) [Force Logout] (neutral) [Reset Password] (neutral)
```

#### Tabs

```tsx
[Overview] [Placements] [Orders] [Subscriptions] [Notes]

Active tab: border-bottom: 2px solid neutral-900
Icon + label for each tab (20px icons)
```

#### Overview Tab

**Identity Card:**
```tsx
┌────────────────────────────────────────┐
│ Identity                               │
│                                        │
│ 👤 Name: Sarah Chen                    │
│ ✉️  Email: sarah.chen@example.com      │
│ 📍 City: Portland, OR                  │
│ 📅 Member Since: Jun 15, 2023          │
│ ✓  Agreement: Accepted Jun 15, 2023   │
└────────────────────────────────────────┘
```

**Stats Grid (for Artists):**
```tsx
┌─────────┐ ┌─────────┐ ┌─────────┐
│    24   │ │    3    │ │    2    │
│Artworks │ │ Active  │ │Protected│
│         │ │Displays │ │Artworks │
└─────────┘ └─────────┘ └─────────┘
```

**Stats Grid (for Venues):**
```tsx
┌─────────┐ ┌─────────┐ ┌─────────┐
│    3    │ │    2    │ │    5    │
│  Walls  │ │ Current │ │  Sales  │
│         │ │ Artists │ │         │
└─────────┘ └─────────┘ └─────────┘
```

#### Placements Tab

**Table:**
- Artwork (image + name)
- Venue
- Status (badge)
- Install Date
- End Date
- Duration
- Protection (On/Off)
- Actions (View)

#### Orders Tab

**Table:**
- Order ID (monospace)
- Artwork
- Amount
- Status (badge)
- Stripe Session ID (masked)
- Date
- Actions (Details)

#### Subscriptions Tab

```tsx
┌────────────────────────────────────────┐
│ Current Plan                           │
│                                        │
│ Tier: Growth                           │
│ Stripe Status: Active (green badge)   │
│                                        │
│ [Open Stripe Customer] (primary)       │
│ [Cancel Subscription] (danger)         │
└────────────────────────────────────────┘
```

#### Notes Tab

**Add Note Composer:**
```tsx
┌────────────────────────────────────────┐
│ Add Internal Note                      │
│                                        │
│ Tag: [Support ▾]                       │
│ [Textarea: "Add note..."]              │
│                                        │
│ [Save Note]                            │
└────────────────────────────────────────┘
```

**Notes Timeline:**
```tsx
┌────────────────────────────────────────┐
│ Notes History                          │
│                                        │
│ Admin User • Support • 2024-01-15      │
│ "User reported upload issue. Resolved  │
│  by clearing cache."                   │
│                                        │
│ [Previous notes...]                    │
└────────────────────────────────────────┘
```

---

## 4. Orders & Payments (`/admin/orders`)

### Layout

```
┌─────────────────────────────────────────────────────┐
│ Orders & Payments                                   │
│ Transaction management and troubleshooting          │
│                                                      │
│ Filters: [Status ▾] [Date Range] [Amount Range]    │
│                                                      │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Order ID │ Artwork │ Artist │ Venue │ Amount... ││ │
│ ├─────────────────────────────────────────────────┤ │
│ │ ord_123  │ Urban..│ Sarah  │ Brew  │ $850      ││ │
│ │ ord_456  │ City.. │ Marcus │ Artis │ $1,200    ││ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Components

#### Filters Row

```tsx
[Status Dropdown] [Date Range Picker] [Amount Range]
[Apply Filters] [Clear]
```

#### Orders Table

**Columns:**
- Order ID (monospace, clickable)
- Artwork (thumbnail + name)
- Buyer Email (if stored)
- Artist
- Venue
- Amount
- Platform Fee
- Status (badge: Paid, Failed, Refunded)
- Created At
- Actions (View Details)

**Click Row:** Opens order detail drawer (slide from right)

#### Order Detail Drawer

```tsx
┌──────────────────────────────────┐
│ [X] Order Details                │
│                                  │
│ Order #ord_123456                │
│ Status: Paid ✓                   │
│                                  │
│ Artwork: "Urban Sunset"          │
│ Artist: Sarah Chen               │
│ Venue: Brew & Palette            │
│ Buyer: customer@example.com      │
│                                  │
│ Amount: $850.00                  │
│ Platform Fee: $85.00 (10%)       │
│ Artist Earnings: $680.00 (80%)   │
│ Venue Commission: $85.00 (10%)   │
│                                  │
│ Timeline:                        │
│ • Created: Jan 15, 10:32 AM      │
│ • Checkout started: 10:33 AM     │
│ • Paid: 10:35 AM                 │
│ • Webhook received: 10:35 AM     │
│                                  │
│ Stripe Details:                  │
│ Session: cs_test_a1b2c3...       │
│ Payment Method: •••• 4242        │
│                                  │
│ [Open in Stripe] [Refund]        │
└──────────────────────────────────┘
```

---

## 5. Announcements (`/admin/announcements`)

### Layout

```
┌─────────────────────────────────────────────────────┐
│ Announcements              [+ Create Announcement]  │
│ Manage global and role-targeted announcements       │
│                                                      │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Title │ Audience │ Type │ Status │ Dates │ ...  ││ │
│ ├─────────────────────────────────────────────────┤ │
│ │ New Protection Plan │ Artists │ Banner │ Active││ │
│ │ System Maintenance  │ All     │ Notif  │Schedu││ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Components

#### Announcements Table

**Columns:**
- Title
- Audience (badge: All=neutral, Artists=blue, Venues=green)
- Type (Banner, Notification, Modal)
- Status (Scheduled=orange, Active=green, Expired=neutral)
- Start Date
- End Date
- Created By
- Actions (View, Edit, Delete icons)

**Row Actions:**
- 👁️ View (preview)
- ✏️ Edit
- 🗑️ Delete (with confirmation)

#### Create Announcement Modal

```tsx
┌────────────────────────────────────────┐
│ [X] Create Announcement                │
│                                        │
│ Title:                                 │
│ [Input]                                │
│                                        │
│ Body:                                  │
│ [Textarea]                             │
│                                        │
│ Audience:                              │
│ ( ) All  (•) Artists  ( ) Venues       │
│                                        │
│ Type:                                  │
│ (•) Banner  ( ) Notification           │
│                                        │
│ Schedule:                              │
│ Start: [Date/Time Picker]              │
│ End: [Date/Time Picker] (optional)     │
│                                        │
│ Preview:                               │
│ [Banner preview component]             │
│                                        │
│ [Save as Draft] [Publish]              │
└────────────────────────────────────────┘
```

---

## 6. Promo Codes (`/admin/promo-codes`)

### Layout

```
┌─────────────────────────────────────────────────────┐
│ Promo Codes                [+ Create Promo Code]    │
│ Create and manage subscription discount codes       │
│                                                      │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Code │ Discount │ Duration │ Redeemed │ Status ││ │
│ ├─────────────────────────────────────────────────┤ │
│ │ WELCOME15 │ 15% off │ Once │ 47/100 │ Active  ││ │
│ │ SUMMER2024│ $10 off │ 3mo  │ 12/∞   │ Active  ││ │
│ │ LAUNCH50  │ 50% off │Forever│ 50/50 │ Inactive││ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Components

#### Promo Codes Table

**Columns:**
- Code (monospace, with copy icon)
- Discount (% or $)
- Duration (Once, N months, Forever)
- Max Redemptions (or ∞)
- Redeemed Count (progress: 47/100)
- Expires (date or "Never")
- Status (Active=green, Inactive=neutral)
- Actions (View, Deactivate)

#### Create Promo Code Modal

```tsx
┌────────────────────────────────────────┐
│ [X] Create Promo Code                  │
│                                        │
│ Code: (uppercase)                      │
│ [WELCOME15]                            │
│                                        │
│ Discount Type:                         │
│ (•) % off  ( ) $ off                   │
│                                        │
│ Discount Amount:                       │
│ [15] %                                 │
│                                        │
│ Duration:                              │
│ (•) Once  ( ) Repeating  ( ) Forever   │
│ Months: [__] (if repeating)            │
│                                        │
│ Applies To:                            │
│ ☑ Starter  ☑ Growth  ☑ Pro             │
│                                        │
│ Max Redemptions: (optional)            │
│ [100]                                  │
│                                        │
│ Expiration: (optional)                 │
│ [Date Picker]                          │
│                                        │
│ ☑ New customers only                   │
│                                        │
│ Internal Note:                         │
│ [Textarea]                             │
│                                        │
│ [Create Promo Code]                    │
│                                        │
│ ⚠️ This creates a Stripe promo code    │
└────────────────────────────────────────┘
```

---

## 7. Activity Log (`/admin/activity-log`)

### Layout

```
┌─────────────────────────────────────────────────────┐
│ Activity Log                                        │
│ Audit trail of all admin actions                   │
│                                                      │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Timestamp │ Admin │ Action │ Target │ Details   ││ │
│ ├─────────────────────────────────────────────────┤ │
│ │ 2024-01-22│ admin@│ Created│WELCOME │15% off... ││ │
│ │  14:32:15 │ ...   │ promo  │   15   │           ││ │
│ │ 2024-01-22│ admin@│Publishd│New Pro │Targeted..││ │
│ │  13:15:42 │ ...   │announce│tection │           ││ │
│ └─────────────────────────────────────────────────┘ │
│                                                      │
│ Showing 1-25 of 247 [Previous] [Next]              │
└─────────────────────────────────────────────────────┘
```

### Components

#### Activity Log Table

**Columns:**
- Timestamp (monospace, YYYY-MM-DD HH:MM:SS)
- Admin User (email)
- Action (color-coded text)
- Target (entity affected)
- Details (summary)
- Actions (View)

**Action Color Coding:**
- Create/Publish: green
- Suspend/Delete: red
- Deactivate: orange
- Update/Edit: blue

**Pagination:**
Bottom of table, centered:
[Previous] 1 2 3 ... 10 [Next]

---

## Admin-Specific Patterns

### Neutral Color Scheme
Admin uses neutral (black/white) accent instead of role colors:
- Primary actions: neutral-900 bg (black)
- Hover: neutral-700
- Active: neutral-800

### Role Badges Preserved
When showing user roles:
- Artist badge: Still blue
- Venue badge: Still green
- Admin badge: Neutral (shield icon)

### Danger Actions
Destructive admin actions (Suspend, Delete, Cancel):
- Color: red-600
- Require confirmation modal
- Log to activity log

### System Fonts
Admin uses monospace font for:
- Order IDs
- Promo codes
- Timestamps
- Stripe session IDs

---

## Mobile Admin (Simplified)

### Navigation
Hamburger menu with drawer (same sidebar items)

### Tables
Convert to cards:
```tsx
┌────────────────────────┐
│ Sarah Chen             │
│ Artist • Growth        │
│ sarah.chen@example.com │
│ Active                 │
│ [View] [Actions ▾]     │
└────────────────────────┘
```

### Forms
Stack all fields vertically
Use bottom sheet for pickers

---

## Dark Mode (Admin)

Admin dark mode uses same token system:

```css
Background: #171717 (neutral-900)
Sidebar: #262626 (neutral-800)
Cards: #262626
Borders: #404040
Text Primary: #FAFAFA
Text Secondary: #D4D4D4

Primary Button (black in light, white in dark):
Light: bg-neutral-900, text-white
Dark: bg-neutral-100, text-neutral-900

KPI Icon Backgrounds (adjusted for dark):
Blue: #1E3A8A bg, #60A5FA icon
Green: #14532D bg, #4ADE80 icon
Red: #7F1D1D bg, #EF4444 icon
```

---

All admin screens prioritize clarity, efficiency, and auditability for internal staff use while maintaining accessibility and responsive behavior.
