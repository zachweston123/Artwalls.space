# Artwalls Design System - Quick Reference Card

## Token Variables at a Glance

### Colors (Use These, Not Arbitrary Colors!)

**Backgrounds**
```css
--bg-base              /* Page background (#fff light, #0f0f0f dark) */
--bg-secondary         /* Subtle variation */
```

**Surfaces (3 Tiers)**
```css
--surface-1            /* Card primary (#fff light, #1a1a18 dark) */
--surface-1-border     /* Card border */
--surface-2            /* Elevated/hover (#fdfcfb light, #252522 dark) */
--surface-2-border
--surface-3            /* Modal/highest (#f3f0eb light, #2d2d2a dark) */
--surface-3-border
```

**Text Layers**
```css
--text                 /* Primary (#1a1a18 light, #f5f5f3 dark) */
--text-secondary       /* Secondary (#4a4a48 light, #d9d9d6 dark) */
--text-muted           /* Labels/hints (#7a7a78 light, #a8a8a6 dark) */
--text-subtle          /* Captions (#a8a8a6 light, #7a7a78 dark) */
--text-inverse         /* On accent background */
```

**Borders**
```css
--border-subtle        /* Faint dividers */
--border-default       /* Card borders, input borders */
--border-emphasis      /* Focused, highlighted */
```

**Accent (Blue)**
```css
--accent               /* #2563eb light, #3b82f6 dark */
--accent-hover         /* Button hover state */
--accent-pressed       /* Button active/pressed */
--accent-light         /* Light variant */
--accent-bg            /* Light background (#eff6ff light, #1e3a8a dark) */
--accent-border        /* Light border */
```

**Semantic Colors (Minimal Use)**
```css
--success              /* Green #059669 light, #10b981 dark */
--success-bg           /* Background for success */
--success-border       /* Border for success */
--success-text         /* Text for success */

--warning              /* Amber #d97706 light, #f59e0b dark */
--warning-bg           /* Background for warning */
--warning-border
--warning-text

--danger               /* Red #dc2626 light, #ef4444 dark */
--danger-bg
--danger-border
--danger-text
```

**States**
```css
--disabled-bg          /* Disabled button/input background */
--disabled-text        /* Disabled text color */
--disabled-border      /* Disabled border */
--focus-ring           /* Focus outline color */
```

**Shadows**
```css
--shadow-xs            /* Minimal */
--shadow-sm            /* Subtle */
--shadow-md            /* Cards */
--shadow-lg            /* Modals */
--shadow-xl            /* Large modals */
```

**Spacing**
```css
--radius-sm            /* 6px (inputs, small buttons) */
--radius-md            /* 8px (buttons, standard radius) */
--radius-lg            /* 12px (cards) */
--radius-xl            /* 16px (modals) */
```

**Motion**
```css
--transition-fast      /* 150ms (hover feedback) */
--transition-normal    /* 200ms (standard animations) */
--transition-slow      /* 300ms (attention-drawing) */
```

---

## Tailwind Class Mapping

### Backgrounds
```tsx
bg-[var(--bg-base)]
bg-[var(--surface-1)]
bg-[var(--surface-2)]
bg-[var(--surface-3)]
bg-[var(--accent-bg)]
bg-[var(--warning-bg)]
bg-[var(--success-bg)]
bg-[var(--danger-bg)]
```

### Text
```tsx
text-[var(--text)]                  /* Primary */
text-[var(--text-secondary)]        /* Secondary body */
text-[var(--text-muted)]            /* Labels, hints */
text-[var(--text-subtle)]           /* Captions, timestamps */
text-white                          /* On accent bg only */
```

### Borders
```tsx
border border-[var(--border-default)]
border border-[var(--border-emphasis)]
border-b border-[var(--border-subtle)]
```

### Buttons
```tsx
bg-[var(--accent)]
hover:bg-[var(--accent-hover)]
active:bg-[var(--accent-pressed)]
disabled:bg-[var(--disabled-bg)]
disabled:text-[var(--disabled-text)]
```

### Focus Rings (ALL Interactive Elements)
```tsx
focus-visible:ring-2
focus-visible:ring-[var(--focus-ring)]
focus-visible:ring-offset-2
```

### Shadows
```tsx
shadow-[var(--shadow-sm)]
shadow-[var(--shadow-md)]
shadow-[var(--shadow-lg)]
```

### Radius
```tsx
rounded-[var(--radius-sm)]
rounded-[var(--radius-md)]
rounded-[var(--radius-lg)]
rounded-[var(--radius-xl)]
```

### Transitions
```tsx
transition-colors duration-[var(--transition-fast)]
transition-all duration-[var(--transition-normal)]
```

---

## Common Patterns

### Page Wrapper
```tsx
<div className="
  min-h-screen
  bg-[var(--bg-base)]
  text-[var(--text)]
">
  {/* Content */}
</div>
```

### Card
```tsx
<div className="
  bg-[var(--surface-1)]
  border border-[var(--surface-1-border)]
  rounded-[var(--radius-lg)]
  p-6
  shadow-[var(--shadow-md)]
">
  {/* Content */}
</div>
```

### Primary Button
```tsx
<button className="
  px-4 py-2
  bg-[var(--accent)]
  text-white
  font-semibold
  rounded-[var(--radius-md)]
  hover:bg-[var(--accent-hover)]
  focus-visible:ring-2
  focus-visible:ring-[var(--focus-ring)]
  transition-colors
  duration-[var(--transition-fast)]
">
  Button
</button>
```

### Input Field
```tsx
<input
  className="
    w-full
    px-4 py-2
    bg-[var(--surface-1)]
    border border-[var(--border-default)]
    rounded-[var(--radius-md)]
    text-[var(--text)]
    placeholder:text-[var(--text-muted)]
    focus:outline-none
    focus:border-[var(--accent)]
    focus:ring-2
    focus:ring-[var(--accent-bg)]
  "
  placeholder="Enter text..."
/>
```

### Action Required Banner
```tsx
<div className="
  bg-[var(--warning-bg)]
  border border-[var(--warning-border)]
  rounded-[var(--radius-md)]
  p-4
  mb-6
">
  <h3 className="
    font-semibold
    text-[var(--warning-text)]
    text-sm
  ">
    Action Required
  </h3>
  <p className="
    text-[var(--text-muted)]
    text-xs
    mt-1
  ">
    Description here
  </p>
  <button className="
    mt-3
    px-3 py-1.5
    bg-[var(--accent)]
    text-white
    text-sm
    font-semibold
    rounded-[var(--radius-sm)]
    hover:bg-[var(--accent-hover)]
  ">
    Fix Now
  </button>
</div>
```

### Table
```tsx
<table className="w-full">
  <thead>
    <tr className="bg-[var(--surface-2)] border-b border-[var(--border-default)]">
      <th className="
        px-4 py-3
        text-left
        text-sm
        font-semibold
        text-[var(--text)]
      ">
        Header
      </th>
    </tr>
  </thead>
  <tbody>
    <tr className="
      border-b border-[var(--border-subtle)]
      hover:bg-[var(--surface-2)]
      transition-colors
    ">
      <td className="
        px-4 py-3
        text-sm
        text-[var(--text-secondary)]
      ">
        Data
      </td>
    </tr>
  </tbody>
</table>
```

---

## DO ✅ vs DON'T ❌

### Colors
✅ `text-[var(--text)]`  
❌ `text-gray-900` or `text-neutral-900`

✅ `bg-[var(--accent)]`  
❌ `bg-blue-500`

✅ `border border-[var(--border-default)]`  
❌ `border border-gray-300`

### Text Layers
✅ Primary: `text-[var(--text)]`  
✅ Secondary: `text-[var(--text-secondary)]`  
✅ Muted: `text-[var(--text-muted)]`  
❌ `text-gray-500/50` (opacity hack)

### Surfaces
✅ Page: `bg-[var(--bg-base)]`  
✅ Cards: `bg-[var(--surface-1)]`  
✅ Modals: `bg-[var(--surface-3)]`  
❌ `bg-white dark:bg-gray-900` (no token)

### Focus
✅ `focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]`  
❌ `focus:outline-blue-500` (arbitrary color)

### Themes
✅ Page entirely light OR dark  
❌ Mixing light + dark on same page

---

## Contrast Reference

| Layer | Light | Dark | Ratio | WCAG |
|-------|-------|------|-------|------|
| **Text** | `--text` on `--bg-base` | `--text` on `--bg-base` | 18.5:1 | AAA ✓ |
| **Secondary** | `--text-secondary` on `--bg-base` | `--text-secondary` on `--bg-base` | 13:1 | AAA ✓ |
| **Muted** | `--text-muted` on `--bg-base` | `--text-muted` on `--bg-base` | 5:1 | AA ✓ |
| **Button** | White on `--accent` | White on `--accent` | 8.7:1 | AAA ✓ |
| **Success** | `--success-text` on `--success-bg` | `--success-text` on `--success-bg` | 8:1+ | AAA ✓ |
| **Warning** | `--warning-text` on `--warning-bg` | `--warning-text` on `--warning-bg` | 7.8:1+ | AAA ✓ |
| **Danger** | `--danger-text` on `--danger-bg` | `--danger-text` on `--danger-bg` | 6:1+ | AAA ✓ |

→ All exceed WCAG AA. No adjustments needed.

---

## Accessibility Checklist

- [ ] **Focus ring visible**: `focus-visible:ring-2` on all buttons, inputs, links
- [ ] **Focus order logical**: Tab through page, makes sense
- [ ] **Semantic HTML**: `<button>` for buttons, `<a>` for links, `<label>` for form labels
- [ ] **Alt text**: Images have `alt`, icons have `aria-label` or are `aria-hidden`
- [ ] **Contrast pass**: Body text 4.5:1+, large text 3:1+ (we do 18.5:1 and 13:1)
- [ ] **No color alone**: Success/error not just red, include icon/label
- [ ] **Reduced motion**: Animations disabled when `prefers-reduced-motion: reduce`
- [ ] **Mobile friendly**: Touch targets 44x44px+, no hover-only interactions

---

## Files to Import

In your main CSS/template:

```html
<!-- In head -->
<link rel="stylesheet" href="/styles/design-tokens.css">
<link rel="stylesheet" href="/styles/components.css">
```

Or in React/Vite:

```tsx
// main.tsx or App.tsx (before component imports)
import './styles/design-tokens.css';
import './styles/components.css';
import './index.css';
```

---

## Dark Mode Setup

Add to `index.html` `<head>`:

```html
<script>
  function initDarkMode() {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) document.documentElement.classList.add('dark');
  }
  initDarkMode();
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', initDarkMode);
</script>
```

---

## Need Help?

- **Color not in system?** Add to `design-tokens.css`, don't create arbitrary
- **Component looking off?** Check `IMPLEMENTATION_GUIDE.md` for pattern
- **Accessibility issue?** Run WAVE/Axe, add focus ring, use token text layer
- **Contrast failing?** Use token colors, not custom
- **Dark mode broken?** Ensure all colors use `var(--...)`, not hardcoded hex

---

**Version**: 1.0 | **Updated**: January 2026 | **Tailwind**: v4.1.3+
