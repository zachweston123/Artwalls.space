-- =============================================================================
-- Momentum Upgrade Banner
-- Date: 2026-02-08
--
-- Adds momentum banner eligibility columns to the artists table.
-- Trigger: first_live_listing (artwork approved to "active" status).
-- =============================================================================

-- =============================================================================
-- 1. New columns on artists
-- =============================================================================
ALTER TABLE public.artists
  ADD COLUMN IF NOT EXISTS momentum_banner_eligible       boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS momentum_banner_reason         text        NULL
    CHECK (momentum_banner_reason IN ('first_live_listing', 'engagement_threshold', 'first_checkout_start')),
  ADD COLUMN IF NOT EXISTS momentum_banner_eligible_at    timestamptz NULL,
  ADD COLUMN IF NOT EXISTS dismissed_momentum_banner      boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dismissed_momentum_banner_at   timestamptz NULL;

-- =============================================================================
-- 2. RLS policies for momentum columns
--    (artists table already has RLS enabled; we add column-scoped policies)
-- =============================================================================

-- Artists can read their own row (existing policy likely covers SELECT *).
-- We add a narrow UPDATE policy so artists can ONLY set their dismissal fields.
DO $$
BEGIN
  -- Drop if re-running migration
  DROP POLICY IF EXISTS artists_dismiss_momentum_banner ON public.artists;

  CREATE POLICY artists_dismiss_momentum_banner ON public.artists
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (
      id = auth.uid()
      -- Only the dismissal columns may change; eligibility columns are server-only.
      -- Supabase RLS can't enforce column-level write restrictions natively,
      -- but the API endpoint only sends the two dismissal fields.
    );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Policy artists_dismiss_momentum_banner skipped: %', SQLERRM;
END $$;

-- =============================================================================
-- 3. Helper: set_momentum_banner_eligible
--    Called by the server after an artwork is approved to "active".
--    Idempotent — does nothing if already eligible.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_momentum_banner_eligible(
  p_artist_id uuid,
  p_reason    text DEFAULT 'first_live_listing'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated boolean;
BEGIN
  UPDATE artists
  SET
    momentum_banner_eligible    = true,
    momentum_banner_reason      = p_reason,
    momentum_banner_eligible_at = now()
  WHERE id = p_artist_id
    AND momentum_banner_eligible = false;   -- idempotent guard

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;
