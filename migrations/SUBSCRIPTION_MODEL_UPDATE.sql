-- Migration: SUBSCRIPTION_MODEL_UPDATE
-- Purpose: Update database schema to support new subscription model
-- Author: Artwalls Engineering
-- Created: 2024
-- 
-- Changes:
-- 1. Add buyer_fee_cents and platform_gross_cents to orders table (optional but recommended)
-- 2. Update artists subscription_tier enum values if using typed enums
-- 3. Add platform_fee_category column for analytics

-- ============================================================
-- STEP 1: Add new columns to orders table (OPTIONAL)
-- ============================================================
-- These columns allow better tracking of the order breakdown
-- They can be calculated on-the-fly, but storing them is recommended for audit trails

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS buyer_fee_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS platform_gross_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS buyer_email_full VARCHAR(255),
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_processed_at 
  ON orders(processed_at DESC);

-- ============================================================
-- STEP 2: Update existing orders with calculated values
-- ============================================================
-- Backfill buyer_fee_cents (3% of list price for all existing orders)
-- Backfill platform_gross_cents (remainder after artist and venue payouts)

UPDATE orders
SET 
  buyer_fee_cents = ROUND(amount_cents * 0.03),
  platform_gross_cents = amount_cents - artist_payout_cents - venue_payout_cents
WHERE buyer_fee_cents = 0 
  AND platform_gross_cents = 0;

-- ============================================================
-- STEP 3: Create subscription tier enum type (if using typed enums)
-- ============================================================
-- If your schema uses typed enums, update it to ensure consistency

-- Option A: If you already have a subscription_tier enum, this adds missing values
DO $$
BEGIN
  ALTER TYPE subscription_tier ADD VALUE 'free' BEFORE 'starter';
  ALTER TYPE subscription_tier ADD VALUE 'growth' BEFORE 'pro';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- Option B: If you don't have an enum yet, create one:
-- CREATE TYPE subscription_tier AS ENUM ('free', 'starter', 'growth', 'pro');

-- ============================================================
-- STEP 4: Update artists table constraints
-- ============================================================
-- Ensure subscription_tier only contains valid values

ALTER TABLE artists
ADD CONSTRAINT subscription_tier_values 
  CHECK (subscription_tier IN ('free', 'starter', 'growth', 'pro', 'inactive', 'cancelled'))
  NOT VALID;

-- Validate existing data (non-blocking)
ALTER TABLE artists VALIDATE CONSTRAINT subscription_tier_values;

-- ============================================================
-- STEP 5: Add analytics views
-- ============================================================

-- View 1: Order breakdown by subscription tier
CREATE OR REPLACE VIEW vw_orders_breakdown AS
SELECT 
  o.id,
  o.artwork_id,
  a.id AS artist_id,
  a.subscription_tier,
  o.amount_cents AS list_price_cents,
  ROUND(o.amount_cents * 0.10) AS venue_commission_cents,
  ROUND(o.amount_cents * 0.03) AS buyer_fee_cents,
  o.artist_payout_cents,
  o.venue_payout_cents,
  (o.amount_cents - o.artist_payout_cents - o.venue_payout_cents - ROUND(o.amount_cents * 0.03)) AS platform_net_cents,
  o.created_at,
  o.status
FROM orders o
JOIN artworks aw ON o.artwork_id = aw.id
JOIN artists a ON aw.artist_id = a.id;

-- View 2: Revenue summary by subscription tier
CREATE OR REPLACE VIEW vw_revenue_by_tier AS
SELECT 
  a.subscription_tier,
  COUNT(*) AS order_count,
  SUM(o.amount_cents) / 100.0 AS gross_revenue,
  SUM(o.artist_payout_cents) / 100.0 AS artist_payouts,
  SUM(o.venue_payout_cents) / 100.0 AS venue_commissions,
  SUM(ROUND(o.amount_cents * 0.03)) / 100.0 AS buyer_fees,
  (SUM(o.amount_cents) - SUM(o.artist_payout_cents) - SUM(o.venue_payout_cents) - SUM(ROUND(o.amount_cents * 0.03))) / 100.0 AS platform_net
FROM orders o
JOIN artworks aw ON o.artwork_id = aw.id
JOIN artists a ON aw.artist_id = a.id
WHERE o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY a.subscription_tier;

-- View 3: Artist earnings summary
CREATE OR REPLACE VIEW vw_artist_earnings AS
SELECT 
  a.id,
  a.display_name,
  a.subscription_tier,
  COUNT(*) AS total_orders,
  SUM(o.amount_cents) / 100.0 AS gross_sales,
  SUM(o.artist_payout_cents) / 100.0 AS artist_earnings,
  AVG(o.amount_cents) / 100.0 AS avg_order_value,
  MAX(o.created_at) AS last_sale
FROM artists a
LEFT JOIN artworks aw ON a.id = aw.artist_id
LEFT JOIN orders o ON aw.id = o.artwork_id
WHERE o.status = 'completed'
GROUP BY a.id, a.display_name, a.subscription_tier;

-- ============================================================
-- STEP 6: Create audit log table
-- ============================================================

CREATE TABLE IF NOT EXISTS order_audit_log (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'created', 'processed', 'refunded', etc.
  list_price_cents INTEGER NOT NULL,
  artist_payout_cents INTEGER NOT NULL,
  venue_payout_cents INTEGER NOT NULL,
  buyer_fee_cents INTEGER NOT NULL,
  platform_net_cents INTEGER NOT NULL,
  artist_subscription_tier VARCHAR(50),
  stripe_charge_id VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_order_audit_order_id 
  ON order_audit_log(order_id);

CREATE INDEX IF NOT EXISTS idx_order_audit_created_at 
  ON order_audit_log(created_at DESC);

-- ============================================================
-- STEP 7: Create function to validate order breakdown
-- ============================================================

CREATE OR REPLACE FUNCTION validate_order_breakdown(
  p_list_price_cents INTEGER,
  p_artist_payout_cents INTEGER,
  p_venue_payout_cents INTEGER,
  p_artist_tier VARCHAR
) RETURNS TABLE(is_valid BOOLEAN, error_message TEXT) AS $$
DECLARE
  v_expected_artist_payout INTEGER;
  v_expected_venue_payout INTEGER;
  v_buyer_fee INTEGER;
  v_artist_take_home_pct DECIMAL;
BEGIN
  -- Get expected take-home percentage for tier
  v_artist_take_home_pct := CASE p_artist_tier
    WHEN 'free' THEN 0.65
    WHEN 'starter' THEN 0.80
    WHEN 'growth' THEN 0.83
    WHEN 'pro' THEN 0.85
    ELSE 0
  END;
  
  -- Calculate expected payouts
  v_expected_artist_payout := ROUND(p_list_price_cents * v_artist_take_home_pct);
  v_expected_venue_payout := ROUND(p_list_price_cents * 0.10);
  v_buyer_fee := ROUND(p_list_price_cents * 0.03);
  
  -- Validate
  IF p_artist_payout_cents != v_expected_artist_payout THEN
    RETURN QUERY SELECT FALSE, 'Artist payout mismatch. Expected: ' || v_expected_artist_payout || ', Got: ' || p_artist_payout_cents;
  ELSIF p_venue_payout_cents != v_expected_venue_payout THEN
    RETURN QUERY SELECT FALSE, 'Venue payout mismatch. Expected: ' || v_expected_venue_payout || ', Got: ' || p_venue_payout_cents;
  ELSE
    RETURN QUERY SELECT TRUE, 'Order breakdown is valid';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- STEP 8: Sample validation query
-- ============================================================

-- Run this to check if any recent orders have incorrect breakdowns:
-- SELECT 
--   o.id,
--   o.amount_cents,
--   a.subscription_tier,
--   validation.is_valid,
--   validation.error_message
-- FROM orders o
-- JOIN artworks aw ON o.artwork_id = aw.id
-- JOIN artists a ON aw.artist_id = a.id
-- CROSS JOIN LATERAL validate_order_breakdown(
--   o.amount_cents,
--   o.artist_payout_cents,
--   o.venue_payout_cents,
--   a.subscription_tier
-- ) AS validation
-- WHERE o.created_at >= NOW() - INTERVAL '7 days'
--   AND NOT validation.is_valid;

-- ============================================================
-- MIGRATION SUMMARY
-- ============================================================
-- 
-- Tables Modified:
--   - orders: Added buyer_fee_cents, platform_gross_cents columns
--   - orders: Added processed_at timestamp
--   - artists: Added subscription_tier_values constraint
--
-- Views Created:
--   - vw_orders_breakdown: Detailed order breakdown view
--   - vw_revenue_by_tier: Revenue summary by subscription tier
--   - vw_artist_earnings: Artist earnings summary
--
-- Tables Created:
--   - order_audit_log: Audit trail for order changes
--
-- Functions Created:
--   - validate_order_breakdown(): Validates order splits
--
-- Migration assumes:
--   - orders table has: amount_cents, artist_payout_cents, venue_payout_cents
--   - artists table has: subscription_tier
--   - All nullable columns default to NULL or 0
--
-- To verify migration success, run:
--   SELECT * FROM vw_revenue_by_tier;
--   SELECT * FROM vw_artist_earnings LIMIT 5;
--   SELECT * FROM information_schema.columns WHERE table_name = 'orders' ORDER BY ordinal_position;

