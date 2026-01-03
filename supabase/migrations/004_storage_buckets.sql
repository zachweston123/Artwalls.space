-- Create public buckets for artworks and wallspaces
insert into storage.buckets (id, name, public)
values ('artworks', 'artworks', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('wallspaces', 'wallspaces', true)
on conflict (id) do nothing;

-- Enable RLS policies for uploads: authenticated users can upload to their own folder
-- Artworks: path must start with auth.uid()
create policy if not exists "artworks_insert_auth"
  on storage.objects for insert to authenticated
  using (bucket_id = 'artworks')
  with check (
    bucket_id = 'artworks' and (name like auth.uid()::text || '/%')
  );

-- Wallspaces: path must start with auth.uid()
create policy if not exists "wallspaces_insert_auth"
  on storage.objects for insert to authenticated
  using (bucket_id = 'wallspaces')
  with check (
    bucket_id = 'wallspaces' and (name like auth.uid()::text || '/%')
  );
