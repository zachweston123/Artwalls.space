-- Add city fields to support artist/venue recommendations
-- Artists can select up to two preferred cities; venues have a single city

alter table if exists public.artists
  add column if not exists city_primary text,
  add column if not exists city_secondary text;

alter table if exists public.venues
  add column if not exists city text;

-- Helpful indexes for filtering by city
create index if not exists artists_city_primary_idx on public.artists(city_primary);
create index if not exists artists_city_secondary_idx on public.artists(city_secondary);
create index if not exists venues_city_idx on public.venues(city);
