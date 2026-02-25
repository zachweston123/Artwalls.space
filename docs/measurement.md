# Measurement & Analytics — Artwalls.space

> Single source of truth for event taxonomy, CWV targets, key funnels, and
> local verification steps.

---

## 1. Architecture Overview

```
Browser (web-vitals + trackAnalyticsEvent)
    │
    ▼  POST /api/analytics  { events: [...] }
Cloudflare Worker
    │  validates → rate-limits → hashes IP
    ▼
Supabase  analytics_events  table
    │
    ▼  (read by admin dashboards / SQL)
```

- **Frontend module**: `src/lib/analytics/` — batched, fire-and-forget, ~2 KB
- **Worker endpoint**: `POST /api/analytics` — accepts up to 25 events per request
- **Storage**: `analytics_events` table with RLS (service-role INSERT only)
- **No third-party trackers** — no Google Analytics, no Segment, no Mixpanel

The existing `app_events` table and `/api/track` endpoint are still used for
the QR → purchase funnel with server-side dedupe. The new `analytics_events`
table captures everything else (CWV, page views, funnel steps).

---

## 2. Core Web Vitals Targets

We target **p75 "good"** thresholds per Google's CWV programme:

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| **LCP** (Largest Contentful Paint) | ≤ 2.5 s | ≤ 4.0 s | > 4.0 s |
| **INP** (Interaction to Next Paint) | ≤ 200 ms | ≤ 500 ms | > 500 ms |
| **CLS** (Cumulative Layout Shift) | ≤ 0.1 | ≤ 0.25 | > 0.25 |
| **FCP** (First Contentful Paint) | ≤ 1.8 s | ≤ 3.0 s | > 3.0 s |
| **TTFB** (Time to First Byte) | ≤ 0.8 s | ≤ 1.8 s | > 1.8 s |

CWV events are collected via the `web-vitals` library (v4, tree-shaken,
dynamically imported) and sent as `cwv` events.

### CWV event shape

```json
{
  "name": "cwv",
  "properties": {
    "metric": "LCP",
    "value": 1823,
    "rating": "good",
    "navigationType": "navigate"
  }
}
```

### Querying CWV data

```sql
-- p75 LCP over the last 7 days
SELECT
  percentile_cont(0.75) WITHIN GROUP (ORDER BY (properties->>'value')::numeric) AS p75_lcp
FROM analytics_events
WHERE event_name = 'cwv'
  AND properties->>'metric' = 'LCP'
  AND created_at > now() - interval '7 days';
```

---

## 3. Event Taxonomy

Every event has a `name` and a typed `properties` bag.  No PII is ever
included — only opaque UUIDs, user roles, and structural metadata.

### 3.1 Core Web Vitals

| Event | Properties | When |
|-------|-----------|------|
| `cwv` | `metric`, `value`, `rating`, `navigationType` | Once per metric per page load |

### 3.2 Landing → Role Selection → Auth

| Event | Properties | When |
|-------|-----------|------|
| `landing_view` | `entryPath`, `utmSource?`, `utmMedium?`, `utmCampaign?` | Login / marketing pages viewed |
| `role_selected` | `role` (artist\|venue), `source` (landing\|google_oauth\|signup_form) | User picks artist or venue |
| `auth_complete` | `action` (signup\|login), `method` (email\|google), `role` | Successful authentication |

### 3.3 Onboarding (Artists)

| Event | Properties | When |
|-------|-----------|------|
| `onboarding_step` | `step` (1-6), `stepName`, `action` (started\|completed\|skipped) | Each onboarding step |
| `onboarding_finished` | `stepsCompleted`, `skippedPlanSelection` | Onboarding wizard completed |

### 3.4 Artwork Lifecycle

| Event | Properties | When |
|-------|-----------|------|
| `artwork_publish` | `artworkId`, `isFirstPublish` | Artwork successfully created/published |

### 3.5 Purchase Funnel (QR → View → Checkout → Purchase)

| Event | Properties | When |
|-------|-----------|------|
| `qr_scan` | `artworkId`, `venueId?`, `artistId?` | QR code scanned (purchase page mount) |
| `artwork_view` | `artworkId`, `venueId?`, `artistId?` | Artwork detail page viewed |
| `checkout_start` | `artworkId`, `venueId?`, `artistId?`, `priceUsd?` | Buy button clicked |
| `purchase_success` | `artworkId`, `venueId?`, `artistId?` | Payment confirmed |

> **Note:** `qr_scan`, `artwork_view`, and `checkout_start` are *also* written
> to the legacy `app_events` table via `POST /api/track` for backward
> compatibility with existing admin dashboards.

### 3.6 Navigation

| Event | Properties | When |
|-------|-----------|------|
| `page_view` | `page` (SPA page key), `path` (URL path + hash) | Every SPA navigation |

---

## 4. Key Funnels & Success Metrics

### Artist Activation Funnel

```
landing_view (entryPath=/) → role_selected (role=artist) → auth_complete (action=signup)
  → onboarding_step (step=1..6) → onboarding_finished
  → artwork_publish (isFirstPublish=true)
```

**Success metric:** % of signups that publish ≥ 1 artwork within 7 days.

### Venue Activation Funnel

```
landing_view (entryPath=/venues) → role_selected (role=venue) → auth_complete (action=signup)
  → page_view (page=venue-setup-wizard) → page_view (page=venue-dashboard)
```

**Success metric:** % of signups that complete setup and go live within 14 days.

### Checkout Funnel

```
qr_scan → artwork_view → checkout_start → purchase_success
```

**Success metric:** checkout_start → purchase_success conversion rate.

---

## 5. Privacy & PII Policy

| ✅ Collected | ❌ Never Collected |
|-------------|-------------------|
| Opaque UUIDs (user, artwork, venue) | Email addresses |
| User role (artist / venue / admin) | Names |
| SPA route / page key | Physical addresses |
| UTM parameters | Payment details |
| IP hash (truncated SHA-256, 16 chars) | Browser fingerprints |
| Session ID (random UUID in localStorage) | Precise geolocation |

The `ip_hash` column stores only the first 16 hex characters of a SHA-256
hash of the IP address — it cannot be reversed to the original IP.

---

## 6. Common Envelope

Every event sent to `/api/analytics` is wrapped in this envelope:

```ts
interface AnalyticsEnvelope {
  name: string;              // Event name from taxonomy
  properties: object;        // Typed property bag
  timestamp: string;         // ISO 8601 from browser
  sessionId: string;         // Stable anonymous session ID
  route: string;             // Current SPA page key
  userRole: string | null;   // 'artist' | 'venue' | 'admin' | null
}
```

The Worker adds `user_id` (from JWT if present), `created_at` (server time),
and `ip_hash` before inserting into the database.

---

## 7. Lighthouse CI

A Lighthouse audit runs on every PR via `.github/workflows/lighthouse.yml`.

### Pages audited

| URL | What it covers |
|-----|---------------|
| `/` | Home / login landing page (LCP, FCP, CLS) |
| `/why-artwalls` | Marketing page (image-heavy) |
| `/venues` | Venue landing page |
| `/pricing` | Pricing page |

### Budgets (initial, lenient)

Defined in `.github/lighthouse/budget.json`:

- **Interactive (TTI):** ≤ 5 s (+ 1 s tolerance)
- **FCP:** ≤ 2.5 s (+ 0.5 s tolerance)
- **LCP:** ≤ 4.0 s (+ 1 s tolerance)
- **Total JS:** ≤ 500 KB
- **Total page weight:** ≤ 1.5 MB

Reports are uploaded as GitHub Actions artifacts and retained for 14 days.

### Tightening budgets

Once a baseline is established, tighten budgets by editing
`.github/lighthouse/budget.json`.  Recommended progression:

1. **Week 1–2:** Warning-only (current)
2. **Month 1:** Reduce tolerance to 500 ms
3. **Month 2+:** Make blocking (remove tolerance or switch to assertions)

---

## 8. Verifying Events Locally

### 8.1 See CWV + page view events in the Network tab

1. `npm run dev` — starts Vite on localhost:5173
2. Open Chrome DevTools → Network → filter by `analytics`
3. Navigate around the app
4. You'll see `POST /api/analytics` requests containing batched events

### 8.2 Inspect payloads

Each request body is:

```json
{
  "events": [
    {
      "name": "page_view",
      "properties": { "page": "artist-dashboard", "path": "/artist/dashboard" },
      "timestamp": "2026-02-25T12:00:00.000Z",
      "sessionId": "a1b2c3d4-...",
      "route": "artist-dashboard",
      "userRole": "artist"
    },
    {
      "name": "cwv",
      "properties": { "metric": "LCP", "value": 1823, "rating": "good" },
      "timestamp": "2026-02-25T12:00:01.000Z",
      "sessionId": "a1b2c3d4-...",
      "route": "artist-dashboard",
      "userRole": "artist"
    }
  ]
}
```

### 8.3 Verify events hit the database

```sql
-- Recent events
SELECT event_name, user_role, route, properties, created_at
FROM analytics_events
ORDER BY created_at DESC
LIMIT 20;

-- Funnel: how many role selections by type
SELECT properties->>'role' AS role, count(*)
FROM analytics_events
WHERE event_name = 'role_selected'
GROUP BY 1;
```

### 8.4 Verify no PII

Run this check — it should return 0 rows:

```sql
SELECT id, event_name, properties::text
FROM analytics_events
WHERE properties::text ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'
LIMIT 10;
```

### 8.5 Run Lighthouse locally

```bash
npm run build
npx serve -s dist -l 5173 &
npx @lhci/cli autorun --collect.url=http://localhost:5173/
```

---

## 9. Files Reference

| File | Purpose |
|------|---------|
| `src/lib/analytics/index.ts` | Barrel export |
| `src/lib/analytics/trackEvent.ts` | `trackAnalyticsEvent()` + batching + flush |
| `src/lib/analytics/cwv.ts` | Core Web Vitals collection via `web-vitals` |
| `src/lib/analytics/types.ts` | TypeScript types for all events |
| `src/lib/trackEvent.ts` | Legacy QR funnel tracking (still used) |
| `src/lib/sessionId.ts` | Stable anonymous session ID |
| `worker/index.ts` | `POST /api/analytics` endpoint |
| `supabase/migrations/20260225_analytics_events.sql` | `analytics_events` table |
| `.github/workflows/lighthouse.yml` | Lighthouse CI workflow |
| `.github/lighthouse/budget.json` | Performance budgets |
