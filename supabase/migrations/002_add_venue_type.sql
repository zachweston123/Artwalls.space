-- Add venue type field (used for filtering/discovery)
alter table if exists public.venues
  add column if not exists type text;
