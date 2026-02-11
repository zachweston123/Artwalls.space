import { supabase } from './supabase';

// ── File validation constants ──
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function validateImageFile(file: File): void {
  if (!file || !(file instanceof File)) {
    throw new Error('Invalid file');
  }
  if (file.size === 0) {
    throw new Error('File is empty');
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.`);
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error(`Unsupported file type "${file.type}". Allowed: JPEG, PNG, WebP, GIF.`);
  }
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function uploadArtworkImage(artistId: string, file: File): Promise<string> {
  validateImageFile(file);
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
  validateImageFile(file);
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

export async function uploadProfilePhoto(userId: string, file: File, userType: 'artist' | 'venue'): Promise<string> {
  validateImageFile(file);
  const filename = `profile_${Date.now()}_${sanitizeFilename(file.name)}`;
  const path = `${userId}/${filename}`;
  const bucket = userType === 'artist' ? 'artist-profiles' : 'venue-profiles';
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || `application/octet-stream`,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadCallApplicationImage(callId: string, file: File): Promise<string> {
  validateImageFile(file);
  const filename = `${Date.now()}_${sanitizeFilename(file.name)}`;
  const path = `${callId}/${filename}`;
  const { error } = await supabase.storage.from('call-applications').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'application/octet-stream',
  });
  if (error) throw error;
  const { data } = supabase.storage.from('call-applications').getPublicUrl(path);
  return data.publicUrl;
}
