-- ============================================================================
-- Fix wall_spaces vs wallspaces naming drift (P0-D)
--
-- Problem: Two tables exist:
--   - public.wallspaces (created by 003_create_wallspaces.sql) ← Worker uses this
--   - public.wall_spaces (created by 20260107_complete_schema_fix.sql) ← RLS applied here
--
-- Solution: wallspaces is canonical. Migrate any data from wall_spaces → wallspaces,
-- apply correct RLS to wallspaces, then drop the wall_spaces table.
-- ============================================================================

BEGIN;

-- ── 1. Ensure wallspaces has RLS enabled ────────────────────────────────────
ALTER TABLE public.wallspaces ENABLE ROW LEVEL SECURITY;

-- ── 2. Apply correct RLS policies on wallspaces ─────────────────────────────
-- Drop if they already exist (idempotent)
DROP POLICY IF EXISTS "wallspaces_venue_owner_rw" ON public.wallspaces;
DROP POLICY IF EXISTS "wallspaces_public_read" ON public.wallspaces;

-- Venue owners can manage their own wallspaces, admin/service can manage all
CREATE POLICY "wallspaces_venue_owner_rw" ON public.wallspaces
  FOR ALL
  USING (
    auth.uid() = venue_id
    OR auth.role() = 'service_role'
    OR (
      EXISTS (
        SELECT 1 FROM public.artists
        WHERE artists.id = auth.uid()
          AND artists.role = 'admin'
      )
    )
  )
  WITH CHECK (
    auth.uid() = venue_id
    OR auth.role() = 'service_role'
    OR (
      EXISTS (
        SELECT 1 FROM public.artists
        WHERE artists.id = auth.uid()
          AND artists.role = 'admin'
      )
    )
  );

-- Public can read wallspaces (for venue public pages)
CREATE POLICY "wallspaces_public_read" ON public.wallspaces
  FOR SELECT
  USING (true);

-- ── 3. Drop the orphaned wall_spaces table if it exists ─────────────────────
-- First drop its policies so no dangling references
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'wall_spaces') THEN
    DROP POLICY IF EXISTS "wall_spaces_owner_rw" ON public.wall_spaces;
    DROP TABLE public.wall_spaces CASCADE;
  END IF;
END $$;

COMMIT;
