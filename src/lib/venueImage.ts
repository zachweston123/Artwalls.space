/**
 * Centralised helper for resolving venue profile image URLs.
 *
 * Different parts of the codebase name the field differently
 * (coverPhoto, coverPhotoUrl, cover_photo_url, imageUrl, venuePhoto).
 * This module normalises all of them to a single, validated URL or `null`.
 *
 * It also handles the edge case where a storage *path* (not a full URL)
 * was persisted — converting it to a Supabase public URL at read time.
 *
 * Usage:
 *   import { getVenueImageUrl } from '../../lib/venueImage';
 *   const url = getVenueImageUrl(venue);  // string | null
 */

import { supabase } from './supabase';

// ── Constants ──

/** The storage bucket used for venue profile/cover photos. */
const VENUE_PROFILE_BUCKET = 'venue-profiles';

/** Placeholder gradient CSS class (Tailwind) used when no image is available. */
export const VENUE_IMAGE_PLACEHOLDER_CLASSES =
  'bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-3)]';

// ── Helpers ──

/** Fast check that a value looks like a full URL. */
function looksLikeUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length < 10) return false;
  return value.startsWith('http://') || value.startsWith('https://');
}

/** Check if a value looks like a bare storage-object path (not a URL). */
function looksLikeStoragePath(value: unknown): value is string {
  if (typeof value !== 'string' || value.length < 3) return false;
  // A storage path won't start with http but will contain a slash
  return !value.startsWith('http') && value.includes('/');
}

/**
 * Convert a bare storage path to a public URL via the Supabase client.
 * E.g. "abc123/profile_170…_photo.jpg" → "https://…/storage/v1/object/public/venue-profiles/abc123/…"
 */
function storagePathToPublicUrl(path: string): string {
  const { data } = supabase.storage
    .from(VENUE_PROFILE_BUCKET)
    .getPublicUrl(path);
  return data.publicUrl;
}

// ── Public API ──

/**
 * Resolve the venue cover/profile image URL from any venue-shaped object.
 *
 * Accepts objects with any of these field names:
 *   coverPhotoUrl, coverPhoto, cover_photo_url, imageUrl, venuePhoto
 *
 * Handles:
 *  • Full URL strings (returned as-is)
 *  • Bare storage paths (converted via getPublicUrl)
 *  • null / undefined / empty string → null
 *
 * Returns a usable URL string or `null`.
 */
export function getVenueImageUrl(
  venue: Record<string, unknown> | null | undefined,
): string | null {
  if (!venue) return null;

  // Try each known field name in priority order
  const candidates = [
    venue.coverPhotoUrl,
    venue.coverPhoto,
    venue.cover_photo_url,
    venue.imageUrl,
    venue.venuePhoto,
  ];

  for (const val of candidates) {
    if (looksLikeUrl(val)) return val;
    if (looksLikeStoragePath(val)) return storagePathToPublicUrl(val);
  }

  return null;
}
