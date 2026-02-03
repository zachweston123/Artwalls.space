-- Harden function search_path per Supabase lint 0011
-- Sets search_path=public for flagged functions without touching bodies

DO $$
DECLARE
  target_names text[] := ARRAY[
    'is_admin',
    'get_max_sets_for_tier',
    'mark_referral_qualified_for_venue',
    'referrals_qualify_on_wallspace_insert',
    'referrals_qualify_on_call_insert',
    'artwork_set_item_stats',
    'enforce_artwork_set_item_consistency',
    'effective_artist_tier',
    'artwork_sets_before_write',
    'refresh_artwork_set_health',
    'admin_activate_venue',
    'artwork_set_items_after_change',
    'admin_suspend_artist',
    'admin_activate_artist',
    'artwork_sets_on_artwork_update',
    'venue_set_selections_touch',
    'admin_suspend_venue'
  ];
  rec record;
BEGIN
  FOR rec IN
    SELECT p.oid::regprocedure AS regproc
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY(target_names)
  LOOP
    EXECUTE format('alter function %s set search_path = public', rec.regproc);
  END LOOP;
END $$;
