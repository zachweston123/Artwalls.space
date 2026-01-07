-- Storage Bucket RLS Policies for Artwalls Profile Photos
-- Run this in Supabase SQL Editor after creating the buckets

-- Artist Profiles Bucket Policies
-- Allow anyone to read public profile photos
CREATE POLICY "public read artist-profiles"
ON storage.objects FOR SELECT
USING (bucket_id = 'artist-profiles');

-- Allow authenticated users to upload to their own folder
CREATE POLICY "authenticated upload artist-profiles"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'artist-profiles'
  AND auth.role() = 'authenticated'
);

-- Allow users to update their own photos
CREATE POLICY "authenticated update artist-profiles"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'artist-profiles'
  AND auth.role() = 'authenticated'
);

-- Allow users to delete their own photos
CREATE POLICY "authenticated delete artist-profiles"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'artist-profiles'
  AND auth.role() = 'authenticated'
);

-- Venue Profiles Bucket Policies
-- Allow anyone to read public venue photos
CREATE POLICY "public read venue-profiles"
ON storage.objects FOR SELECT
USING (bucket_id = 'venue-profiles');

-- Allow authenticated users to upload to their own folder
CREATE POLICY "authenticated upload venue-profiles"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'venue-profiles'
  AND auth.role() = 'authenticated'
);

-- Allow users to update their own photos
CREATE POLICY "authenticated update venue-profiles"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'venue-profiles'
  AND auth.role() = 'authenticated'
);

-- Allow users to delete their own photos
CREATE POLICY "authenticated delete venue-profiles"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'venue-profiles'
  AND auth.role() = 'authenticated'
);
