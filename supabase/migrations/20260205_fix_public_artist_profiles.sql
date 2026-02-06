-- Fix public artist profiles: ensure all artists are public by default and have slugs
-- Date: 2026-02-05

-- =============================================================================
-- Ensure is_public column exists and is set to true by default
-- =============================================================================

-- Add is_public if it doesn't exist (it should from earlier migration)
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

-- Add slug column if it doesn't exist (it should from earlier migration)
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS slug text;

-- =============================================================================
-- Backfill: Set all existing artists to public
-- =============================================================================

-- Set is_public to true for all existing artists
UPDATE public.artists
SET is_public = true
WHERE is_public IS NULL OR is_public = false;

-- =============================================================================
-- Backfill: Generate slugs for artists who don't have one
-- =============================================================================

-- Generate slugs for artists without one
UPDATE public.artists
SET slug = regexp_replace(
  lower(
    coalesce(
      nullif(trim(name), ''),
      'artist'
    )
  ),
  '[^a-z0-9]+',
  '-',
  'g'
) || '-' || substr(id::text, 1, 8)
WHERE slug IS NULL OR slug = '';

-- =============================================================================
-- Create unique index on slug
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS artists_slug_uidx 
  ON public.artists (lower(slug)) 
  WHERE slug IS NOT NULL AND slug <> '';

-- =============================================================================
-- Add index on is_public for faster public queries
-- =============================================================================

CREATE INDEX IF NOT EXISTS artists_is_public_idx 
  ON public.artists (is_public) 
  WHERE is_public = true;

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON COLUMN public.artists.is_public IS 'Whether the artist profile is publicly visible. Set to true by default.';
COMMENT ON COLUMN public.artists.slug IS 'URL-friendly slug for public artist profile pages.';
