-- Fix venue RLS policies to allow owners to insert/upsert their own profile
-- The venues table uses `id` as the primary key which matches auth.uid()

-- Allow venue owners to insert their own profile (for first-time setup)
DROP POLICY IF EXISTS "venues_insert_own" ON public.venues;
CREATE POLICY "venues_insert_own" ON public.venues
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Ensure update policy exists and is correct
DROP POLICY IF EXISTS "venues_update_own" ON public.venues;
CREATE POLICY "venues_update_own" ON public.venues
  FOR UPDATE USING (auth.uid() = id);

-- Ensure read policy exists
DROP POLICY IF EXISTS "venues_read_own" ON public.venues;
CREATE POLICY "venues_read_own" ON public.venues
  FOR SELECT USING (auth.uid() = id);

-- Also allow admins to read all venues
DROP POLICY IF EXISTS "venues_admin_read" ON public.venues;
CREATE POLICY "venues_admin_read" ON public.venues
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (
        auth.users.raw_user_meta_data->>'role' = 'admin'
        OR auth.users.raw_user_meta_data->>'isAdmin' = 'true'
      )
    )
  );
