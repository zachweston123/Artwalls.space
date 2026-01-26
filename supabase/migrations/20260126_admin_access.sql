CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  jwt jsonb := auth.jwt();
  uid uuid := auth.uid();
  meta jsonb;
  raw_role text;
BEGIN
  -- Allow service role and other elevated contexts automatically
  IF auth.role() = 'service_role' THEN
    RETURN true;
  END IF;

  -- Inspect JWT payload for admin flags first
  IF jwt IS NOT NULL THEN
    raw_role := coalesce(
      jwt ->> 'role',
      jwt -> 'app_metadata' ->> 'role',
      jwt -> 'user_metadata' ->> 'role',
      jwt ->> 'userRole',
      jwt ->> 'user_role'
    );
    IF lower(coalesce(raw_role, '')) = 'admin' THEN
      RETURN true;
    END IF;

    IF lower(coalesce(jwt -> 'user_metadata' ->> 'isAdmin', '')) IN ('true','t','1','yes','on') THEN
      RETURN true;
    END IF;

    IF lower(coalesce(jwt -> 'app_metadata' ->> 'is_admin', '')) IN ('true','t','1','yes','on') THEN
      RETURN true;
    END IF;

    IF coalesce((jwt -> 'user_metadata' -> 'roles')::text, '') ILIKE '%"admin"%' THEN
      RETURN true;
    END IF;
  END IF;

  -- No user id available means we cannot elevate
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  -- Fallback: read latest metadata from auth.users
  SELECT raw_user_meta_data
  INTO meta
  FROM auth.users
  WHERE id = uid;

  IF meta IS NULL THEN
    RETURN false;
  END IF;

  raw_role := coalesce(
    meta ->> 'role',
    meta ->> 'userRole',
    meta ->> 'user_role',
    meta ->> 'tier'
  );
  IF lower(coalesce(raw_role, '')) = 'admin' THEN
    RETURN true;
  END IF;

  IF lower(coalesce(meta ->> 'isAdmin', '')) IN ('true','t','1','yes','on') THEN
    RETURN true;
  END IF;

  IF coalesce((meta -> 'roles')::text, '') ILIKE '%"admin"%' THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Add RLS policies for Admins on all standard tables
-- This allows admins to view and edit all data in the system securely

-- Artists
DROP POLICY IF EXISTS "admin_all_artists" ON public.artists;
CREATE POLICY "admin_all_artists" ON public.artists
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Venues
DROP POLICY IF EXISTS "admin_all_venues" ON public.venues;
CREATE POLICY "admin_all_venues" ON public.venues
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Artworks
DROP POLICY IF EXISTS "admin_all_artworks" ON public.artworks;
CREATE POLICY "admin_all_artworks" ON public.artworks
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Orders
DROP POLICY IF EXISTS "admin_all_orders" ON public.orders;
CREATE POLICY "admin_all_orders" ON public.orders
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Notifications
DROP POLICY IF EXISTS "admin_all_notifications" ON public.notifications;
CREATE POLICY "admin_all_notifications" ON public.notifications
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Bookings
DROP POLICY IF EXISTS "admin_all_bookings" ON public.bookings;
CREATE POLICY "admin_all_bookings" ON public.bookings
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Wallspaces
DROP POLICY IF EXISTS "admin_all_wallspaces" ON public.wallspaces;
CREATE POLICY "admin_all_wallspaces" ON public.wallspaces
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Venue Schedules
DROP POLICY IF EXISTS "admin_all_venue_schedules" ON public.venue_schedules;
CREATE POLICY "admin_all_venue_schedules" ON public.venue_schedules
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Venue Invites
DROP POLICY IF EXISTS "admin_all_venue_invites" ON public.venue_invites;
CREATE POLICY "admin_all_venue_invites" ON public.venue_invites
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- City Recommendations
-- Note: city_recommendations table does not exist (008_city_recommendations adds columns to artists/venues)
-- create index if not exists artists_city_primary_idx on public.artists(city_primary);
-- create index if not exists venues_city_idx on public.venues(city);

-- INSTRUCTIONS TO PROMOTE A USER TO ADMIN:
-- Run the following SQL in the Supabase Dashboard SQL Editor:
-- 
-- UPDATE auth.users
-- SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{role}', '"admin"')
-- WHERE email = 'your-email@example.com';
