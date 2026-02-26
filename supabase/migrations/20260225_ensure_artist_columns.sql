-- ============================================================================
-- Ensure all artist columns required by GET /api/artists exist.
--
-- The Find Artists endpoint (venue → discover artists) selects these columns.
-- If ANY column is missing, the Supabase PostgREST query returns a 400 error
-- and the UI shows "Could not load artists."
--
-- Using ADD COLUMN IF NOT EXISTS so this is safe to re-run.
-- ============================================================================

BEGIN;

-- Core profile fields used by the artist listing endpoint
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS profile_photo_url text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS art_types text[] DEFAULT '{}';

-- Visibility & liveness flags — default to visible & open
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS is_live boolean DEFAULT true;

-- Founding artist badge
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS is_founding_artist boolean DEFAULT false;

-- City fields (may already exist from 20260107_complete_schema_fix)
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS city_primary text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS city_secondary text;

-- Backfill NULLs: NULL should mean "visible" / "open to placements"
UPDATE public.artists SET is_public = true WHERE is_public IS NULL;
UPDATE public.artists SET is_live = true WHERE is_live IS NULL;

COMMIT;
