import { supabase } from './supabase';

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function uploadArtworkImage(artistId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'bin';
  const filename = `${Date.now()}_${sanitizeFilename(file.name)}`;
  const path = `${artistId}/${filename}`;
  const { error } = await supabase.storage.from('artworks').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || `application/octet-stream`,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('artworks').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadWallspacePhoto(venueId: string, file: File): Promise<string> {
  const filename = `${Date.now()}_${sanitizeFilename(file.name)}`;
  const path = `${venueId}/${filename}`;
  const { error } = await supabase.storage.from('wallspaces').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || `application/octet-stream`,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('wallspaces').getPublicUrl(path);
  return data.publicUrl;
}
