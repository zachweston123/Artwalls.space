/**
 * worker/routes/venue-requests.ts
 *
 * API endpoints for the unified venue request system (applications + waitlist).
 *
 * Endpoints:
 *   POST   /api/venues/:venueId/requests           — create request (artist)
 *   GET    /api/venues/:venueId/requests            — list requests (venue owner)
 *   PATCH  /api/venues/:venueId/requests/:requestId — update status (venue or artist)
 *   GET    /api/me/requests                         — list own requests (artist)
 *   GET    /api/me/requests/quota                   — get current month usage + limit
 *   PATCH  /api/venues/:venueId/settings/waitlist   — toggle waitlist (venue owner)
 */

import type { WorkerContext } from '../types';
import { isUUID, clampStr } from '../helpers';

// ── Shared constants (mirrored from src/lib/venueRequests.ts) ──────────

type RequestType = 'application' | 'waitlist';
type RequestStatus =
  | 'submitted' | 'approved' | 'rejected' | 'withdrawn'
  | 'waitlisted' | 'invited_to_apply' | 'removed' | 'converted_to_application';
type ArtistTier = 'free' | 'starter' | 'growth' | 'pro';

const TIER_REQUEST_LIMITS: Record<ArtistTier, number> = {
  free: 2,
  starter: 5,
  growth: Infinity,
  pro: Infinity,
};

const QUOTA_EXCLUDED_STATUSES = new Set(['withdrawn', 'removed']);

const TERMINAL_STATUSES = new Set([
  'rejected', 'withdrawn', 'removed', 'approved', 'converted_to_application',
]);

const ARTIST_TRANSITIONS: Record<string, string[]> = {
  submitted: ['withdrawn'],
  waitlisted: ['removed'],
  invited_to_apply: ['withdrawn'],
};

const VENUE_TRANSITIONS: Record<string, string[]> = {
  submitted: ['approved', 'rejected'],
  waitlisted: ['invited_to_apply', 'removed', 'rejected', 'converted_to_application'],
  invited_to_apply: ['rejected', 'removed'],
};

// ── Helpers ──────────────────────────────────────────────────────────────

function monthStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function resolveTier(profile: any): ArtistTier {
  const proUntil = profile?.pro_until ? new Date(profile.pro_until).getTime() : 0;
  if (proUntil && proUntil > Date.now()) return 'pro';
  const tier = (profile?.subscription_tier || 'free').toLowerCase();
  if (['starter', 'growth', 'pro'].includes(tier)) return tier as ArtistTier;
  return 'free';
}

// ── Route handler ────────────────────────────────────────────────────────

export async function handleVenueRequests(wc: WorkerContext): Promise<Response | null> {
  const { url, method, request, json, supabaseAdmin, getUser, requireAuthOrFail } = wc;

  // ── PATCH /api/venues/:venueId/settings/waitlist ──────────────────────
  const waitlistToggleMatch = url.pathname.match(
    /^\/api\/venues\/([0-9a-f-]+)\/settings\/waitlist$/,
  );
  if (waitlistToggleMatch && method === 'PATCH') {
    if (!supabaseAdmin) return json({ error: 'Server error' }, { status: 500 });
    const user = await getUser(request);
    const authErr = requireAuthOrFail(request, user);
    if (authErr) return authErr;
    const venueId = waitlistToggleMatch[1];
    if (user!.id !== venueId) return json({ error: 'Forbidden' }, { status: 403 });

    let body: any;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, { status: 400 }); }
    const enabled = typeof body?.waitlistEnabled === 'boolean' ? body.waitlistEnabled : null;
    if (enabled === null) return json({ error: 'waitlistEnabled (boolean) required' }, { status: 400 });

    const { error } = await supabaseAdmin
      .from('venues')
      .update({ waitlist_enabled: enabled })
      .eq('id', venueId);

    if (error) return json({ error: error.message }, { status: 500 });
    return json({ ok: true, waitlistEnabled: enabled });
  }

  // ── POST /api/venues/:venueId/requests ────────────────────────────────
  const createMatch = url.pathname.match(/^\/api\/venues\/([0-9a-f-]+)\/requests$/);
  if (createMatch && method === 'POST') {
    if (!supabaseAdmin) return json({ error: 'Server error' }, { status: 500 });
    const user = await getUser(request);
    const authErr = requireAuthOrFail(request, user);
    if (authErr) return authErr;
    const venueId = createMatch[1];
    const artistId = user!.id;

    // Ensure user is an artist
    if (user!.user_metadata?.role !== 'artist') {
      return json({ error: 'Only artists can submit requests' }, { status: 403 });
    }

    let body: any;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, { status: 400 }); }

    const requestType: RequestType = body?.requestType === 'waitlist' ? 'waitlist' : 'application';
    const message = clampStr(body?.message, 500) || null;
    const artworkId = isUUID(body?.artworkId) ? body.artworkId : null;

    // Fetch venue to check waitlist_enabled
    const { data: venue } = await supabaseAdmin
      .from('venues')
      .select('id, waitlist_enabled')
      .eq('id', venueId)
      .maybeSingle();

    if (!venue) return json({ error: 'Venue not found' }, { status: 404 });

    if (requestType === 'waitlist' && !venue.waitlist_enabled) {
      return json({ error: 'This venue does not have a waitlist enabled' }, { status: 400 });
    }

    // Duplicate check: active request for same artist+venue
    const { data: existing } = await supabaseAdmin
      .from('venue_requests')
      .select('id, request_type, status')
      .eq('artist_id', artistId)
      .eq('venue_id', venueId)
      .not('status', 'in', `(${[...TERMINAL_STATUSES].join(',')})`)
      .maybeSingle();

    if (existing) {
      return json({
        error: 'You already have an active request for this venue',
        existingRequest: existing,
      }, { status: 409 });
    }

    // Quota check
    const { data: artistProfile } = await supabaseAdmin
      .from('artists')
      .select('subscription_tier, subscription_status, pro_until')
      .eq('id', artistId)
      .maybeSingle();

    const tier = resolveTier(artistProfile);
    const limit = TIER_REQUEST_LIMITS[tier];

    if (Number.isFinite(limit)) {
      const { count } = await supabaseAdmin
        .from('venue_requests')
        .select('id', { count: 'exact', head: true })
        .eq('artist_id', artistId)
        .gte('created_at', monthStart())
        .not('status', 'in', `(${[...QUOTA_EXCLUDED_STATUSES].join(',')})`);

      const used = count ?? 0;
      if (used >= limit) {
        return json({
          error: `Monthly application limit reached (${limit} per month on ${tier} plan)`,
          limit,
          used,
          tier,
        }, { status: 402 });
      }
    }

    // Insert
    const initialStatus = requestType === 'waitlist' ? 'waitlisted' : 'submitted';
    const { data: created, error: insertErr } = await supabaseAdmin
      .from('venue_requests')
      .insert({
        artist_id: artistId,
        venue_id: venueId,
        request_type: requestType,
        status: initialStatus,
        message,
        artwork_id: artworkId,
      })
      .select()
      .single();

    if (insertErr) {
      // Unique constraint violation → race condition duplicate
      if (insertErr.code === '23505') {
        return json({ error: 'You already have an active request for this venue' }, { status: 409 });
      }
      return json({ error: insertErr.message }, { status: 500 });
    }

    // Analytics event
    try {
      await supabaseAdmin.from('analytics_events').insert({
        event_type: requestType === 'waitlist' ? 'waitlist_join' : 'application_submit',
        artist_id: artistId,
        venue_id: venueId,
        metadata: { request_id: created.id, request_type: requestType },
      });
    } catch { /* non-critical */ }

    return json({ request: created }, { status: 201 });
  }

  // ── GET /api/venues/:venueId/requests ─────────────────────────────────
  const listForVenueMatch = url.pathname.match(/^\/api\/venues\/([0-9a-f-]+)\/requests$/);
  if (listForVenueMatch && method === 'GET') {
    if (!supabaseAdmin) return json({ error: 'Server error' }, { status: 500 });
    const user = await getUser(request);
    const authErr = requireAuthOrFail(request, user);
    if (authErr) return authErr;
    const venueId = listForVenueMatch[1];
    if (user!.id !== venueId) return json({ error: 'Forbidden' }, { status: 403 });

    const typeFilter = url.searchParams.get('type');
    const statusFilter = url.searchParams.get('status');

    let query = supabaseAdmin
      .from('venue_requests')
      .select('id, artist_id, venue_id, request_type, status, message, artwork_id, created_at, updated_at, artists(name, subscription_tier)')
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false });

    if (typeFilter === 'application' || typeFilter === 'waitlist') {
      query = query.eq('request_type', typeFilter);
    }
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) return json({ error: error.message }, { status: 500 });
    return json({ requests: data || [] });
  }

  // ── PATCH /api/venues/:venueId/requests/:requestId ────────────────────
  const updateMatch = url.pathname.match(
    /^\/api\/venues\/([0-9a-f-]+)\/requests\/([0-9a-f-]+)$/,
  );
  if (updateMatch && method === 'PATCH') {
    if (!supabaseAdmin) return json({ error: 'Server error' }, { status: 500 });
    const user = await getUser(request);
    const authErr = requireAuthOrFail(request, user);
    if (authErr) return authErr;
    const venueId = updateMatch[1];
    const requestId = updateMatch[2];

    let body: any;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, { status: 400 }); }
    const newStatus = body?.status as RequestStatus | undefined;
    if (!newStatus) return json({ error: 'status required' }, { status: 400 });

    // Fetch existing request
    const { data: existing } = await supabaseAdmin
      .from('venue_requests')
      .select('id, artist_id, venue_id, request_type, status')
      .eq('id', requestId)
      .eq('venue_id', venueId)
      .maybeSingle();

    if (!existing) return json({ error: 'Request not found' }, { status: 404 });

    // Determine actor
    const isArtist = user!.id === existing.artist_id;
    const isVenue = user!.id === existing.venue_id;
    if (!isArtist && !isVenue) return json({ error: 'Forbidden' }, { status: 403 });

    const actor = isVenue ? 'venue' : 'artist';
    const transitions = actor === 'artist' ? ARTIST_TRANSITIONS : VENUE_TRANSITIONS;
    const allowed = transitions[existing.status] || [];

    if (!allowed.includes(newStatus)) {
      return json({
        error: `Invalid status transition: ${existing.status} → ${newStatus} (as ${actor})`,
        currentStatus: existing.status,
        allowedTransitions: allowed,
      }, { status: 400 });
    }

    // For conversion: change request_type to 'application' and status to 'submitted'
    const updatePayload: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'converted_to_application') {
      updatePayload.request_type = 'application';
      updatePayload.status = 'submitted';
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('venue_requests')
      .update(updatePayload)
      .eq('id', requestId)
      .select()
      .single();

    if (updateErr) return json({ error: updateErr.message }, { status: 500 });

    // Analytics event
    try {
      const eventType =
        newStatus === 'withdrawn' || newStatus === 'removed' ? 'waitlist_left' :
        newStatus === 'invited_to_apply' ? 'waitlist_invited' :
        newStatus === 'converted_to_application' ? 'waitlist_converted' :
        `request_${newStatus}`;
      await supabaseAdmin.from('analytics_events').insert({
        event_type: eventType,
        artist_id: existing.artist_id,
        venue_id: existing.venue_id,
        metadata: { request_id: requestId, from_status: existing.status, to_status: newStatus },
      });
    } catch { /* non-critical */ }

    return json({ request: updated });
  }

  // ── GET /api/me/requests ──────────────────────────────────────────────
  if (url.pathname === '/api/me/requests' && method === 'GET') {
    if (!supabaseAdmin) return json({ error: 'Server error' }, { status: 500 });
    const user = await getUser(request);
    const authErr = requireAuthOrFail(request, user);
    if (authErr) return authErr;

    const typeFilter = url.searchParams.get('type');
    let query = supabaseAdmin
      .from('venue_requests')
      .select('id, artist_id, venue_id, request_type, status, message, artwork_id, created_at, updated_at, venues(name, city, cover_photo_url)')
      .eq('artist_id', user!.id)
      .order('created_at', { ascending: false });

    if (typeFilter === 'application' || typeFilter === 'waitlist') {
      query = query.eq('request_type', typeFilter);
    }

    const { data, error } = await query;
    if (error) return json({ error: error.message }, { status: 500 });
    return json({ requests: data || [] });
  }

  // ── GET /api/me/requests/quota ────────────────────────────────────────
  if (url.pathname === '/api/me/requests/quota' && method === 'GET') {
    if (!supabaseAdmin) return json({ error: 'Server error' }, { status: 500 });
    const user = await getUser(request);
    const authErr = requireAuthOrFail(request, user);
    if (authErr) return authErr;

    const { data: profile } = await supabaseAdmin
      .from('artists')
      .select('subscription_tier, subscription_status, pro_until')
      .eq('id', user!.id)
      .maybeSingle();

    const tier = resolveTier(profile);
    const limit = TIER_REQUEST_LIMITS[tier];

    let used = 0;
    if (Number.isFinite(limit)) {
      const { count } = await supabaseAdmin
        .from('venue_requests')
        .select('id', { count: 'exact', head: true })
        .eq('artist_id', user!.id)
        .gte('created_at', monthStart())
        .not('status', 'in', `(${[...QUOTA_EXCLUDED_STATUSES].join(',')})`);
      used = count ?? 0;
    }

    return json({
      tier,
      limit: Number.isFinite(limit) ? limit : null, // null = unlimited
      used,
      remaining: Number.isFinite(limit) ? Math.max(0, limit - used) : null,
    });
  }

  return null; // Not handled by this module
}
