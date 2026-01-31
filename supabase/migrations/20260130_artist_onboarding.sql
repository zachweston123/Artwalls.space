-- Artist Onboarding + profile completeness support
-- Adds onboarding progress tracking, profile completeness metrics, and pricing defaults for artists

-- New/expanded artist profile fields (idempotent)
alter table public.artists
  add column if not exists display_name text,
  add column if not exists city text,
  add column if not exists style_tags text[] default '{}'::text[],
  add column if not exists mediums text[] default '{}'::text[],
  add column if not exists instagram_url text,
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists onboarding_step integer not null default 1,
  add column if not exists profile_completion_percent integer default 0,
  add column if not exists accepts_commissions boolean default false,
  add column if not exists price_range text,
  add column if not exists availability_notes text,
  add column if not exists framing_notes text,
  add column if not exists selected_plan text check (selected_plan in ('free','starter','growth','pro')),
  add column if not exists plan_selected_at timestamptz;

-- Backfill display_name and city defaults for existing rows
update public.artists
set display_name = coalesce(display_name, name)
where display_name is null;

update public.artists
set city = coalesce(city, city_primary)
where city is null;

-- Onboarding progress table (one row per artist)
create table if not exists public.artist_onboarding (
  user_id uuid primary key references public.artists(id) on delete cascade,
  current_step integer not null default 1,
  steps_completed jsonb not null default '[]'::jsonb,
  skipped_plan_selection boolean not null default false,
  selected_plan text check (selected_plan in ('free','starter','growth','pro')),
  metadata jsonb default '{}'::jsonb,
  started_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create index if not exists artist_onboarding_current_step_idx on public.artist_onboarding(current_step);

-- Seed onboarding rows for existing artists
insert into public.artist_onboarding (user_id, current_step, steps_completed)
select id, coalesce(onboarding_step, 1), '[]'::jsonb from public.artists
on conflict (user_id) do nothing;

-- Analytics metadata: keep events table flexible for onboarding signals
alter table public.events add column if not exists metadata jsonb default '{}'::jsonb;

-- RLS for onboarding table
alter table public.artist_onboarding enable row level security;

drop policy if exists artist_onboarding_select_own on public.artist_onboarding;
create policy artist_onboarding_select_own on public.artist_onboarding
  for select using (auth.uid() = user_id);

drop policy if exists artist_onboarding_insert_own on public.artist_onboarding;
create policy artist_onboarding_insert_own on public.artist_onboarding
  for insert with check (auth.uid() = user_id);

drop policy if exists artist_onboarding_update_own on public.artist_onboarding;
create policy artist_onboarding_update_own on public.artist_onboarding
  for update using (auth.uid() = user_id);

drop policy if exists artist_onboarding_service_read on public.artist_onboarding;
create policy artist_onboarding_service_read on public.artist_onboarding
  for select using (auth.role() = 'service_role');

comment on column public.artists.profile_completion_percent is 'Cached profile completion percentage for onboarding/checklists';
comment on column public.artists.onboarding_completed is 'True when the artist has finished the onboarding wizard requirements';
comment on table public.artist_onboarding is 'Step tracking for artist onboarding wizard (progress + plan selection)';
