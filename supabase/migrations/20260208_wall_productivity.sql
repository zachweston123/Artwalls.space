-- =============================================================================
-- Wall Productivity Tracking
-- Date: 2026-02-08
--
-- Adds the app_events table for tracking the core funnel:
--   Venue live → QR scans → artwork views → checkout starts → purchases
-- All attributed to venue + wallspace + artwork.
-- =============================================================================

-- =============================================================================
-- 1. app_events table (append-only, server-written)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.app_events (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz  NOT NULL DEFAULT now(),
  event_type    text         NOT NULL
                             CHECK (event_type IN ('qr_scan','artwork_view','checkout_start','purchase')),
  -- attribution
  user_id       uuid         NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id    text         NOT NULL,
  venue_id      uuid         NULL REFERENCES public.venues(id) ON DELETE SET NULL,
  wallspace_id  uuid         NULL REFERENCES public.wallspaces(id) ON DELETE SET NULL,
  artwork_id    uuid         NULL REFERENCES public.artworks(id) ON DELETE SET NULL,
  artist_id     uuid         NULL REFERENCES public.artists(id) ON DELETE SET NULL,
  -- purchase-specific
  order_id      uuid         NULL REFERENCES public.orders(id) ON DELETE SET NULL,
  stripe_checkout_session_id text NULL,
  -- extensible payload
  metadata      jsonb        NOT NULL DEFAULT '{}'::jsonb
);

-- =============================================================================
-- 2. Dedupe: unique partial indexes per event type
--    Prevents duplicate events within the same logical window.
--
--    date_trunc(timestamptz) is only STABLE (timezone-dependent), so we pin
--    to UTC via an IMMUTABLE wrapper to satisfy index-expression rules.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trunc_minute_utc(ts timestamptz)
RETURNS timestamp
LANGUAGE sql
IMMUTABLE PARALLEL SAFE
AS $$ SELECT date_trunc('minute', ts AT TIME ZONE 'UTC') $$;

-- qr_scan: one per session + artwork + venue per minute
CREATE UNIQUE INDEX IF NOT EXISTS app_events_dedup_qr_scan_idx
  ON public.app_events (event_type, session_id, artwork_id, venue_id, (public.trunc_minute_utc(created_at)))
  WHERE event_type = 'qr_scan';

-- artwork_view: one per session + artwork per minute
CREATE UNIQUE INDEX IF NOT EXISTS app_events_dedup_artwork_view_idx
  ON public.app_events (event_type, session_id, artwork_id, (public.trunc_minute_utc(created_at)))
  WHERE event_type = 'artwork_view';

-- checkout_start: one per session + artwork per minute
CREATE UNIQUE INDEX IF NOT EXISTS app_events_dedup_checkout_start_idx
  ON public.app_events (event_type, session_id, artwork_id, (public.trunc_minute_utc(created_at)))
  WHERE event_type = 'checkout_start';

-- purchase: one per order (idempotent from webhook retries)
CREATE UNIQUE INDEX IF NOT EXISTS app_events_dedup_purchase_idx
  ON public.app_events (event_type, order_id)
  WHERE event_type = 'purchase';

-- =============================================================================
-- 3. Query indexes
-- =============================================================================

-- Time-series by venue (wall productivity)
CREATE INDEX IF NOT EXISTS app_events_venue_type_created_idx
  ON public.app_events (venue_id, event_type, created_at DESC)
  WHERE venue_id IS NOT NULL;

-- Per-artwork funnel
CREATE INDEX IF NOT EXISTS app_events_artwork_type_created_idx
  ON public.app_events (artwork_id, event_type, created_at DESC)
  WHERE artwork_id IS NOT NULL;

-- Session lookup
CREATE INDEX IF NOT EXISTS app_events_session_created_idx
  ON public.app_events (session_id, created_at DESC);

-- =============================================================================
-- 4. RLS — locked down
-- =============================================================================
ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

-- Only service role (server) can insert
CREATE POLICY app_events_insert_service ON public.app_events
  FOR INSERT
  WITH CHECK (
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role'
    OR current_setting('role', true) = 'service_role'
  );

-- No public/anon reads of raw events
-- Admin reads happen through the RPC function below

-- =============================================================================
-- 5. RPC: wall_productivity_metrics (admin-only, aggregated)
--    Returns funnel metrics for the admin dashboard.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.wall_productivity_metrics(
  p_days int DEFAULT 7
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_since timestamptz := now() - (p_days || ' days')::interval;
  v_result jsonb;
BEGIN
  -- Admin gate: only service_role or admin users
  IF NOT (
    current_setting('role', true) = 'service_role'
    OR (
      current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'authenticated'
      AND EXISTS (
        SELECT 1 FROM public.artists
        WHERE id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
          AND role = 'admin'
      )
    )
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT jsonb_build_object(
    'period_days', p_days,
    'since', v_since,

    -- Totals
    'total_scans',           COALESCE((SELECT count(*) FROM app_events WHERE event_type = 'qr_scan'        AND created_at >= v_since), 0),
    'total_artwork_views',   COALESCE((SELECT count(*) FROM app_events WHERE event_type = 'artwork_view'   AND created_at >= v_since), 0),
    'total_checkout_starts', COALESCE((SELECT count(*) FROM app_events WHERE event_type = 'checkout_start' AND created_at >= v_since), 0),
    'total_purchases',       COALESCE((SELECT count(*) FROM app_events WHERE event_type = 'purchase'       AND created_at >= v_since), 0),

    -- Scans per venue (top 20)
    'scans_by_venue', COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT
          ae.venue_id,
          v.name AS venue_name,
          count(*) AS scans
        FROM app_events ae
        LEFT JOIN venues v ON v.id = ae.venue_id
        WHERE ae.event_type = 'qr_scan'
          AND ae.created_at >= v_since
          AND ae.venue_id IS NOT NULL
        GROUP BY ae.venue_id, v.name
        ORDER BY scans DESC
        LIMIT 20
      ) t
    ), '[]'::jsonb),

    -- Top artworks by scans (top 20)
    'top_artworks', COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT
          ae.artwork_id,
          a.title AS artwork_title,
          ar.name AS artist_name,
          count(*) FILTER (WHERE ae.event_type = 'qr_scan')        AS scans,
          count(*) FILTER (WHERE ae.event_type = 'artwork_view')   AS views,
          count(*) FILTER (WHERE ae.event_type = 'checkout_start') AS checkout_starts,
          count(*) FILTER (WHERE ae.event_type = 'purchase')       AS purchases
        FROM app_events ae
        LEFT JOIN artworks a ON a.id = ae.artwork_id
        LEFT JOIN artists ar ON ar.id = ae.artist_id
        WHERE ae.created_at >= v_since
          AND ae.artwork_id IS NOT NULL
        GROUP BY ae.artwork_id, a.title, ar.name
        ORDER BY scans DESC
        LIMIT 20
      ) t
    ), '[]'::jsonb),

    -- Funnel by venue (scans → checkout_start → purchase)
    'funnel_by_venue', COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT
          ae.venue_id,
          v.name AS venue_name,
          count(*) FILTER (WHERE ae.event_type = 'qr_scan')        AS scans,
          count(*) FILTER (WHERE ae.event_type = 'artwork_view')   AS views,
          count(*) FILTER (WHERE ae.event_type = 'checkout_start') AS checkout_starts,
          count(*) FILTER (WHERE ae.event_type = 'purchase')       AS purchases
        FROM app_events ae
        LEFT JOIN venues v ON v.id = ae.venue_id
        WHERE ae.created_at >= v_since
          AND ae.venue_id IS NOT NULL
        GROUP BY ae.venue_id, v.name
        ORDER BY scans DESC
        LIMIT 20
      ) t
    ), '[]'::jsonb)

  ) INTO v_result;

  RETURN v_result;
END;
$$;
