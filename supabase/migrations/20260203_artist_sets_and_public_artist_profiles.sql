-- Artist sets + display grouping for public artist profiles
-- Adapts shared curated set tables (artwork_sets/artwork_set_items) to include visibility and set_id links

-- Safety: uuid generator
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1) Sets / Collections (use existing artwork_sets table)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'artist_set_visibility' and n.nspname = 'public'
  ) then
    create type public.artist_set_visibility as enum ('public','private');
  end if;
end $$;

-- Extend curated sets with hero image + visibility
alter table public.artwork_sets add column if not exists hero_image_url text;
alter table public.artwork_sets add column if not exists visibility public.artist_set_visibility not null default 'public';
update public.artwork_sets set visibility = 'public' where visibility is null;

create index if not exists idx_artwork_sets_artist_id on public.artwork_sets (artist_id);
create index if not exists idx_artwork_sets_visibility on public.artwork_sets (visibility);

-- Keep uniqueness for items; add helper indexes
create index if not exists idx_artwork_set_items_set_id on public.artwork_set_items (set_id);
create index if not exists idx_artwork_set_items_artwork_id on public.artwork_set_items (artwork_id);

-- ---------------------------------------------------------------------------
-- 2) Add set_id to canonical display table (artworks acts as live listings)
-- ---------------------------------------------------------------------------
-- Ensure public flag exists (earlier migration added, but keep idempotent for fresh envs)
alter table public.artworks add column if not exists is_public boolean not null default true;
update public.artworks set is_public = coalesce(is_public, true);

alter table public.artworks add column if not exists set_id uuid;

do $$
begin
  if exists (
    select 1 from information_schema.tables where table_schema = 'public' and table_name = 'artwork_sets'
  ) then
    begin
      alter table public.artworks
        add constraint fk_artworks_set_id
        foreign key (set_id) references public.artwork_sets(id)
        on delete set null;
    exception when duplicate_object then null; end;
  end if;
end $$;

create index if not exists idx_artworks_set_id on public.artworks (set_id);

-- ---------------------------------------------------------------------------
-- 3) Public view: where is this artist displayed right now?
--    A "current display" is an artwork with a venue_id, public visibility, and an active/published status.
-- ---------------------------------------------------------------------------
create or replace view public.v_artist_current_displays as
select
  a.id          as artwork_id,
  a.artist_id   as artist_id,
  a.venue_id    as venue_id,
  a.set_id      as set_id,
  a.status      as status,
  a.title       as title,
  a.price_cents as price_cents,
  a.currency    as currency,
  a.image_url   as image_url,
  a.is_public   as is_public
from public.artworks a
where a.venue_id is not null
  and a.is_public = true
  and a.archived_at is null
  and lower(coalesce(a.status, '')) in ('active', 'published');

comment on view public.v_artist_current_displays is 'Public, non-PII view of artworks currently on display (active/published with a venue)';

-- ---------------------------------------------------------------------------
-- 4) RLS updates (public sets must also be visibility = ''public'')
-- ---------------------------------------------------------------------------
alter table public.artwork_sets enable row level security;
alter table public.artwork_set_items enable row level security;

-- Public read: only published + public visibility + valid item counts
drop policy if exists artwork_sets_public_read on public.artwork_sets;
create policy artwork_sets_public_read on public.artwork_sets
  for select using (
    status = 'published'
    and visibility = 'public'
    and (
      select count(*) from public.artwork_set_items i
        join public.artworks a on a.id = i.artwork_id
      where i.set_id = public.artwork_sets.id
        and a.status in ('available','active','published')
        and a.archived_at is null
    ) between 3 and 6
  );

-- Owner CRUD unchanged
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

-- Set items: public read only when parent is public+published
drop policy if exists artwork_set_items_public_read on public.artwork_set_items;
create policy artwork_set_items_public_read on public.artwork_set_items
  for select using (
    exists (
      select 1 from public.artwork_sets s
      where s.id = set_id and s.status = 'published' and s.visibility = 'public'
    )
  );

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

-- ---------------------------------------------------------------------------
-- 5) Minimal dev seed (only if the database is empty) for quick QA
-- ---------------------------------------------------------------------------
do $$
declare
  has_data boolean;
  artist_id uuid;
  venue_a uuid;
  venue_b uuid;
  set_id uuid;
  art_ids uuid[];
begin
  select count(*) > 0 into has_data from public.artists;
  if has_data then
    return; -- skip seeding when any artist exists
  end if;

  artist_id := gen_random_uuid();
  venue_a := gen_random_uuid();
  venue_b := gen_random_uuid();
  set_id := gen_random_uuid();
  art_ids := ARRAY[
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
  ];

  insert into public.artists (id, name, email, is_public, slug, city_primary, bio, profile_photo_url)
  values (artist_id, 'Demo Public Artist', 'demo+artist@artwalls.test', true, 'demo-public-artist', 'San Francisco', 'Sample artist for public profile QA.', null);

  insert into public.venues (id, name, email, is_public, slug, city, neighborhood)
  values
    (venue_a, 'Sample Cafe', 'demo+cafe@artwalls.test', true, 'sample-cafe', 'San Francisco', 'Mission'),
    (venue_b, 'Gallery One', 'demo+gallery@artwalls.test', true, 'gallery-one', 'Oakland', 'Uptown');

  insert into public.artwork_sets (id, artist_id, title, description, status, visibility, hero_image_url, created_at, updated_at)
  values (set_id, artist_id, 'Demo Collection', 'Public set used for automated checks', 'published', 'public', null, now(), now());

  insert into public.artworks (id, artist_id, title, price_cents, currency, image_url, status, is_public, published_at, venue_id, venue_name, set_id)
  values
    (art_ids[1], artist_id, 'Sunlit Alley', 45000, 'usd', null, 'active', true, now(), venue_a, 'Sample Cafe', set_id),
    (art_ids[2], artist_id, 'City Pulse', 52000, 'usd', null, 'active', true, now(), venue_a, 'Sample Cafe', set_id),
    (art_ids[3], artist_id, 'Night Bloom', 38000, 'usd', null, 'active', true, now(), venue_b, 'Gallery One', set_id),
    (art_ids[4], artist_id, 'Quiet Morning', 41000, 'usd', null, 'available', true, now(), null, null, set_id),
    (art_ids[5], artist_id, 'Color Field', 36000, 'usd', null, 'available', true, now(), null, null, null),
    (art_ids[6], artist_id, 'Drift', 30000, 'usd', null, 'published', true, now(), venue_b, 'Gallery One', null);

  insert into public.artwork_set_items (id, set_id, artwork_id, sort_order, created_at)
  values
    (gen_random_uuid(), set_id, art_ids[1], 1, now()),
    (gen_random_uuid(), set_id, art_ids[2], 2, now()),
    (gen_random_uuid(), set_id, art_ids[3], 3, now()),
    (gen_random_uuid(), set_id, art_ids[4], 4, now());
end $$;