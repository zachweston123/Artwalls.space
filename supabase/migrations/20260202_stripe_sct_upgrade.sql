-- Stripe SCT upgrade: ensure payout fields and idempotency table
-- Safe to run multiple times via IF NOT EXISTS guards

-- Artists: connected account + customer + enablement flags + tier state
ALTER TABLE public.artists
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS tier TEXT,
  ADD COLUMN IF NOT EXISTS tier_status TEXT,
  ADD COLUMN IF NOT EXISTS charges_enabled BOOLEAN,
  ADD COLUMN IF NOT EXISTS payouts_enabled BOOLEAN;

-- Venues: connected account + enablement + default commission
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS charges_enabled BOOLEAN,
  ADD COLUMN IF NOT EXISTS payouts_enabled BOOLEAN,
  ADD COLUMN IF NOT EXISTS default_commission_percent NUMERIC DEFAULT 15;

-- Orders: payout + Stripe identifiers for SCT bookkeeping
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS list_price NUMERIC,
  ADD COLUMN IF NOT EXISTS buyer_fee NUMERIC,
  ADD COLUMN IF NOT EXISTS platform_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS venue_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS artist_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_transfer_id_artist TEXT,
  ADD COLUMN IF NOT EXISTS stripe_transfer_id_venue TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT;

-- Webhook idempotency table (new) for Stripe
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  stripe_event_id TEXT PRIMARY KEY,
  type TEXT,
  processed_at TIMESTAMPTZ,
  note TEXT
);

COMMENT ON TABLE public.stripe_webhook_events IS 'Tracks processed Stripe events for idempotency of transfers';
