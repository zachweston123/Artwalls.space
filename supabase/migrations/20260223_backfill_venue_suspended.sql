-- Backfill: ensure every venue row has suspended = false (not NULL).
-- The column was originally added as nullable in some migration paths,
-- then made NOT NULL DEFAULT false in 004_add_venue_suspended.sql.
-- This migration defends against rows that slipped through with NULL.

UPDATE public.venues
  SET suspended = false
  WHERE suspended IS NULL;

-- Ensure the column constraint is NOT NULL with a default going forward
ALTER TABLE public.venues
  ALTER COLUMN suspended SET NOT NULL,
  ALTER COLUMN suspended SET DEFAULT false;
