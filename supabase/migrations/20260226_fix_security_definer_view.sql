-- ============================================================================
-- Fix: v_artist_current_displays SECURITY DEFINER → SECURITY INVOKER
--
-- Supabase linter flags this view as SECURITY DEFINER (the default when
-- security_invoker is not explicitly set). This means the view runs with
-- the *creator's* permissions, bypassing RLS on the underlying artworks
-- table. Re-create the view with security_invoker = true so it respects
-- the calling user's RLS policies.
--
-- Safe to re-run (CREATE OR REPLACE + idempotent).
-- ============================================================================

BEGIN;

CREATE OR REPLACE VIEW public.v_artist_current_displays
WITH (security_invoker = true)
AS
SELECT
  a.id          AS artwork_id,
  a.artist_id   AS artist_id,
  a.venue_id    AS venue_id,
  a.set_id      AS set_id,
  a.status      AS status,
  a.title       AS title,
  a.price_cents AS price_cents,
  a.currency    AS currency,
  a.image_url   AS image_url,
  a.is_public   AS is_public
FROM public.artworks a
WHERE a.venue_id IS NOT NULL
  AND a.is_public = true
  AND a.archived_at IS NULL
  AND lower(coalesce(a.status, '')) IN ('active', 'published');

COMMENT ON VIEW public.v_artist_current_displays
  IS 'Public, non-PII view of artworks currently on display (active/published with a venue). Uses SECURITY INVOKER.';

COMMIT;
