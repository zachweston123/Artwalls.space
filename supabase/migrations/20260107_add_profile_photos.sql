-- Add profile photo columns for artists and venues
-- Run this migration in Supabase SQL Editor

-- Add profile_photo_url column to artists table
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS profile_photo_url text;

-- Add cover_photo_url column to venues table
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS cover_photo_url text;

-- Create index for faster lookups (optional)
CREATE INDEX IF NOT EXISTS artists_profile_photo_url_idx ON public.artists(profile_photo_url);
CREATE INDEX IF NOT EXISTS venues_cover_photo_url_idx ON public.venues(cover_photo_url);

-- Verify columns were added
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'artists' AND column_name = 'profile_photo_url';
