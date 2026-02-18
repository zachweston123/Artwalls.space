-- Migration: Create admin_users allowlist table
-- This table is the single source of truth for admin membership.
-- The Worker validates admin access by checking this table with the service role client.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.admin_users is 'Server-side admin allowlist. Only the Worker (service role) reads this table.';

-- Enable RLS
alter table public.admin_users enable row level security;

-- Deny ALL direct client access (anon + authenticated).
-- The Worker uses the service role key which bypasses RLS.
create policy "no direct client access"
  on public.admin_users
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- ─────────────────────────────────────────────────────────────────────────────
-- HOW TO SEED YOUR FIRST ADMIN
-- ─────────────────────────────────────────────────────────────────────────────
-- Run this in the Supabase SQL Editor (which uses the service role):
--
--   INSERT INTO public.admin_users (user_id)
--   VALUES ('<your-supabase-auth-user-uuid>')
--   ON CONFLICT DO NOTHING;
--
-- You can find your user UUID in the Supabase Auth → Users dashboard.
-- ─────────────────────────────────────────────────────────────────────────────
