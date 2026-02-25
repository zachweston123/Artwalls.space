-- =============================================================================
-- Analytics Events table — stores unified measurement events from the frontend.
-- Separate from app_events (which tracks the QR → purchase funnel with dedupe).
--
-- This table captures CWV metrics, page views, funnel step events, and other
-- lightweight analytics events sent via POST /api/analytics.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz  NOT NULL DEFAULT now(),

  -- Event identity
  event_name      text         NOT NULL,
  session_id      text         NOT NULL,
  user_id         uuid         NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  user_role       text         NULL,

  -- Context
  route           text         NULL,
  client_timestamp text        NULL,     -- ISO 8601 from the browser
  ip_hash         text         NULL,     -- truncated SHA-256 of IP, not raw IP

  -- Flexible property bag (metric values, artwork IDs, step numbers, etc.)
  properties      jsonb        NOT NULL DEFAULT '{}'::jsonb
);

-- Index for querying by event name + time range (dashboards)
CREATE INDEX IF NOT EXISTS analytics_events_name_created_idx
  ON public.analytics_events (event_name, created_at DESC);

-- Index for session-level analysis
CREATE INDEX IF NOT EXISTS analytics_events_session_idx
  ON public.analytics_events (session_id, created_at);

-- Index for user-level analysis (when authenticated)
CREATE INDEX IF NOT EXISTS analytics_events_user_idx
  ON public.analytics_events (user_id, created_at)
  WHERE user_id IS NOT NULL;

-- ─── Row Level Security ──────────────────────────────────────────────────────
-- Only the service role (Worker) can write.
-- Admins and service role can read.

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "analytics_events_service_insert" ON public.analytics_events;
CREATE POLICY "analytics_events_service_insert" ON public.analytics_events
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "analytics_events_admin_read" ON public.analytics_events;
CREATE POLICY "analytics_events_admin_read" ON public.analytics_events
  FOR SELECT USING (public.is_admin() OR auth.role() = 'service_role');

COMMIT;
