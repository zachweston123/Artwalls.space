-- Add phone_number columns to artists and venues and create indexes
-- Idempotent: uses IF NOT EXISTS

ALTER TABLE artists ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE venues  ADD COLUMN IF NOT EXISTS phone_number text;

-- Optional: index for filtering by user id and recent notifications already exist; no need here.
-- Ensure default null and no constraints to avoid breaking existing rows.
