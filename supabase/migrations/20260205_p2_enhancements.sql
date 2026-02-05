-- P2 Performance & Observability Enhancements
-- Date: 2026-02-05

-- =============================================================================
-- F7: Add partial index for non-paid payout statuses
-- =============================================================================

-- Index for fast queries of stuck/pending payouts (excludes the majority 'paid' rows)
CREATE INDEX IF NOT EXISTS orders_payout_status_partial_idx 
  ON public.orders(payout_status, created_at) 
  WHERE payout_status != 'paid';

-- Index for fast lookup by payment intent (for webhook processing)
CREATE INDEX IF NOT EXISTS orders_stripe_payment_intent_idx 
  ON public.orders(stripe_payment_intent_id) 
  WHERE stripe_payment_intent_id IS NOT NULL;

-- Composite index for admin queries (find orders by artist/venue with specific status)
CREATE INDEX IF NOT EXISTS orders_artist_status_idx 
  ON public.orders(artist_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS orders_venue_status_idx 
  ON public.orders(venue_id, status, created_at DESC) 
  WHERE venue_id IS NOT NULL;

-- =============================================================================
-- F7b: Additional analytics indexes for events table
-- =============================================================================

-- Composite index for time-series analytics queries
CREATE INDEX IF NOT EXISTS events_type_created_idx 
  ON public.events(event_type, created_at DESC);

-- For funnel analysis (artwork views -> purchases)
CREATE INDEX IF NOT EXISTS events_artwork_type_created_idx 
  ON public.events(artwork_id, event_type, created_at DESC) 
  WHERE artwork_id IS NOT NULL;

-- For venue analytics (events at specific venue)
CREATE INDEX IF NOT EXISTS events_venue_type_created_idx 
  ON public.events(venue_id, event_type, created_at DESC) 
  WHERE venue_id IS NOT NULL;
