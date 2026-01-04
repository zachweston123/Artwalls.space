-- Add venue labels/highlights as JSONB
alter table if exists public.venues
  add column if not exists labels jsonb default '[]'::jsonb;
