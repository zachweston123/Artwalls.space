-- Enable Row Level Security on all tables
-- This migration MUST be run before exposing the anon key to the frontend

-- Enable RLS
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_schedules ENABLE ROW LEVEL SECURITY;

-- Artists: users can read and update their own profile
DROP POLICY IF EXISTS "artists_read_own" ON public.artists;
CREATE POLICY "artists_read_own" ON public.artists
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "artists_update_own" ON public.artists;
CREATE POLICY "artists_update_own" ON public.artists
  FOR UPDATE USING (auth.uid() = id);

-- Service role can insert artists (for backend provisioning)
DROP POLICY IF EXISTS "artists_insert_service" ON public.artists;
CREATE POLICY "artists_insert_service" ON public.artists
  FOR INSERT WITH CHECK (true);

-- Venues: users can read and update their own profile
DROP POLICY IF EXISTS "venues_read_own" ON public.venues;
CREATE POLICY "venues_read_own" ON public.venues
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "venues_update_own" ON public.venues;
CREATE POLICY "venues_update_own" ON public.venues
  FOR UPDATE USING (auth.uid() = id);

-- Service role can insert venues (for backend provisioning)
DROP POLICY IF EXISTS "venues_insert_service" ON public.venues;
CREATE POLICY "venues_insert_service" ON public.venues
  FOR INSERT WITH CHECK (true);

-- Artworks: anyone can read; only artist can create/update their own
DROP POLICY IF EXISTS "artworks_read_all" ON public.artworks;
CREATE POLICY "artworks_read_all" ON public.artworks
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "artworks_insert_own" ON public.artworks;
CREATE POLICY "artworks_insert_own" ON public.artworks
  FOR INSERT WITH CHECK (auth.uid() = artist_id);

DROP POLICY IF EXISTS "artworks_update_own" ON public.artworks;
CREATE POLICY "artworks_update_own" ON public.artworks
  FOR UPDATE USING (auth.uid() = artist_id);

DROP POLICY IF EXISTS "artworks_delete_own" ON public.artworks;
CREATE POLICY "artworks_delete_own" ON public.artworks
  FOR DELETE USING (auth.uid() = artist_id);

-- Orders: artist and venue can read their own orders
DROP POLICY IF EXISTS "orders_read_artist" ON public.orders;
CREATE POLICY "orders_read_artist" ON public.orders
  FOR SELECT USING (auth.uid() = artist_id);

DROP POLICY IF EXISTS "orders_read_venue" ON public.orders;
CREATE POLICY "orders_read_venue" ON public.orders
  FOR SELECT USING (auth.uid() = venue_id);

-- Service role can insert/update orders (for payment processing)
DROP POLICY IF EXISTS "orders_insert_service" ON public.orders;
CREATE POLICY "orders_insert_service" ON public.orders
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "orders_update_service" ON public.orders;
CREATE POLICY "orders_update_service" ON public.orders
  FOR UPDATE USING (true);

-- Notifications: users can read their own notifications
DROP POLICY IF EXISTS "notifications_read_own" ON public.notifications;
CREATE POLICY "notifications_read_own" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role can insert notifications
DROP POLICY IF EXISTS "notifications_insert_service" ON public.notifications;
CREATE POLICY "notifications_insert_service" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Bookings: artist and venue can read their own bookings
DROP POLICY IF EXISTS "bookings_read_artist" ON public.bookings;
CREATE POLICY "bookings_read_artist" ON public.bookings
  FOR SELECT USING (auth.uid() = artist_id);

DROP POLICY IF EXISTS "bookings_read_venue" ON public.bookings;
CREATE POLICY "bookings_read_venue" ON public.bookings
  FOR SELECT USING (auth.uid() = venue_id);

-- Service role can manage bookings
DROP POLICY IF EXISTS "bookings_insert_service" ON public.bookings;
CREATE POLICY "bookings_insert_service" ON public.bookings
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "bookings_update_service" ON public.bookings;
CREATE POLICY "bookings_update_service" ON public.bookings
  FOR UPDATE USING (true);

-- Wallspaces: venue can manage their own wallspaces; anyone can read
DROP POLICY IF EXISTS "wallspaces_read_all" ON public.wallspaces;
CREATE POLICY "wallspaces_read_all" ON public.wallspaces
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "wallspaces_insert_own" ON public.wallspaces;
CREATE POLICY "wallspaces_insert_own" ON public.wallspaces
  FOR INSERT WITH CHECK (auth.uid() = venue_id);

DROP POLICY IF EXISTS "wallspaces_update_own" ON public.wallspaces;
CREATE POLICY "wallspaces_update_own" ON public.wallspaces
  FOR UPDATE USING (auth.uid() = venue_id);

DROP POLICY IF EXISTS "wallspaces_delete_own" ON public.wallspaces;
CREATE POLICY "wallspaces_delete_own" ON public.wallspaces
  FOR DELETE USING (auth.uid() = venue_id);

-- Venue schedules: venue can manage their own schedule; anyone can read
DROP POLICY IF EXISTS "venue_schedules_read_all" ON public.venue_schedules;
CREATE POLICY "venue_schedules_read_all" ON public.venue_schedules
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "venue_schedules_insert_own" ON public.venue_schedules;
CREATE POLICY "venue_schedules_insert_own" ON public.venue_schedules
  FOR INSERT WITH CHECK (auth.uid() = venue_id);

DROP POLICY IF EXISTS "venue_schedules_update_own" ON public.venue_schedules;
CREATE POLICY "venue_schedules_update_own" ON public.venue_schedules
  FOR UPDATE USING (auth.uid() = venue_id);

DROP POLICY IF EXISTS "venue_schedules_delete_own" ON public.venue_schedules;
CREATE POLICY "venue_schedules_delete_own" ON public.venue_schedules
  FOR DELETE USING (auth.uid() = venue_id);
