-- Migration: Default all artists to "open to new placements"
--
-- Problem: The `is_live` column on the `artists` table is used to indicate
-- whether an artist appears in venue discovery ("Find Artists"). Many existing
-- rows have is_live = NULL because the column was never explicitly set during
-- profile creation. The discovery query excluded these NULL rows, causing
-- "Find Artists" to return 0 results for venues.
--
-- Fix:
--   1. Backfill all NULL is_live rows to TRUE (existing artists become discoverable).
--   2. Set the column default to TRUE so new artists are discoverable immediately.
--   3. Do NOT add NOT NULL constraint — the application now handles NULL safely
--      with `.or('is_live.eq.true,is_live.is.null')`, so this is a belt-and-
--      suspenders approach.
--
-- The artist can opt out by setting is_live = FALSE via their profile settings.

-- Step 1: Backfill existing NULL rows
UPDATE artists
SET    is_live = true
WHERE  is_live IS NULL;

-- Step 2: Set column default for future inserts
ALTER TABLE artists
  ALTER COLUMN is_live SET DEFAULT true;

-- Step 3: Same treatment for is_public — backfill NULLs and set default.
-- This ensures no artist is hidden from discovery by default.
UPDATE artists
SET    is_public = true
WHERE  is_public IS NULL;

ALTER TABLE artists
  ALTER COLUMN is_public SET DEFAULT true;

-- Verify: after this migration, the following should return 0 rows:
-- SELECT count(*) FROM artists WHERE is_live IS NULL OR is_public IS NULL;
