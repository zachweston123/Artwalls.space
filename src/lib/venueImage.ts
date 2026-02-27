/**
 * Centralised helper for resolving venue profile image URLs.
 *
 * Different parts of the codebase name the field differently
 * (coverPhoto, coverPhotoUrl, cover_photo_url, imageUrl, venuePhoto).
 * This module normalises all of them to a single, validated URL or `null`.
 *
 * Usage:
 *   import { getVenueImageUrl } from '../../lib/venueImage';
 *   const url = getVenueImageUrl(venue);  // string | null
 */

// Minimal URL validation — fast check that value looks like an image URL
function looksLikeUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length < 10) return false;
  return value.startsWith('http://') || value.startsWith('https://');
}

/**
 * Resolve the venue cover/profile image URL from any venue-shaped object.
 *
 * Accepts objects with any of these field names:
 *   coverPhotoUrl, coverPhoto, cover_photo_url, imageUrl, venuePhoto
 *
 * Returns a validated HTTPS URL or `null`.
 */
export function getVenueImageUrl(
  venue: Record<string, unknown> | null | undefined
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
  }

  return null;
}

/** Placeholder gradient CSS class (Tailwind) used when no image is available. */
export const VENUE_IMAGE_PLACEHOLDER_CLASSES =
  'bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-3)]';
