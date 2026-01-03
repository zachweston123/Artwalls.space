-- Create public storage buckets and RLS policies for uploads
-- Buckets: artworks (artist uploads), wallspaces (venue photos)

-- Create buckets if they do not exist
insert into storage.buckets (id, name, public)
values ('artworks', 'artworks', true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('wallspaces', 'wallspaces', true)
on conflict (id) do update set public = excluded.public;

-- Public read via client (listing) for these buckets (idempotent via pg_policies)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read artworks'
  ) THEN
    CREATE POLICY "Public read artworks" ON storage.objects
      FOR SELECT USING (bucket_id = 'artworks');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read wallspaces'
  ) THEN
    CREATE POLICY "Public read wallspaces" ON storage.objects
      FOR SELECT USING (bucket_id = 'wallspaces');
  END IF;
END $$;

-- Authenticated users can upload to their own folder prefix: <auth.uid()>/filename
-- Use split_part(name, '/', 1) to match the first path segment against auth.uid()
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users upload own artwork images'
  ) THEN
    CREATE POLICY "Users upload own artwork images" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'artworks'
        AND split_part(name, '/', 1) = auth.uid()
      );
  END IF;
END $$;

-- Allow update/delete for owners if needed (optional but helpful in app)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users manage own artwork images'
  ) THEN
    CREATE POLICY "Users manage own artwork images" ON storage.objects
      FOR UPDATE TO authenticated
      USING (
        bucket_id = 'artworks'
        AND split_part(name, '/', 1) = auth.uid()
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users delete own artwork images'
  ) THEN
    CREATE POLICY "Users delete own artwork images" ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'artworks'
        AND split_part(name, '/', 1) = auth.uid()
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Venues upload own wallspace photos'
  ) THEN
    CREATE POLICY "Venues upload own wallspace photos" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'wallspaces'
        AND split_part(name, '/', 1) = auth.uid()
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Venues manage own wallspace photos'
  ) THEN
    CREATE POLICY "Venues manage own wallspace photos" ON storage.objects
      FOR UPDATE TO authenticated
      USING (
        bucket_id = 'wallspaces'
        AND split_part(name, '/', 1) = auth.uid()
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Venues delete own wallspace photos'
  ) THEN
    CREATE POLICY "Venues delete own wallspace photos" ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'wallspaces'
        AND split_part(name, '/', 1) = auth.uid()
      );
  END IF;
END $$;
