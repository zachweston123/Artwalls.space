-- =============================================================================
-- Founding Venues Program — 2026-02-19
-- Adds: founding venue columns, venue_requests table, profile completion
-- =============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. VENUES TABLE — add founding venue columns
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS is_founding boolean NOT NULL DEFAULT false;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS founding_start timestamptz;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS founding_end timestamptz;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS featured_until timestamptz;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS founding_notes text;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS profile_completion_percent int NOT NULL DEFAULT 0;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS founder_kit_requested_at timestamptz;

-- Index for discovery list sorting (featured venues first)
CREATE INDEX IF NOT EXISTS venues_featured_until_idx ON public.venues (featured_until DESC NULLS LAST)
  WHERE featured_until IS NOT NULL AND featured_until > now();

-- Index for founding status queries
CREATE INDEX IF NOT EXISTS venues_founding_idx ON public.venues (is_founding)
  WHERE is_founding = true;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. VENUE_REQUESTS TABLE — install kit + other venue requests
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.venue_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'install_kit',
  status text NOT NULL DEFAULT 'new',
  shipping_or_dropoff_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS venue_requests_venue_idx ON public.venue_requests (venue_id);
CREATE INDEX IF NOT EXISTS venue_requests_status_idx ON public.venue_requests (status);

ALTER TABLE public.venue_requests ENABLE ROW LEVEL SECURITY;

-- Venues can read their own requests
DROP POLICY IF EXISTS "venue_requests_read_own" ON public.venue_requests;
CREATE POLICY "venue_requests_read_own" ON public.venue_requests
  FOR SELECT USING (auth.uid() = venue_id);

-- Venues can insert their own requests
DROP POLICY IF EXISTS "venue_requests_insert_own" ON public.venue_requests;
CREATE POLICY "venue_requests_insert_own" ON public.venue_requests
  FOR INSERT WITH CHECK (auth.uid() = venue_id);

-- Admin / service role can read + update all requests
DROP POLICY IF EXISTS "venue_requests_admin_all" ON public.venue_requests;
CREATE POLICY "venue_requests_admin_all" ON public.venue_requests
  FOR ALL USING (public.is_admin() OR auth.role() = 'service_role')
  WITH CHECK (public.is_admin() OR auth.role() = 'service_role');

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. RLS — only admin can set founding columns on venues
-- ═══════════════════════════════════════════════════════════════════════════════

-- Note: The existing venue update policy allows owners to update their own row.
-- Founding columns (is_founding, founding_start, founding_end, featured_until)
-- are protected at the API layer (Worker) — only admin endpoints can set them.
-- profile_completion_percent is computed by the Worker and set via service_role.

COMMIT;
