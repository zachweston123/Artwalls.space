-- Add agreement_accepted_at column to artists and venues tables
alter table public.artists add column if not exists agreement_accepted_at timestamptz;
alter table public.venues add column if not exists agreement_accepted_at timestamptz;
