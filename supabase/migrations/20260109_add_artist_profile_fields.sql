-- Add bio and art_types fields to artists table for enhanced profiles
-- Run this in Supabase SQL Editor

ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS art_types text[] DEFAULT '{}';
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS instagram_handle text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS verified_profile boolean DEFAULT false;

-- Create index for profile completeness queries
CREATE INDEX IF NOT EXISTS artists_verified_profile_idx ON public.artists(verified_profile);

-- Add comment for clarity
COMMENT ON COLUMN public.artists.bio IS 'Artist biography/about section for profile';
COMMENT ON COLUMN public.artists.art_types IS 'Array of art types (Painter, Photographer, etc.)';
COMMENT ON COLUMN public.artists.instagram_handle IS 'Instagram handle for portfolio link';
COMMENT ON COLUMN public.artists.verified_profile IS 'Profile is complete and verified (helps with sales)';
