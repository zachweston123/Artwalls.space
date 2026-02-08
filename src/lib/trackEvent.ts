/**
 * Client-side helpers to fire wall-productivity events via the
 * server-side /api/track endpoint.
 *
 * All writes go through Cloudflare → Supabase (service-role),
 * so they work even with ad-blockers and don't expose raw event data.
 */

import { getSessionId } from './sessionId';

const API_BASE = (() => {
  if (typeof window === 'undefined') return 'https://artwalls.space';
  const { hostname, origin } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4242';
  }
  return (import.meta as any).env?.VITE_API_BASE_URL || origin || 'https://artwalls.space';
})();

interface TrackPayload {
  event_type: 'qr_scan' | 'artwork_view' | 'checkout_start';
  artwork_id?: string | null;
  venue_id?: string | null;
  wallspace_id?: string | null;
  artist_id?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Fire a tracking event. Fire-and-forget — never throws.
 * Returns true if the event was accepted (or deduped), false on error.
 */
export async function trackEvent(payload: TrackPayload): Promise<boolean> {
  try {
    const sessionId = getSessionId();
    // Get auth token if available (optional, for user_id attribution)
    let authHeader: Record<string, string> = {};
    try {
      const { supabase } = await import('./supabase');
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) {
        authHeader = { Authorization: `Bearer ${data.session.access_token}` };
      }
    } catch {
      // Not signed in, which is fine for anonymous QR scanners
    }

    const res = await fetch(`${API_BASE}/api/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify({
        ...payload,
        session_id: sessionId,
      }),
    });

    return res.ok || res.status === 429; // Rate limited still counts as "handled"
  } catch {
    return false;
  }
}

// Dedupe guard: prevents duplicate calls within the same JS session
// (e.g. React strict-mode double-mount)
const _fired = new Set<string>();

function dedupeKey(type: string, artworkId?: string | null, venueId?: string | null): string {
  return `${type}:${artworkId || ''}:${venueId || ''}`;
}

/**
 * Track qr_scan — call on purchase page mount when loaded via QR deep link.
 * Deduped client-side + server-side.
 */
export function trackQrScan(opts: {
  artworkId: string;
  venueId?: string | null;
  wallspaceId?: string | null;
  artistId?: string | null;
}) {
  const key = dedupeKey('qr_scan', opts.artworkId, opts.venueId);
  if (_fired.has(key)) return;
  _fired.add(key);

  trackEvent({
    event_type: 'qr_scan',
    artwork_id: opts.artworkId,
    venue_id: opts.venueId,
    wallspace_id: opts.wallspaceId,
    artist_id: opts.artistId,
  });
}

/**
 * Track artwork_view — call once when artwork detail page mounts.
 * Deduped client-side + server-side.
 */
export function trackArtworkView(opts: {
  artworkId: string;
  venueId?: string | null;
  wallspaceId?: string | null;
  artistId?: string | null;
}) {
  const key = dedupeKey('artwork_view', opts.artworkId, opts.venueId);
  if (_fired.has(key)) return;
  _fired.add(key);

  trackEvent({
    event_type: 'artwork_view',
    artwork_id: opts.artworkId,
    venue_id: opts.venueId,
    wallspace_id: opts.wallspaceId,
    artist_id: opts.artistId,
  });
}

/**
 * Track checkout_start — call when user clicks "Buy" and checkout session
 * is about to be created.
 */
export function trackCheckoutStart(opts: {
  artworkId: string;
  venueId?: string | null;
  wallspaceId?: string | null;
  artistId?: string | null;
}) {
  // Allow re-fire on retry (no client-side dedupe for checkout_start)
  trackEvent({
    event_type: 'checkout_start',
    artwork_id: opts.artworkId,
    venue_id: opts.venueId,
    wallspace_id: opts.wallspaceId,
    artist_id: opts.artistId,
  });
}
