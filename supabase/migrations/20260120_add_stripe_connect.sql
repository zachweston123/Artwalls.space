-- Migration: Add Stripe Connect fields for artists and venues
-- Purpose: Enable automatic payouts via Stripe Connect Express accounts
-- Created: 2026-01-20

-- ============================================================
-- STEP 1: Add Stripe Connect fields to artists table
-- ============================================================
ALTER TABLE public.artists
ADD COLUMN IF NOT EXISTS stripe_onboarding_status TEXT DEFAULT 'not_started' CHECK (stripe_onboarding_status IN ('not_started', 'pending', 'complete', 'restricted')),
ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_requirements_currently_due JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS stripe_requirements_eventually_due JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS stripe_last_status_sync_at TIMESTAMPTZ;

-- ============================================================
-- STEP 2: Add Stripe Connect fields to venues table
-- ============================================================
ALTER TABLE public.venues
ADD COLUMN IF NOT EXISTS stripe_onboarding_status TEXT DEFAULT 'not_started' CHECK (stripe_onboarding_status IN ('not_started', 'pending', 'complete', 'restricted')),
ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_requirements_currently_due JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS stripe_requirements_eventually_due JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS stripe_last_status_sync_at TIMESTAMPTZ;

-- ============================================================
-- STEP 3: Enhance orders table for Connect transfers
-- ============================================================
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS list_price_cents INTEGER,
ADD COLUMN IF NOT EXISTS buyer_fee_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS buyer_total_cents INTEGER,
ADD COLUMN IF NOT EXISTS venue_amount_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS artist_amount_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS platform_gross_before_stripe_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS stripe_fee_cents INTEGER,
ADD COLUMN IF NOT EXISTS platform_net_cents INTEGER,
ADD COLUMN IF NOT EXISTS artist_plan_id_at_purchase TEXT,
ADD COLUMN IF NOT EXISTS stripe_balance_transaction_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_transfer_id_artist TEXT,
ADD COLUMN IF NOT EXISTS stripe_transfer_id_venue TEXT,
ADD COLUMN IF NOT EXISTS payout_status TEXT DEFAULT 'pending_connect' CHECK (payout_status IN ('pending_connect', 'pending_transfer', 'paid', 'failed')),
ADD COLUMN IF NOT EXISTS payout_error TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_artists_stripe_account_id ON public.artists(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_venues_stripe_account_id ON public.venues(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_orders_payout_status ON public.orders(payout_status);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment_intent_id ON public.orders(stripe_payment_intent_id);

-- ============================================================
-- STEP 4: Backfill list_price_cents for existing orders
-- ============================================================
-- Set list_price_cents to amount_cents for orders where it's not set
UPDATE public.orders
SET list_price_cents = amount_cents
WHERE list_price_cents IS NULL AND amount_cents IS NOT NULL;

-- ============================================================
-- STEP 5: Create audit view for Connect accounts
-- ============================================================
CREATE OR REPLACE VIEW vw_stripe_connect_accounts AS
SELECT 
  'artist' AS account_type,
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
FROM public.artists a
WHERE a.stripe_account_id IS NOT NULL
UNION ALL
SELECT 
  'venue' AS account_type,
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
FROM public.venues v
WHERE v.stripe_account_id IS NOT NULL;

-- ============================================================
-- STEP 6: Create view for pending payouts
-- ============================================================
CREATE OR REPLACE VIEW vw_pending_payouts AS
SELECT 
  o.id AS order_id,
  o.artwork_id,
  o.artist_id,
  o.venue_id,
  a.name AS artist_name,
  a.stripe_account_id AS artist_stripe_account_id,
  a.stripe_payouts_enabled AS artist_payouts_enabled,
  v.name AS venue_name,
  v.stripe_account_id AS venue_stripe_account_id,
  v.stripe_payouts_enabled AS venue_payouts_enabled,
  o.list_price_cents,
  o.artist_amount_cents,
  o.venue_amount_cents,
  o.payout_status,
  o.payout_error,
  o.created_at AS order_created_at
FROM public.orders o
JOIN public.artists a ON o.artist_id = a.id
LEFT JOIN public.venues v ON o.venue_id = v.id
WHERE o.payout_status IN ('pending_connect', 'failed')
  AND o.status = 'completed';

COMMENT ON VIEW vw_pending_payouts IS 'Orders with completed payments but pending payouts (Connect accounts not onboarded or transfers failed)';
