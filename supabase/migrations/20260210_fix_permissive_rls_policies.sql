-- ============================================================================
-- Fix overly permissive RLS policies (Audit Issue #10)
-- 
-- Problem: Several tables have INSERT/UPDATE policies with WITH CHECK (true)
-- or USING (true), meaning ANY user (including anonymous) can insert/update.
-- The service role already bypasses RLS, so these "service" policies are
-- not restricting anything — they open the door to everyone.
--
-- Fix: Drop the permissive policies and re-create with proper guards.
-- ============================================================================

BEGIN;

-- ── 1. Drop overly permissive policies ──────────────────────────────────────

-- artists: WITH CHECK (true) allows anyone to create artist profiles
DROP POLICY IF EXISTS "artists_insert_service" ON public.artists;

-- venues: WITH CHECK (true) allows anyone to create venues
-- Note: 20260129_fix_venue_rls.sql added venues_insert_own but never
-- dropped venues_insert_service, so the hole remained open.
DROP POLICY IF EXISTS "venues_insert_service" ON public.venues;

-- orders: CRITICAL — anyone can fabricate/modify financial records
DROP POLICY IF EXISTS "orders_insert_service" ON public.orders;
DROP POLICY IF EXISTS "orders_update_service" ON public.orders;

-- notifications: anyone can inject fake notifications to any user
DROP POLICY IF EXISTS "notifications_insert_service" ON public.notifications;

-- bookings: anyone can create/modify bookings for any artist/venue
DROP POLICY IF EXISTS "bookings_insert_service" ON public.bookings;
DROP POLICY IF EXISTS "bookings_update_service" ON public.bookings;

-- events: anyone can spam analytics events
DROP POLICY IF EXISTS "events_insert_service" ON public.events;


-- ── 2. Re-create with proper access controls ────────────────────────────────

-- Artists: a user can only create their own profile (id = auth.uid())
-- The separate venues_insert_own policy from 20260129 already handles venues.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'artists_insert_own' AND tablename = 'artists'
  ) THEN
    EXECUTE 'CREATE POLICY "artists_insert_own" ON public.artists FOR INSERT WITH CHECK (auth.uid() = id)';
  END IF;
END $$;

-- Orders: only the service role (Stripe webhook handler) should create/update orders
CREATE POLICY "orders_insert_service_only" ON public.orders
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "orders_update_service_only" ON public.orders
  FOR UPDATE USING (auth.role() = 'service_role');

-- Notifications: only the service role can insert (server creates them on events)
CREATE POLICY "notifications_insert_service_only" ON public.notifications
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Bookings: participants (artist or venue) can create and update their own bookings
CREATE POLICY "bookings_insert_participant" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = artist_id OR auth.uid() = venue_id);

CREATE POLICY "bookings_update_participant" ON public.bookings
  FOR UPDATE USING (auth.uid() = artist_id OR auth.uid() = venue_id);

-- Events: only the service role can insert analytics events
-- (the Worker API endpoint handles rate limiting and validation)
CREATE POLICY "events_insert_service_only" ON public.events
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

COMMIT;
