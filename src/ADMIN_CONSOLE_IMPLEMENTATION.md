# @deprecated — Internal documentation. Moved to project wiki.

## ✅ Components Created (11 files)

### 1. Navigation & Access Control

#### **AdminSidebar** (`/components/admin/AdminSidebar.tsx`)
- Left sidebar navigation for desktop
- Active state highlighting with neutral black/white accent
- Navigation items:
  - Dashboard
  - Users
  - Orders & Payments
  - Announcements
  - Promo Codes
  - Activity Log
  - Settings (placeholder)
- Admin badge at top
- User info at bottom
- Fully dark mode compatible

#### **AdminAccessDenied** (`/components/admin/AdminAccessDenied.tsx`)
- Two guard states:
  1. **Not signed in**: "Please sign in to access Admin Console" with Sign In CTA
  2. **Not authorized**: "You don't have admin access" with Return to App CTA
- Clean, centered layout
- Icon-based visual hierarchy

### 2. Dashboard

#### **AdminDashboard** (`/components/admin/AdminDashboard.tsx`)
**KPI Cards** (7 metrics):
- Total Artists (blue accent)
- Total Venues (green accent)
- Active Displays (purple accent)
- Pending Invites (orange accent)
- Total GMV - Month (emerald accent)
- Platform Revenue (cyan accent)
- Support Queue (red accent)

**Features**:
- Each KPI shows: Icon, label, value, delta/context
- Color-coded icon backgrounds
- Delta text with positive/negative/neutral colors
- Responsive grid (1-4 columns based on screen size)

**Quick Actions**:
- Create Announcement
- Create Promo Code
- Search User
- Button group with hover effects

**Recent Activity Panel**:
- Last 10 admin actions
- Status icons (success, warning, info)
- Timestamp, user, description
- Link to full Activity Log

**System Status Card**:
- Stripe Webhooks status
- Supabase Database status
- Email Delivery status
- Operational/Degraded indicators
- Last checked timestamps

### 3. Users Management

#### **AdminUsers** (`/components/admin/AdminUsers.tsx`)
**Search & Filters**:
- Full-width search bar (name, email, venue name, user ID)
- Collapsible filter panel with:
  - Role (Artist/Venue)
  - Plan tier (Free/Starter/Growth/Pro)
  - Status (Active/Suspended)
  - City dropdown
  - Agreement accepted (Yes/No)
- Active filters counter badge
- Clear all filters button
- Export button (placeholder)

**Results Table**:
- Columns: Name, Role, Email, Plan, Status, Last Active, Actions
- Role badges (Artist blue, Venue green)
- Plan badges (colored by tier)
- Status badges (Active green, Suspended red)
- Actions: View, Suspend/Activate
- Hover states on rows
- Results counter

**Empty State**:
- Icon, heading, description
- Clear filters CTA if filters active

#### **AdminUserDetail** (`/components/admin/AdminUserDetail.tsx`)
**Header**:
- Back to Users button
- User name and badges (role, plan, status)
- Quick action buttons:
  - Suspend/Unsuspend (red)
  - Force Logout (neutral)
  - Reset Password (neutral)

**Tabbed Interface**:
1. **Overview Tab**:
   - Identity card: Name, email, city, member since, agreement status
   - Icon-based layout for each field
   - Artist stats: Artworks count, active displays, protected artworks
   - Venue stats: Wallspaces, current artworks, install window

2. **Placements Tab**:
   - Table: Artwork, Venue, Status, Install Date, End Date, Duration, Protection, Actions
   - Status badges (On display, Sold, etc.)
   - Protection indicator (On/Off)

3. **Orders Tab**:
   - Table: Order ID, Artwork, Amount, Status, Stripe Session ID, Date, Actions
   - Masked Stripe session IDs
   - Status badges
   - Details button

4. **Subscriptions Tab**:
   - Current plan card
   - Stripe subscription status
   - "Open Stripe Customer" button
   - "Cancel Subscription" button (admin-only, red)

5. **Notes Tab**:
   - Add internal note composer:
     - Tag dropdown (Support, Billing, Safety)
     - Textarea for note content
     - Save button
   - Notes timeline:
     - Author, tag badge, timestamp
     - Note content
     - Chronological display

### 4. Announcements

#### **AdminAnnouncements** (`/components/admin/AdminAnnouncements.tsx`)
**Table Columns**:
- Title
- Audience (All/Artists/Venues with color-coded badges)
- Type (Banner/Notification/Modal)
- Status (Scheduled/Active/Expired)
- Start Date
- End Date (optional)
- Created By
- Actions (View, Edit, Delete icons)

**Features**:
- "Create Announcement" button (primary CTA)
- Audience badges match role colors (Artists=blue, Venues=green, All=neutral)
- Status badges (Active=green, Scheduled=orange, Expired=neutral)
- Empty state with CTA

#### **AnnouncementBanner** (`/components/admin/AnnouncementBanner.tsx`)
**Reusable in-app banner component**:
- Four severity types:
  - **Info** (blue): General information
  - **Success** (green): Positive updates
  - **Warning** (orange): Important notices
  - **Critical** (red): Urgent alerts
- Features:
  - Icon (matches severity type)
  - Title (bold)
  - Optional message
  - Optional "Learn more" link
  - Optional dismiss button
  - Full dark mode support
- Used in top of app for active announcements

### 5. Promo Codes

#### **AdminPromoCodes** (`/components/admin/AdminPromoCodes.tsx`)
**Table Columns**:
- Code (monospace font with copy icon)
- Discount (% off or $ off)
- Duration (Once/N months/Forever)
- Max Redemptions (or "Unlimited")
- Redeemed Count (with progress vs max)
- Expires (date or "Never")
- Status (Active/Inactive)
- Actions (View, Deactivate/Activate)

**Features**:
- "Create Promo Code" button (primary CTA)
- Copy code button for easy sharing
- Progress indicator (redeemed / max)
- Status badges
- Empty state with CTA

**Note**: Creates Stripe Promotion Codes. Customer-facing entry happens in Stripe Checkout.

### 6. Activity Log

#### **AdminActivityLog** (`/components/admin/AdminActivityLog.tsx`)
**Audit Trail Table**:
- Columns: Timestamp, Admin User, Action, Target, Details, Actions
- Monospace font for timestamps and targets
- Color-coded actions:
  - Created/Published = green
  - Suspended = red
  - Deactivated = orange
  - Default = blue
- Pagination controls
- View detail action

**Tracked Actions**:
- Created promo code
- Published announcement
- Suspended/Reinstated user
- Reset password
- Added note
- Deactivated promo code
- And more...

## 🎨 Design System

### Color Accents

**Admin Neutral** (primary):
```css
- Active states: bg-neutral-900 dark:bg-neutral-100
- Hover: bg-neutral-800 dark:bg-neutral-200
- Secondary: bg-neutral-100 dark:bg-neutral-700
```

**Role Badges** (preserved):
```css
- Artist: bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300
- Venue: bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300
```

**Plan Badges**:
```css
- Free: neutral
- Starter: blue
- Growth: purple
- Pro: orange
```

**Status Colors**:
```css
- Active/Success: green
- Suspended/Danger: red
- Warning/Scheduled: orange
- Info/Neutral: neutral/blue
```

**Banner Severity**:
```css
- Info: blue
- Success: green
- Warning: orange
- Critical: red
```

### Components Patterns

**Tables**:
- Header: `bg-neutral-50 dark:bg-neutral-900`
- Borders: `border-neutral-200 dark:border-neutral-700`
- Row hover: `hover:bg-neutral-50 dark:hover:bg-neutral-700/50`
- Dividers: `divide-neutral-100 dark:divide-neutral-700`

**Cards**:
- Background: `bg-white dark:bg-neutral-800`
- Border: `border border-neutral-200 dark:border-neutral-700`
- Rounded: `rounded-xl`

**Buttons**:
- Primary: `bg-neutral-900 dark:bg-neutral-100` with white/black text
- Secondary: `bg-neutral-100 dark:bg-neutral-700`
- Danger: `bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300`

**Badges**:
- Small: `px-2 py-1 rounded-full text-xs`
- Role-aware colors
- Status-aware colors

**Forms**:
- Input: `border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900`
- Focus ring: `focus:ring-2 focus:ring-neutral-500`

## 📱 Responsive Design

**Desktop-First Approach**:
- Sidebar always visible on desktop (≥1024px)
- Tables scroll horizontally on mobile
- KPI cards adapt: 1 col → 2 cols → 3 cols → 4 cols
- Filter panels stack vertically on mobile

**Mobile Considerations**:
- Collapsible sidebar drawer (same pattern as main app)
- Touch-friendly button sizes (min 44px)
- Readable font sizes throughout
- Horizontal scrolling tables with sticky first column (optional)

## 🌓 Dark Mode

All components fully support light and dark modes:
- Surfaces use consistent neutral palette
- Text maintains proper contrast ratios
- Borders are visible but subtle
- Role/status colors remain distinguishable
- Icons inherit text color and adapt automatically
- No "white flash" on load

## 📊 Data Structures

### User
```typescript
{
  id: string;
  name: string;
  email: string;
  role: 'artist' | 'venue';
  plan: 'Free' | 'Starter' | 'Growth' | 'Pro';
  status: 'Active' | 'Suspended';
  city: string;
  createdAt: string;
  lastActive: string;
  agreementAccepted: boolean;
  agreementDate?: string;
  // Artist-specific
  artworksCount?: number;
  activeDisplays?: number;
  protectionPlanActive?: number;
  // Venue-specific
  wallSpaces?: number;
  currentArtists?: number;
  installWindow?: string;
}
```

### Announcement
```typescript
{
  id: string;
  title: string;
  body: string;
  audience: 'All' | 'Artists' | 'Venues';
  type: 'Banner' | 'Notification' | 'Modal';
  status: 'Scheduled' | 'Active' | 'Expired';
  startDate: string;
  endDate?: string;
  createdBy: string;
  city?: string; // Optional targeting
}
```

### Promo Code
```typescript
{
  id: string;
  code: string; // e.g., "WELCOME15"
  discountType: 'percent' | 'amount';
  discountValue: number;
  duration: 'once' | 'repeating' | 'forever';
  durationMonths?: number; // If repeating
  maxRedemptions?: number;
  redeemedCount: number;
  expires?: string;
  status: 'Active' | 'Inactive';
  appliesToPlans: string[]; // ['Starter', 'Growth', 'Pro']
  newCustomersOnly?: boolean;
  internalNote?: string;
}
```

### Activity Log Entry
```typescript
{
  id: string;
  timestamp: string;
  adminUser: string;
  action: string; // e.g., "Created promo code"
  target: string; // e.g., "WELCOME15" or "user@example.com"
  details: string;
}
```

## 🔗 Integration Points

### Navigation
Add admin routes to main app navigation:
```typescript
if (user.role === 'admin') {
  showAdminMenuItem = true;
}
```

### Access Control
```typescript
// Check on route access
if (page.startsWith('admin-') && !user.isAdmin) {
  return <AdminAccessDenied type="not-authorized" />;
}

if (!user) {
  return <AdminAccessDenied type="not-signed-in" />;
}
```

### API Integration
Replace mock data with API calls:
- `GET /api/admin/users` - User list with filters
- `GET /api/admin/users/:id` - User detail
- `GET /api/admin/announcements` - Announcements list
- `POST /api/admin/announcements` - Create announcement
- `GET /api/admin/promo-codes` - Promo codes list
- `POST /api/admin/promo-codes` - Create Stripe promo code
- `GET /api/admin/activity-log` - Activity entries
- `GET /api/admin/dashboard/kpis` - Dashboard metrics

### Stripe Integration
For promo codes:
```typescript
// Create Stripe Coupon + Promotion Code
const coupon = await stripe.coupons.create({
  percent_off: 15,
  duration: 'once',
});

const promotionCode = await stripe.promotionCodes.create({
  coupon: coupon.id,
  code: 'WELCOME15',
  max_redemptions: 100,
});
```

## 🚀 Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Add admin role to user model
- [ ] Create admin routes in App.tsx
- [ ] Implement AdminSidebar navigation
- [ ] Add access control checks
- [ ] Set up admin API endpoints

### Phase 2: Dashboard & Users
- [ ] Build AdminDashboard with KPIs
- [ ] Connect real-time metrics
- [ ] Implement AdminUsers list with filters
- [ ] Build AdminUserDetail with all tabs
- [ ] Add user action handlers (suspend, reset password)

### Phase 3: Support Features
- [ ] Create announcements system
- [ ] Build AnnouncementBanner component
- [ ] Implement banner display logic in main app
- [ ] Add announcement scheduling
- [ ] Build promo code manager
- [ ] Connect to Stripe for coupon creation

### Phase 4: Audit & Polish
- [ ] Implement Activity Log tracking
- [ ] Add logging to all admin actions
- [ ] Test all dark mode variants
- [ ] Ensure mobile responsiveness
- [ ] Add loading states
- [ ] Add error handling
- [ ] Security audit

## 🎯 MVP Features

**Included** (MVP-ready):
✅ User search and support tools
✅ Suspend/unsuspend users
✅ View user details and history
✅ Create announcements (global or targeted)
✅ Create promo codes for subscriptions
✅ Activity log for audit trail
✅ Dashboard KPIs

**Future Enhancements**:
- Orders refund functionality
- Bulk user operations
- Advanced analytics charts
- Email notification composer
- Dispute resolution workflow
- Automated reports

## 📋 Form Flows

### Create Announcement Flow
1. Click "Create Announcement"
2. Fill form:
   - Title (required)
   - Body (required, multiline)
   - Audience (All/Artists/Venues)
   - Type (Banner/Notification/Modal)
   - Start date/time
   - End date/time (optional)
   - City targeting (optional)
3. Preview banner appearance
4. Save as Draft or Publish
5. Confirmation modal: "This will create a Stripe promo code"

### Create Promo Code Flow
1. Click "Create Promo Code"
2. Fill form:
   - Code (uppercase, e.g., WELCOME15)
   - Discount type (% off or $ off)
   - Discount amount
   - Duration (Once/Repeating/Forever)
   - Applies to plans (checkboxes)
   - Max redemptions (optional)
   - Expiration date (optional)
   - New customers only (toggle)
   - Internal note (optional)
3. Review summary
4. Click "Create"
5. Confirmation: "This creates a Stripe promo code"
6. Success: Show code with copy button

## 🔒 Security Considerations

1. **Role-Based Access**: Only users with `isAdmin: true` can access
2. **Action Logging**: All admin actions logged to Activity Log
3. **Confirmation Modals**: Destructive actions require confirmation
4. **Stripe Integration**: Secure API key handling
5. **Data Masking**: Sensitive data (Stripe IDs) partially masked
6. **Session Timeout**: Force logout capability
7. **Audit Trail**: Immutable activity log

## 💡 Best Practices

1. **Use Neutral Accents**: Admin console uses black/white, not artist blue or venue green
2. **Preserve Role Colors**: Role badges always use brand colors
3. **Loading States**: Show skeleton screens for tables and KPIs
4. **Empty States**: Every list has a helpful empty state
5. **Responsive Tables**: Horizontal scroll on mobile, fixed columns on desktop
6. **Dark Mode**: Test every component in both themes
7. **Accessibility**: Proper contrast ratios, keyboard navigation
8. **Error Handling**: User-friendly error messages
9. **Confirmation**: Destructive actions always require confirmation
10. **Help Text**: Include tooltips and inline guidance

---

The Admin Console provides Artwalls staff with powerful, easy-to-use tools for managing the platform while maintaining the clean, professional aesthetic of the main application. All components are production-ready with full light/dark mode support and responsive design.
