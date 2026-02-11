# @deprecated — Internal documentation. Moved to project wiki.

---

## Design Tokens

### Semantic Color Tokens (Light Mode)

```css
/* Backgrounds */
--background: #FAFAF9;          /* neutral-50 - Page background */
--surface: #FFFFFF;             /* white - Cards, panels, modals */
--surface-elevated: #FFFFFF;    /* white - Elevated cards */
--surface-overlay: #FFFFFF;     /* white - Modals, dialogs */
--surface-print: #FFFFFF;       /* white - Print templates */

/* Text */
--text-primary: #171717;        /* neutral-900 - Headings, primary content */
--text-secondary: #525252;      /* neutral-600 - Body text, labels */
--text-tertiary: #737373;       /* neutral-500 - Muted text, helpers */
--text-inverse: #FFFFFF;        /* white - Text on dark backgrounds */
--text-print: #000000;          /* black - High contrast for print */

/* Borders */
--border-subtle: #E5E5E5;       /* neutral-200 - Subtle dividers */
--border-default: #D4D4D4;      /* neutral-300 - Default borders */
--border-strong: #A3A3A3;       /* neutral-400 - Emphasized borders */
--border-print: #000000;        /* black - Print borders */

/* Interactive */
--interactive-default: #171717; /* neutral-900 - Default buttons */
--interactive-hover: #404040;   /* neutral-700 - Hover state */
--interactive-active: #262626;  /* neutral-800 - Active/pressed */
--interactive-disabled: #D4D4D4; /* neutral-300 - Disabled */

/* Brand - Artist (Blue) */
--artist-primary: #2563EB;      /* blue-600 */
--artist-secondary: #3B82F6;    /* blue-500 */
--artist-light: #DBEAFE;        /* blue-100 */
--artist-dark: #1E40AF;         /* blue-700 */
--artist-surface: #EFF6FF;      /* blue-50 */

/* Brand - Venue (Green) */
--venue-primary: #16A34A;       /* green-600 */
--venue-secondary: #22C55E;     /* green-500 */
--venue-light: #DCFCE7;         /* green-100 */
--venue-dark: #15803D;          /* green-700 */
--venue-surface: #F0FDF4;       /* green-50 */

/* Brand - Artwalls Platform (Purple) */
--platform-primary: #7C3AED;    /* purple-600 */
--platform-secondary: #8B5CF6;  /* purple-500 */
--platform-light: #E9D5FF;      /* purple-100 */
--platform-dark: #6D28D9;       /* purple-700 */
--platform-surface: #FAF5FF;    /* purple-50 */

/* Feedback */
--success: #16A34A;             /* green-600 - Success states */
--success-light: #DCFCE7;       /* green-100 */
--success-surface: #F0FDF4;     /* green-50 */

--error: #DC2626;               /* red-600 - Error states */
--error-light: #FEE2E2;         /* red-100 */
--error-surface: #FEF2F2;       /* red-50 */

--warning: #EA580C;             /* orange-600 - Warning states */
--warning-light: #FED7AA;       /* orange-200 */
--warning-surface: #FFF7ED;     /* orange-50 */

--info: #2563EB;                /* blue-600 - Info states */
--info-light: #DBEAFE;          /* blue-100 */
--info-surface: #EFF6FF;        /* blue-50 */

/* QR & Print-specific */
--qr-active: #16A34A;           /* green-600 - Active QR */
--qr-expired: #737373;          /* neutral-500 - Expired QR */
--qr-replaced: #EA580C;         /* orange-600 - Replaced QR */
--qr-background: #FFFFFF;       /* white - QR code background */
--qr-foreground: #000000;       /* black - QR code data */

/* Focus */
--focus-ring: #2563EB;          /* blue-600 - Focus outline */
--focus-ring-offset: #FFFFFF;   /* white - Focus outline offset */
```

### Semantic Color Tokens (Dark Mode)

```css
/* Backgrounds */
--background: #171717;          /* neutral-900 - Page background */
--surface: #262626;             /* neutral-800 - Cards, panels */
--surface-elevated: #404040;    /* neutral-700 - Elevated cards */
--surface-overlay: #262626;     /* neutral-800 - Modals, dialogs */
--surface-print: #FFFFFF;       /* white - Print stays white */

/* Text */
--text-primary: #FAFAFA;        /* neutral-50 - Headings */
--text-secondary: #D4D4D4;      /* neutral-300 - Body text */
--text-tertiary: #A3A3A3;       /* neutral-400 - Muted text */
--text-inverse: #171717;        /* neutral-900 - Text on light */
--text-print: #000000;          /* black - Print stays black */

/* Borders */
--border-subtle: #404040;       /* neutral-700 - Subtle dividers */
--border-default: #525252;      /* neutral-600 - Default borders */
--border-strong: #737373;       /* neutral-500 - Emphasized */
--border-print: #000000;        /* black - Print stays black */

/* Interactive */
--interactive-default: #FAFAFA; /* neutral-50 - Default buttons */
--interactive-hover: #E5E5E5;   /* neutral-200 - Hover */
--interactive-active: #D4D4D4;  /* neutral-300 - Active */
--interactive-disabled: #525252; /* neutral-600 - Disabled */

/* Brand - Artist (Blue, adjusted) */
--artist-primary: #3B82F6;      /* blue-500 */
--artist-secondary: #60A5FA;    /* blue-400 */
--artist-light: #1E3A8A;        /* blue-900 */
--artist-dark: #DBEAFE;         /* blue-100 */
--artist-surface: #1E3A8A;      /* blue-900/30 */

/* Brand - Venue (Green, adjusted) */
--venue-primary: #22C55E;       /* green-500 */
--venue-secondary: #4ADE80;     /* green-400 */
--venue-light: #14532D;         /* green-900 */
--venue-dark: #DCFCE7;          /* green-100 */
--venue-surface: #14532D;       /* green-900/30 */

/* Brand - Platform (Purple, adjusted) */
--platform-primary: #8B5CF6;    /* purple-500 */
--platform-secondary: #A78BFA;  /* purple-400 */
--platform-light: #4C1D95;      /* purple-900 */
--platform-dark: #E9D5FF;       /* purple-100 */
--platform-surface: #4C1D95;    /* purple-900/30 */

/* Feedback (adjusted) */
--success: #22C55E;             /* green-500 */
--success-light: #14532D;       /* green-900 */
--success-surface: #14532D;     /* green-900/30 */

--error: #EF4444;               /* red-500 */
--error-light: #7F1D1D;         /* red-900 */
--error-surface: #7F1D1D;       /* red-900/30 */

--warning: #F97316;             /* orange-500 */
--warning-light: #7C2D12;       /* orange-900 */
--warning-surface: #7C2D12;     /* orange-900/30 */

--info: #3B82F6;                /* blue-500 */
--info-light: #1E3A8A;          /* blue-900 */
--info-surface: #1E3A8A;        /* blue-900/30 */

/* QR & Print (unchanged - always high contrast) */
--qr-active: #22C55E;           /* green-500 */
--qr-expired: #A3A3A3;          /* neutral-400 */
--qr-replaced: #F97316;         /* orange-500 */
--qr-background: #FFFFFF;       /* white - Always */
--qr-foreground: #000000;       /* black - Always */

/* Focus */
--focus-ring: #60A5FA;          /* blue-400 - More visible */
--focus-ring-offset: #171717;   /* neutral-900 */
```

---

## Typography

### Font Family
```css
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
--font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
--font-print: "Helvetica Neue", Helvetica, Arial, sans-serif; /* Print-safe */
```

### Font Scale
```css
--text-xs: 12px;    /* line-height: 16px */
--text-sm: 14px;    /* line-height: 20px */
--text-base: 16px;  /* line-height: 24px */
--text-lg: 18px;    /* line-height: 28px */
--text-xl: 20px;    /* line-height: 28px */
--text-2xl: 24px;   /* line-height: 32px */
--text-3xl: 30px;   /* line-height: 36px */
--text-4xl: 36px;   /* line-height: 40px */
--text-5xl: 48px;   /* line-height: 1 - Print headings */
```

### Font Weights
```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Print Typography
```css
/* Optimized for 4x6" and 8.5x11" print */
--print-title: 24px / 700;      /* Artwork title */
--print-artist: 16px / 600;     /* Artist name */
--print-price: 20px / 700;      /* Price */
--print-url: 14px / 400;        /* Short URL */
--print-footer: 10px / 400;     /* Powered by Artwalls */
--print-body: 12px / 400;       /* Body text */
```

---

## Spacing System (8px base)

```css
--space-0: 0px;
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-20: 80px;
--space-24: 96px;

/* Print spacing */
--print-margin: 0.5in;          /* Print margins */
--print-gap: 16px;              /* Element gaps */
```

---

## Border Radius

```css
--radius-none: 0px;
--radius-sm: 4px;     /* Small elements */
--radius-md: 8px;     /* Buttons, inputs */
--radius-lg: 12px;    /* Cards */
--radius-xl: 16px;    /* Large cards, modals */
--radius-2xl: 24px;   /* Hero sections */
--radius-full: 9999px; /* Badges, pills, avatars */
--radius-print: 4px;  /* Print elements (subtle) */
```

---

## Shadows

```css
/* Light Mode */
--shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);

/* Dark Mode */
--shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.3);
--shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.3);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.5), 0 4px 6px -4px rgb(0 0 0 / 0.4);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.6), 0 8px 10px -6px rgb(0 0 0 / 0.5);

/* Print (no shadows) */
--shadow-print: none;
```

---

## Focus Ring

```css
/* All interactive elements */
--focus-ring-width: 2px;
--focus-ring-offset: 2px;
--focus-ring-style: solid;

/* Applied as: */
outline: var(--focus-ring-width) var(--focus-ring-style) var(--focus-ring);
outline-offset: var(--focus-ring-offset);
```

**Accessibility:** Focus rings must have 3:1 contrast ratio with background (WCAG 2.1 Level AA).

---

## Breakpoints

```css
--breakpoint-mobile: 390px;   /* Mobile design frame */
--breakpoint-tablet: 768px;   /* Tablet */
--breakpoint-desktop: 1280px; /* Desktop design frame */
--breakpoint-wide: 1920px;    /* Wide desktop */

/* Print */
--print-4x6: 4in × 6in;       /* Label size */
--print-letter: 8.5in × 11in; /* Standard letter */
```

---

## Component Specifications

### 1. Buttons

#### Primary Button
```tsx
// Default
background: var(--interactive-default)
color: var(--text-inverse)
padding: 12px 24px
border-radius: 8px
font: 14px/20px medium
transition: all 150ms ease-out

// Hover
background: var(--interactive-hover)
transform: translateY(-1px)
box-shadow: var(--shadow-md)

// Active
background: var(--interactive-active)
transform: translateY(0)

// Focus
outline: 2px solid var(--focus-ring)
outline-offset: 2px

// Disabled
background: var(--interactive-disabled)
color: var(--text-tertiary)
cursor: not-allowed
opacity: 0.6
```

#### Role-Aware Buttons

**Artist Primary:**
```tsx
background: var(--artist-primary)
hover: var(--artist-dark)
```

**Venue Primary:**
```tsx
background: var(--venue-primary)
hover: var(--venue-dark)
```

**Platform Primary:**
```tsx
background: var(--platform-primary)
hover: var(--platform-dark)
```

#### Secondary Button
```tsx
background: transparent
color: var(--text-primary)
border: 1px solid var(--border-default)

// Hover
background: var(--surface-elevated)
border-color: var(--border-strong)
```

#### Danger Button
```tsx
background: var(--error)
color: white
```

#### Sizes
- **Large:** 48px min-height, 16px/32px padding
- **Medium:** 44px min-height, 12px/24px padding (default)
- **Small:** 36px min-height, 8px/16px padding

---

### 2. Inputs

#### Text Input
```tsx
// Default
padding: 12px 16px
border: 1px solid var(--border-default)
border-radius: 8px
background: var(--surface)
color: var(--text-primary)
font: 16px/24px normal

// Focus
border-color: var(--focus-ring)
outline: 2px solid var(--focus-ring)
outline-offset: 0

// Error
border-color: var(--error)
background: var(--error-surface)

// Success
border-color: var(--success)
background: var(--success-surface)

// Disabled
background: var(--background)
color: var(--text-tertiary)
cursor: not-allowed
```

#### Label
```tsx
display: block
font: 14px/20px medium
color: var(--text-primary)
margin-bottom: 8px

// Required indicator
::after {
  content: "*"
  color: var(--error)
  margin-left: 4px
}
```

#### Error Message
```tsx
font: 12px/16px normal
color: var(--error)
margin-top: 4px
display: flex
align-items: center
gap: 4px

// Icon
[AlertCircle icon, 12px]
```

---

### 3. Cards

#### Base Card
```tsx
background: var(--surface)
border: 1px solid var(--border-subtle)
border-radius: 12px
padding: 24px
box-shadow: var(--shadow-sm)
transition: all 200ms ease-out

// Hover (if interactive)
box-shadow: var(--shadow-md)
transform: translateY(-2px)
```

#### Listing Card (Artist/Venue)
```tsx
// Enhanced card for listing items
border-left: 4px solid [status-color]
  - Pending: orange
  - Approved: green
  - Rejected: red
  - Active: blue

// Contains:
- Artwork thumbnail (aspect-ratio 4/3)
- Title + price
- Status badge
- Venue/artist name
- Actions row
```

---

### 4. Badges

#### Status Badges
```tsx
// Base
display: inline-flex
padding: 4px 12px
border-radius: 9999px
font: 12px/16px medium
white-space: nowrap

// Variants
Pending: bg-orange-100, text-orange-700
Approved: bg-green-100, text-green-700
Rejected: bg-red-100, text-red-700
Active: bg-blue-100, text-blue-700
Sold: bg-neutral-100, text-neutral-700
Expired: bg-neutral-100, text-neutral-500
```

#### QR Status Badge
```tsx
// Special badges for QR codes
QR Active: bg-green-100, text-green-700, dot-prefix
QR Expired: bg-neutral-100, text-neutral-500, dot-prefix
QR Replaced: bg-orange-100, text-orange-700, dot-prefix

// Dot prefix
::before {
  content: ""
  width: 6px
  height: 6px
  border-radius: 50%
  background: currentColor
  margin-right: 6px
}
```

---

### 5. Tables

#### Base Table
```tsx
width: 100%
background: var(--surface)
border: 1px solid var(--border-subtle)
border-radius: 12px
overflow: hidden

// Header
background: var(--surface-elevated)
border-bottom: 1px solid var(--border-subtle)
padding: 12px 24px
font: 12px/16px medium
color: var(--text-secondary)
text-transform: uppercase
letter-spacing: 0.05em

// Row
border-bottom: 1px solid var(--border-subtle)
padding: 16px 24px
transition: background 150ms

// Row hover
background: var(--surface-elevated)

// Cell
vertical-align: middle
```

#### Empty State (in table)
```tsx
padding: 64px 24px
text-align: center

// Icon (48px)
color: var(--text-tertiary)

// Title
font: 18px/28px semibold
margin-bottom: 8px

// Description
font: 14px/20px normal
color: var(--text-secondary)
max-width: 400px

// CTA
[Primary button]
```

---

### 6. Tabs

#### Tab List
```tsx
display: flex
gap: 24px
border-bottom: 1px solid var(--border-subtle)
```

#### Tab
```tsx
// Default
padding: 12px 16px
border-bottom: 2px solid transparent
color: var(--text-secondary)
font: 14px/20px medium
cursor: pointer
transition: all 150ms

// Hover
color: var(--text-primary)

// Active
border-bottom-color: var(--interactive-default)
color: var(--text-primary)

// Focus
outline: 2px solid var(--focus-ring)
outline-offset: -2px
border-radius: 4px

// Keyboard nav
Arrow Left/Right: Navigate tabs
Enter/Space: Activate tab
```

---

### 7. Modals / Dialogs

#### Base Modal
```tsx
// Backdrop
position: fixed
inset: 0
background: rgba(0, 0, 0, 0.5)
backdrop-filter: blur(4px)
z-index: 1040

// Dialog
position: fixed
top: 50%
left: 50%
transform: translate(-50%, -50%)
background: var(--surface-overlay)
border-radius: 16px
box-shadow: var(--shadow-xl)
max-width: 560px
width: calc(100% - 32px)
max-height: calc(100vh - 64px)
overflow-y: auto
z-index: 1050

// Animation
@keyframes modal-enter {
  from { opacity: 0; transform: translate(-50%, -48%) scale(0.96); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
```

#### Modal Header
```tsx
padding: 24px 24px 16px
border-bottom: 1px solid var(--border-subtle)

// Title
font: 24px/32px semibold

// Close button
position: absolute
top: 24px
right: 24px
width: 32px
height: 32px
border-radius: 8px
color: var(--text-tertiary)

// Keyboard
Esc: Close modal
Tab: Cycle through focusable elements
Focus trap: Focus stays within modal
```

---

### 8. Dropdown Menus

#### Base Dropdown
```tsx
// Trigger
[Button component]

// Menu
position: absolute
top: calc(100% + 8px)
left: 0
background: var(--surface-overlay)
border: 1px solid var(--border-default)
border-radius: 8px
box-shadow: var(--shadow-lg)
min-width: 200px
max-height: 320px
overflow-y: auto
padding: 8px
z-index: 1060

// Menu Item
padding: 8px 12px
border-radius: 6px
color: var(--text-primary)
font: 14px/20px normal
cursor: pointer
transition: background 150ms

// Hover
background: var(--surface-elevated)

// Focus
outline: 2px solid var(--focus-ring)
outline-offset: -2px

// Keyboard
Arrow Up/Down: Navigate items
Enter: Select item
Esc: Close menu
```

---

### 9. Toasts

#### Base Toast
```tsx
position: fixed
bottom: 24px
right: 24px
background: var(--surface-overlay)
border: 1px solid var(--border-default)
border-radius: 12px
box-shadow: var(--shadow-xl)
padding: 16px
max-width: 420px
display: flex
gap: 12px
align-items: flex-start
z-index: 1070

// Variants
Success: border-left: 4px solid var(--success)
Error: border-left: 4px solid var(--error)
Warning: border-left: 4px solid var(--warning)
Info: border-left: 4px solid var(--info)

// Animation
@keyframes toast-enter {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
```

---

### 10. Skeleton Loaders

#### Base Skeleton
```tsx
background: linear-gradient(
  90deg,
  var(--surface-elevated) 0%,
  var(--border-subtle) 50%,
  var(--surface-elevated) 100%
)
background-size: 200% 100%
animation: skeleton-shimmer 1.5s infinite
border-radius: 4px

@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

#### Variants
```tsx
// Text line
height: 16px
width: 100% (or 80%, 60%, etc.)
margin-bottom: 8px

// Card
height: 200px
width: 100%
border-radius: 12px

// Avatar
width: 40px
height: 40px
border-radius: 50%

// Image (artwork)
aspect-ratio: 4/3
width: 100%
border-radius: 8px
```

---

### 11. Error Banners

#### Page-level Error Banner
```tsx
background: var(--error-surface)
border: 1px solid var(--error)
border-radius: 8px
padding: 16px
display: flex
gap: 12px
align-items: flex-start
margin-bottom: 24px

// Icon
[AlertTriangle, 20px, error color]

// Content
font: 14px/20px normal
color: var(--text-primary)

// Actions
[Retry button] or [Dismiss button]
```

#### Inline Error State
```tsx
// In forms
border-color: var(--error)
background: var(--error-surface)

// Error message below
[Error message component]
```

---

### 12. Empty States

#### Structure
```tsx
display: flex
flex-direction: column
align-items: center
padding: 64px 24px
text-align: center

// Icon container
width: 80px
height: 80px
background: var(--surface-elevated)
border-radius: 50%
display: flex
align-items: center
justify-content: center
margin-bottom: 24px

// Icon
size: 40px
color: var(--text-tertiary)

// Title
font: 20px/28px semibold
margin-bottom: 8px

// Description
font: 14px/20px normal
color: var(--text-secondary)
max-width: 400px
margin-bottom: 24px

// CTA
[Primary button]
```

---

## Accessibility Standards

### Contrast Requirements (WCAG AA)
- **Normal text (< 18px):** 4.5:1 minimum
- **Large text (≥ 18px or ≥ 14px bold):** 3:1 minimum
- **UI components:** 3:1 minimum
- **Focus indicators:** 3:1 minimum

### Keyboard Navigation Patterns

**Global:**
- `Tab`: Focus next element
- `Shift + Tab`: Focus previous element
- `Enter`: Activate focused element
- `Space`: Toggle checkbox/switch, activate button

**Modals:**
- `Esc`: Close modal
- `Tab`: Cycle within modal (focus trap)
- Focus returns to trigger on close

**Dropdowns:**
- `↑` `↓`: Navigate items
- `Enter`: Select item
- `Esc`: Close dropdown
- `Home`: First item
- `End`: Last item

**Tabs:**
- `←` `→`: Navigate tabs
- `Home`: First tab
- `End`: Last tab
- `Tab`: Move focus to tab panel

**Tables:**
- `↑` `↓`: Navigate rows
- `Enter`: Open row detail
- `Tab`: Move to next interactive element

### Focus Management

**Required:**
- All interactive elements have visible focus indicator
- Focus order follows visual order
- Modal/dialog has focus trap
- Skip links for screen readers
- No keyboard traps

---

## Print & QR Code Specifications

### QR Code Requirements

#### Technical Specs
```
Format: QR Code (not barcode)
Error correction: High (30% - handles damage/dirt)
Encoding: URL (short link)
Minimum size: 1.5in × 1.5in (physical)
Maximum size: 3in × 3in (standard)
Quiet zone: 4 modules minimum (white border)
Foreground: #000000 (pure black)
Background: #FFFFFF (pure white)
Resolution: 300 DPI minimum for print
```

#### QR URL Pattern
```
Format: https://art.wls/[6-char-code]
Example: https://art.wls/a3f9k2

// Benefits:
- Short URL fits easily
- Stable (can redirect if listing changes)
- Trackable (analytics)
- Branded domain
```

#### QR Status States
```tsx
Active: Green badge, scannable
Expired: Gray badge, redirects to "no longer available"
Replaced: Orange badge, redirects to "updated listing"
Sold: Gray badge, redirects to "sold - inquire"
```

#### Quiet Zone Rule
```
The QR code must have white space around it:
- Minimum: 4 QR modules (dots)
- Recommended: 0.25in margin on all sides
- Critical: No text, graphics, or color within quiet zone
```

### Print Kit Templates

#### 4×6" Label Template

```
Dimensions: 4in × 6in
Orientation: Portrait
Margins: 0.25in all sides
DPI: 300 minimum

Layout:
┌────────────────────┐
│ [Artwork Image]    │ 3.5in × 2.5in (top)
│                    │
├────────────────────┤
│ Artwork Title      │ 24px bold
│ by Artist Name     │ 16px semibold
│ $850               │ 20px bold
│                    │
│ ┌────────────┐     │
│ │  QR Code   │     │ 1.5in × 1.5in
│ │            │     │
│ └────────────┘     │
│                    │
│ art.wls/a3f9k2    │ 14px mono
│                    │
│ At: Venue Name     │ 12px
│ Powered by Artwalls│ 10px gray
└────────────────────┘
```

#### 8.5×11" Sheet Template

```
Dimensions: 8.5in × 11in
Orientation: Portrait
Margins: 0.5in all sides
DPI: 300 minimum

Layout:
┌──────────────────────────┐
│                          │
│   [Large Artwork Image]  │ 7.5in × 5in
│                          │
├──────────────────────────┤
│ Artwork Title            │ 36px bold
│ by Artist Name           │ 24px semibold
│                          │
│ $850                     │ 30px bold
│                          │
│ ┌────────────┐           │
│ │  QR Code   │ Description │ 2.5in × 2.5in QR
│ │            │ Up to 3 lines│
│ └────────────┘           │
│                          │
│ Scan to purchase         │ 16px
│ art.wls/a3f9k2          │ 18px mono
│                          │
│ Currently at: Venue Name │ 14px
│ Powered by Artwalls      │ 12px gray
└──────────────────────────┘
```

### Print Guidelines

**Test Scan Checklist:**
- [ ] QR code scans successfully from 12 inches away
- [ ] QR code scans in low light
- [ ] QR code scans at 45° angle
- [ ] URL redirects correctly
- [ ] No text in quiet zone
- [ ] Black and white only (no gradients)
- [ ] Minimum 1.5in size maintained

**Print Settings:**
- Paper: Matte or glossy (avoid textured)
- Color mode: RGB (for screen), CMYK (for professional print)
- Resolution: 300 DPI minimum
- Format: PDF (for sharing), PNG (for web)

---

## Payment UX Specifications

### Customer Landing Page (QR Scan Destination)

#### Performance Requirements
```
Load time: < 2 seconds
Time to interactive: < 3 seconds
Lighthouse score: 90+ (mobile)
Image optimization: WebP with JPEG fallback
Lazy loading: Below-fold images only
```

#### Layout Structure (Mobile-first)
```tsx
┌─────────────────────┐
│ [Artwork Image]     │ // Hero, full-width, 4:3 ratio
│                     │
├─────────────────────┤
│ Artwork Title       │ // h1, 30px bold
│ by Artist Name      │ // 18px, link to artist
│                     │
│ $850                │ // 36px bold, green
│ • Available         │ // Status badge
│                     │
│ [BUY NOW]          │ // Large, high contrast CTA
│ 🍎 Apple Pay ready  │ // Conditional hint
│                     │
├─────────────────────┤
│ About this artwork  │
│ [Description...]    │
│                     │
│ Details:            │
│ • Medium: Oil      │
│ • Size: 24×36"     │
│ • Year: 2024       │
│                     │
├─────────────────────┤
│ Currently at:       │
│ Venue Name          │
│ Portland, OR        │
│                     │
├─────────────────────┤
│ Where your $ goes:  │ // Transparency section
│ ┌─────────────────┐ │
│ │ You pay: $850   │ │
│ │ Artist: $680    │ │ // 80% (Growth tier)
│ │ Venue: $85      │ │ // 10%
│ │ Artwalls: $85   │ │ // 10%
│ └─────────────────┘ │
└─────────────────────┘
```

#### Apple Pay Indicator
```tsx
// Show ONLY when:
- User device supports Apple Pay
- User browser supports Payment Request API
- User region allows Apple Pay

// Display:
<div className="flex items-center gap-2 text-sm">
  <ApplePayIcon /> Apple Pay available
</div>

// DO NOT promise it will always appear
// DO NOT make it the only payment option shown
```

#### Breakdown Component
```tsx
// "Where the money goes" transparency panel
┌──────────────────────────────┐
│ Payment Breakdown            │
├──────────────────────────────┤
│ Total Price         $850.00  │ // Bold, large
├──────────────────────────────┤
│ Artist (80%)        $680.00  │ // Blue badge
│ Venue (10%)          $85.00  │ // Green badge
│ Artwalls (10%)       $85.00  │ // Purple badge
└──────────────────────────────┘

// Note: Percentages vary by artist subscription tier
// Show actual tier name: "(Growth tier: 80/10/10 split)"
```

### Stripe Checkout UX

```tsx
// Flow:
1. User clicks "BUY NOW"
2. Client creates Stripe Checkout Session
3. Redirect to Stripe-hosted checkout
4. User enters payment (card, Apple Pay, Google Pay)
5. Stripe processes payment
6. Redirect to success page

// Checkout Session Config:
mode: 'payment'
success_url: 'https://artwalls.app/purchase/success?session_id={CHECKOUT_SESSION_ID}'
cancel_url: 'https://artwalls.app/listings/{listing_id}'
line_items: [{
  price_data: {
    currency: 'usd',
    product_data: {
      name: 'Artwork Title',
      description: 'by Artist Name',
      images: ['https://...']
    },
    unit_amount: 85000 // $850.00 in cents
  },
  quantity: 1
}]
payment_method_types: ['card', 'apple_pay', 'google_pay']
```

### Success Page
```tsx
┌─────────────────────┐
│  ✓ Purchase Complete│
│                     │
│ [Artwork Image]     │
│                     │
│ "Urban Sunset"      │
│ by Sarah Chen       │
│                     │
│ You paid: $850      │
│                     │
│ Receipt sent to:    │
│ customer@email.com  │
│                     │
│ Next steps:         │
│ • Coordinate pickup │
│ • Contact venue     │
│ • Rate experience   │
│                     │
│ [View Receipt]      │
│ [Contact Support]   │
└─────────────────────┘
```

### Sold / Unavailable States

#### After Artwork Sold
```tsx
// QR scan redirects to:
┌─────────────────────┐
│ [Artwork Image]     │ // Grayed out overlay
│ SOLD                │
│                     │
│ "Urban Sunset"      │
│ by Sarah Chen       │
│                     │
│ This artwork has    │
│ been sold.          │
│                     │
│ Interested in       │
│ similar works?      │
│                     │
│ [View Artist]       │
│ [Browse Venue]      │
└─────────────────────┘
```

#### Listing Removed/Expired
```tsx
┌─────────────────────┐
│ ⚠️ Not Available    │
│                     │
│ This artwork is no  │
│ longer on display.  │
│                     │
│ [Browse Available]  │
│ [Contact Support]   │
└─────────────────────┘
```

---

## Theme Toggle Implementation

```tsx
// Toggle component
<button
  onClick={toggleTheme}
  aria-label="Toggle dark mode"
  className="theme-toggle"
>
  {theme === 'light' ? <Moon /> : <Sun />}
</button>

// Persistence
localStorage.setItem('theme', theme)

// System preference
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
```

---

This foundation provides all tokens, components, and specifications needed to build a consistent, accessible, print-ready marketplace.
