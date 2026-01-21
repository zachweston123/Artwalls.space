-- Ensure artist profile columns exist
alter table public.artists add column if not exists bio text;
alter table public.artists add column if not exists art_types text[]; -- Array of strings
alter table public.artists add column if not exists instagram_handle text;
alter table public.artists add column if not exists portfolio_url text;
alter table public.artists add column if not exists profile_photo_url text;
alter table public.artists add column if not exists city_primary text;
alter table public.artists add column if not exists city_secondary text;

-- Ensure venue columns exist
alter table public.venues add column if not exists city text;
alter table public.venues add column if not exists suspended boolean default false;
