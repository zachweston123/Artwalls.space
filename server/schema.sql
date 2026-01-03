-- Artwalls Marketplace schema (Supabase Postgres)
-- Run this in Supabase SQL Editor, or via Supabase CLI migrations.

-- Enable uuid generation
create extension if not exists "uuid-ossp";

-- Artists
create table if not exists public.artists (
  id uuid primary key,
  email text,
  name text,
  role text not null default 'artist',
  stripe_account_id text,
  stripe_customer_id text,
  subscription_tier text not null default 'free',
  subscription_status text not null default 'inactive',
  stripe_subscription_id text,
  platform_fee_bps int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Venues
create table if not exists public.venues (
  id uuid primary key,
  email text,
  name text,
  type text,
  stripe_account_id text,
  default_venue_fee_bps int not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Artworks / listings
create table if not exists public.artworks (
  id uuid primary key,
  artist_id uuid not null references public.artists(id) on delete cascade,
  venue_id uuid references public.venues(id) on delete set null,
  artist_name text,
  venue_name text,
  title text not null,
  description text,
  price_cents int not null,
  currency text not null default 'usd',
  image_url text,
  venue_fee_bps int,
  stripe_product_id text,
  stripe_price_id text,
  status text not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists artworks_artist_id_idx on public.artworks(artist_id);
create index if not exists artworks_venue_id_idx on public.artworks(venue_id);

-- Orders
create table if not exists public.orders (
  id uuid primary key,
  artwork_id uuid references public.artworks(id) on delete set null,
  artist_id uuid not null references public.artists(id) on delete restrict,
  venue_id uuid references public.venues(id) on delete set null,
  buyer_email text,
  amount_cents int not null,
  currency text not null default 'usd',
  platform_fee_bps int,
  venue_fee_bps int,
  platform_fee_cents int,
  artist_payout_cents int,
  venue_payout_cents int,
  status text not null default 'created',
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  transfer_ids jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_artist_id_idx on public.orders(artist_id);
create index if not exists orders_venue_id_idx on public.orders(venue_id);

-- Stripe webhook idempotency
create table if not exists public.webhook_events (
  id text primary key,
  type text,
  note text,
  processed_at timestamptz not null default now()
);

-- Settings (admin-configurable via UI)
create table if not exists public.settings (
  id text primary key default 'default',
  app_url text,
  sub_success_url text,
  sub_cancel_url text,
  sub_price_starter text,
  sub_price_growth text,
  sub_price_pro text,
  sub_price_elite text,
  fee_bps_free int,
  fee_bps_starter int,
  fee_bps_pro int,
  fee_bps_elite int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Optional: enable Row Level Security (RLS) for future browser access.
-- Server uses service-role key so RLS is bypassed. Enable when you're ready.
-- alter table public.artists enable row level security;
-- alter table public.venues enable row level security;
-- alter table public.artworks enable row level security;
-- alter table public.orders enable row level security;
