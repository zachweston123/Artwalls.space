# @deprecated — Orphaned design system checklist. No longer maintained.

---

## 1. Color & Contrast Validation

### Backgrounds
- [ ] **Light mode**: All page backgrounds are `#ffffff` (no off-whites)
- [ ] **Dark mode**: All page backgrounds are `#0f0f0f` (no grays lighter than this)
- [ ] **No mixed themes**: Pages are entirely light OR dark, never both
- [ ] **Card surfaces**: Properly elevated with appropriate borders
  - Light: `#ffffff` with `#e5e3e0` border
  - Dark: `#1a1a18` with `#2d2d2a` border
- [ ] **Elevated surfaces** (modals, dropdowns): Correct elevation level
  - Light: `#f3f0eb`
  - Dark: `#252522`

### Text Layers
- [ ] **Primary text** (headings, emphasis): Uses `--text` or `--text-secondary`
  - NOT `--text-muted` or `--text-subtle` for primary content
- [ ] **Secondary/body text**: Uses `--text-secondary` (good contrast ~13:1)
- [ ] **Muted labels/hints**: Uses `--text-muted` (min 4.5:1, ok for secondary content)
- [ ] **Subtle captions**: Uses `--text-subtle` (lowest contrast, captions only)
- [ ] **No arbitrary opacities**: No `text-neutral-600/75` hacks in Tailwind

### Contrast Ratios (Check with tools: WebAIM, Axe, Lighthouse)
- [ ] **Body text on background**: 4.5:1 minimum (AA) ✓ Our system: 18.5:1 (AAA)
- [ ] **Secondary text**: 4.5:1 minimum ✓ Our system: 13:1 (AAA)
- [ ] **Large text (18pt+)**: 3:1 minimum ✓ Our system: 4.5:1+ (AAA)
- [ ] **UI components (buttons, inputs)**: 3:1 minimum ✓ Our system: 8.7:1+ (AAA)
- [ ] **Semantic colors readable**: Green/warning/red not relying on color alone
  - [ ] Icons/labels accompany colored elements
  - [ ] Text distinguishable from background

---

## 2. Component Consistency

### Buttons
- [ ] **Primary button**: `bg-[var(--accent)]` + white text + hover state
- [ ] **Secondary button**: Border + transparent bg + hover highlight
- [ ] **Ghost button**: No border, text-only, hover bg applied
- [ ] **All buttons have focus rings**: `focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]`
- [ ] **Disabled state**: Reduced opacity or `--disabled-bg`
- [ ] **Icon buttons**: Minimum 44x44px touch target (mobile)

### Input Fields
- [ ] **Background**: `bg-[var(--surface-1)]`
- [ ] **Border**: `border border-[var(--border-default)]`
- [ ] **Placeholder contrast**: `::placeholder` uses `--text-muted` (readable)
- [ ] **Focus state**: Border color changes to `--accent`, optional ring
- [ ] **Error state**: Optional, red border + `--danger-bg` if needed
- [ ] **Disabled state**: Opacity reduced, cursor not-allowed

### Cards
- [ ] **Background**: `bg-[var(--surface-1)]`
- [ ] **Border**: `border border-[var(--surface-1-border)]`
- [ ] **Padding**: Consistent (1.5rem or equivalent)
- [ ] **Shadow**: Subtle, matching `--shadow-sm` or `--shadow-md`
- [ ] **Hover state**: Shadow increases or bg changes slightly
- [ ] **No arbitrary colors**: All from token system

### Navigation
- [ ] **Active state**: Clear visual indicator (color change + underline or bg)
- [ ] **Hover state**: Subtle highlight without confusion
- [ ] **Focus ring**: Visible on all nav items
- [ ] **Border**: Proper `--border-default` separator

### Tables
- [ ] **Header row**: Darker surface (`--surface-2`)
- [ ] **Body rows**: Alternate or single color from `--surface-1`
- [ ] **Row separators**: Subtle `--border-subtle` or `--border-default`
- [ ] **Row hover**: Highlight with `--surface-2` or subtle shadow
- [ ] **Text contrast**: Headers bold, body readable, muted data lower contrast
- [ ] **Data columns aligned**: Numbers right-aligned, text left-aligned

### Banners (Action Required, Alerts)
- [ ] **Warning banner**: `bg-[var(--warning-bg)]` + `border-[var(--warning-border)]`
- [ ] **Success banner**: `bg-[var(--success-bg)]` + `border-[var(--success-border)]`
- [ ] **Danger banner**: `bg-[var(--danger-bg)]` + `border-[var(--danger-border)]`
- [ ] **Text color**: Uses semantic text color (e.g., `--warning-text`)
- [ ] **Icon present**: Icon + title + description + CTA (if applicable)
- [ ] **Compact height**: Not dominating the page

### Stat Cards
- [ ] **Icon small, not dominant**: 10x10px or 2.5rem max
- [ ] **Icon background**: Uses `--accent-bg` (light background for dark mode too)
- [ ] **Metric prominent**: Large, bold, high contrast
- [ ] **Label readable**: `--text-muted` but still readable
- [ ] **Sublabel subtle**: Timestamp or additional info in `--text-subtle`
- [ ] **Hover state**: Subtle lift, border emphasis, shadow increase
- [ ] **Alignment consistent**: Icon top-left, metric below, label below metric

---

## 3. Accessibility & Keyboard Navigation

### Focus Management
- [ ] **Focus ring visible** on all interactive elements:
  - Buttons, links, inputs, nav items, cards (if clickable)
  - Outline: `2px solid var(--focus-ring)` with `2px offset`
- [ ] **Focus order logical**: Tab through page, order makes sense
- [ ] **No focus trap**: User can tab out of modals/dropdowns
- [ ] **Focus visible on mouse too** (not just keyboard):
  - Use `:focus-visible` pseudo-class, not just `:focus`

### Semantic HTML
- [ ] **Buttons are `<button>`**: Not `<div role="button">`
- [ ] **Links are `<a>`**: Not `<div onclick>`
- [ ] **Headings use `<h1>`, `<h2>`, etc.**: Proper hierarchy
- [ ] **Forms use `<input>`, `<label>`, `<textarea>`**: Not custom elements
- [ ] **Labels connected to inputs**: `<label for="input-id">` with matching `id`

### Screen Reader Support
- [ ] **Page title/header present**: `<h1>` or similar for page context
- [ ] **Form labels present**: Every input has associated label
- [ ] **Icons have alt text or aria-label**:
  - Decorative icon: `aria-hidden="true"`
  - Meaningful icon: `aria-label="Edit Profile"` or wrapped label
- [ ] **Button text clear**: "Save" not "Click Here"; "Delete" not "X"
- [ ] **Disabled states announced**: Inputs have `disabled` attribute, not just visual change
- [ ] **Dynamic content**: `aria-live="polite"` for notifications, toast messages

### Color Not the Only Indicator
- [ ] **Status indicators use icon + color**: Not color alone
  - ✓ Green checkmark + text "Completed"
  - ❌ Green circle only
- [ ] **Error messages**: Text + optional red border/icon
- [ ] **Links distinguishable**: Not color alone, use underline or icon

### Motion & Reduced Motion
- [ ] **Animations use `prefers-reduced-motion`**: Disabled when user prefers
- [ ] **No auto-playing animations**: User controls start
- [ ] **No flashing/blinking content**: Avoid triggers for photosensitivity

---

## 4. Typography & Readability

### Font Scale
- [ ] **Headings (H1-H3)**: Appropriate sizes (H1 largest, H3 smallest)
- [ ] **Body text**: 1rem (16px) or appropriate size for platform
- [ ] **Small text (captions)**: 0.875rem or 0.75rem, still readable
- [ ] **Line height**: 1.5+ for body text (not cramped)
- [ ] **Font weights**: Used intentionally (bold headings, regular body)

### Reading Comfort
- [ ] **No excessive line lengths**: Max ~65 characters per line (optimal ~50-75)
- [ ] **Sufficient spacing**: Margin/padding between sections
- [ ] **Text alignment**: Left-aligned for primary text (not justified or centered excessively)

---

## 5. Light Mode Specifics

- [ ] **No white text on white bg**: All text layers have proper contrast
- [ ] **Backgrounds are true white or off-white**: `#ffffff` or `#f9f8f7`, not gray
- [ ] **Borders visible**: `#e5e3e0` or darker for clear definition
- [ ] **Icons/graphics readable**: Dark colors on light background
- [ ] **Links underlined or styled distinctly**: Not color alone

---

## 6. Dark Mode Specifics

- [ ] **No white patches**: No `#ffffff` backgrounds (should be `#1a1a18` min)
- [ ] **No light gray dividers**: Use tokens, not arbitrary light colors
- [ ] **Text not washed out**: `#f5f5f3` is bright enough, `#d9d9d6` for secondary
- [ ] **Tables not broken**: Dark header + dark body rows (not bright white inner rows)
- [ ] **Icons/graphics visible**: Bright enough to see on dark background
- [ ] **Shadows subtle**: Not too prominent on dark surfaces
- [ ] **Accent colors pop**: Blue stands out, not dim

---

## 7. Responsive Design

### Mobile (< 640px)
- [ ] **Touch targets minimum 44x44px**: Buttons, inputs, links
- [ ] **No hover-only interactions**: Designs work with touch
- [ ] **Stacked layout**: Multi-column becomes single column
- [ ] **Text readable**: No font-size less than 16px for interactive elements
- [ ] **Scrollable containers**: Don't trap horizontal scroll
- [ ] **Banner/search compact**: Doesn't take excessive mobile real estate

### Tablet (640px - 1024px)
- [ ] **Two-column layout** (if applicable): Not squished
- [ ] **Touch targets still 44x44px**: Not reduced
- [ ] **Navigation responsive**: Hamburger menu or flexible nav

### Desktop (1024px+)
- [ ] **Multi-column layout** (if applicable): Full use of space
- [ ] **Max-width constraint**: Content not stretched too wide
- [ ] **Hover states work**: Desktop hover, not relying on mobile touch

---

## 8. Brand Consistency

### Colors
- [ ] **One blue accent used**: `--accent` only, not multiple blues
- [ ] **No random colors**: All colors from token system
- [ ] **Semantic colors used sparingly**: Only for success/warning/danger
- [ ] **Consistent use across pages**: Same button blue everywhere

### Spacing
- [ ] **Padding consistent**: Cards use 1.5rem, sections use 2rem (or defined scale)
- [ ] **Gaps consistent**: Between items, use defined spacing
- [ ] **Margins logical**: Section breaks have appropriate space

### Border Radius
- [ ] **Buttons**: `var(--radius-md)` (8px) or `var(--radius-sm)` (6px)
- [ ] **Cards/surfaces**: `var(--radius-lg)` (12px)
- [ ] **Modals/elevated**: `var(--radius-xl)` (16px)
- [ ] **Inputs**: `var(--radius-md)` (8px)

### Shadows
- [ ] **Cards**: `var(--shadow-sm)` or `var(--shadow-md)` (no harsh shadows)
- [ ] **Modals/elevated**: `var(--shadow-lg)` (more prominent)
- [ ] **No fake 3D effects**: Shadows subtle, modern

---

## 9. Performance Considerations

- [ ] **Images optimized**: Compressed, responsive `srcset`
- [ ] **CSS not bloated**: Tokens used, no duplicate styles
- [ ] **No layout shift (CLS)**: Elements don't jump during load
- [ ] **Animations smooth**: 60fps, not janky
- [ ] **No console errors**: Open DevTools, check for warnings

---

## 10. Testing Checklist

### Manual Testing
- [ ] **Light mode in browser**: Looks cohesive, no glitches
- [ ] **Dark mode in browser**: Looks cohesive, no glitches
- [ ] **System preference toggle**: Switch system dark mode, page responds
- [ ] **Keyboard navigation**: Tab through entire page, focus rings visible
- [ ] **Resize to mobile**: Responsive, readable, touch targets work
- [ ] **High contrast mode**: Windows high contrast, still readable
- [ ] **Print styles**: Page looks reasonable when printed (optional)

### Automated Testing
- [ ] **WAVE accessibility checker**: No errors or warnings
- [ ] **Axe accessibility audit**: No critical issues
- [ ] **Lighthouse**: Accessibility score 90+
- [ ] **Color contrast checker**: WebAIM WCAG AA+
- [ ] **Responsive design checker**: Mobile, tablet, desktop pass

### Browser/Device Testing
- [ ] **Chrome**: Latest version
- [ ] **Firefox**: Latest version
- [ ] **Safari**: macOS + iOS
- [ ] **Edge**: Latest version
- [ ] **Mobile Safari**: iOS device
- [ ] **Chrome Mobile**: Android device

### Screen Reader Testing
- [ ] **NVDA** (Windows): Pages navigable, content readable
- [ ] **JAWS** (Windows, if available): Content accessible
- [ ] **VoiceOver** (macOS/iOS): Pages navigable
- [ ] **TalkBack** (Android): Pages navigable

---

## 11. Page-Specific Checks

### Homepage / Onboarding
- [ ] **"I'm an Artist / I'm a Venue" buttons**: Clear, centered, with CTA
- [ ] **No white void**: Proper background color (light or dark)
- [ ] **Cards visible**: Role cards have borders, surfaces defined
- [ ] **Call-to-action prominent**: Button clearly visible after selection

### Dashboard
- [ ] **Plan badge + Upgrade button**: Aligned, not cramped
- [ ] **Action Required banner**: Compact, clear, high contrast
- [ ] **Search module**: Reduced height, input + button visible
- [ ] **Stat cards**: Icons small, metrics readable, hover states work
- [ ] **Activity/Quick Actions**: Proper surfaces, readable text

### Pricing Page
- [ ] **Plan cards**: Proper elevation, borders clear
- [ ] **Features list**: Text readable (not washed out)
- [ ] **CTA buttons**: Distinct from background, focus rings visible
- [ ] **Popular badge**: Clear visual indicator (not color alone)

### Sales/Analytics Page
- [ ] **Sales table**: Dark header, readable body rows, hover highlight
- [ ] **Earnings card**: Monetary values legible (not too bright/too dim)
- [ ] **Graphs/charts**: Legend clear, colors from token system

### Settings/Profile
- [ ] **Form labels**: Associated with inputs, readable
- [ ] **Input fields**: Proper focus states, error states clear
- [ ] **Submit button**: Prominent, focus ring visible
- [ ] **Confirmation messages**: Toast/banner styled correctly

---

## 12. Sign-Off Checklist

Before **shipping to production**:

- [ ] **All items above checked**: No skipped items
- [ ] **Design reviewed**: Stakeholder/designer approval
- [ ] **Code reviewed**: Peer review for consistency
- [ ] **Tested in all major browsers**: No regressions
- [ ] **Tested on mobile devices**: Responsive, touch-friendly
- [ ] **Accessibility audit passed**: WAVE, Axe, Lighthouse
- [ ] **No console errors**: DevTools clean
- [ ] **Performance acceptable**: Load time < 3s (Core Web Vitals)
- [ ] **Screenshots captured**: For documentation
- [ ] **Documented any deviations**: If token system not followed, note why

---

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| **Text too faint** | Using `--text-subtle` for body | Use `--text` or `--text-secondary` |
| **Buttons hard to see** | Not using `--accent` | Apply `bg-[var(--accent)]` |
| **Table unreadable** | White rows in dark mode | Use `--surface-1` background for all rows |
| **Focus rings missing** | Not added to interactive elements | Add `focus-visible:ring-2` |
| **Mixed light/dark** | Page partially redesigned | Audit all surfaces, ensure consistency |
| **Contrast fails WCAG** | Arbitrary color choices | Use token colors instead |
| **Mobile not responsive** | Fixed widths, no flex | Add responsive classes, flex layouts |
| **Touch targets too small** | Buttons < 44x44px | Increase padding on mobile |
| **Borders invisible** | Using `--border-subtle` in dark | Use `--border-default` for visibility |

---

## Questions?

- **Token not available?** Add it to `design-tokens.css`, don't create arbitrary colors
- **Component looks different?** Check if using correct token classes
- **Dark mode broken?** Ensure `.dark` class applied or `@media (prefers-color-scheme: dark)` works
- **Accessibility failing?** Run WAVE/Axe, check contrast, add focus rings, use semantic HTML

---

**Last Updated**: January 2026  
**Design System Version**: 1.0  
**Tailwind Version**: v4.1.3+

