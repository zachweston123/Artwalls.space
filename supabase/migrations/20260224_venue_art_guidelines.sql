-- ============================================================================
-- Add art guidelines columns to venues table
-- Venues can describe what kind of art they want and select preferred styles
-- ============================================================================

BEGIN;

-- Free-form text: "We're looking for large, colorful abstract pieces…"
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS art_guidelines text;

-- Array of style tags: ['Abstract', 'Photography', 'Sculpture', …]
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS preferred_styles text[] DEFAULT '{}';

COMMIT;
