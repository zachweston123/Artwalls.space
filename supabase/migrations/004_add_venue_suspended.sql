-- Add suspended flag to venues for admin moderation
alter table if exists public.venues
  add column if not exists suspended boolean not null default false;
