-- ============================================================================
-- Venue Requests & Waitlist System
--
-- Creates a unified `venue_requests` table for both applications and waitlist
-- entries, adds `waitlist_enabled` to venues, and sets up RLS policies.
--
-- Key design decisions:
--   • Single table for both request types (application/waitlist) so they
--     share the same monthly quota and deduplication logic.
--   • Partial unique index prevents duplicate active requests per artist+venue.
--   • Status transitions are enforced in the API layer (finite-state machine).
--
-- Safe to re-run (idempotent via IF NOT EXISTS / ON CONFLICT patterns).
-- ============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Add waitlist_enabled to venues table
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS waitlist_enabled boolean NOT NULL DEFAULT false;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Create venue_requests table
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.venue_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id      uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,

  -- 'application' | 'waitlist'
  request_type  text NOT NULL DEFAULT 'application'
    CONSTRAINT venue_requests_type_check
      CHECK (request_type IN ('application', 'waitlist')),

  -- Unified status field supporting both types:
  --   application: submitted → approved | rejected | withdrawn
  --   waitlist:    waitlisted → invited_to_apply | removed | rejected | converted_to_application
  status        text NOT NULL DEFAULT 'submitted'
    CONSTRAINT venue_requests_status_check
      CHECK (status IN (
        'submitted',
        'approved',
        'rejected',
        'withdrawn',
        'waitlisted',
        'invited_to_apply',
        'removed',
        'converted_to_application'
      )),

  -- Optional message from the artist
  message       text,

  -- Optional artwork ID for applications (links to the artwork being submitted)
  artwork_id    uuid REFERENCES public.artworks(id) ON DELETE SET NULL,

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_venue_requests_artist
  ON public.venue_requests(artist_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_venue_requests_venue
  ON public.venue_requests(venue_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_venue_requests_status
  ON public.venue_requests(status);

-- Partial unique index: only one active request per artist+venue
-- "Active" = not in a terminal state
CREATE UNIQUE INDEX IF NOT EXISTS idx_venue_requests_active_unique
  ON public.venue_requests(artist_id, venue_id)
  WHERE status NOT IN ('rejected', 'withdrawn', 'removed', 'approved', 'converted_to_application');

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Auto-update updated_at trigger
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_venue_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_venue_requests_updated_at ON public.venue_requests;
CREATE TRIGGER trg_venue_requests_updated_at
  BEFORE UPDATE ON public.venue_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_venue_requests_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. RLS policies
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.venue_requests ENABLE ROW LEVEL SECURITY;

-- 4a. Artists can read their own requests
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'venue_requests'
      AND policyname = 'Artists read own requests'
  ) THEN
    CREATE POLICY "Artists read own requests" ON public.venue_requests
      FOR SELECT TO authenticated
      USING (artist_id = auth.uid());
  END IF;
END $$;

-- 4b. Venues can read requests targeting their venue
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'venue_requests'
      AND policyname = 'Venues read own venue requests'
  ) THEN
    CREATE POLICY "Venues read own venue requests" ON public.venue_requests
      FOR SELECT TO authenticated
      USING (venue_id = auth.uid());
  END IF;
END $$;

-- 4c. Artists can insert their own requests
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'venue_requests'
      AND policyname = 'Artists insert own requests'
  ) THEN
    CREATE POLICY "Artists insert own requests" ON public.venue_requests
      FOR INSERT TO authenticated
      WITH CHECK (artist_id = auth.uid());
  END IF;
END $$;

-- 4d. Artists can update their own requests (withdraw/remove only — enforced in API)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'venue_requests'
      AND policyname = 'Artists update own requests'
  ) THEN
    CREATE POLICY "Artists update own requests" ON public.venue_requests
      FOR UPDATE TO authenticated
      USING (artist_id = auth.uid());
  END IF;
END $$;

-- 4e. Venues can update requests targeting their venue (approve/reject/invite)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'venue_requests'
      AND policyname = 'Venues update own venue requests'
  ) THEN
    CREATE POLICY "Venues update own venue requests" ON public.venue_requests
      FOR UPDATE TO authenticated
      USING (venue_id = auth.uid());
  END IF;
END $$;

-- 4f. Service role (admin / worker) bypass — handled by supabaseAdmin client

COMMIT;
