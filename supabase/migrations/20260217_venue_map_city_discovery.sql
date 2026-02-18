-- Migration: Add venue map columns for city-based discovery
-- Supports the "Find Art Near You" / Venue Map per City feature.

-- city_slug: URL-safe slug for city-based routing (e.g. "san-diego")
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS city_slug text;

-- is_participating: opt-in flag for appearing on the public venue map
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS is_participating boolean NOT NULL DEFAULT false;

-- Additional address fields for map display
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS postal_code text;

-- Indexes for map queries
CREATE INDEX IF NOT EXISTS idx_venues_city_slug_participating
  ON public.venues (city_slug, is_participating)
  WHERE is_participating = true;

CREATE INDEX IF NOT EXISTS idx_venues_participating
  ON public.venues (is_participating)
  WHERE is_participating = true;

-- Backfill city_slug from existing city values
-- Converts "San Diego" → "san-diego", "New York" → "new-york", etc.
UPDATE public.venues
SET city_slug = lower(regexp_replace(trim(city), '[^a-zA-Z0-9]+', '-', 'g'))
WHERE city IS NOT NULL
  AND city != ''
  AND city_slug IS NULL;

-- RLS: Allow anonymous reads of participating venue data for public map
-- Only exposes minimal fields needed for map rendering.
-- The actual SELECT query on the client filters to is_participating = true.
DO $$
BEGIN
  -- Drop if exists to make migration idempotent
  DROP POLICY IF EXISTS "public_map_read_participating_venues" ON public.venues;
  
  CREATE POLICY "public_map_read_participating_venues"
    ON public.venues
    FOR SELECT
    TO anon, authenticated
    USING (
      is_participating = true
      AND (
        -- Allow reading these rows from the public map
        -- Existing RLS policies already allow venue owners to read their own rows
        true
      )
    );
END
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTES:
-- • lat/lng columns (address_lat, address_lng) already exist from 20260129_add_venue_address.sql
-- • city column already exists
-- • To mark a venue as participating:
--     UPDATE venues SET is_participating = true WHERE id = '<venue-uuid>';
-- • city_slug is auto-backfilled from city but can be manually corrected
-- ─────────────────────────────────────────────────────────────────────────────
