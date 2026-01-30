-- Add address fields to venues table
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS address_lat double precision;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS address_lng double precision;

-- Index for geospatial queries (if needed later)
CREATE INDEX IF NOT EXISTS venues_address_idx ON public.venues(address);
