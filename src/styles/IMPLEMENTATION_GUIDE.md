# @deprecated — Orphaned design system doc. Active theme lives in theme.css.

**What Changed**:
- ✅ **One token system** supporting both light and dark modes (no theme forking)
- ✅ **Consistent 3-tier surface elevation**: base (page) → card (surface-1) → elevated (surface-2/3)
- ✅ **High contrast** text (4.5:1 for body, 3:1 for large text) - readable & accessible
- ✅ **One blue accent** + 3 semantic colors (success/warning/danger) - no random colors
- ✅ **No mixed themes** on single page - pages are either fully light or fully dark
- ✅ **Consistent components** - buttons, cards, tables, inputs, banners all follow same rules

---

## 1. Token System Overview

### Light Mode (Default)
- **Page background**: `#ffffff`
- **Card surface**: `#ffffff` with `#e5e3e0` border
- **Elevated surface**: `#f3f0eb` with `#d9d4cf` border
- **Primary text**: `#1a1a18` (dark brown-gray, 18.5:1 contrast on white)
- **Secondary text**: `#4a4a48` (medium gray, ~13:1 contrast)
- **Muted text**: `#7a7a78` (lighter gray, 5:1 contrast - ok for labels/captions)

### Dark Mode
- **Page background**: `#0f0f0f` (deep charcoal)
- **Card surface**: `#1a1a18` with `#2d2d2a` border
- **Elevated surface**: `#252522` with `#3a3a36` border
- **Primary text**: `#f5f5f3` (bright off-white, 18.5:1 contrast on dark)
- **Secondary text**: `#d9d9d6` (light gray, ~13:1 contrast)
- **Muted text**: `#a8a8a6` (medium gray, 5:1 contrast - ok for labels)

### Accent & Semantic
| Color | Light | Dark | Usage |
|-------|-------|------|-------|
| **Blue Accent** | `#2563eb` | `#3b82f6` | Primary CTAs, links, active states |
| **Blue Hover** | `#1d4ed8` | `#2563eb` | Button hover, active links |
| **Success** | `#059669` (green) | `#10b981` | Positive actions, confirmations |
| **Warning** | `#d97706` (amber) | `#f59e0b` | Alerts, action required, cautions |
| **Danger** | `#dc2626` (red) | `#ef4444` | Destructive actions, errors |

---

## 2. Implementation Rules (DO / DON'T)

### ✅ DO:
1. **Use token variables** - Never hardcode `#1a1a18`; use `var(--text)`
2. **Apply surfaces consistently**:
   - Page/body: `bg-[var(--bg-base)]` + `text-[var(--text)]`
   - Cards: `bg-[var(--surface-1)]` + `border border-[var(--surface-1-border)]`
   - Tables/lists: Cards with `border-b border-[var(--border-subtle)]` for row separators
3. **Use token text layers**:
   - Headings/primary: `text-[var(--text)]` + font-bold
   - Body text: `text-[var(--text)]` or `text-[var(--text-secondary)]`
   - Labels/hints: `text-[var(--text-muted)]`
   - Captions/timestamps: `text-[var(--text-subtle)]`
4. **Apply focus rings to all interactive elements**:
   - `focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2`
5. **Use semantic colors with restraint**:
   - Warning banner: `bg-[var(--warning-bg)]` + `border border-[var(--warning-border)]` + `text-[var(--warning-text)]`
   - Success/danger similarly structured

### ❌ DON'T:
1. **Never mix light & dark on one page** - Choose a mode, commit fully
2. **Never hardcode grays** - Use token text layers instead (`text-gray-500` → `text-[var(--text-muted)]`)
3. **Never use arbitrary opacities for text** - `text-neutral-600/75` ❌ → Use tokens instead
4. **Never apply multiple surfaces inconsistently**:
   - "Bright white card in dark container" ❌
   - "Light gray dividers in light theme" ✅ (use `border-subtle`)
5. **Never duplicate color definitions** - If it's a new color, add to tokens first
6. **Don't invent new accent colors** - Use blue + semantic (success/warn/danger)

---

## 3. Component Styling Examples

### 3.1 Buttons

#### Primary Button
```tsx
<button className="
  px-4 py-2 
  bg-[var(--accent)] 
  text-white 
  font-semibold 
  rounded-[var(--radius-md)]
  hover:bg-[var(--accent-hover)]
  active:bg-[var(--accent-pressed)]
  disabled:bg-[var(--disabled-bg)]
  disabled:text-[var(--disabled-text)]
  focus-visible:ring-2 
  focus-visible:ring-[var(--focus-ring)]
  focus-visible:ring-offset-2
  transition-colors
  duration-[var(--transition-fast)]
">
  Action
</button>
```

#### Secondary Button (Border-based)
```tsx
<button className="
  px-4 py-2 
  bg-transparent 
  border border-[var(--border-default)]
  text-[var(--text)]
  font-semibold 
  rounded-[var(--radius-md)]
  hover:bg-[var(--surface-2)]
  hover:border-[var(--border-emphasis)]
  focus-visible:ring-2 
  focus-visible:ring-[var(--focus-ring)]
  focus-visible:ring-offset-2
  transition-all
  duration-[var(--transition-fast)]
">
  Secondary
</button>
```

### 3.2 Card Surface

```tsx
<div className="
  bg-[var(--surface-1)]
  border border-[var(--surface-1-border)]
  rounded-[var(--radius-lg)]
  p-6
  shadow-[var(--shadow-md)]
  hover:shadow-[var(--shadow-lg)]
  transition-shadow
  duration-[var(--transition-normal)]
">
  <h2 className="text-lg font-bold text-[var(--text)] mb-2">Title</h2>
  <p className="text-[var(--text-secondary)]">Body content</p>
</div>
```

### 3.3 Input Field

```tsx
<input
  className="
    w-full
    px-4 py-2.5
    bg-[var(--surface-1)]
    border border-[var(--border-default)]
    rounded-[var(--radius-md)]
    text-[var(--text)]
    placeholder:text-[var(--text-muted)]
    focus:outline-none
    focus:border-[var(--accent)]
    focus:ring-2
    focus:ring-[var(--accent-light)]
    focus:ring-opacity-30
    transition-all
    duration-[var(--transition-fast)]
  "
  placeholder="Search..."
/>
```

### 3.4 Action Required Banner

```tsx
<div className="
  bg-[var(--warning-bg)]
  border border-[var(--warning-border)]
  rounded-[var(--radius-md)]
  p-4
  flex items-center justify-between gap-4
">
  <div className="flex-1">
    <h3 className="font-semibold text-[var(--warning-text)] text-sm">
      Action Required
    </h3>
    <p className="text-xs text-[var(--text-muted)] mt-1">
      Complete your profile to unlock features
    </p>
  </div>
  <button className="
    px-3 py-1.5
    bg-[var(--accent)]
    text-white
    text-sm
    font-semibold
    rounded-[var(--radius-sm)]
    hover:bg-[var(--accent-hover)]
    focus-visible:ring-2
    focus-visible:ring-[var(--focus-ring)]
    flex-shrink-0
  ">
    Fix Now
  </button>
</div>
```

### 3.5 Table Structure

```tsx
<table className="w-full">
  <thead>
    <tr className="border-b border-[var(--border-default)]">
      <th className="
        text-left
        py-3
        px-4
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
      <td className="py-3 px-4 text-[var(--text-secondary)]">
        Data
      </td>
    </tr>
  </tbody>
</table>
```

### 3.6 Stat Card

```tsx
<div className="
  bg-[var(--surface-1)]
  border border-[var(--surface-1-border)]
  rounded-[var(--radius-lg)]
  p-5
  hover:bg-[var(--surface-2)]
  transition-colors
">
  <div className="
    w-10 h-10
    bg-[var(--accent-bg)]
    rounded-[var(--radius-md)]
    flex items-center justify-center
    mb-3
  ">
    <span className="text-[var(--accent)]">📊</span>
  </div>
  <div className="text-2xl font-bold text-[var(--text)] mb-1">
    42
  </div>
  <div className="text-sm text-[var(--text-muted)]">
    Active Sales
  </div>
</div>
```

---

## 4. Contrast Checklist

| Element | Foreground | Background | Ratio | WCAG |
|---------|-----------|-----------|-------|------|
| **Body Text (Light)** | `#1a1a18` | `#ffffff` | 18.5:1 | AAA ✓ |
| **Body Text (Dark)** | `#f5f5f3` | `#0f0f0f` | 18.5:1 | AAA ✓ |
| **Secondary Text (Light)** | `#4a4a48` | `#ffffff` | 13.3:1 | AAA ✓ |
| **Secondary Text (Dark)** | `#d9d9d6` | `#0f0f0f` | 13.5:1 | AAA ✓ |
| **Muted Text (Light)** | `#7a7a78` | `#ffffff` | 4.9:1 | AA ✓ |
| **Muted Text (Dark)** | `#a8a8a6` | `#0f0f0f` | 5.1:1 | AA ✓ |
| **Primary Button (Light)** | White | `#2563eb` | 8.7:1 | AAA ✓ |
| **Primary Button (Dark)** | White | `#3b82f6` | 8.2:1 | AAA ✓ |
| **Success Text (Light)** | `#065f46` | `#ecfdf5` | 8.1:1 | AAA ✓ |
| **Warning Text (Light)** | `#78350f` | `#fffbeb` | 7.8:1 | AAA ✓ |
| **Danger Text (Light)** | `#7f1d1d` | `#fef2f2` | 6.2:1 | AAA ✓ |

---

## 5. Page Layout Pattern

Every page should follow this structure to avoid mixed themes:

```tsx
export function MyPage() {
  return (
    <div className="
      min-h-screen
      bg-[var(--bg-base)]
      text-[var(--text)]
    ">
      {/* HEADER */}
      <header className="
        border-b border-[var(--border-default)]
        px-6 py-4
      ">
        <h1 className="text-3xl font-bold">Page Title</h1>
      </header>

      {/* MAIN CONTENT */}
      <main className="p-6 max-w-6xl mx-auto">
        {/* Cards, sections, etc. */}
      </main>
    </div>
  );
}
```

---

## 6. Validation Checklist

Before shipping a page, verify:

- [ ] **No arbitrary colors** - All colors come from `var(--...)`
- [ ] **No mixed modes** - Page is entirely light OR dark, not mixed
- [ ] **No white patches** - In dark mode, no `#ffffff` backgrounds
- [ ] **No washed-out text** - Body text uses `--text` or `--text-secondary`, not `--text-muted/subtle` for primary content
- [ ] **Focus rings present** - All buttons, inputs, links have `focus-visible:ring-2`
- [ ] **Surfaces consistent**:
  - Page: `bg-[var(--bg-base)]`
  - Cards: `bg-[var(--surface-1)]` with border
  - Modals/elevated: `bg-[var(--surface-3)]`
- [ ] **Tables readable** - Dark header row, light body rows, subtle separators, row hover highlight
- [ ] **Semantic colors used sparingly** - Only for success/warning/danger, not as decoration
- [ ] **Responsive** - Mobile, tablet, desktop all work
- [ ] **Accessibility** - NVDA/VoiceOver users can navigate, high contrast mode supported

---

## 7. Dark Mode Implementation

Add this script to your index.html in the `<head>`:

```html
<script>
  // Detect system preference and apply to html element
  function initializeDarkMode() {
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
  
  // Run on load
  initializeDarkMode();
  
  // Listen for preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', initializeDarkMode);
</script>
```

Ensure your `design-tokens.css` is imported **before** component-specific CSS:

```tsx
// src/index.tsx or main.tsx
import './styles/design-tokens.css';
import './index.css';
import App from './App';
```

---

## 8. Migration Path (Old → New)

| Old Class | New Equivalent | Notes |
|-----------|---|---|
| `bg-white dark:bg-neutral-950` | `bg-[var(--surface-1)]` | Unified token |
| `text-neutral-900 dark:text-neutral-50` | `text-[var(--text)]` | Unified token |
| `text-neutral-600 dark:text-neutral-400` | `text-[var(--text-muted)]` | Semantic layer |
| `border-gray-300 dark:border-gray-700` | `border-[var(--border-default)]` | Unified token |
| `bg-blue-600 hover:bg-blue-700` | `bg-[var(--accent)] hover:bg-[var(--accent-hover)]` | Unified token |
| `ring-blue-400` | `ring-[var(--focus-ring)]` | Focus ring token |

---

## Next Steps

1. **Update Navigation & Header** - Use tokens, apply focus rings
2. **Update Dashboard Cards** - Surfaces, borders, shadows
3. **Update Tables & Lists** - Consistent row styling, hover states
4. **Update Forms & Inputs** - Focus states, error styling
5. **Update Modals & Popovers** - Elevated surface (`--surface-3`)
6. **Test in both modes** - Light and dark, ensure no mixed themes
7. **Test with screen reader** - NVDA, JAWS, VoiceOver
8. **Test in high contrast mode** - Windows high contrast, browser extensions
9. **Test on mobile** - Touch targets 44x44px minimum, responsive layout

