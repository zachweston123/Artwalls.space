-- ============================================================================
-- Create storage buckets for venue and artist profile images
--
-- Root-cause fix: the app uploads venue cover photos to the "venue-profiles"
-- bucket and artist profile photos to "artist-profiles", but neither bucket
-- was ever created in migrations. Without the bucket (or with it set to
-- private), getPublicUrl returns a URL that 400s for anyone — including
-- other authenticated users such as artists browsing venues.
--
-- This migration:
--   1. Creates both buckets as PUBLIC so getPublicUrl works for everyone.
--   2. Adds RLS policies on storage.objects so:
--      - Anyone can read (SELECT) objects in these buckets.
--      - Authenticated users can INSERT/UPDATE/DELETE only in their own
--        folder prefix (uid/…).
--
-- Safe to re-run (idempotent via ON CONFLICT and IF NOT EXISTS).
-- ============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Create buckets (public = true so /object/public/<bucket>/… works)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES ('venue-profiles', 'venue-profiles', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('artist-profiles', 'artist-profiles', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Public read policies (anyone can view profile images)
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public read venue-profiles'
  ) THEN
    CREATE POLICY "Public read venue-profiles" ON storage.objects
      FOR SELECT USING (bucket_id = 'venue-profiles');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public read artist-profiles'
  ) THEN
    CREATE POLICY "Public read artist-profiles" ON storage.objects
      FOR SELECT USING (bucket_id = 'artist-profiles');
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Upload policies (authenticated users → own folder only)
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Venues upload own profile images'
  ) THEN
    CREATE POLICY "Venues upload own profile images" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'venue-profiles'
        AND split_part(name, '/', 1) = auth.uid()::text
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Artists upload own profile images'
  ) THEN
    CREATE POLICY "Artists upload own profile images" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'artist-profiles'
        AND split_part(name, '/', 1) = auth.uid()::text
      );
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Update / Delete policies (own folder only)
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Venues manage own profile images'
  ) THEN
    CREATE POLICY "Venues manage own profile images" ON storage.objects
      FOR UPDATE TO authenticated
      USING (
        bucket_id = 'venue-profiles'
        AND split_part(name, '/', 1) = auth.uid()::text
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Venues delete own profile images'
  ) THEN
    CREATE POLICY "Venues delete own profile images" ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'venue-profiles'
        AND split_part(name, '/', 1) = auth.uid()::text
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Artists manage own profile images'
  ) THEN
    CREATE POLICY "Artists manage own profile images" ON storage.objects
      FOR UPDATE TO authenticated
      USING (
        bucket_id = 'artist-profiles'
        AND split_part(name, '/', 1) = auth.uid()::text
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Artists delete own profile images'
  ) THEN
    CREATE POLICY "Artists delete own profile images" ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'artist-profiles'
        AND split_part(name, '/', 1) = auth.uid()::text
      );
  END IF;
END $$;

COMMIT;
