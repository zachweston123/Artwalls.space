-- ============================================================
-- Public Artist Profile resolver functions
-- ============================================================
-- NOTE: In this schema, artists.id IS the auth user id (there is no separate user_id column).
-- The public identifier column is "slug" (not "handle").
--
-- These SECURITY DEFINER functions bypass RLS and return only
-- safe public fields.  Granted to anon + authenticated so that
-- logged-out QR customers can view artist profiles.

-- ── 1. Public artist profile resolver ────────────────────────
create or replace function public.get_public_artist_profile(p_identifier text)
returns table (
  id uuid,
  slug text,
  name text,
  bio text,
  profile_photo_url text,
  portfolio_url text,
  website_url text,
  instagram_handle text,
  city_primary text,
  city_secondary text,
  art_types text[]
) as $$
begin
  return query
  select
    a.id,
    a.slug,
    a.name,
    a.bio,
    a.profile_photo_url,
    a.portfolio_url,
    a.website_url,
    a.instagram_handle,
    a.city_primary,
    a.city_secondary,
    a.art_types
  from artists a
  where 
    (a.slug = p_identifier or a.id::text = p_identifier)
    and a.is_public = true
  limit 1;
end;
$$ language plpgsql security definer;

-- Grant access to the function
grant execute on function public.get_public_artist_profile(text) to anon, authenticated;

-- ── 2. Public artist artworks resolver ───────────────────────
create or replace function public.get_public_artist_artworks(p_identifier text)
returns table (
  id uuid,
  title text,
  status text,
  price_cents integer,
  currency text,
  image_url text,
  venue_name text,
  venue_city text,
  venue_state text
) as $$
declare
  v_artist_id uuid;
begin
  -- Find the artist_id from the identifier (slug or uuid)
  select a.id into v_artist_id
  from artists a
  where (a.slug = p_identifier or a.id::text = p_identifier)
  and a.is_public = true
  limit 1;

  if v_artist_id is null then
    return;
  end if;

  return query
  select
    aw.id,
    aw.title,
    aw.status,
    aw.price_cents,
    aw.currency,
    aw.image_url,
    v.name as venue_name,
    v.city as venue_city,
    v.state as venue_state
  from artworks aw
  left join venues v on aw.venue_id = v.id
  where aw.artist_id = v_artist_id
    and aw.is_public = true
    and aw.archived_at is null
    and aw.status in ('available', 'active', 'published');
end;
$$ language plpgsql security definer;

-- Grant access to the function
grant execute on function public.get_public_artist_artworks(text) to anon, authenticated;

-- ── 3. Ensure is_public columns exist (idempotent) ───────────
-- These may already exist from 20260129_artist_public_profiles.sql,
-- but we guarantee them here so the RPC functions and policies work
-- even if this migration runs first.
alter table public.artists  add column if not exists is_public boolean not null default true;
alter table public.artworks add column if not exists is_public boolean not null default true;

-- ── 4. Ensure RLS policies exist for direct-query fallback ───
-- (Idempotent: won't fail if they already exist from 20260129)
do $$
begin
  -- artists: anon can read public profiles
  if not exists (
    select 1 from pg_policies
    where tablename = 'artists' and policyname = 'artists_public_read'
  ) then
    execute 'create policy "artists_public_read" on public.artists for select using (is_public = true)';
  end if;

  -- artworks: anon can read public artworks
  if not exists (
    select 1 from pg_policies
    where tablename = 'artworks' and policyname = 'artworks_public_read'
  ) then
    execute $p$create policy "artworks_public_read" on public.artworks for select using (is_public = true and status in ('available','active','published'))$p$;
  end if;
end $$;
