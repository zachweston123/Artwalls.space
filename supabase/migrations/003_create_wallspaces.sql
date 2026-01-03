-- Wallspaces per venue
create table if not exists public.wallspaces (
  id uuid primary key,
  venue_id uuid not null references public.venues(id) on delete cascade,
  name text not null,
  width_inches int,
  height_inches int,
  description text,
  available boolean not null default true,
  photos jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wallspaces_venue_id_idx on public.wallspaces(venue_id);
