-- Add website and Instagram handle to venues table
-- Mirrors the same fields on the artists table for parity.

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS website varchar(255),
  ADD COLUMN IF NOT EXISTS instagram_handle varchar(255);

-- Allow public/anon reads for public venue profiles
-- (These columns don't require additional RLS – the existing venue row policy covers them.)
