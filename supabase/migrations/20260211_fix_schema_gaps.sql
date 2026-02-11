-- ============================================================================
-- Fix schema gaps: columns referenced by app code but missing from DB
-- ============================================================================

BEGIN;

-- ── 1. venues.state ─────────────────────────────────────────────────────────
-- get_public_artist_artworks() selects v.state as venue_state
-- but the column was never added to the venues table.
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS state text;

-- ── 2. venues.subscription_tier / subscription_status ───────────────────────
-- Worker /api/stats/venue queries these for venue tier gating, but only
-- artists had subscription columns.  Add them to venues for parity.
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS subscription_tier   text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive';

-- ── 3. wallspaces.current_artwork_id ────────────────────────────────────────
-- Worker venue stats counts occupied wallspaces by filtering on
-- current_artwork_id IS NOT NULL.  The column never existed.
ALTER TABLE public.wallspaces
  ADD COLUMN IF NOT EXISTS current_artwork_id uuid
    REFERENCES public.artworks(id) ON DELETE SET NULL;

-- ── 4. orders.venue_commission_cents ────────────────────────────────────────
-- Worker + VenueAnalytics.tsx read this column for venue earnings, but
-- no migration ever created it.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS venue_commission_cents integer DEFAULT 0;

-- ── 5. orders: economics snapshot columns ──────────────────────────────────
-- These columns freeze the pricing breakdown at checkout time so payouts
-- always use the snapshot, not recomputed values.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS list_price_cents integer,
  ADD COLUMN IF NOT EXISTS buyer_fee_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS buyer_total_cents integer,
  ADD COLUMN IF NOT EXISTS venue_amount_cents integer,
  ADD COLUMN IF NOT EXISTS artist_amount_cents integer,
  ADD COLUMN IF NOT EXISTS platform_gross_before_stripe_cents integer,
  ADD COLUMN IF NOT EXISTS artist_plan_id_at_purchase text;

-- ── 6. orders: Stripe + payout tracking columns ───────────────────────────
-- Track Stripe session/charge/intent IDs and transfer results for
-- complete payment lifecycle visibility.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS stripe_charge_id text,
  ADD COLUMN IF NOT EXISTS transfer_ids jsonb,
  ADD COLUMN IF NOT EXISTS payout_status text DEFAULT 'pending_connect',
  ADD COLUMN IF NOT EXISTS payout_error text;

COMMIT;
