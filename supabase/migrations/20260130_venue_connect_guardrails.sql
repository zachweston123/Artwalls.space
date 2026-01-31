-- Ensure venue Stripe Connect columns exist and enforce payout gating
-- Focus: venues payouts readiness + order blocking state

-- Venue Connect fields (align with artists)
alter table public.venues
  add column if not exists stripe_account_id text,
  add column if not exists stripe_charges_enabled boolean not null default false,
  add column if not exists stripe_payouts_enabled boolean not null default false,
  add column if not exists stripe_details_submitted boolean not null default false,
  add column if not exists stripe_onboarding_status text not null default 'not_started'
    check (stripe_onboarding_status in ('not_started','pending','complete','restricted')),
  add column if not exists stripe_requirements_currently_due jsonb default '[]'::jsonb,
  add column if not exists stripe_requirements_eventually_due jsonb default '[]'::jsonb,
  add column if not exists stripe_last_status_sync_at timestamptz,
  add column if not exists updated_at timestamptz default timezone('utc', now());

-- Backfill onboarding status from existing flags if present
update public.venues
set stripe_onboarding_status = case
  when coalesce(stripe_details_submitted, false) and coalesce(stripe_charges_enabled, false) and coalesce(stripe_payouts_enabled, false) then 'complete'
  when coalesce(stripe_details_submitted, false) and (not coalesce(stripe_charges_enabled, false) or not coalesce(stripe_payouts_enabled, false)) then 'restricted'
  when coalesce(stripe_details_submitted, false) or jsonb_array_length(coalesce(stripe_requirements_currently_due, '[]'::jsonb)) > 0 then 'pending'
  else 'not_started'
end,
    stripe_last_status_sync_at = coalesce(stripe_last_status_sync_at, timezone('utc', now()))
where stripe_onboarding_status is null or stripe_onboarding_status = '';

-- Helpful index for webhook lookups
create index if not exists idx_venues_stripe_account on public.venues (stripe_account_id);

-- Orders: allow a blocked payout state for venues awaiting onboarding
alter table public.orders drop constraint if exists orders_payout_status_check;
alter table public.orders
  add constraint orders_payout_status_check
    check (payout_status in ('pending_connect','pending_transfer','paid','failed','blocked_pending_onboarding'));
alter table public.orders alter column payout_status set default 'pending_connect';

comment on column public.orders.payout_status is 'Transfer status; blocked_pending_onboarding means venue not ready for payouts yet';
