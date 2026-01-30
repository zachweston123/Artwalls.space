-- Add theme preference to artists and venues
-- Allows syncing UI appearance across devices

-- Artists: store chosen theme
ALTER TABLE public.artists
ADD COLUMN IF NOT EXISTS theme_preference text
  CHECK (theme_preference IN ('system', 'light', 'dark'))
  DEFAULT 'system';

-- Venues: store chosen theme
ALTER TABLE public.venues
ADD COLUMN IF NOT EXISTS theme_preference text
  CHECK (theme_preference IN ('system', 'light', 'dark'))
  DEFAULT 'system';
