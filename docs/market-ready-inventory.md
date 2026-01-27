# Market-Ready Inventory

_Last updated: 2026-01-26_

## Route Map (App Shell in [src/App.tsx](src/App.tsx))

- **Public / Marketing**
  - Landing & learn: why-artwalls-artist, why-artwalls-venue/venues, plans-pricing ([src/pages/WhyArtwallsArtists.tsx](src/pages/WhyArtwallsArtists.tsx), [src/pages/VenuesLanding.tsx](src/pages/VenuesLanding.tsx), [src/components/pricing/PricingPage.tsx](src/components/pricing/PricingPage.tsx))
  - Policies & agreements: policies, privacy-policy, terms-of-service, artist-agreement, venue-agreement ([src/components/legal](src/components/legal))
  - Venue invite deep links `/v/invite/:token` ([src/pages/VenueInviteLanding.tsx](src/pages/VenueInviteLanding.tsx))
  - Email verification `/verify-email` ([src/pages/VerifyEmail.tsx](src/pages/VerifyEmail.tsx))
- **Auth & Core Utility**
  - login view ([src/components/Login.tsx](src/components/Login.tsx))
  - Profile completion after OAuth ([src/components/ProfileCompletion.tsx](src/components/ProfileCompletion.tsx))
  - Agreement gating via AgreementBanner ([src/components/legal/AgreementBanner.tsx](src/components/legal/AgreementBanner.tsx))
- **Artist surfaces**
  - Dashboards & stats: artist-dashboard ([src/components/artist/ArtistDashboard.tsx](src/components/artist/ArtistDashboard.tsx))
  - Art lifecycle: artist-artworks, artist-sales, artist-profile/profile-edit, artist-venues/find venues, artist-applications, artist-invites ([src/components/artist](src/components/artist))
  - Security & notifications: artist-password-security, artist-notifications ([src/components/artist/PasswordSecurity.tsx](src/components/artist/PasswordSecurity.tsx), [src/components/notifications/NotificationsList.tsx](src/components/notifications/NotificationsList.tsx))
- **Venue surfaces**
  - Dashboards & setup: venue-dashboard, venue-setup ([src/components/venue/VenueDashboard.tsx](src/components/venue/VenueDashboard.tsx), [src/components/venue/VenueSetupWizard.tsx](src/components/venue/VenueSetupWizard.tsx))
  - Walls & scheduling: venue-walls, venue-current, venue-sales, find-art, venue-find-artists ([src/components/venue/VenueWalls.tsx](src/components/venue/VenueWalls.tsx), [src/components/venue/VenueCurrentArtWithScheduling.tsx](src/components/venue/VenueCurrentArtWithScheduling.tsx))
  - Partner enablement: venue-partner-kit, venue-partner-kit embedded, venue-hosting-policy, venues-apply ([src/components/venue/VenuePartnerKit.tsx](src/components/venue/VenuePartnerKit.tsx), [src/components/venue/VenuePartnerKitEmbedded.tsx](src/components/venue/VenuePartnerKitEmbedded.tsx))
  - Settings & notifications: venue-profile, venue-settings, venue-password-security, venue-notifications ([src/components/venue/VenueProfile.tsx](src/components/venue/VenueProfile.tsx), [src/components/venue/VenueSettingsWithEmptyState.tsx](src/components/venue/VenueSettingsWithEmptyState.tsx))
- **Admin surfaces**
  - Admin hub: admin-dashboard, admin-users/detail, admin-sales, admin-support, admin-invites, admin-current-displays, admin-activity-log ([src/components/admin](src/components/admin))
- **Purchase / QR flow**
  - Purchase page triggered by `purchase-${artworkId}` state ([src/components/PurchasePage.tsx](src/components/PurchasePage.tsx))
  - QR generation & registry handled server-side (worker generateQrSvg usage in [worker/index.ts](worker/index.ts))

## Facet Inventory & Key Implementations

- **Authentication & Onboarding**
  - Supabase client in [src/lib/supabase.ts](src/lib/supabase.ts); auth session wiring in App shell
  - Google OAuth role selection & profile provisioning in [src/App.tsx](src/App.tsx)
  - Profile completion prompt in [src/components/ProfileCompletion.tsx](src/components/ProfileCompletion.tsx)
- **Artist Lifecycle**
  - Dashboard metrics & stats fetch from `/api/stats/artist` fallback to `/api/artworks` ([src/components/artist/ArtistDashboard.tsx](src/components/artist/ArtistDashboard.tsx))
  - Artwork CRUD via `/api/artworks` endpoints from worker ([worker/index.ts](worker/index.ts))
  - Venue discovery UI ([src/components/artist/FindVenues.tsx](src/components/artist/FindVenues.tsx))
  - Invitations & applications handled with [src/components/shared/ApplicationsAndInvitations.tsx](src/components/shared/ApplicationsAndInvitations.tsx)
- **Venue Lifecycle**
  - Setup wizard storing progress into venues table ([src/components/venue/VenueSetupWizard.tsx](src/components/venue/VenueSetupWizard.tsx), [src/db/migrations/add_venue_setup.sql](src/db/migrations/add_venue_setup.sql))
  - Venue dashboard modules ([src/components/venue/VenueDashboardModule.tsx](src/components/venue/VenueDashboardModule.tsx))
  - Venue partner kit embed & success resources ([src/components/venue/VenuePartnerKitEmbedded.tsx](src/components/venue/VenuePartnerKitEmbedded.tsx))
  - Scheduling & bookings via `/api/venues/:id/schedule` endpoints (frontend in [src/lib/api.ts](src/lib/api.ts), backend placeholders in [worker/index.ts](worker/index.ts))
- **Artwork Discovery & QR**
  - Public walls & profiles ([src/components/venue/VenueWallsPublic.tsx](src/components/venue/VenueWallsPublic.tsx), [src/components/artist/ArtistProfileView.tsx](src/components/artist/ArtistProfileView.tsx))
  - QR code creation persisted to artworks table through worker generateQrSvg
- **Checkout & Payments**
  - Checkout session creation client in [src/components/PurchasePage.tsx](src/components/PurchasePage.tsx) calling `/api/stripe/create-checkout-session`
  - Pricing calculators & copy in [src/lib/pricingCalculations.ts](src/lib/pricingCalculations.ts) and [src/components/pricing/PricingPage.tsx](src/components/pricing/PricingPage.tsx)
  - Stripe Connect onboarding flows for artists/venues in worker endpoints `/api/stripe/connect/*` (see [worker/index.ts](worker/index.ts))
- **Admin & Support**
  - Admin sidebar & modules ([src/components/admin/AdminSidebar.tsx](src/components/admin/AdminSidebar.tsx), [src/components/admin/AdminSupport.tsx](src/components/admin/AdminSupport.tsx))
  - Support Inbox detail ([src/components/admin/SupportMessageDetail.tsx](src/components/admin/SupportMessageDetail.tsx))
- **Notifications & Messaging**
  - Fetch API wrappers in [src/lib/api.ts](src/lib/api.ts) hitting `/api/notifications`
  - Worker inserts into notifications table upon order completion ([worker/index.ts](worker/index.ts))
- **Analytics & Tracking**
  - Venue setup analytics service in [src/services/setup-analytics.ts](src/services/setup-analytics.ts) logging to `analytics_events`
  - No global funnel tracker found beyond venue setup
- **Legal / Policies**
  - Policy landing, agreements, hosting policy components located under [src/components/legal](src/components/legal)

## Data Surfaces & Tables Observed

- Core commerce: `orders`, `artworks`, `artists`, `venues` (read/write via worker)
- Financial routing: `orders.transfer_ids` merged with [worker/orderSettlement.ts](worker/orderSettlement.ts)
- Event tracking & idempotency: `webhook_events` (worker stores processed Stripe events)
- Operations: `notifications`, `venue_invites`, `venue_invite_events`, `wallspaces`
- Programs: `students`, `student_verifications`, `schools`
- Analytics: `analytics_events` via setup analytics service
- Admin review: `admin_approvals` created in migration but usage not wired in worker yet

## Payout Calculations & Persistence

- Frontend economic model defined in [src/lib/pricingCalculations.ts](src/lib/pricingCalculations.ts) with buyer fee 4.5%, venue 15%, tiered artist share (60/80/83/85). Tests live in [src/lib/__tests__/pricingCalculations.test.ts](src/lib/__tests__/pricingCalculations.test.ts).
- Checkout page reiterates copy in [src/components/pricing/PricingPage.tsx](src/components/pricing/PricingPage.tsx) and [src/components/PurchasePage.tsx](src/components/PurchasePage.tsx) but currently presents artist share as ~80% without conditioning by tier.
- Worker settlement source of truth: [worker/orderSettlement.ts](worker/orderSettlement.ts) `calculateOrderFinancials` + `mergeTransferRecords`.
- Worker order creation (multiple locations) stores `amount_cents`, `platform_fee_bps`, `venue_fee_bps`, `platform_fee_cents`, `artist_payout_cents`, `venue_payout_cents`, but omits buyer fee, buyer total, calc version, or subscription tier snapshot ([worker/index.ts](worker/index.ts)).
- Duplicated payout math snippets inline inside `/api/stripe/webhook` handler (manual Math.floor rather than shared helper), creating drift from `orderSettlement.ts` and frontend percentages.

## Stripe Webhooks & Connect Flow

- Webhook verification implemented in [worker/stripeWebhook.ts](worker/stripeWebhook.ts); worker fetch handler routes `/api/stripe/webhook` twice (legacy+new blocks). Events forwarded to REST backend (`/api/stripe/webhook/forwarded`) and processed locally.
- Checkout session completion handled both inline inside webhook handler and via `processCheckoutSessionCompleted` function later in [worker/index.ts](worker/index.ts), with overlapping logic for transfers, notifications, and order updates.
- Idempotency partially addressed via `webhook_events` table but not enforced consistently across duplicate handlers.
- Refund or transfer reversal handling not located in worker.
- Stripe Connect onboarding endpoints for artists/venues located in worker (create account, account link, login link, status). Frontend triggers exist via [src/lib/api.ts](src/lib/api.ts) and dashboards.

## Duplicates / Competing Implementations Detected

- Duplicate definitions of `/api/stripe/create-checkout-session`, `/api/stripe/billing/create-subscription-session`, `/api/stripe/billing/create-portal-session`, and `/api/stripe/webhook` within [worker/index.ts](worker/index.ts) (legacy block near top, newer block later) causing divergent business logic.
- Two partner kit component versions (`VenuePartnerKit*.tsx` and `VenuePartnerKit*.tsx.bak`) under [src/components/venue](src/components/venue) — `.bak` copies likely obsolete.
- Both `VenueCurrentArt.tsx` and `VenueCurrentArtWithScheduling.tsx` present; dashboards use the scheduling variant while older component persists.
- Analytics split between inline console logging and dedicated setup analytics service; no single wrapper for broader product funnel events.
- Frontend payout copy exists in Pricing page, Purchase page, and dash widgets without central helper usage, leading to inconsistent phrasing.

## Test Coverage Snapshot

- Unit tests present only for pricing breakdown helper ([src/lib/__tests__/pricingCalculations.test.ts](src/lib/__tests__/pricingCalculations.test.ts)).
- No automated tests for worker settlement logic or webhook handling detected.

## Observed Risk Areas for Refinement

- Economic data persisted server-side lacks buyer fee records & calc versioning.
- Webhook handling is duplicated and mixes synchronous insert + async transfer logic without robust idempotency or refund pathways.
- Frontend copy and payouts mention "~80%" without reflecting tier-specific or venue cut details, risking trust issues.
- QR landing (PurchasePage) performs multiple sequential API calls and lacks skeleton/perf optimisations for mobile use.
- Analytics events limited to venue setup; no checkout funnel instrumentation beyond notifications.
