/**
 * venueMap.ts — Data types and fetching helpers for the public Venue Map.
 *
 * Queries Supabase directly (anon key) for participating venues,
 * filtered by city_slug. No Worker endpoint needed because the RLS
 * policy allows public reads of participating venues.
 */

import { supabase } from './supabase';
import type { City } from '../data/cities';
import { calculateDistance } from '../data/cities';

// ── Types ───────────────────────────────────────────────────────────────────

export interface MapVenue {
  id: string;
  name: string;
  slug: string | null;
  coverPhotoUrl: string | null;
  city: string | null;
  address: string | null;
  type: string | null;
  lat: number;
  lng: number;
  labels: string[];
  verified: boolean;
  bio: string | null;
  instagramHandle: string | null;
  /** Distance from center city in miles (computed client-side) */
  distance?: number;
}

// ── Fetch ───────────────────────────────────────────────────────────────────

/**
 * Fetch all participating venues for a given city slug.
 * Returns venues sorted by distance from the city center.
 */
export async function fetchVenuesForCity(
  citySlug: string,
  cityCenter: City,
  radiusMiles = 50
): Promise<MapVenue[]> {
  const { data, error } = await supabase
    .from('venues')
    .select(
      'id, name, slug, cover_photo_url, city, address, type, address_lat, address_lng, labels, verified, bio, instagram_handle'
    )
    .eq('city_slug', citySlug)
    .eq('is_participating', true)
    .not('address_lat', 'is', null)
    .not('address_lng', 'is', null);

  if (error) {
    console.warn('[venueMap] Supabase query error:', error.message);
    return [];
  }

  if (!data || data.length === 0) return [];

  return data
    .map((v) => {
      const lat = Number(v.address_lat);
      const lng = Number(v.address_lng);
      const dist = calculateDistance(cityCenter.lat, cityCenter.lng, lat, lng);
      return {
        id: v.id,
        name: v.name || 'Unnamed Venue',
        slug: v.slug || null,
        coverPhotoUrl: v.cover_photo_url || null,
        city: v.city || null,
        address: v.address || null,
        type: v.type || null,
        lat,
        lng,
        labels: v.labels || [],
        verified: Boolean(v.verified),
        bio: v.bio || null,
        instagramHandle: v.instagram_handle || null,
        distance: dist,
      } satisfies MapVenue;
    })
    .filter((v) => v.distance! <= radiusMiles)
    .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
}

/**
 * Also fetch venues within radius but across ALL city slugs (for when
 * a city doesn't have exact city_slug matches but has nearby venues).
 */
export async function fetchNearbyVenues(
  cityCenter: City,
  radiusMiles = 50
): Promise<MapVenue[]> {
  // We need a bounding box to limit the query
  const latDelta = radiusMiles / 69.0; // ~69 miles per degree of latitude
  const lngDelta = radiusMiles / (69.0 * Math.cos((cityCenter.lat * Math.PI) / 180));

  const { data, error } = await supabase
    .from('venues')
    .select(
      'id, name, slug, cover_photo_url, city, address, type, address_lat, address_lng, labels, verified, bio, instagram_handle'
    )
    .eq('is_participating', true)
    .gte('address_lat', cityCenter.lat - latDelta)
    .lte('address_lat', cityCenter.lat + latDelta)
    .gte('address_lng', cityCenter.lng - lngDelta)
    .lte('address_lng', cityCenter.lng + lngDelta);

  if (error) {
    console.warn('[venueMap] Nearby query error:', error.message);
    return [];
  }

  if (!data || data.length === 0) return [];

  return data
    .map((v) => {
      const lat = Number(v.address_lat);
      const lng = Number(v.address_lng);
      const dist = calculateDistance(cityCenter.lat, cityCenter.lng, lat, lng);
      return {
        id: v.id,
        name: v.name || 'Unnamed Venue',
        slug: v.slug || null,
        coverPhotoUrl: v.cover_photo_url || null,
        city: v.city || null,
        address: v.address || null,
        type: v.type || null,
        lat,
        lng,
        labels: v.labels || [],
        verified: Boolean(v.verified),
        bio: v.bio || null,
        instagramHandle: v.instagram_handle || null,
        distance: dist,
      } satisfies MapVenue;
    })
    .filter((v) => v.distance! <= radiusMiles)
    .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
}
