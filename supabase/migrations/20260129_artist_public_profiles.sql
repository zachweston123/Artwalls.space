-- Public artist profiles, visibility flags, and tighter RLS

-- Artists visibility + slug + optional website
alter table public.artists add column if not exists slug text;
alter table public.artists add column if not exists is_public boolean not null default true;
alter table public.artists add column if not exists website_url text;

-- Backfill artist visibility + slugs (idempotent)
update public.artists
set is_public = coalesce(is_public, true)
where is_public is null;

update public.artists
set slug = regexp_replace(lower(coalesce(name, 'artist')), '[^a-z0-9]+', '-', 'g') || '-' || substr(id::text, 1, 8)
where (slug is null or slug = '') and name is not null;

create unique index if not exists artists_slug_uidx on public.artists (lower(slug)) where slug is not null and slug <> '';

-- Artworks visibility + lifecycle helpers
alter table public.artworks add column if not exists is_public boolean not null default true;
alter table public.artworks add column if not exists published_at timestamptz;
alter table public.artworks add column if not exists archived_at timestamptz;

update public.artworks
set is_public = coalesce(is_public, true)
where is_public is null;

-- Indexes for public queries
create index if not exists artworks_status_public_idx on public.artworks(status, is_public);

-- Venues visibility + slug + optional neighborhood
alter table public.venues add column if not exists slug text;
alter table public.venues add column if not exists is_public boolean not null default true;
alter table public.venues add column if not exists neighborhood text;

update public.venues
set is_public = coalesce(is_public, true)
where is_public is null;

update public.venues
set slug = regexp_replace(lower(coalesce(name, 'venue')), '[^a-z0-9]+', '-', 'g') || '-' || substr(id::text, 1, 8)
where (slug is null or slug = '') and name is not null;

create unique index if not exists venues_slug_uidx on public.venues (lower(slug)) where slug is not null and slug <> '';
create index if not exists venues_is_public_idx on public.venues(is_public);

-- RLS: public read for published content, keep owner access
-- Artworks
drop policy if exists "artworks_read_all" on public.artworks;
create policy if not exists "artworks_public_read" on public.artworks
  for select using (is_public = true and status in ('available','active','published'));
create policy if not exists "artworks_read_own" on public.artworks
  for select using (auth.uid() = artist_id);

-- Artists (public profiles)
create policy if not exists "artists_public_read" on public.artists
  for select using (is_public = true);

-- Venues (public discovery)
create policy if not exists "venues_public_read" on public.venues
  for select using (is_public = true);
