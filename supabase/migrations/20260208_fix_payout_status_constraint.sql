-- Migration: Fix payout_status CHECK constraint to include 'blocked_pending_onboarding'
-- The webhook handler sets this value when a venue hasn't completed Stripe onboarding,
-- but it was missing from the allowed values.

-- Drop the old constraint and add the updated one
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payout_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payout_status_check
  CHECK (payout_status IN ('pending_connect', 'pending_transfer', 'paid', 'failed', 'blocked_pending_onboarding'));

-- Add indexes on artworks stripe columns for faster lookups during deactivation
CREATE INDEX IF NOT EXISTS idx_artworks_stripe_product_id ON public.artworks(stripe_product_id)
  WHERE stripe_product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_artworks_stripe_price_id ON public.artworks(stripe_price_id)
  WHERE stripe_price_id IS NOT NULL;
