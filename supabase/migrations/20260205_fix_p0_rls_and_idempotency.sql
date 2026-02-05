-- P0 Security Fixes: RLS for events/invites/referrals + Idempotency table consolidation
-- Date: 2026-02-05

-- =============================================================================
-- F1: Add RLS to events table (prevent anonymous write spam)
-- =============================================================================

-- Create events table if it doesn't exist (analytics/tracking)
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  artwork_id uuid REFERENCES public.artworks(id) ON DELETE CASCADE,
  venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE,
  session_id text,
  user_agent_hash text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS events_event_type_idx ON public.events(event_type);
CREATE INDEX IF NOT EXISTS events_user_id_idx ON public.events(user_id);
CREATE INDEX IF NOT EXISTS events_artwork_id_idx ON public.events(artwork_id);
CREATE INDEX IF NOT EXISTS events_venue_id_idx ON public.events(venue_id);
CREATE INDEX IF NOT EXISTS events_created_at_idx ON public.events(created_at);

-- Enable RLS if not already enabled
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Service role can insert events (for internal analytics tracking)
DROP POLICY IF EXISTS "events_insert_service" ON public.events;
CREATE POLICY "events_insert_service" ON public.events
  FOR INSERT WITH CHECK (true);

-- Users can only read their own events (if user_id is set)
DROP POLICY IF EXISTS "events_read_own" ON public.events;
CREATE POLICY "events_read_own" ON public.events
  FOR SELECT USING (
    auth.uid() = user_id OR
    auth.role() = 'service_role'
  );

-- Admins can read all events
DROP POLICY IF EXISTS "events_read_admin" ON public.events;
CREATE POLICY "events_read_admin" ON public.events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.artists
      WHERE id = auth.uid()
        AND (
          email = ANY(string_to_array(current_setting('app.admin_emails', true), ','))
        )
    )
  );

-- =============================================================================
-- F2: Consolidate webhook idempotency to single table
-- =============================================================================

-- Ensure stripe_webhook_events exists with correct schema
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  stripe_event_id text PRIMARY KEY,
  type text NOT NULL,
  note text,
  processed_at timestamptz DEFAULT now()
);

-- Migrate existing webhook_events to stripe_webhook_events (if legacy table exists)
INSERT INTO public.stripe_webhook_events (stripe_event_id, type, note, processed_at)
SELECT id, type, note, processed_at
FROM public.webhook_events
ON CONFLICT (stripe_event_id) DO NOTHING;

-- Index for fast status lookups
CREATE INDEX IF NOT EXISTS stripe_webhook_events_processed_at_idx ON public.stripe_webhook_events(processed_at);
CREATE INDEX IF NOT EXISTS stripe_webhook_events_type_idx ON public.stripe_webhook_events(type);

-- =============================================================================
-- F3: Add RLS to venue_invites, venue_referrals, call_applications
-- =============================================================================

-- Venue Invites: only artist who created can read/write (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'venue_invites') THEN
    ALTER TABLE public.venue_invites ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "venue_invites_read_own" ON public.venue_invites;
    CREATE POLICY "venue_invites_read_own" ON public.venue_invites
      FOR SELECT USING (auth.uid() = artist_id);

    DROP POLICY IF EXISTS "venue_invites_insert_own" ON public.venue_invites;
    CREATE POLICY "venue_invites_insert_own" ON public.venue_invites
      FOR INSERT WITH CHECK (auth.uid() = artist_id);

    DROP POLICY IF EXISTS "venue_invites_update_own" ON public.venue_invites;
    CREATE POLICY "venue_invites_update_own" ON public.venue_invites
      FOR UPDATE USING (auth.uid() = artist_id);

    DROP POLICY IF EXISTS "venue_invites_service_all" ON public.venue_invites;
    CREATE POLICY "venue_invites_service_all" ON public.venue_invites
      FOR ALL USING (auth.role() = 'service_role');
      
    RAISE NOTICE 'Applied RLS policies to venue_invites';
  ELSE
    RAISE NOTICE 'Skipping venue_invites RLS (table does not exist)';
  END IF;
END $$;

-- Venue Referrals: only artist who created can read/write (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'venue_referrals') THEN
    ALTER TABLE public.venue_referrals ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "venue_referrals_read_own" ON public.venue_referrals;
    CREATE POLICY "venue_referrals_read_own" ON public.venue_referrals
      FOR SELECT USING (auth.uid() = artist_user_id);

    DROP POLICY IF EXISTS "venue_referrals_insert_own" ON public.venue_referrals;
    CREATE POLICY "venue_referrals_insert_own" ON public.venue_referrals
      FOR INSERT WITH CHECK (auth.uid() = artist_user_id);

    DROP POLICY IF EXISTS "venue_referrals_update_own" ON public.venue_referrals;
    CREATE POLICY "venue_referrals_update_own" ON public.venue_referrals
      FOR UPDATE USING (auth.uid() = artist_user_id);

    DROP POLICY IF EXISTS "venue_referrals_service_all" ON public.venue_referrals;
    CREATE POLICY "venue_referrals_service_all" ON public.venue_referrals
      FOR ALL USING (auth.role() = 'service_role');
      
    RAISE NOTICE 'Applied RLS policies to venue_referrals';
  ELSE
    RAISE NOTICE 'Skipping venue_referrals RLS (table does not exist)';
  END IF;
END $$;

-- Call Applications: artist applicant + venue owner can read (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'call_applications') THEN
    ALTER TABLE public.call_applications ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "call_applications_read_applicant" ON public.call_applications;
    CREATE POLICY "call_applications_read_applicant" ON public.call_applications
      FOR SELECT USING (auth.uid() = artist_user_id);

    DROP POLICY IF EXISTS "call_applications_read_venue" ON public.call_applications;
    CREATE POLICY "call_applications_read_venue" ON public.call_applications
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.calls_for_art
          WHERE calls_for_art.id = call_applications.call_id
            AND calls_for_art.venue_id = auth.uid()
        )
      );

    DROP POLICY IF EXISTS "call_applications_insert_own" ON public.call_applications;
    CREATE POLICY "call_applications_insert_own" ON public.call_applications
      FOR INSERT WITH CHECK (auth.uid() = artist_user_id);

    DROP POLICY IF EXISTS "call_applications_service_all" ON public.call_applications;
    CREATE POLICY "call_applications_service_all" ON public.call_applications
      FOR ALL USING (auth.role() = 'service_role');
      
    RAISE NOTICE 'Applied RLS policies to call_applications';
  ELSE
    RAISE NOTICE 'Skipping call_applications RLS (table does not exist)';
  END IF;
END $$;

-- Venue Invite Events: only artist who owns the invite can read events (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'venue_invite_events') THEN
    ALTER TABLE public.venue_invite_events ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "venue_invite_events_read_via_invite" ON public.venue_invite_events;
    CREATE POLICY "venue_invite_events_read_via_invite" ON public.venue_invite_events
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.venue_invites
          WHERE venue_invites.id = venue_invite_events.invite_id
            AND venue_invites.artist_id = auth.uid()
        )
      );

    DROP POLICY IF EXISTS "venue_invite_events_service_all" ON public.venue_invite_events;
    CREATE POLICY "venue_invite_events_service_all" ON public.venue_invite_events
      FOR ALL USING (auth.role() = 'service_role');
      
    RAISE NOTICE 'Applied RLS policies to venue_invite_events';
  ELSE
    RAISE NOTICE 'Skipping venue_invite_events RLS (table does not exist)';
  END IF;
END $$;
