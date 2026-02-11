# Artwalls.space — Production Readiness Changes

> Generated as part of the surgical production-readiness audit.
> All changes follow the "minimal, surgical, zero scope-creep" mandate.

---

## 1. Changes List

### P0-A: Debug / Refund Endpoints → 404
**Status: ✅ Already done — no changes needed**
- `worker/index.ts` line 532: `/api/debug/auth`, `/api/env/check`, `/api/debug/supabase` all return `404`.
- `server/index.js` is entirely deprecated (throws on line 13). Its debug routes are dead code.

### P0-B: Admin Auth Hygiene
**Files changed:**

| File | Change |
|------|--------|
| `src/components/admin/AdminPasswordPrompt.tsx` | Replaced `localStorage.setItem('adminPassword', password)` with `sessionStorage.setItem('adminSessionToken', token)`. Password is no longer persisted in plaintext; token lives only for the browser session. |
| `server/index.js` | Removed hardcoded `StormBL26` dev password fallback and `?admin=1` query-string bypass from `isAdmin()`. *(Dead code — server throws on line 13 — but sanitized for safety.)* |
| `src/App.tsx` | Added `sessionStorage.removeItem('adminSessionToken')` to the logout handler so admin tokens are cleared on sign-out. |

### P0-C: RLS / GRANT Fixes
**Status: ✅ Already done — no changes needed**
- Migration `20260210_fix_permissive_rls_policies.sql` already replaces `WITH CHECK (true)` / `USING (true)` with proper auth-based policies on `artists`, `orders`, `notifications`, `bookings`, `events`.
- Migration `20260211_support_messages.sql` already has correct RLS: `service_role` full access, `anon` INSERT-only.

### P0-D: Schema Naming Drift (wall_spaces vs wallspaces)
**New file:** `supabase/migrations/20260211_fix_wallspace_naming.sql`
- Enables RLS on canonical `wallspaces` table.
- Creates `venue_owner_rw` and `public_read` policies.
- Drops orphaned `wall_spaces` table.

### P0-E: Support → Admin Console End-to-End Auth
**Files changed:**

| File | Change |
|------|--------|
| `src/components/admin/SupportInbox.tsx` | Replaced bare `fetch()` with authenticated `apiGet()` from `../../lib/api`. |
| `src/components/admin/SupportMessageDetail.tsx` | Replaced bare `fetch()` for GET and PATCH with `apiGet()` / `apiPatch()`. |
| `src/lib/api.ts` | Added `apiPatch<T>()` function (was missing; `apiGet` and `apiPost` already existed). |
| `worker/index.ts` (PATCH handler) | Enhanced the `PATCH /api/admin/support/messages/:id/status` response to return the full updated message object instead of just `{ ok: true, status }`. |

### P0-F: No Refund Flows
**Status: ✅ Already done — no changes needed**
- Legal policies (Returns & Refunds, Cancellations, Damage-in-Transit, Misrepresentation) all say "All Sales Final".
- `AdminReturns.tsx` is a disabled stub showing "All Sales Final" — not routed in `App.tsx`.
- No refund action handlers or endpoints exist in Worker or frontend. `AdminSales.tsx` displays a `refunded` status badge (display-only; read from Stripe).

### P1-G: Order Economics Snapshot + Marketplace Checkout
**Files changed:**

| File | Change |
|------|--------|
| `worker/index.ts` | **NEW endpoint:** `POST /api/stripe/create-checkout-session` — looks up artwork + artist tier, calculates economics via `calculatePricingBreakdown`, inserts order with full snapshot columns, creates Stripe Checkout Session, returns `{ url }`. |
| `worker/index.ts` | **Enhanced webhook:** `checkout.session.completed` (payment mode) now retrieves PaymentIntent + charge, creates Stripe Transfers to artist and venue Connect accounts using snapshot data, updates order with `stripe_payment_intent_id`, `stripe_charge_id`, `transfer_ids`, `payout_status`, `payout_error`. |
| `supabase/migrations/20260211_fix_schema_gaps.sql` | Added Section 6: `stripe_checkout_session_id`, `stripe_payment_intent_id`, `stripe_charge_id`, `transfer_ids` (jsonb), `payout_status`, `payout_error` columns to `orders` table. |

### P1-H: PricingPage Earnings Calculator Bugs
**File changed:** `src/components/pricing/PricingPage.tsx`

| Bug | Fix |
|-----|-----|
| Free tier showed Starter data (`$9.00` sub, `starterEarnings`, `starterMonthly`) | Fixed to use `freeEarnings`, `freeMonthly`, `$0` subscription |
| Starter tier section was **completely missing** | Added full Starter calculator block with `starterEarnings`, `starterMonthly`, `$9` subscription |
| Growth tier Venue Commission row missing value span | Added `${formatCurrency(growthEarnings.venueAmount * 100)}` |
| Pro tier Venue Commission row missing value span | Added `${formatCurrency(proEarnings.venueAmount * 100)}` |

### P1-I: Agreements Lead with Take-Home
**Status: ✅ Already done — no changes needed**
- `ArtistAgreement.tsx` Section 8: "Artist take-home by plan" lists Free 60%, Starter 80%, Growth 83%, Pro 85%.
- `VenueAgreement.tsx` Section 7: Lists "Artist take-home: varies by plan (Free 60%, Starter 80%, Growth 83%, Pro 85%)".
- Both agreements say "All Sales Final" and reference 4.5% buyer fee, 15% venue commission.

### P2-J: Partner Kit PDF Label
**File changed:** `src/components/venue/VenuePartnerKitEmbedded.tsx`
- Button label changed from "Download Success Guide" to "Print / Save as PDF".
- Functionality unchanged: expands all sections, calls `window.print()`.

---

## 2. API Routes (Worker — `worker/index.ts`)

### Public (no auth)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Health text |
| GET | `/api/health` | Health JSON |
| POST | `/api/track` | Event tracking |
| POST | `/api/events` | Legacy event tracking |
| POST | `/api/support/messages` | Submit support message |
| GET | `/api/artworks` | List artworks |
| GET | `/api/artworks/:id` | Get single artwork |
| GET | `/api/artworks/:id/reactions` | Get reactions |
| GET | `/api/artworks/:id/link` | Get purchase link |
| GET | `/api/artworks/:id/qrcode.svg` | QR code SVG |
| GET | `/api/artworks/:id/qrcode.png` | QR code PNG |
| GET | `/api/artworks/:id/qr-poster` | Printable QR poster |
| GET | `/api/venues` | List venues |
| GET | `/api/venues/:id` | Get single venue |
| GET | `/api/public/artists/:id` | Public artist profile |
| GET | `/api/public/sets/:id` | Public curated set |

### Authenticated (Supabase JWT)
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/profile/me` | Any | Current user profile |
| GET | `/api/me` | Any | Current user (alt) |
| POST | `/api/profile/provision` | Any | Provision artist/venue profile |
| GET | `/api/stats/artist` | Artist | Artist dashboard stats |
| GET | `/api/stats/venue` | Venue | Venue dashboard stats |
| GET | `/api/analytics/artist` | Artist | Scan/view/checkout analytics |
| GET | `/api/analytics/venue` | Venue | Venue analytics |
| POST | `/api/artists/dismiss-momentum-banner` | Artist | Dismiss banner |
| GET | `/api/artists/:id` | Artist | Private artist profile |
| GET | `/api/artists` | Any | List artists (filtered) |
| POST | `/api/artists` | Any | Update/create artist |
| POST | `/api/venues` | Any | Update/create venue |
| POST | `/api/artworks` | Artist | Create artwork |
| POST | `/api/artworks/:id/reactions` | Any | React to artwork |
| POST | `/api/artworks/:id/approve` | Admin | Approve artwork |
| GET | `/api/venues/:id/wallspaces` | Venue | List wallspaces |
| POST | `/api/venues/:id/wallspaces` | Venue | Create wallspace |
| PATCH | `/api/wallspaces/:id` | Venue | Update wallspace |

### Stripe Integration
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/stripe/webhook` | Stripe sig | Webhook handler |
| **POST** | **`/api/stripe/create-checkout-session`** | **Rate-limited** | **NEW: Marketplace artwork purchase** |
| POST | `/api/stripe/billing/create-subscription-session` | Artist | Subscription checkout |
| POST | `/api/stripe/billing/create-portal-session` | Artist | Billing portal |
| POST | `/api/stripe/connect/artist/create-account` | Artist | Connect onboarding |
| POST | `/api/stripe/connect/artist/account-link` | Artist | Onboarding link |
| POST | `/api/stripe/connect/artist/login-link` | Artist | Dashboard link |
| GET | `/api/stripe/connect/artist/status` | Artist | Connect status |
| POST | `/api/stripe/connect/venue/create-account` | Venue | Connect onboarding |
| POST | `/api/stripe/connect/venue/account-link` | Venue | Onboarding link |
| POST | `/api/stripe/connect/venue/login-link` | Venue | Dashboard link |
| GET | `/api/stripe/connect/venue/status` | Venue | Connect status |

### Admin (JWT + `artists.role = 'admin'`)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin/wall-productivity` | Wall productivity metrics |
| GET | `/api/admin/support-tickets` | Support ticket list |
| GET | `/api/admin/support-tickets/:id/messages` | Ticket messages |
| GET | `/api/admin/support/messages` | Support messages (paginated) |
| GET | `/api/admin/support/messages/:id` | Single support message |
| PATCH | `/api/admin/support/messages/:id/status` | Update message status |

### Disabled (return 404)
| Method | Path |
|--------|------|
| GET | `/api/debug/auth` |
| GET | `/api/env/check` |
| GET | `/api/debug/supabase` |

---

## 3. SQL Migration Summary

| Migration | Purpose | Status |
|-----------|---------|--------|
| `20260210_fix_permissive_rls_policies.sql` | Fix `WITH CHECK(true)` / `USING(true)` on artists, orders, notifications, bookings, events | Pre-existing ✅ |
| `20260211_support_messages.sql` | Create `support_messages` table with correct RLS | Pre-existing ✅ |
| `20260211_fix_wallspace_naming.sql` | Enable RLS on `wallspaces`, drop orphaned `wall_spaces` | **New** |
| `20260211_fix_schema_gaps.sql` | Add snapshot + payout tracking columns to `orders`; add `venues.state`, `venues.subscription_tier/status`, `wallspaces.current_artwork_id`, `orders.venue_commission_cents` | **Modified** (added Section 6: Stripe + payout columns) |

### New columns added to `orders`:
```
list_price_cents          integer
buyer_fee_cents           integer  DEFAULT 0
buyer_total_cents         integer
venue_amount_cents        integer
artist_amount_cents       integer
platform_gross_before_stripe_cents  integer
artist_plan_id_at_purchase  text
stripe_checkout_session_id  text
stripe_payment_intent_id    text
stripe_charge_id            text
transfer_ids                jsonb
payout_status               text     DEFAULT 'pending_connect'
payout_error                text
venue_commission_cents      integer  DEFAULT 0
```

---

## 4. Smoke-Test Plan

### P0 Tests

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1 | Debug endpoints return 404 | `curl https://api.artwalls.space/api/debug/auth` | `{"error":"Not found"}` 404 |
| 2 | Admin token is session-only | Login as admin → check sessionStorage → close tab → reopen → check sessionStorage | Token present during session, gone after close |
| 3 | Admin logout clears token | Login as admin → sign out | `sessionStorage.getItem('adminSessionToken')` returns null |
| 4 | RLS blocks unauthorized writes | As anon, try `INSERT INTO artists ...` via Supabase client | Permission denied |
| 5 | Wallspaces table works | Query `SELECT * FROM wallspaces LIMIT 1` | Returns data; `wall_spaces` table does not exist |
| 6 | Support submit works | Submit contact form on any page | Row appears in `support_messages` table |
| 7 | Support inbox loads | Navigate to Admin → Support | Messages load with auth (no 401) |
| 8 | Support status update | Click status toggle in message detail | Status updates, returns full message |

### P1 Tests

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 9 | Marketplace checkout creates order | Click "Buy" on PurchasePage for available artwork | Redirects to Stripe Checkout; `orders` row has all snapshot columns populated |
| 10 | Payment webhook creates transfers | Complete Stripe test checkout | Order status = 'paid'; `transfer_ids` populated; artist + venue get transfers |
| 11 | PricingPage Free tier | Select "Free" in calculator | Shows 60% earnings, $0 subscription, `freeMonthly` net |
| 12 | PricingPage Starter tier | Select "Starter" in calculator | Shows 80% earnings, $9 subscription, `starterMonthly` net |
| 13 | PricingPage Growth tier | Select "Growth" in calculator | Shows 83% earnings, venue commission value displayed, $19 subscription |
| 14 | PricingPage Pro tier | Select "Pro" in calculator | Shows 85% earnings, venue commission value displayed, $39 subscription |
| 15 | Agreements show take-home first | Read Artist Agreement Section 8 | "Free: Take home 60%" listed before fee details |

### P2 Tests

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 16 | Partner Kit PDF | Click "Print / Save as PDF" in Venue Partner Kit | All sections expand; print dialog opens |

---

## 5. Risk Register

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Marketplace checkout endpoint is new code** — no existing tests | High | Rate-limited (10/min/IP). Order is cleaned up on Stripe failure. Economics use battle-tested `calculatePricingBreakdown`. Test in Stripe test mode before enabling live keys. |
| **Transfer failures in webhook** are logged but not retried | Medium | `payout_status` and `payout_error` columns enable manual admin follow-up. Stripe webhooks auto-retry failed deliveries for 72h. Consider adding an admin "retry transfers" button in future. |
| **`wall_spaces` DROP** may fail if other objects reference it | Low | Migration uses `DROP TABLE IF EXISTS`. If foreign keys exist, migration will error and can be adjusted. Run in staging first. |
| **server/index.js is dead code** with `throw` on line 13 | Low | All routes are served by Worker. Server should be deleted from repo in a cleanup pass to avoid confusion. |
| **sessionStorage admin token** is not a CSRF-resistant pattern | Low | Acceptable for admin console behind Supabase JWT. The token is never sent as a cookie; it's injected via `Authorization` header by `apiGet`/`apiPost`/`apiPatch`. |
| **Stripe Connect onboarding incomplete** for some artists/venues | Medium | Webhook handler sets `payout_status = 'blocked_pending_onboarding'` when venue lacks Connect account. Dashboard should surface this. |
| **`orders` table may lack some referenced columns** in older deployments | Low | All new columns use `ADD COLUMN IF NOT EXISTS` and have safe defaults. |

---

## 6. Files Modified Summary

```
Modified:
  src/App.tsx                                     (logout clears admin token)
  src/components/admin/AdminPasswordPrompt.tsx     (sessionStorage token)
  src/components/admin/SupportInbox.tsx            (authenticated apiGet)
  src/components/admin/SupportMessageDetail.tsx    (authenticated apiGet/apiPatch)
  src/components/pricing/PricingPage.tsx           (Free/Starter/Growth/Pro calculator fixes)
  src/components/venue/VenuePartnerKitEmbedded.tsx (PDF button label)
  src/lib/api.ts                                  (added apiPatch)
  server/index.js                                 (removed dev password fallback)
  worker/index.ts                                 (marketplace checkout + enhanced webhook + support PATCH response)
  supabase/migrations/20260211_fix_schema_gaps.sql (added payout tracking columns)

New:
  supabase/migrations/20260211_fix_wallspace_naming.sql
  PRODUCTION_READINESS_CHANGES.md                  (this file)
```
