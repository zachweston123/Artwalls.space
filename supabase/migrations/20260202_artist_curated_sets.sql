-- Artist-Curated Sets (3–6 artworks) with venue selections and tier gating
-- Run in Supabase SQL

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helper: max sets per tier
-- ---------------------------------------------------------------------------
create or replace function public.get_max_sets_for_tier(tier text)
returns integer
language sql
as $$
  select case lower(coalesce(tier, 'free'))
    when 'free' then 0
    when 'starter' then 1
    when 'growth' then 3
    when 'pro' then 6
    else 0
  end;
$$;

-- Ensure artworks has archived_at column for availability checks (defensive)
alter table public.artworks add column if not exists archived_at timestamptz;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.artwork_sets (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  title text not null check (char_length(title) <= 60),
  description text check (description is null or char_length(description) <= 240),
  tags text[],
  status text not null default 'draft' check (status in ('draft','published','archived')),
  needs_attention boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists artwork_sets_artist_status_idx on public.artwork_sets(artist_id, status);
create index if not exists artwork_sets_status_idx on public.artwork_sets(status);
create index if not exists artwork_sets_tags_gin on public.artwork_sets using gin (tags);

create table if not exists public.artwork_set_items (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.artwork_sets(id) on delete cascade,
  artwork_id uuid not null references public.artworks(id) on delete cascade,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.artwork_set_items
  add constraint artwork_set_items_unique unique (set_id, artwork_id);

create index if not exists artwork_set_items_set_idx on public.artwork_set_items(set_id, sort_order);
create index if not exists artwork_set_items_artwork_idx on public.artwork_set_items(artwork_id);

-- Venue selections (bookmark/select a set)
create table if not exists public.venue_set_selections (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  set_id uuid not null references public.artwork_sets(id) on delete cascade,
  status text not null default 'selected' check (status in ('selected','removed')),
  artwork_ids_snapshot uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists venue_set_selections_venue_idx on public.venue_set_selections(venue_id, status);
create index if not exists venue_set_selections_set_idx on public.venue_set_selections(set_id, status);
create unique index if not exists venue_set_selection_active_uidx
  on public.venue_set_selections(venue_id, set_id) where status = 'selected';

-- ---------------------------------------------------------------------------
-- Helpers + validation
-- ---------------------------------------------------------------------------
create or replace function public.artwork_set_item_stats(p_set_id uuid)
returns table(valid_count int, invalid_count int)
language sql
as $$
  select
    count(*) filter (
      where a.status in ('available','active','published')
        and a.archived_at is null
    ) as valid_count,
    count(*) filter (
      where coalesce(a.status, '') not in ('available','active','published')
         or a.archived_at is not null
    ) as invalid_count
  from public.artwork_set_items i
  left join public.artworks a on a.id = i.artwork_id
  where i.set_id = p_set_id;
$$;

-- Ensure item belongs to same artist and artwork is available
create or replace function public.enforce_artwork_set_item_consistency()
returns trigger
language plpgsql
as $$
declare
  set_artist uuid;
  art_artist uuid;
  art_status text;
begin
  select artist_id into set_artist from public.artwork_sets where id = new.set_id;
  if set_artist is null then
    raise exception 'Set % not found', new.set_id;
  end if;

  select artist_id, status into art_artist, art_status from public.artworks where id = new.artwork_id;
  if art_artist is null then
    raise exception 'Artwork % not found', new.artwork_id;
  end if;
  if art_artist <> set_artist then
    raise exception 'Artwork artist mismatch for set';
  end if;
  if art_status not in ('available','active','published') then
    raise exception 'Artwork is not available/active for sets';
  end if;
  return new;
end;
$$;

-- Derive effective tier (pro_until override, inactive => free)
create or replace function public.effective_artist_tier(p_artist_id uuid)
returns text
language plpgsql
as $$
declare
  t record;
  tier text := 'free';
  status text := 'inactive';
begin
  select subscription_tier, subscription_status, pro_until
    into t
    from public.artists
    where id = p_artist_id;

  if not found then
    return 'free';
  end if;

  if t.pro_until is not null and t.pro_until > now() then
    tier := 'pro';
    status := 'active';
  else
    tier := lower(coalesce(t.subscription_tier, 'free'));
    status := lower(coalesce(t.subscription_status, 'inactive'));
  end if;

  if status <> 'active' then
    tier := 'free';
  end if;
  return tier;
end;
$$;

-- Enforce per-tier set limits and publish readiness
create or replace function public.artwork_sets_before_write()
returns trigger
language plpgsql
as $$
declare
  eff_tier text;
  limit_sets int;
  active_count int;
  stats record;
begin
  if new.id is null then
    new.id := gen_random_uuid();
  end if;
  new.updated_at := now();

  eff_tier := effective_artist_tier(new.artist_id);
  limit_sets := coalesce(get_max_sets_for_tier(eff_tier), 0);

  if new.status <> 'archived' then
    select count(*) into active_count
      from public.artwork_sets s
      where s.artist_id = new.artist_id
        and s.status <> 'archived'
        and (tg_op = 'INSERT' or s.id <> new.id);
    active_count := active_count + 1;
    if active_count > limit_sets then
      raise exception 'Set limit exceeded for tier % (max %)', eff_tier, limit_sets;
    end if;
  end if;

  if new.status = 'published' then
    select * into stats from public.artwork_set_item_stats(new.id);
    if coalesce(stats.valid_count, 0) < 3 or coalesce(stats.valid_count, 0) > 6 or coalesce(stats.invalid_count, 0) > 0 then
      raise exception 'Published sets must have 3–6 available artworks';
    end if;
    new.needs_attention := false;
  end if;

  return new;
end;
$$;

-- After item changes or artwork status changes, downgrade published sets that are no longer valid
create or replace function public.refresh_artwork_set_health(p_set_id uuid)
returns void
language plpgsql
as $$
declare
  stats record;
  cur_status text;
begin
  select status into cur_status from public.artwork_sets where id = p_set_id;
  if cur_status is null then return; end if;

  select * into stats from public.artwork_set_item_stats(p_set_id);

  if stats.invalid_count > 0 or stats.valid_count is null then
    update public.artwork_sets
      set status = case when status = 'published' then 'draft' else status end,
          needs_attention = true,
          updated_at = now()
      where id = p_set_id;
    return;
  end if;

  if stats.valid_count < 3 or stats.valid_count > 6 then
    update public.artwork_sets
      set status = case when status = 'published' then 'draft' else status end,
          needs_attention = true,
          updated_at = now()
      where id = p_set_id;
  else
    update public.artwork_sets
      set needs_attention = false,
          updated_at = now()
      where id = p_set_id;
  end if;
end;
$$;

create or replace function public.artwork_set_items_after_change()
returns trigger
language plpgsql
as $$
declare
  target uuid := coalesce(new.set_id, old.set_id);
begin
  if target is null then return null; end if;
  perform refresh_artwork_set_health(target);
  return null;
end;
$$;

create or replace function public.artwork_sets_on_artwork_update()
returns trigger
language plpgsql
as $$
declare
  is_available boolean;
begin
  is_available := new.status in ('available','active','published') and new.archived_at is null;
  if is_available then
    -- Re-evaluate sets in case availability improved
    update public.artwork_sets
      set updated_at = now()
      where id in (select set_id from public.artwork_set_items where artwork_id = new.id);
  else
    update public.artwork_sets
      set status = case when status = 'published' then 'draft' else status end,
          needs_attention = true,
          updated_at = now()
      where id in (select set_id from public.artwork_set_items where artwork_id = new.id);
  end if;
  -- Run health check for all affected sets
  perform refresh_artwork_set_health(sid) from (
    select distinct set_id as sid from public.artwork_set_items where artwork_id = new.id
  ) t;
  return null;
end;
$$;

-- Keep selections updated_at fresh
create or replace function public.venue_set_selections_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create trigger trg_artwork_sets_before_write
  before insert or update on public.artwork_sets
  for each row
  execute procedure public.artwork_sets_before_write();

create trigger trg_artwork_set_items_consistency
  before insert or update on public.artwork_set_items
  for each row
  execute procedure public.enforce_artwork_set_item_consistency();

create trigger trg_artwork_set_items_after_change
  after insert or update or delete on public.artwork_set_items
  for each row
  execute procedure public.artwork_set_items_after_change();

create trigger trg_artwork_sets_on_artwork_update
  after update of status, archived_at on public.artworks
  for each row
  execute procedure public.artwork_sets_on_artwork_update();

create trigger trg_venue_set_selections_touch
  before insert or update on public.venue_set_selections
  for each row
  execute procedure public.venue_set_selections_touch();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.artwork_sets enable row level security;
alter table public.artwork_set_items enable row level security;
alter table public.venue_set_selections enable row level security;

-- Artwork sets policies
drop policy if exists artwork_sets_public_read on public.artwork_sets;
create policy artwork_sets_public_read on public.artwork_sets
  for select using (
    status = 'published' and
    (select count(*) from public.artwork_set_items i
      join public.artworks a on a.id = i.artwork_id
     where i.set_id = public.artwork_sets.id
       and a.status in ('available','active','published')
       and a.archived_at is null) between 3 and 6
  );

drop policy if exists artwork_sets_read_own on public.artwork_sets;
create policy artwork_sets_read_own on public.artwork_sets
  for select using (auth.uid() = artist_id);

drop policy if exists artwork_sets_insert_own on public.artwork_sets;
create policy artwork_sets_insert_own on public.artwork_sets
  for insert with check (auth.uid() = artist_id);

drop policy if exists artwork_sets_update_own on public.artwork_sets;
create policy artwork_sets_update_own on public.artwork_sets
  for update using (auth.uid() = artist_id);

drop policy if exists artwork_sets_delete_own on public.artwork_sets;
create policy artwork_sets_delete_own on public.artwork_sets
  for delete using (auth.uid() = artist_id);

-- Set items policies
drop policy if exists artwork_set_items_public_read on public.artwork_set_items;
create policy artwork_set_items_public_read on public.artwork_set_items
  for select using (exists (
    select 1 from public.artwork_sets s
    where s.id = set_id and s.status = 'published'
  ));

drop policy if exists artwork_set_items_read_own on public.artwork_set_items;
create policy artwork_set_items_read_own on public.artwork_set_items
  for select using (auth.uid() = (select artist_id from public.artwork_sets s where s.id = set_id));

drop policy if exists artwork_set_items_insert_own on public.artwork_set_items;
create policy artwork_set_items_insert_own on public.artwork_set_items
  for insert with check (auth.uid() = (select artist_id from public.artwork_sets s where s.id = set_id));

drop policy if exists artwork_set_items_update_own on public.artwork_set_items;
create policy artwork_set_items_update_own on public.artwork_set_items
  for update using (auth.uid() = (select artist_id from public.artwork_sets s where s.id = set_id));

drop policy if exists artwork_set_items_delete_own on public.artwork_set_items;
create policy artwork_set_items_delete_own on public.artwork_set_items
  for delete using (auth.uid() = (select artist_id from public.artwork_sets s where s.id = set_id));

-- Venue selections policies
drop policy if exists venue_set_selections_read_venue on public.venue_set_selections;
create policy venue_set_selections_read_venue on public.venue_set_selections
  for select using (auth.uid() = venue_id);

drop policy if exists venue_set_selections_insert_venue on public.venue_set_selections;
create policy venue_set_selections_insert_venue on public.venue_set_selections
  for insert with check (auth.uid() = venue_id);

drop policy if exists venue_set_selections_update_venue on public.venue_set_selections;
create policy venue_set_selections_update_venue on public.venue_set_selections
  for update using (auth.uid() = venue_id);

-- Allow artists to see selections for their sets (read-only)
drop policy if exists venue_set_selections_read_artist on public.venue_set_selections;
create policy venue_set_selections_read_artist on public.venue_set_selections
  for select using (
    exists (
      select 1 from public.artwork_sets s
      where s.id = set_id and s.artist_id = auth.uid()
    )
  );
