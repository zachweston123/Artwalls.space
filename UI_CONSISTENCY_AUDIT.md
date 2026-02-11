# UI Consistency Audit — Artwalls.space

> **Gold standard**: `PricingPage.tsx` / `PurchasePage.tsx`
> Audit performed against the full `src/` tree.

---

## 1 · Design-system tokens added (`src/styles/theme.css`)

| Token | Light value | Dark value | Purpose |
|-------|------------|------------|---------|
| `--warning-muted` | `rgba(234,179,8,.12)` | `rgba(234,179,8,.15)` | Warning background tint |
| `--danger-muted` | `rgba(239,68,68,.10)` | `rgba(239,68,68,.15)` | Error / danger background tint |
| `--info` | `#3b82f6` | `#60a5fa` | Informational accent |
| `--info-muted` | `rgba(59,130,246,.10)` | `rgba(59,130,246,.15)` | Info background tint |
| `--skeleton` | `rgba(0,0,0,.06)` | `rgba(255,255,255,.06)` | Loading placeholder |

**shadcn/ui bridge tokens** were also added (`--background`, `--foreground`, `--card`, `--muted`, `--primary`, `--secondary`, `--destructive`, `--ring`, `--radius`, etc.) so that shadcn primitives map to the existing token palette.

---

## 2 · New primitives created

| Component | Path | Purpose |
|-----------|------|---------|
| `PageShell` | `src/components/ui/page-shell.tsx` | Consistent page container (max-width, padding, bg) |
| `SectionCard` | `src/components/ui/section-card.tsx` | Standard content card (rounded-xl, border, surface bg) |
| `StatCard` | `src/components/ui/stat-card.tsx` | KPI tile with color variants (blue · green · muted) |

---

## 3 · Existing primitives updated

| Component | Change |
|-----------|--------|
| `Skeleton` | `bg-accent` → `bg-[var(--skeleton)]` — prevents blue flash |
| `PageHeader` | Primary button green → blue; h1 `text-2xl sm:text-3xl`; added `focus-visible` |
| `EmptyState` | Primary button green → blue; icon bg `surface-3`; title `text-lg font-semibold` |

---

## 4 · Page-by-page changes

### ArtistDashboard.tsx
- Header: `text-3xl sm:text-4xl font-bold` → `text-2xl sm:text-3xl font-semibold`
- Search card: `rounded-lg` → `rounded-xl`; input `rounded-md` → `rounded-lg`
- Stat cards: `rounded-lg` → `rounded-xl`; icon badge `color-mix()` → `--blue-muted`
- Content cards: `rounded-lg` → `rounded-xl`; headings `font-bold` → `font-semibold`
- Secondary buttons: `font-semibold` → `font-medium`
- Fixed stray `}` typo in Why Artwalls button className

### VenueDashboard.tsx
- Stat card hover: `border-[var(--green)]` → `border-[var(--border-hover)]`
- Headings: `text-xl` → `text-lg font-semibold`
- Quick action button: added `font-medium text-sm`

### ArtistProfile.tsx
- Page heading: `text-3xl` → `text-2xl sm:text-3xl font-semibold`
- Upload error: hard-coded `red-500`/`red-600` → `--danger`/`--danger-muted`
- Section headings: added `font-semibold` consistently

### PublicArtistPage.tsx
- Avatar placeholder: `bg-gray-200` → `bg-[var(--surface-3)]`
- Header card: `rounded-2xl shadow-lg` → `rounded-xl shadow-md`
- Artist name: `text-3xl font-bold` → `text-2xl sm:text-3xl font-semibold`
- Section heading: `text-2xl font-bold` → `text-xl font-semibold`
- Artwork cards: `rounded-lg` → `rounded-xl`; hover border → `--border-hover`
- Empty state: `rounded-lg` → `rounded-xl`; bg `surface-2` → `surface-1`

### PublicVenuePage.tsx
- Heading: added `font-semibold`

### CuratedSetsMarketplace.tsx (worst dark-mode offender — fully fixed)
- 11 replacements: all `bg-white/5`, `border-white/10`, `text-gray-*`, `text-white`, `bg-blue-500`, `border-blue-400 text-blue-100 bg-blue-500/10` (active filter state) migrated to CSS-variable tokens (`--surface-1`, `--border`, `--text-muted`, `--text`, `--blue`, `--blue-muted`, `--on-blue`)

### ArtistOnboardingWizard.tsx
- Artwork error alert: `bg-red-500/10 border-red-500/30 text-red-500` → `--danger-muted`/`--danger`
- General error: `bg-red-50 dark:bg-red-900/20` (Tailwind `dark:` won't work with `data-theme`) → `--danger-muted`/`--danger`

### IconInput.tsx
- Error text: `text-red-500` → `text-[var(--danger)]`

### VenueProfile.tsx
- All 4 section headings (`text-lg`): added `font-semibold`

### ArtistArtworks.tsx
- Page heading: `text-3xl` → `text-2xl sm:text-3xl font-semibold`
- Modal heading: added `font-semibold`
- Empty state heading: `text-xl` → `text-lg font-semibold`

### Login.tsx
- Welcome heading: `text-3xl sm:text-4xl font-bold` → `text-2xl sm:text-3xl font-semibold`
- Role cards: `font-bold` → `font-semibold`
- Branding heading: added `font-semibold`
- Divider `bg-[var(--surface)]` → `bg-[var(--surface-1)]` (undefined token fix)

---

## 5 · Intentionally unchanged

| File | Hard-coded classes | Reason |
|------|-------------------|--------|
| `Settings.tsx` L573 `bg-white` / L597 `bg-gray-900` | Decorative — theme-preview icons that show what light/dark look like |
| `PublicArtistPage.tsx` L421 `bg-gray-800 text-white` | Dev-only debug panel (`process.env.NODE_ENV === 'development'`) |

---

## 6 · Pattern reference (gold standard)

| Element | Class pattern |
|---------|--------------|
| Card | `bg-[var(--surface-2)] rounded-xl border border-[var(--border)]` |
| Page heading | `text-2xl sm:text-3xl font-semibold` |
| Section heading | `text-lg font-semibold` |
| Sub-heading | `text-base font-semibold` |
| Body text | `text-[var(--text)]` |
| Muted text | `text-[var(--text-muted)]` |
| Primary button | `bg-[var(--blue)] text-[var(--on-blue)] hover:bg-[var(--blue-hover)] rounded-lg font-semibold` |
| Secondary button | `bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] rounded-lg font-medium` |
| Error text | `text-[var(--danger)]` |
| Error container | `bg-[var(--danger-muted)] border border-[var(--danger)]/30 rounded-lg` |
| Input | `rounded-lg border border-[var(--border)] bg-[var(--surface-1)]` |
| Stat card radius | `rounded-xl` |
| Hover border | `hover:border-[var(--border-hover)]` |
