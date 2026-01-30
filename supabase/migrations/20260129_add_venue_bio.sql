-- Add bio column to venues table for venue description
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS bio text;

-- Ensure cover_photo_url column exists (may already exist from previous migration)
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS cover_photo_url text;

-- Create index for bio search (optional, for future search feature)
CREATE INDEX IF NOT EXISTS venues_bio_idx ON public.venues USING gin (to_tsvector('english', COALESCE(bio, '')));
