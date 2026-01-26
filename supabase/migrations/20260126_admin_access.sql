-- Create a function to check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  -- Check if the user metadata has role 'admin'
  RETURN ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policies for Admins on all standard tables
-- This allows admins to view and edit all data in the system securely

-- Artists
DROP POLICY IF EXISTS "admin_all_artists" ON public.artists;
CREATE POLICY "admin_all_artists" ON public.artists
  FOR ALL USING (public.is_admin());

-- Venues
DROP POLICY IF EXISTS "admin_all_venues" ON public.venues;
CREATE POLICY "admin_all_venues" ON public.venues
  FOR ALL USING (public.is_admin());

-- Artworks
DROP POLICY IF EXISTS "admin_all_artworks" ON public.artworks;
CREATE POLICY "admin_all_artworks" ON public.artworks
  FOR ALL USING (public.is_admin());

-- Orders
DROP POLICY IF EXISTS "admin_all_orders" ON public.orders;
CREATE POLICY "admin_all_orders" ON public.orders
  FOR ALL USING (public.is_admin());

-- Notifications
DROP POLICY IF EXISTS "admin_all_notifications" ON public.notifications;
CREATE POLICY "admin_all_notifications" ON public.notifications
  FOR ALL USING (public.is_admin());

-- Bookings
DROP POLICY IF EXISTS "admin_all_bookings" ON public.bookings;
CREATE POLICY "admin_all_bookings" ON public.bookings
  FOR ALL USING (public.is_admin());

-- Wallspaces
DROP POLICY IF EXISTS "admin_all_wallspaces" ON public.wallspaces;
CREATE POLICY "admin_all_wallspaces" ON public.wallspaces
  FOR ALL USING (public.is_admin());

-- Venue Schedules
DROP POLICY IF EXISTS "admin_all_venue_schedules" ON public.venue_schedules;
CREATE POLICY "admin_all_venue_schedules" ON public.venue_schedules
  FOR ALL USING (public.is_admin());

-- Venue Invites
DROP POLICY IF EXISTS "admin_all_venue_invites" ON public.venue_invites;
CREATE POLICY "admin_all_venue_invites" ON public.venue_invites
  FOR ALL USING (public.is_admin());

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
