-- Create public storage buckets and RLS policies for uploads
-- Buckets: artworks (artist uploads), wallspaces (venue photos)

-- Create buckets if they do not exist
insert into storage.buckets (id, name, public)
values ('artworks', 'artworks', true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('wallspaces', 'wallspaces', true)
on conflict (id) do update set public = excluded.public;

-- Public read via client (listing) for these buckets
create policy if not exists "Public read artworks" on storage.objects
  for select using (bucket_id = 'artworks');

create policy if not exists "Public read wallspaces" on storage.objects
  for select using (bucket_id = 'wallspaces');

-- Authenticated users can upload to their own folder prefix: <auth.uid()>/filename
create policy if not exists "Users upload own artwork images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'artworks'
    and (storage.foldername(name))[1] = auth.uid()
  );

-- Allow update/delete for owners if needed (optional but helpful in app)
create policy if not exists "Users manage own artwork images" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'artworks'
    and (storage.foldername(name))[1] = auth.uid()
  );

create policy if not exists "Users delete own artwork images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'artworks'
    and (storage.foldername(name))[1] = auth.uid()
  );

create policy if not exists "Venues upload own wallspace photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'wallspaces'
    and (storage.foldername(name))[1] = auth.uid()
  );

create policy if not exists "Venues manage own wallspace photos" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'wallspaces'
    and (storage.foldername(name))[1] = auth.uid()
  );

create policy if not exists "Venues delete own wallspace photos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'wallspaces'
    and (storage.foldername(name))[1] = auth.uid()
  );
