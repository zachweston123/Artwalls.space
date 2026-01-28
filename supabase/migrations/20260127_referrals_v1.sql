-- Migration: Artist → Venue Referrals (V1)
-- Purpose: Lightweight referral tracking + manual rewards
-- Created: 2026-01-27

-- ============================================================
-- STEP 1: venue_referrals table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.venue_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_name text NOT NULL,
  venue_email text NOT NULL,
  venue_website text,
  venue_location_text text,
  note text,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','opened','venue_signed_up','qualified','reward_granted','invalid')),
  venue_id uuid NULL REFERENCES public.venues(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- If the table already existed from a partial run, ensure required columns exist
ALTER TABLE public.venue_referrals
  ADD COLUMN IF NOT EXISTS artist_user_id uuid,
  ADD COLUMN IF NOT EXISTS venue_name text,
  ADD COLUMN IF NOT EXISTS venue_email text,
  ADD COLUMN IF NOT EXISTS venue_website text,
  ADD COLUMN IF NOT EXISTS venue_location_text text,
  ADD COLUMN IF NOT EXISTS note text,
  ADD COLUMN IF NOT EXISTS token text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS venue_id uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_venue_referrals_token ON public.venue_referrals(token);
CREATE INDEX IF NOT EXISTS idx_venue_referrals_artist_user_id ON public.venue_referrals(artist_user_id);
CREATE INDEX IF NOT EXISTS idx_venue_referrals_venue_email ON public.venue_referrals(venue_email);
CREATE INDEX IF NOT EXISTS idx_venue_referrals_status ON public.venue_referrals(status);

-- ============================================================
-- STEP 2: referral_rewards table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.venue_referrals(id) ON DELETE CASCADE,
  artist_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_type text NOT NULL,
  granted_by_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_referral_id ON public.referral_rewards(referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_artist_user_id ON public.referral_rewards(artist_user_id);

-- ============================================================
-- STEP 3: add pro_until to artists
-- ============================================================
ALTER TABLE public.artists
  ADD COLUMN IF NOT EXISTS pro_until timestamptz;

-- ============================================================
-- STEP 4: add referral_id to venues
-- ============================================================
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS referral_id uuid REFERENCES public.venue_referrals(id);

CREATE INDEX IF NOT EXISTS idx_venues_referral_id ON public.venues(referral_id);

-- ============================================================
-- STEP 5: qualification triggers (wallspaces + calls_for_art)
-- ============================================================
CREATE OR REPLACE FUNCTION public.mark_referral_qualified_for_venue(p_venue_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_referral_id uuid;
BEGIN
  SELECT referral_id INTO v_referral_id
  FROM public.venues
  WHERE id = p_venue_id;

  IF v_referral_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.venue_referrals
  SET status = 'qualified',
      updated_at = now()
  WHERE id = v_referral_id
    AND status IN ('venue_signed_up');
END;
$$;

CREATE OR REPLACE FUNCTION public.referrals_qualify_on_wallspace_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.mark_referral_qualified_for_venue(NEW.venue_id);
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'wallspaces'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'trg_referrals_qualify_on_wallspaces'
    ) THEN
      EXECUTE 'CREATE TRIGGER trg_referrals_qualify_on_wallspaces '
           || 'AFTER INSERT ON public.wallspaces '
           || 'FOR EACH ROW EXECUTE FUNCTION public.referrals_qualify_on_wallspace_insert()';
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.referrals_qualify_on_call_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.mark_referral_qualified_for_venue(NEW.venue_id);
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'calls_for_art'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'trg_referrals_qualify_on_calls'
    ) THEN
      EXECUTE 'CREATE TRIGGER trg_referrals_qualify_on_calls '
           || 'AFTER INSERT ON public.calls_for_art '
           || 'FOR EACH ROW EXECUTE FUNCTION public.referrals_qualify_on_call_insert()';
    END IF;
  END IF;
END;
$$;

-- ============================================================
-- STEP 6: RLS policies
-- ============================================================
ALTER TABLE public.venue_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

-- Artist can insert/select their own referrals
DROP POLICY IF EXISTS "venue_referrals_insert_own" ON public.venue_referrals;
CREATE POLICY "venue_referrals_insert_own" ON public.venue_referrals
  FOR INSERT WITH CHECK (auth.uid() = artist_user_id);

DROP POLICY IF EXISTS "venue_referrals_select_own" ON public.venue_referrals;
CREATE POLICY "venue_referrals_select_own" ON public.venue_referrals
  FOR SELECT USING (auth.uid() = artist_user_id);

-- Admin full access to referrals
DROP POLICY IF EXISTS "admin_all_venue_referrals" ON public.venue_referrals;
CREATE POLICY "admin_all_venue_referrals" ON public.venue_referrals
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Referral rewards: admin only
DROP POLICY IF EXISTS "admin_all_referral_rewards" ON public.referral_rewards;
CREATE POLICY "admin_all_referral_rewards" ON public.referral_rewards
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());
