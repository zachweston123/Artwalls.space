-- Admin Dashboard Metrics RPC
-- Provides real-time user and artist statistics for the admin dashboard
--
-- DEPLOYMENT INSTRUCTIONS:
-- 1. Apply this migration via Supabase Dashboard SQL Editor, OR
-- 2. Run: supabase db push (if using Supabase CLI), OR
-- 3. Copy and paste this SQL into your Supabase SQL Editor
--
-- This creates a new RPC function that:
-- - Returns total users count (from auth.users)
-- - Returns total artists count
-- - Groups artists by subscription_tier (free/starter/growth/pro/etc.)
-- - Groups artists by art_types (Photographer/Painter/etc.)
-- - Auto-updates as data changes (no caching)
-- - Requires admin access (uses is_admin() function)

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  total_users_count int;
  total_artists_count int;
  tier_counts jsonb;
  art_type_counts jsonb;
BEGIN
  -- Check if user is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Count total users (from auth.users)
  SELECT COUNT(*)::int INTO total_users_count
  FROM auth.users;

  -- Count total artists
  SELECT COUNT(*)::int INTO total_artists_count
  FROM public.artists;

  -- Count artists by subscription tier
  SELECT jsonb_object_agg(
    COALESCE(subscription_tier, 'unknown'),
    tier_count
  ) INTO tier_counts
  FROM (
    SELECT 
      subscription_tier,
      COUNT(*)::int as tier_count
    FROM public.artists
    GROUP BY subscription_tier
  ) tier_data;

  -- Count artists by art type (unnest the array and count)
  SELECT jsonb_object_agg(
    art_type,
    type_count
  ) INTO art_type_counts
  FROM (
    SELECT 
      COALESCE(art_type, 'Unspecified') as art_type,
      COUNT(*)::int as type_count
    FROM public.artists
    CROSS JOIN LATERAL unnest(COALESCE(art_types, ARRAY[]::text[])) as art_type
    GROUP BY art_type
    UNION ALL
    -- Include artists with no art_types specified
    SELECT 
      'Unspecified' as art_type,
      COUNT(*)::int as type_count
    FROM public.artists
    WHERE art_types IS NULL OR array_length(art_types, 1) IS NULL OR array_length(art_types, 1) = 0
  ) type_data
  WHERE type_count > 0;

  -- Build the result JSON
  result := jsonb_build_object(
    'totalUsers', total_users_count,
    'totalArtists', total_artists_count,
    'artistsByTier', COALESCE(tier_counts, '{}'::jsonb),
    'artistsByType', COALESCE(art_type_counts, '{}'::jsonb)
  );

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users (admin check is inside the function)
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_metrics() TO authenticated;

COMMENT ON FUNCTION public.get_admin_dashboard_metrics() IS 
'Returns aggregated metrics for admin dashboard including user counts, artist tier distribution, and art type distribution';
