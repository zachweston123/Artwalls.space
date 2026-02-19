-- ============================================================
-- Founding Artist Program — 50% off for first 12 months
-- ============================================================
BEGIN;

-- ── 1. Add founding-artist columns to `artists` ─────────────

ALTER TABLE artists
  ADD COLUMN IF NOT EXISTS founding_offer_eligible    boolean      DEFAULT false,
  ADD COLUMN IF NOT EXISTS founding_offer_redeemed_at timestamptz  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS founding_discount_ends_at  timestamptz  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS founding_coupon_id         text         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_founding_artist         boolean      DEFAULT false,
  ADD COLUMN IF NOT EXISTS had_paid_subscription      boolean      DEFAULT false;

COMMENT ON COLUMN artists.founding_offer_eligible    IS 'Admin-set flag: artist may redeem the founding discount';
COMMENT ON COLUMN artists.founding_offer_redeemed_at IS 'Timestamp when the founding coupon was applied';
COMMENT ON COLUMN artists.founding_discount_ends_at  IS 'When the 50 % discount expires (redeemed_at + 12 months)';
COMMENT ON COLUMN artists.founding_coupon_id         IS 'Stripe Coupon ID used for the founding discount';
COMMENT ON COLUMN artists.is_founding_artist         IS 'Badge flag — true once discount is successfully redeemed';
COMMENT ON COLUMN artists.had_paid_subscription      IS 'True once artist has ever had any paid subscription';

-- Index for badge lookups on public pages
CREATE INDEX IF NOT EXISTS idx_artists_founding ON artists (is_founding_artist)
  WHERE is_founding_artist = true;

-- ── 2. Global settings table for founding-artist offer caps ──

CREATE TABLE IF NOT EXISTS app_settings (
  key   text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Seed default settings
INSERT INTO app_settings (key, value) VALUES
  ('founding_artist_offer_enabled',      'true'::jsonb),
  ('founding_artist_offer_max_redemptions', '50'::jsonb),
  ('founding_artist_offer_cutoff',       '"2026-12-31T23:59:59Z"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ── 3. RLS policies ──────────────────────────────────────────

-- Artists can read their OWN founding columns (already covered by
-- existing row-level SELECT policy on artists).
-- Only service-role / admin can UPDATE founding fields.

-- app_settings: public read, no client write
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read app_settings" ON app_settings;
CREATE POLICY "Anyone can read app_settings"
  ON app_settings FOR SELECT
  USING (true);

-- No INSERT/UPDATE/DELETE policy for non-service roles
-- (service_role bypasses RLS)

COMMIT;
