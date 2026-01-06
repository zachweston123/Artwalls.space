-- Patch: align artists/venues tables with server expectations
-- Run in Supabase SQL editor or via CLI (supabase db push)

-- Artists: additional profile fields
alter table if exists public.artists add column if not exists phone_number text;
alter table if exists public.artists add column if not exists city_primary text;
alter table if exists public.artists add column if not exists city_secondary text;

-- Venues: moderation flag
alter table if exists public.venues add column if not exists suspended boolean default false;

-- Touch updated_at on existing rows for consistency
update public.artists set updated_at = now() where true;
update public.venues set updated_at = now() where true;
