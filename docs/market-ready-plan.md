# Market-Readiness Refinement Plan

_Last updated: 2026-01-26_

## Priority 0 (Launch Blockers / Immediate Conversion & Reliability Wins)

- **Unify payout math + persisted order snapshots**
  - Consolidate calculations behind a shared helper (extend [worker/orderSettlement.ts](worker/orderSettlement.ts) to export a canon function used by webhook/order reserve paths and align with [src/lib/pricingCalculations.ts](src/lib/pricingCalculations.ts)).
  - Persist buyer fee, buyer total, platform share, venue share, artist share, calc version, and tier snapshot on `orders` updates (touch existing insert/update blocks in [worker/index.ts](worker/index.ts)).
  - Update UX surfaces (Pricing page, dashboards, purchase page) to read from shared helper/copy so "Take home X%" matches tier and venue cut.
- **Deduplicate Stripe webhook + checkout session handlers**
  - Collapse duplicate `/api/stripe/webhook` and `/api/stripe/create-checkout-session` branches in [worker/index.ts](worker/index.ts) into a single path that uses shared helpers.
  - Enforce idempotency via `webhook_events` table lookups before processing and ensure transfers only run once.
  - Improve logging with structured context (event id, order id, transfer ids) and guard against logging secrets.
- **QR purchase landing conversion polish**
  - Optimise [src/components/PurchasePage.tsx](src/components/PurchasePage.tsx) for mobile: defer non-essential fetches, add lightweight skeleton, move CTA above fold, clarify fee breakdown using shared helper outputs, and tighten error messaging/retry copy.
- **Connect onboarding clarity in dashboards**
  - Reuse existing checklist components ([src/components/venue/SetupHealthChecklist.tsx](src/components/venue/SetupHealthChecklist.tsx), [src/components/artist/ArtistPayoutsCard.tsx](src/components/artist/ArtistPayoutsCard.tsx)) to surface "Connect status" and CTA if account incomplete; ensure status polling debounced via worker `/api/stripe/connect/*/status` endpoints.

## Priority 1 (Trust, Support Load, and Onboarding Efficiency)

- **Refund / reversal handling**
  - Extend worker webhook processing to catch `charge.refunded` / `charge.refund.updated` events, reverse platform/venue transfers proportionally, and persist refund metadata on `orders`.
- **Notification & checklist coherence**
  - Audit existing notifications (artist + venue) to ensure copy references accurate earnings split and next steps; reuse checklist statuses across dashboards.
- **Performance tuning for marketing & dashboards**
  - Lazy-load heavy admin/marketing components, compress hero imagery, and ensure QR landing has pre-generated responsive assets.
- **Accessibility pass on navigation and CTA buttons**
  - Align color tokens for contrast, add focus states on icon buttons (Navigation bell/logout) and ensure ARIA labels on CTA icons.

## Priority 2 (SEO, Analytics, and Nice-to-Have Enhancements)

- **Funnel analytics unification**
  - Build thin wrapper over existing analytics service to emit `qr_scan_or_open`, `artwork_view`, `start_checkout`, `checkout_error`, `purchase_success`, `connect_started`, `connect_completed`, `subscription_started`, `subscription_active` events (non-PII) and route to Supabase `analytics_events`.
- **SEO & share metadata polish**
  - Ensure marketing pages and PurchasePage set dynamic `<title>`, OG tags, canonical URLs using existing theming utilities.
- **Admin tooling for webhook monitoring**
  - Surface latest webhook events & transfer outcomes inside Admin sales/support views to speed up triage.
- **Progressive enhancement for venue partner kit**
  - Remove `.bak` duplicates, tighten embed performance, and cache partner resources for offline reference.
