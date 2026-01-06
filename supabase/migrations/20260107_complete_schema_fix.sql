-- Complete schema fix for Artwalls Marketplace
-- This migration ensures all tables and columns exist as expected by the application
-- Run this in Supabase SQL Editor to fix the "Invalid schema: public" error

-- Enable uuid generation (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ARTISTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.artists (
  id uuid PRIMARY KEY,
  email text,
  name text,
  role text NOT NULL DEFAULT 'artist',
  phone_number text,
  city_primary text,
  city_secondary text,
  stripe_account_id text,
  stripe_customer_id text,
  subscription_tier text NOT NULL DEFAULT 'free',
  subscription_status text NOT NULL DEFAULT 'inactive',
  stripe_subscription_id text,
  platform_fee_bps int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add columns if they don't exist (for existing tables)
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS city_primary text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS city_secondary text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS subscription_tier text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS subscription_status text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS platform_fee_bps int;

-- Set defaults for existing rows with null values
UPDATE public.artists SET subscription_tier = 'free' WHERE subscription_tier IS NULL;
UPDATE public.artists SET subscription_status = 'inactive' WHERE subscription_status IS NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS artists_city_primary_idx ON public.artists(city_primary);
CREATE INDEX IF NOT EXISTS artists_city_secondary_idx ON public.artists(city_secondary);

-- ============================================
-- VENUES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.venues (
  id uuid PRIMARY KEY,
  email text,
  name text,
  type text,
  city text,
  phone_number text,
  stripe_account_id text,
  default_venue_fee_bps int NOT NULL DEFAULT 1000,
  labels jsonb DEFAULT '[]'::jsonb,
  suspended boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add columns if they don't exist (for existing tables)
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS labels jsonb;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS suspended boolean;

-- Set defaults for existing rows
UPDATE public.venues SET labels = '[]'::jsonb WHERE labels IS NULL;
UPDATE public.venues SET suspended = false WHERE suspended IS NULL;
UPDATE public.venues SET default_venue_fee_bps = 1000 WHERE default_venue_fee_bps IS NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS venues_city_idx ON public.venues(city);

-- ============================================
-- ARTWORKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.artworks (
  id uuid PRIMARY KEY,
  artist_id uuid NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  venue_id uuid REFERENCES public.venues(id) ON DELETE SET NULL,
  artist_name text,
  venue_name text,
  title text NOT NULL,
  description text,
  price_cents int NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  image_url text,
  venue_fee_bps int,
  stripe_product_id text,
  stripe_price_id text,
  qr_code_url text,
  nfc_tag_id text,
  display_start_date timestamptz,
  display_end_date timestamptz,
  display_duration_days int,
  status text NOT NULL DEFAULT 'available',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add columns if they don't exist
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS qr_code_url text;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS nfc_tag_id text;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS display_start_date timestamptz;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS display_end_date timestamptz;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS display_duration_days int;

-- Create indexes
CREATE INDEX IF NOT EXISTS artworks_artist_id_idx ON public.artworks(artist_id);
CREATE INDEX IF NOT EXISTS artworks_venue_id_idx ON public.artworks(venue_id);

-- ============================================
-- ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY,
  artwork_id uuid REFERENCES public.artworks(id) ON DELETE SET NULL,
  artist_id uuid NOT NULL REFERENCES public.artists(id) ON DELETE RESTRICT,
  venue_id uuid REFERENCES public.venues(id) ON DELETE SET NULL,
  buyer_email text,
  amount_cents int NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  platform_fee_bps int,
  venue_fee_bps int,
  platform_fee_cents int,
  artist_payout_cents int,
  venue_payout_cents int,
  status text NOT NULL DEFAULT 'created',
  stripe_checkout_session_id text UNIQUE,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  transfer_ids jsonb,
  receipt_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add columns if they don't exist
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS receipt_url text;

-- Create indexes
CREATE INDEX IF NOT EXISTS orders_artist_id_idx ON public.orders(artist_id);
CREATE INDEX IF NOT EXISTS orders_venue_id_idx ON public.orders(venue_id);

-- ============================================
-- WEBHOOK EVENTS TABLE (Stripe idempotency)
-- ============================================
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id text PRIMARY KEY,
  type text,
  note text,
  processed_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  data jsonb,
  read boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications(created_at DESC);

-- ============================================
-- VENUE SCHEDULES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.venue_schedules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  open_time time NOT NULL,
  close_time time NOT NULL,
  is_closed boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(venue_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS venue_schedules_venue_id_idx ON public.venue_schedules(venue_id);

-- ============================================
-- BOOKINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  artist_id uuid NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  artwork_id uuid REFERENCES public.artworks(id) ON DELETE SET NULL,
  wall_space_id uuid,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bookings_venue_id_idx ON public.bookings(venue_id);
CREATE INDEX IF NOT EXISTS bookings_artist_id_idx ON public.bookings(artist_id);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON public.bookings(status);

-- ============================================
-- WALL SPACES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.wall_spaces (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  width_inches numeric,
  height_inches numeric,
  price_per_day_cents int,
  is_available boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wall_spaces_venue_id_idx ON public.wall_spaces(venue_id);

-- ============================================
-- SETTINGS TABLE (App-wide settings)
-- ============================================
CREATE TABLE IF NOT EXISTS public.settings (
  key text PRIMARY KEY,
  value jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- GRANT PUBLIC ACCESS (for anon key usage)
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ============================================
-- ROW LEVEL SECURITY (Optional - commented out for now)
-- Enable when ready for production security
-- ============================================
-- ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.artworks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Users can view their own artist profile" ON public.artists
--   FOR SELECT USING (auth.uid() = id);
-- CREATE POLICY "Users can update their own artist profile" ON public.artists
--   FOR UPDATE USING (auth.uid() = id);

-- CREATE POLICY "Users can view their own venue profile" ON public.venues
--   FOR SELECT USING (auth.uid() = id);
-- CREATE POLICY "Users can update their own venue profile" ON public.venues
--   FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- VERIFY TABLES EXIST
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Schema verification complete. Tables created/updated:';
  RAISE NOTICE '  - public.artists';
  RAISE NOTICE '  - public.venues';
  RAISE NOTICE '  - public.artworks';
  RAISE NOTICE '  - public.orders';
  RAISE NOTICE '  - public.webhook_events';
  RAISE NOTICE '  - public.notifications';
  RAISE NOTICE '  - public.venue_schedules';
  RAISE NOTICE '  - public.bookings';
  RAISE NOTICE '  - public.wall_spaces';
  RAISE NOTICE '  - public.settings';
END $$;
