-- Add receipt URL to orders and create notifications table (idempotent)

-- Orders: receipt URL from Stripe charge
alter table if exists public.orders
  add column if not exists stripe_receipt_url text;

-- Notifications table for artist, venue, and platform
create table if not exists public.notifications (
  id uuid primary key,
  user_id uuid null,
  role text not null check (role in ('artist','venue','platform')),
  title text not null,
  message text not null,
  artwork_id uuid not null,
  order_id uuid not null,
  created_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists notifications_user_role_idx on public.notifications (user_id, role, created_at desc);
create index if not exists notifications_artwork_idx on public.notifications (artwork_id, created_at desc);
