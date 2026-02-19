-- =============================================================================
-- Security Hardening Migration — 2026-02-18
-- Addresses: RLS gaps, public data exposure, audit logging, admin safety
-- =============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. ARTISTS TABLE — tighten public read access
-- ═══════════════════════════════════════════════════════════════════════════════

-- Currently artists_read_own only lets owner see their row.
-- Public profiles need a *limited* public read for is_public=true rows.
DROP POLICY IF EXISTS "artists_public_read" ON public.artists;
CREATE POLICY "artists_public_read" ON public.artists
  FOR SELECT USING (
    is_public = true AND is_live = true
  );

-- Ensure owners can always read their own full row (even if is_public=false)
DROP POLICY IF EXISTS "artists_read_own" ON public.artists;
CREATE POLICY "artists_read_own" ON public.artists
  FOR SELECT USING (auth.uid() = id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. VENUES TABLE — tighten public read access
-- ═══════════════════════════════════════════════════════════════════════════════

-- Public read: non-suspended venues only
DROP POLICY IF EXISTS "venues_public_read" ON public.venues;
CREATE POLICY "venues_public_read" ON public.venues
  FOR SELECT USING (
    suspended IS NOT TRUE
  );

-- Owner read their own row always
DROP POLICY IF EXISTS "venues_read_own" ON public.venues;
CREATE POLICY "venues_read_own" ON public.venues
  FOR SELECT USING (auth.uid() = id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. ARTWORKS TABLE — restrict public reads to published items only
-- ═══════════════════════════════════════════════════════════════════════════════

-- The current "artworks_read_all" policy allows ANYONE to read ALL artworks
-- including drafts, sold, and archived. Replace with a scoped policy.
DROP POLICY IF EXISTS "artworks_read_all" ON public.artworks;

-- Public: only published/available artworks that are not archived
DROP POLICY IF EXISTS "artworks_public_read" ON public.artworks;
CREATE POLICY "artworks_public_read" ON public.artworks
  FOR SELECT USING (
    is_public = true
    AND archived_at IS NULL
    AND status IN ('available', 'active', 'published')
  );

-- Artists can read ALL their own artworks (including drafts)
DROP POLICY IF EXISTS "artworks_read_own" ON public.artworks;
CREATE POLICY "artworks_read_own" ON public.artworks
  FOR SELECT USING (auth.uid() = artist_id);

-- Venues can read artworks assigned to them
DROP POLICY IF EXISTS "artworks_read_venue" ON public.artworks;
CREATE POLICY "artworks_read_venue" ON public.artworks
  FOR SELECT USING (auth.uid() = venue_id);

-- Service role can update artworks (for webhook order finalization)
DROP POLICY IF EXISTS "artworks_update_service_only" ON public.artworks;
CREATE POLICY "artworks_update_service_only" ON public.artworks
  FOR UPDATE USING (auth.role() = 'service_role' OR auth.uid() = artist_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. ORDERS TABLE — ensure only service role can write
-- ═══════════════════════════════════════════════════════════════════════════════

-- Orders should NEVER be writable by anon/authenticated users directly.
-- The Worker (service_role) handles all order creation/updates.
-- These policies should already exist from 20260210_fix_permissive_rls, but
-- ensure they are correct.
DROP POLICY IF EXISTS "orders_insert_service_only" ON public.orders;
CREATE POLICY "orders_insert_service_only" ON public.orders
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "orders_update_service_only" ON public.orders;
CREATE POLICY "orders_update_service_only" ON public.orders
  FOR UPDATE USING (auth.role() = 'service_role');

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. STRIPE_WEBHOOK_EVENTS — RLS (idempotency table)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE IF EXISTS public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stripe_webhook_events_service_only" ON public.stripe_webhook_events;
CREATE POLICY "stripe_webhook_events_service_only" ON public.stripe_webhook_events
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. SUPPORT_MESSAGES — RLS
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'support_messages') THEN
    ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

    -- Anyone can INSERT a support message (public contact form)
    DROP POLICY IF EXISTS "support_messages_insert_public" ON public.support_messages;
    CREATE POLICY "support_messages_insert_public" ON public.support_messages
      FOR INSERT WITH CHECK (true);

    -- Only service_role (admin API) can read support messages
    DROP POLICY IF EXISTS "support_messages_read_service" ON public.support_messages;
    CREATE POLICY "support_messages_read_service" ON public.support_messages
      FOR SELECT USING (auth.role() = 'service_role');

    -- Only service_role can update (status changes)
    DROP POLICY IF EXISTS "support_messages_update_service" ON public.support_messages;
    CREATE POLICY "support_messages_update_service" ON public.support_messages
      FOR UPDATE USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. ARTWORK_REACTIONS — RLS
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'artwork_reactions') THEN
    ALTER TABLE public.artwork_reactions ENABLE ROW LEVEL SECURITY;

    -- Anyone can read reaction counts
    DROP POLICY IF EXISTS "reactions_read_all" ON public.artwork_reactions;
    CREATE POLICY "reactions_read_all" ON public.artwork_reactions
      FOR SELECT USING (true);

    -- Service role inserts/deletes reactions (the Worker validates)
    DROP POLICY IF EXISTS "reactions_write_service" ON public.artwork_reactions;
    CREATE POLICY "reactions_write_service" ON public.artwork_reactions
      FOR ALL USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. ARTWORK_SETS — RLS for curated sets
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'artwork_sets') THEN
    ALTER TABLE public.artwork_sets ENABLE ROW LEVEL SECURITY;

    -- Public: read published + public sets
    DROP POLICY IF EXISTS "sets_public_read" ON public.artwork_sets;
    CREATE POLICY "sets_public_read" ON public.artwork_sets
      FOR SELECT USING (status = 'published' AND visibility = 'public');

    -- Owner can CRUD their own sets
    DROP POLICY IF EXISTS "sets_owner_all" ON public.artwork_sets;
    CREATE POLICY "sets_owner_all" ON public.artwork_sets
      FOR ALL USING (auth.uid() = artist_id)
      WITH CHECK (auth.uid() = artist_id);

    -- Admin + service role full access
    DROP POLICY IF EXISTS "sets_admin_all" ON public.artwork_sets;
    CREATE POLICY "sets_admin_all" ON public.artwork_sets
      FOR ALL USING (public.is_admin() OR auth.role() = 'service_role')
      WITH CHECK (public.is_admin() OR auth.role() = 'service_role');
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. APP_EVENTS / EVENTS — ensure RLS is enforced
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'app_events') THEN
    ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "app_events_service_insert" ON public.app_events;
    CREATE POLICY "app_events_service_insert" ON public.app_events
      FOR INSERT WITH CHECK (auth.role() = 'service_role');

    DROP POLICY IF EXISTS "app_events_service_read" ON public.app_events;
    CREATE POLICY "app_events_service_read" ON public.app_events
      FOR SELECT USING (auth.role() = 'service_role' OR auth.uid() = user_id);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. NOTIFICATIONS — ensure users can only read/update their own
-- ═══════════════════════════════════════════════════════════════════════════════

-- These should already exist but re-assert for safety
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
    DROP POLICY IF EXISTS "notifications_read_own" ON public.notifications;
    CREATE POLICY "notifications_read_own" ON public.notifications
      FOR SELECT USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
    CREATE POLICY "notifications_update_own" ON public.notifications
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 11. AUDIT LOG TABLE — for admin action tracking
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  action text NOT NULL,
  target_type text,            -- 'artist', 'venue', 'order', 'referral', etc.
  target_id text,              -- ID of the affected record
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_admin_idx ON public.admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx ON public.admin_audit_log(created_at);
CREATE INDEX IF NOT EXISTS admin_audit_log_action_idx ON public.admin_audit_log(action);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only service role can insert (Worker does this)
DROP POLICY IF EXISTS "audit_log_service_write" ON public.admin_audit_log;
CREATE POLICY "audit_log_service_write" ON public.admin_audit_log
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Only admins can read
DROP POLICY IF EXISTS "audit_log_admin_read" ON public.admin_audit_log;
CREATE POLICY "audit_log_admin_read" ON public.admin_audit_log
  FOR SELECT USING (public.is_admin() OR auth.role() = 'service_role');

-- ═══════════════════════════════════════════════════════════════════════════════
-- 12. Fix the is_admin() function — do NOT trust user_metadata.isAdmin
-- The current function trusts isAdmin from user_metadata which is user-editable.
-- Only trust app_metadata (server-set) or the ADMIN_EMAILS list.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  uid uuid := auth.uid();
  user_email text;
BEGIN
  -- Service role is always admin
  IF auth.role() = 'service_role' THEN
    RETURN true;
  END IF;

  IF uid IS NULL THEN
    RETURN false;
  END IF;

  -- Check the user's email against the admin list.
  -- ONLY server-set app_metadata.role = 'admin' or email match is trusted.
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = uid;

  -- Hardcoded admin email (must match Worker ADMIN_EMAILS)
  IF lower(coalesce(user_email, '')) = 'zweston8136@sdsu.edu' THEN
    RETURN true;
  END IF;

  -- Trust app_metadata.role (set by service role only, not user-editable)
  IF (SELECT raw_app_meta_data ->> 'role' FROM auth.users WHERE id = uid) = 'admin' THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

COMMIT;
