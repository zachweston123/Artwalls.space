-- Product upgrades: policies, calls for art, analytics

-- Artworks: required listing details
alter table public.artworks
  add column if not exists dimensions_width numeric,
  add column if not exists dimensions_height numeric,
  add column if not exists dimensions_depth numeric,
  add column if not exists dimensions_unit text,
  add column if not exists medium text,
  add column if not exists materials text,
  add column if not exists condition text,
  add column if not exists known_flaws text,
  add column if not exists edition_type text,
  add column if not exists edition_size int,
  add column if not exists shipping_time_estimate text,
  add column if not exists image_urls text[] default '{}'::text[],
  add column if not exists in_space_photo_url text,
  add column if not exists color_accuracy_ack boolean not null default false,
  add column if not exists is_publishable boolean not null default false,
  add column if not exists purchase_url text,
  add column if not exists qr_svg text;

-- Orders: immutable financial snapshot
alter table public.orders
  add column if not exists list_price_cents int,
  add column if not exists buyer_fee_cents int,
  add column if not exists buyer_total_cents int,
  add column if not exists venue_amount_cents int,
  add column if not exists artist_amount_cents int,
  add column if not exists platform_gross_before_stripe_cents int,
  add column if not exists artist_plan_id_at_purchase text,
  add column if not exists stripe_receipt_url text;

-- Calls for Art
create table if not exists public.calls_for_art (
  id uuid primary key default uuid_generate_v4(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  title text not null,
  description text,
  wall_constraints text,
  max_dimensions text,
  max_pieces int,
  preferred_tags text[] default '{}'::text[],
  price_min_cents int,
  price_max_cents int,
  submission_deadline timestamptz,
  install_window_start timestamptz,
  install_window_end timestamptz,
  show_start timestamptz,
  show_end timestamptz,
  submission_fee_cents int not null default 0,
  max_applications int,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calls_for_art_venue_idx on public.calls_for_art(venue_id);
create index if not exists calls_for_art_status_idx on public.calls_for_art(status);

create table if not exists public.call_applications (
  id uuid primary key default uuid_generate_v4(),
  call_id uuid not null references public.calls_for_art(id) on delete cascade,
  artist_user_id uuid not null references public.artists(id) on delete cascade,
  statement text,
  portfolio_url text,
  selected_artwork_ids uuid[] default '{}'::uuid[],
  additional_image_urls text[] default '{}'::text[],
  status text not null default 'submitted',
  paid boolean not null default false,
  amount_paid_cents int,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists call_apps_call_idx on public.call_applications(call_id);
create index if not exists call_apps_artist_idx on public.call_applications(artist_user_id);

-- Platform payments (submission fees)
create table if not exists public.platform_payments (
  id uuid primary key default uuid_generate_v4(),
  payment_type text not null,
  related_id uuid,
  amount_cents int not null,
  currency text not null default 'usd',
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  created_at timestamptz not null default now()
);

create index if not exists platform_payments_type_idx on public.platform_payments(payment_type);

-- Analytics events (append-only)
create table if not exists public.events (
  id uuid primary key default uuid_generate_v4(),
  event_type text not null,
  user_id uuid,
  artwork_id uuid,
  venue_id uuid,
  session_id uuid,
  user_agent_hash text,
  created_at timestamptz not null default now()
);

create index if not exists events_type_idx on public.events(event_type);
create index if not exists events_artwork_idx on public.events(artwork_id);
create index if not exists events_venue_idx on public.events(venue_id);
create index if not exists events_created_idx on public.events(created_at);

-- RLS policies
alter table public.calls_for_art enable row level security;
alter table public.call_applications enable row level security;
alter table public.events enable row level security;

-- Calls for art: venues can manage, public can read open
create policy if not exists calls_for_art_select_open on public.calls_for_art
  for select using (status = 'open');
create policy if not exists calls_for_art_venue_manage on public.calls_for_art
  for all using (venue_id = auth.uid()) with check (venue_id = auth.uid());

-- Call applications: artists manage own; venues can read/update for their calls
create policy if not exists call_apps_artist_manage on public.call_applications
  for all using (artist_user_id = auth.uid()) with check (artist_user_id = auth.uid());
create policy if not exists call_apps_venue_read on public.call_applications
  for select using (call_id in (select id from public.calls_for_art where venue_id = auth.uid()));
create policy if not exists call_apps_venue_update on public.call_applications
  for update using (call_id in (select id from public.calls_for_art where venue_id = auth.uid()));

-- Events: allow insert from authenticated users
create policy if not exists events_insert_auth on public.events
  for insert with check (auth.uid() is not null);

