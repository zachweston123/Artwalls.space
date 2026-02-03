-- Fix Supabase lint findings: security invoker views, RLS enablement, and safer policies

-- ---------------------------------------------------------------------------
-- Views: run as invoker so RLS checks caller instead of view owner
-- ---------------------------------------------------------------------------
create or replace view public.vw_stripe_connect_accounts
  with (security_invoker = true) as
select 
  'artist' as account_type,
  a.id,
  a.name,
  a.email,
  a.stripe_account_id,
  a.stripe_onboarding_status,
  a.stripe_charges_enabled,
  a.stripe_payouts_enabled,
  a.stripe_details_submitted,
  a.stripe_last_status_sync_at,
  a.created_at
from public.artists a
where a.stripe_account_id is not null
union all
select 
  'venue' as account_type,
  v.id,
  v.name,
  v.email,
  v.stripe_account_id,
  v.stripe_onboarding_status,
  v.stripe_charges_enabled,
  v.stripe_payouts_enabled,
  v.stripe_details_submitted,
  v.stripe_last_status_sync_at,
  v.created_at
from public.venues v
where v.stripe_account_id is not null;

create or replace view public.vw_pending_payouts
  with (security_invoker = true) as
select 
  o.id as order_id,
  o.artwork_id,
  o.artist_id,
  o.venue_id,
  a.name as artist_name,
  a.stripe_account_id as artist_stripe_account_id,
  a.stripe_payouts_enabled as artist_payouts_enabled,
  v.name as venue_name,
  v.stripe_account_id as venue_stripe_account_id,
  v.stripe_payouts_enabled as venue_payouts_enabled,
  o.list_price_cents,
  o.artist_amount_cents,
  o.venue_amount_cents,
  o.payout_status,
  o.payout_error,
  o.created_at as order_created_at
from public.orders o
join public.artists a on o.artist_id = a.id
left join public.venues v on o.venue_id = v.id
where o.payout_status in ('pending_connect', 'failed')
  and o.status = 'completed';

comment on view public.vw_pending_payouts is 'Orders with completed payments but pending payouts (Connect accounts not onboarded or transfers failed)';

-- ---------------------------------------------------------------------------
-- RLS: enable on public tables flagged by lint
-- ---------------------------------------------------------------------------
alter table public.webhook_events enable row level security;
alter table public.settings enable row level security;
alter table public.wall_spaces enable row level security;
alter table public.student_verifications enable row level security;
alter table public.schools enable row level security;

-- Service/admin-only system tables
create policy webhook_events_service_only on public.webhook_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy settings_admin_or_service on public.settings
  for all
  using (
    auth.role() = 'service_role' or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    auth.role() = 'service_role' or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Wall spaces: owned by venue, also allow admin/service
create policy wall_spaces_owner_rw on public.wall_spaces
  for all
  using (
    auth.uid() = venue_id
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    or auth.role() = 'service_role'
  )
  with check (
    auth.uid() = venue_id
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    or auth.role() = 'service_role'
  );

-- Student verifications: artist owns row; admin/service allowed
create policy student_verifications_owner_rw on public.student_verifications
  for all
  using (
    auth.uid() = artist_id
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    or auth.role() = 'service_role'
  )
  with check (
    auth.uid() = artist_id
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    or auth.role() = 'service_role'
  );

-- Schools: read-only to everyone; writes admin/service
create policy schools_public_read on public.schools
  for select using (true);

create policy schools_admin_or_service_write on public.schools
  for all
  using (
    auth.role() = 'service_role' or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    auth.role() = 'service_role' or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- ---------------------------------------------------------------------------
-- RLS policy cleanup: stop referencing user_metadata (user-controlled)
-- ---------------------------------------------------------------------------
drop policy if exists "venues_admin_read" on public.venues;
create policy "venues_admin_read" on public.venues
  for select using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' or auth.role() = 'service_role'
  );

drop policy if exists "venues_admin_update" on public.venues;
create policy "venues_admin_update" on public.venues
  for update using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' or auth.role() = 'service_role'
  );
