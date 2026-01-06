-- Migration: add scheduling and notifications
create extension if not exists "uuid-ossp";

create table if not exists public.venue_schedules (
  id uuid primary key default uuid_generate_v4(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  day_of_week text not null,
  start_time time not null,
  end_time time not null,
  slot_minutes int not null default 30,
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (venue_id)
);

create table if not exists public.bookings (
  id uuid primary key default uuid_generate_v4(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  artwork_id uuid references public.artworks(id) on delete set null,
  type text not null check (type in ('install','pickup')),
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'booked',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookings_venue_time_idx on public.bookings(venue_id, start_at, end_at);
create index if not exists bookings_artwork_idx on public.bookings(artwork_id);

create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  type text not null,
  title text not null,
  message text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);
