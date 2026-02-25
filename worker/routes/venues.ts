/**
 * worker/routes/venues.ts
 *
 * All venue-related route handlers extracted from the monolithic worker.
 * Each handler preserves the original business logic exactly.
 */

import type { WorkerContext } from '../types';
import { isUUID, clampStr, isValidUrl } from '../helpers';

export async function handleVenues(wc: WorkerContext): Promise<Response | null> {
  const {
    url,
    method,
    request,
    json,
    text,
    supabaseAdmin,
    env,
    pagesOrigin,
    getUser,
    requireAuthOrFail,
    requireVenue,
    isAdminUser,
    applyRateLimit,
    upsertVenue,
    logAdminAction,
    shapePublicArtwork,
    applyProOverride,
  } = wc;

  // ══════════════════════════════════════════════════════════════════════════
  // GET /api/stats/venue — venue dashboard stats
  // ══════════════════════════════════════════════════════════════════════════
  if (url.pathname === '/api/stats/venue' && method === 'GET') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const user = await getUser(request);
    const authErr = requireAuthOrFail(request, user);
    if (authErr) return authErr;
    const venueId = url.searchParams.get('venueId');
    if (!venueId) return json({ error: 'Missing venueId' }, { status: 400 });
    // Enforce ownership: venues can only view their own stats (admins exempt)
    if (user!.id !== venueId && !(await isAdminUser(user))) {
      return json({ error: 'Forbidden' }, { status: 403 });
    }

    const [{ data: venue }, { count: totalWallSpaces }, { count: occupiedWallSpaces }] = await Promise.all([
      supabaseAdmin.from('venues').select('subscription_tier,subscription_status').eq('id', venueId).maybeSingle(),
      supabaseAdmin.from('wallspaces').select('id', { count: 'exact', head: true }).eq('venue_id', venueId),
      supabaseAdmin.from('wallspaces').select('id', { count: 'exact', head: true }).eq('venue_id', venueId).not('current_artwork_id', 'is', null),
    ]).then((results: unknown[]) => results as { data: unknown; count: number | null }[]);

    const now = new Date();
    const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { count: totalSales } = await supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('venue_id', venueId);

    const { data: ordersMonth } = await supabaseAdmin
      .from('orders')
      .select('venue_commission_cents')
      .eq('venue_id', venueId)
      .gte('created_at', past30)
      .order('created_at', { ascending: false })
      .limit(1000);
    const totalVenueCommissionCents = (ordersMonth || []).reduce((sum: number, o: Record<string, unknown>) => sum + (Number(o.venue_commission_cents) || 0), 0);

    return json({
      venueId,
      walls: {
        total: totalWallSpaces || 0,
        occupied: occupiedWallSpaces || 0,
        available: (totalWallSpaces || 0) - (occupiedWallSpaces || 0),
      },
      applications: {
        pending: 0,
      },
      sales: {
        total: totalSales || 0,
        totalEarnings: Math.round(totalVenueCommissionCents / 100),
      },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GET /api/venues — public venue listing (artist discovery)
  // ══════════════════════════════════════════════════════════════════════════
  if (url.pathname === '/api/venues' && method === 'GET') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const requester = await getUser(request);
    const requesterRole = requester?.user_metadata?.role;
    if (requesterRole === 'venue') {
      return json({ error: 'Venue discovery is only available to artists.' }, { status: 403 });
    }
    // Optional filters: by artistId (use artist's preferred cities) or by cities query
    const artistId = url.searchParams.get('artistId');
    const citiesParam = url.searchParams.get('cities');
    const q = url.searchParams.get('q');

    let cities: string[] | null = null;
    if (citiesParam) {
      cities = citiesParam.split(',').map(c => c.trim()).filter(Boolean);
    } else if (artistId) {
      const { data: artistRow } = await supabaseAdmin
        .from('artists')
        .select('city_primary,city_secondary')
        .eq('id', artistId)
        .maybeSingle();
      const cp = (artistRow?.city_primary || '').trim();
      const cs = (artistRow?.city_secondary || '').trim();
      cities = [cp, cs].filter(Boolean);
    }

    let query = supabaseAdmin
      .from('venues')
      .select('id,name,type,labels,default_venue_fee_bps,city,bio,cover_photo_url,verified,created_at,is_founding,founding_end,featured_until,art_guidelines,preferred_styles')
      .eq('suspended', false)
      .order('name', { ascending: true })
      .limit(50);

    // If search query is present, search by name globally. Otherwise, filter by city (local discovery).
    if (q) {
      query = query.ilike('name', `%${q}%`);
    } else if (cities && cities.length > 0) {
      query = query.in('city', cities);
    }
    const { data, error } = await query;
    if (error) return json({ error: error.message }, { status: 500 });

    // Fetch wallspace counts for all returned venue IDs
    const venueIds = (data || []).map(v => v.id);
    let wallspaceCounts: Record<string, { total: number; available: number }> = {};
    if (venueIds.length > 0) {
      const { data: wsData } = await supabaseAdmin
        .from('wallspaces')
        .select('venue_id,current_artwork_id')
        .in('venue_id', venueIds);
      if (wsData) {
        for (const ws of wsData) {
          if (!wallspaceCounts[ws.venue_id]) wallspaceCounts[ws.venue_id] = { total: 0, available: 0 };
          wallspaceCounts[ws.venue_id].total++;
          if (!ws.current_artwork_id) wallspaceCounts[ws.venue_id].available++;
        }
      }
    }

    const now = new Date().toISOString();
    const venues = (data || []).map(v => ({
      id: v.id,
      name: v.name,
      type: v.type,
      labels: v.labels,
      defaultVenueFeeBps: v.default_venue_fee_bps,
      city: (v as any).city || null,
      bio: (v as any).bio || '',
      coverPhotoUrl: (v as any).cover_photo_url || null,
      verified: (v as any).verified === true,
      createdAt: (v as any).created_at || null,
      wallSpaces: wallspaceCounts[v.id]?.total || 0,
      availableSpaces: wallspaceCounts[v.id]?.available || 0,
      isFounding: (v as any).is_founding === true && (v as any).founding_end && (v as any).founding_end > now,
      featuredUntil: (v as any).featured_until || null,
      preferredStyles: (v as any).preferred_styles || [],
      artGuidelines: (v as any).art_guidelines || null,
    }));

    // Sort: featured/founding venues appear first, then by name
    venues.sort((a, b) => {
      const aFeatured = a.featuredUntil && a.featuredUntil > now ? 1 : 0;
      const bFeatured = b.featuredUntil && b.featuredUntil > now ? 1 : 0;
      if (aFeatured !== bFeatured) return bFeatured - aFeatured;
      return (a.name || '').localeCompare(b.name || '');
    });

    return json({ venues });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GET /api/analytics/venue — venue analytics (scans, views, checkouts)
  // ══════════════════════════════════════════════════════════════════════════
  if (url.pathname === '/api/analytics/venue' && method === 'GET') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const user = await getUser(request);
    const authErrVAnalytics = requireAuthOrFail(request, user);
    if (authErrVAnalytics) return authErrVAnalytics;
    const venueId = url.searchParams.get('venueId') || user!.id;
    if (!venueId) return json({ error: 'Missing venueId' }, { status: 400 });
    // SECURITY: Enforce ownership — venues can only view their own analytics
    if (user!.id !== venueId && !(await isAdminUser(user))) {
      return json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: events } = await supabaseAdmin
      .from('events')
      .select('event_type,artwork_id,created_at')
      .eq('venue_id', venueId)
      .gte('created_at', monthAgo)
      .order('created_at', { ascending: false })
      .limit(5000);

    const rows = events || [];
    let scansWeek = 0, scansMonth = 0, totalCheckouts = 0, totalPurchases = 0;
    const perArtwork: Record<string, { scans: number; views: number; checkouts: number; purchases: number }> = {};

    for (const e of rows) {
      const aid = e.artwork_id || 'unknown';
      if (!perArtwork[aid]) perArtwork[aid] = { scans: 0, views: 0, checkouts: 0, purchases: 0 };
      if (e.event_type === 'qr_scan') {
        scansMonth++;
        if (e.created_at >= weekAgo) scansWeek++;
        perArtwork[aid].scans++;
      } else if (e.event_type === 'view_artwork') {
        perArtwork[aid].views++;
      } else if (e.event_type === 'start_checkout') {
        totalCheckouts++;
        perArtwork[aid].checkouts++;
      } else if (e.event_type === 'purchase') {
        totalPurchases++;
        perArtwork[aid].purchases++;
      }
    }

    const conversion = totalCheckouts > 0 ? Math.round((totalPurchases / totalCheckouts) * 100) : 0;
    return json({ cards: { scansWeek, scansMonth, conversion }, perArtwork });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GET /api/venues/:id — single venue profile (public)
  // ══════════════════════════════════════════════════════════════════════════
  if (url.pathname.match(/^\/api\/venues\/[0-9a-f-]+$/) && method === 'GET') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const parts = url.pathname.split('/');
    const venueId = parts[3];
    if (!venueId) return json({ error: 'Missing venue id' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('venues')
      .select('id,name,type,cover_photo_url,address,city,bio,labels,verified,founded_year,website,instagram_handle')
      .eq('id', venueId)
      .maybeSingle();

    if (error) return json({ error: error.message }, { status: 500 });
    if (!data) return json({ error: 'Not found' }, { status: 404 });

    return json({
      id: data.id,
      name: data.name,
      type: data.type || null,
      coverPhotoUrl: data.cover_photo_url || null,
      address: data.address || null,
      city: data.city || null,
      bio: data.bio || null,
      labels: data.labels || [],
      verified: Boolean(data.verified),
      foundedYear: data.founded_year || null,
      websiteUrl: data.website || null,
      instagramHandle: data.instagram_handle || null,
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GET /api/venues/:id/wallspaces — list wallspaces (public)
  // ══════════════════════════════════════════════════════════════════════════
  if (url.pathname.match(/^\/api\/venues\/[\w-]+\/wallspaces$/) && method === 'GET') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const parts = url.pathname.split('/');
    const venueId = parts[3];
    if (!venueId) return json({ error: 'Missing venue id' }, { status: 400 });
    const { data, error } = await supabaseAdmin
      .from('wallspaces')
      .select('id,name,width_inches,height_inches,available,description,photos')
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false });
    if (error) return json({ error: error.message }, { status: 500 });
    const items = (data || []).map((w: any) => ({
      id: w.id,
      name: w.name,
      width: typeof w.width_inches === 'number' ? w.width_inches : undefined,
      height: typeof w.height_inches === 'number' ? w.height_inches : undefined,
      available: Boolean(w.available),
      description: w.description || undefined,
      photos: Array.isArray(w.photos) ? w.photos : [],
    }));
    // Return bare array to match frontend expectations
    return json(items);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // POST /api/venues/:id/wallspaces — create wallspace (venue-auth)
  // ══════════════════════════════════════════════════════════════════════════
  if (url.pathname.match(/^\/api\/venues\/[\w-]+\/wallspaces$/) && method === 'POST') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const user = await requireVenue(request);
    if (!user) return json({ error: 'Missing or invalid Authorization bearer token (venue required)' }, { status: 401 });
    const rlWsCreate = await applyRateLimit('wallspace-write', request);
    if (rlWsCreate) return rlWsCreate;
    const parts = url.pathname.split('/');
    const venueId = parts[3];
    if (!venueId) return json({ error: 'Missing venue id' }, { status: 400 });
    if (user.id !== venueId) return json({ error: 'Cannot create for another venue' }, { status: 403 });
    const body = await request.json().catch(() => ({}));
    const insert = {
      id: crypto.randomUUID(),
      venue_id: venueId,
      name: clampStr(body?.name, 200),
      width_inches: typeof body?.width === 'number' ? body.width : undefined,
      height_inches: typeof body?.height === 'number' ? body.height : undefined,
      description: clampStr(body?.description, 2000) || null,
      available: true,
      photos: Array.isArray(body?.photos) ? body.photos.slice(0, 20).filter((p: any) => typeof p === 'string' && isValidUrl(p)) : [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any;
    if (!insert.name) return json({ error: 'Name is required' }, { status: 400 });
    // Validate width and height are positive if provided
    if (insert.width_inches !== undefined && (!Number.isFinite(insert.width_inches) || insert.width_inches <= 0)) {
      return json({ error: 'Width must be a positive number' }, { status: 400 });
    }
    if (insert.height_inches !== undefined && (!Number.isFinite(insert.height_inches) || insert.height_inches <= 0)) {
      return json({ error: 'Height must be a positive number' }, { status: 400 });
    }
    const { data, error } = await supabaseAdmin.from('wallspaces').insert(insert).select('*').single();
    if (error) return json({ error: error.message }, { status: 500 });
    const created = {
      id: data.id,
      name: data.name,
      width: typeof data.width_inches === 'number' ? data.width_inches : undefined,
      height: typeof data.height_inches === 'number' ? data.height_inches : undefined,
      available: Boolean(data.available),
      description: data.description || undefined,
      photos: Array.isArray(data.photos) ? data.photos : [],
    };
    return json(created, { status: 201 });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PATCH /api/wallspaces/:wid — update wallspace (venue-auth)
  // ══════════════════════════════════════════════════════════════════════════
  if ((url.pathname.match(/^\/api\/wallspaces\/[\w-]+$/) && (method === 'PATCH' || (method === 'POST' && (request.headers.get('X-HTTP-Method-Override') || '').toUpperCase() === 'PATCH')))) {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const user = await requireVenue(request);
    if (!user) return json({ error: 'Missing or invalid Authorization bearer token (venue required)' }, { status: 401 });
    const rlWsUpdate = await applyRateLimit('wallspace-write', request);
    if (rlWsUpdate) return rlWsUpdate;
    const parts = url.pathname.split('/');
    const wallId = parts[3];
    if (!wallId) return json({ error: 'Missing wallspace id' }, { status: 400 });
    const { data: existing, error: exErr } = await supabaseAdmin
      .from('wallspaces')
      .select('id,venue_id')
      .eq('id', wallId)
      .maybeSingle();
    if (exErr) return json({ error: exErr.message }, { status: 500 });
    if (!existing) return json({ error: 'Not found' }, { status: 404 });
    if (existing.venue_id !== user.id) return json({ error: 'Forbidden' }, { status: 403 });
    const body = await request.json().catch(() => ({}));
    const update: any = { updated_at: new Date().toISOString() };
    if (typeof body?.name === 'string') update.name = body.name.trim();
    if (typeof body?.width === 'number') update.width_inches = body.width;
    if (typeof body?.height === 'number') update.height_inches = body.height;
    if (typeof body?.description === 'string' || body?.description === null) update.description = body.description;
    if (typeof body?.available === 'boolean') update.available = body.available;
    if (Array.isArray(body?.photos)) update.photos = body.photos;
    const { data, error } = await supabaseAdmin
      .from('wallspaces')
      .update(update)
      .eq('id', wallId)
      .select('*')
      .maybeSingle();
    if (error) return json({ error: error.message }, { status: 500 });
    if (!data) return json({ error: 'Not found' }, { status: 404 });
    const updated = {
      id: data.id,
      name: data.name,
      width: typeof data.width_inches === 'number' ? data.width_inches : undefined,
      height: typeof data.height_inches === 'number' ? data.height_inches : undefined,
      available: Boolean(data.available),
      description: data.description || undefined,
      photos: Array.isArray(data.photos) ? data.photos : [],
    };
    return json(updated);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // POST /api/venues — upsert venue profile
  // ══════════════════════════════════════════════════════════════════════════
  if (url.pathname === '/api/venues' && method === 'POST') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    // SECURITY: Require authentication — no anonymous venue upserts
    const user = await getUser(request);
    const authErr = requireAuthOrFail(request, user);
    if (authErr) return authErr;
    const rlVenue = await applyRateLimit('profile-upsert', request);
    if (rlVenue) return rlVenue;
    const payload = await request.json().catch(() => ({}));
    const id = String(payload?.venueId || '').trim() || user!.id;
    if (!isUUID(id)) return json({ error: 'Invalid venueId format' }, { status: 400 });
    // SECURITY: Only allow users to upsert their own venue profile (admins exempt)
    if (id !== user!.id && !(await isAdminUser(user))) {
      return json({ error: 'Forbidden: cannot modify another venue\'s profile' }, { status: 403 });
    }
    const coverUrl = clampStr(payload?.coverPhoto || payload?.coverPhotoUrl, 2048) || null;
    if (coverUrl && !isValidUrl(coverUrl)) return json({ error: 'Invalid cover photo URL' }, { status: 400 });
    const resp = await upsertVenue({
      id,
      email: clampStr(payload?.email, 254) || null,
      name: clampStr(payload?.name, 200) || null,
      type: clampStr(payload?.type, 50) || null,
      phoneNumber: clampStr(payload?.phoneNumber, 30) || null,
      city: clampStr(payload?.city, 100) || null,
      bio: clampStr(payload?.bio, 2000) || null,
      labels: Array.isArray(payload?.labels) ? payload.labels.slice(0, 20).map((l: any) => clampStr(l, 50)) : null,
      coverPhotoUrl: coverUrl,
      address: clampStr(payload?.address, 500) || null,
      addressLat: typeof payload?.addressLat === 'number' ? payload.addressLat : null,
      addressLng: typeof payload?.addressLng === 'number' ? payload.addressLng : null,
      defaultVenueFeeBps: typeof payload?.defaultVenueFeeBps === 'number' ? payload.defaultVenueFeeBps : 1000,
      website: clampStr(payload?.website, 255) || null,
      instagramHandle: clampStr(payload?.instagramHandle, 255) || null,
      artGuidelines: payload?.artGuidelines !== undefined ? clampStr(payload.artGuidelines, 1000) || null : undefined,
      preferredStyles: Array.isArray(payload?.preferredStyles) ? payload.preferredStyles.slice(0, 20).map((s: any) => clampStr(s, 50)) : undefined,
    });
    return resp;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Venue Schedule Routes
  // ══════════════════════════════════════════════════════════════════════════

  // GET /api/venues/:venueId/schedule — read the venue's install/pickup window (public)
  if (url.pathname.match(/^\/api\/venues\/[0-9a-f-]+\/schedule$/) && method === 'GET') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const parts = url.pathname.split('/');
    const venueId = parts[3];
    if (!venueId) return json({ error: 'Missing venue id' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('venue_schedules')
      .select('*')
      .eq('venue_id', venueId)
      .maybeSingle();

    if (error) return json({ error: error.message }, { status: 500 });
    if (!data) return json({ schedule: null });

    return json({
      schedule: {
        id: data.id,
        venueId: data.venue_id,
        dayOfWeek: data.day_of_week,
        startTime: data.start_time,
        endTime: data.end_time,
        slotMinutes: data.slot_minutes ?? 30,
        installSlotIntervalMinutes: data.install_slot_interval_minutes ?? data.slot_minutes ?? 60,
        timezone: data.timezone ?? null,
      },
    });
  }

  // POST /api/venues/:venueId/schedule — create or update the venue's install/pickup window
  if (url.pathname.match(/^\/api\/venues\/[0-9a-f-]+\/schedule$/) && method === 'POST') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const user = await getUser(request);
    const authErr = requireAuthOrFail(request, user);
    if (authErr) return authErr;

    const parts = url.pathname.split('/');
    const venueId = parts[3];
    if (!venueId) return json({ error: 'Missing venue id' }, { status: 400 });

    // Only the venue owner (or admin) may set the schedule
    const isAdmin = await isAdminUser(user);
    if (user!.id !== venueId && !isAdmin) {
      return json({ error: 'Forbidden: cannot modify another venue\'s schedule' }, { status: 403 });
    }

    const rlSched = await applyRateLimit('profile-upsert', request);
    if (rlSched) return rlSched;

    const body = await request.json().catch(() => ({})) as Record<string, unknown>;

    // Validate required fields
    const dayOfWeek = String(body?.dayOfWeek || '').trim();
    const validDays = new Set(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
    if (!validDays.has(dayOfWeek)) return json({ error: 'Invalid dayOfWeek. Must be Monday–Sunday.' }, { status: 400 });

    const startTime = String(body?.startTime || '').trim();
    const endTime = String(body?.endTime || '').trim();
    const timeRe = /^\d{2}:\d{2}$/;
    if (!timeRe.test(startTime)) return json({ error: 'startTime must be HH:MM' }, { status: 400 });
    if (!timeRe.test(endTime)) return json({ error: 'endTime must be HH:MM' }, { status: 400 });
    if (startTime >= endTime) return json({ error: 'startTime must be before endTime' }, { status: 400 });

    const interval = typeof body?.installSlotIntervalMinutes === 'number'
      ? body.installSlotIntervalMinutes
      : typeof body?.slotMinutes === 'number'
        ? body.slotMinutes
        : 60;
    const allowedIntervals = new Set([15, 30, 60, 120]);
    if (!allowedIntervals.has(interval as number)) return json({ error: 'Slot interval must be 15, 30, 60, or 120' }, { status: 400 });

    const timezone = typeof body?.timezone === 'string' ? body.timezone.trim() || null : null;

    const { data, error } = await supabaseAdmin
      .from('venue_schedules')
      .upsert({
        venue_id: venueId,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        slot_minutes: interval,
        install_slot_interval_minutes: interval,
        timezone,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'venue_id' })
      .select('*')
      .single();

    if (error) return json({ error: error.message }, { status: 500 });

    return json({
      schedule: {
        id: data.id,
        venueId: data.venue_id,
        dayOfWeek: data.day_of_week,
        startTime: data.start_time,
        endTime: data.end_time,
        slotMinutes: data.slot_minutes ?? 30,
        installSlotIntervalMinutes: data.install_slot_interval_minutes ?? data.slot_minutes ?? 60,
        timezone: data.timezone ?? null,
      },
    }, { status: 200 });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GET /api/venues/:venueId/availability — compute available time slots
  // ══════════════════════════════════════════════════════════════════════════
  if (url.pathname.match(/^\/api\/venues\/[0-9a-f-]+\/availability$/) && method === 'GET') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const parts = url.pathname.split('/');
    const venueId = parts[3];
    if (!venueId) return json({ error: 'Missing venue id' }, { status: 400 });

    // Load the venue schedule
    const { data: sched, error: schedErr } = await supabaseAdmin
      .from('venue_schedules')
      .select('*')
      .eq('venue_id', venueId)
      .maybeSingle();

    if (schedErr) return json({ error: schedErr.message }, { status: 500 });
    if (!sched) {
      return json({
        slots: [],
        slotMinutes: 30,
        slotIntervalMinutes: 60,
        dayOfWeek: null,
        startTime: null,
        endTime: null,
      });
    }

    const dayOfWeek: string = sched.day_of_week;
    const startTime: string = sched.start_time;     // "16:00"
    const endTime: string = sched.end_time;          // "18:00"
    const intervalMin: number = sched.install_slot_interval_minutes ?? sched.slot_minutes ?? 60;

    // Determine the week window: find the next occurrence of dayOfWeek from weekStart
    const weekStartParam = url.searchParams.get('weekStart');
    const now = new Date();
    let anchor: Date;
    if (weekStartParam) {
      anchor = new Date(weekStartParam);
      if (isNaN(anchor.getTime())) anchor = now;
    } else {
      anchor = now;
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDayIdx = dayNames.indexOf(dayOfWeek);
    if (targetDayIdx === -1) return json({ error: 'Invalid dayOfWeek in schedule' }, { status: 500 });

    // Find the next occurrence of the target day (or today if today IS that day and still in future)
    const anchorDay = anchor.getDay();
    let daysUntil = (targetDayIdx - anchorDay + 7) % 7;
    // If daysUntil is 0 and the time has passed, jump to next week
    const targetDate = new Date(anchor);
    targetDate.setDate(targetDate.getDate() + daysUntil);

    // Generate time slots
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;
    const slots: string[] = [];

    for (let m = startMin; m + intervalMin <= endMin; m += intervalMin) {
      const slotDate = new Date(targetDate);
      slotDate.setHours(Math.floor(m / 60), m % 60, 0, 0);
      slots.push(slotDate.toISOString());
    }

    // Filter out slots that are already booked
    if (slots.length > 0) {
      const { data: booked } = await supabaseAdmin
        .from('venue_bookings')
        .select('start_at')
        .eq('venue_id', venueId)
        .gte('start_at', slots[0])
        .lte('start_at', slots[slots.length - 1]);

      if (booked && booked.length > 0) {
        const bookedSet = new Set(booked.map((b: any) => new Date(b.start_at).toISOString()));
        const filtered = slots.filter(s => !bookedSet.has(s));
        return json({
          slots: filtered,
          slotMinutes: intervalMin,
          slotIntervalMinutes: intervalMin,
          dayOfWeek,
          startTime,
          endTime,
          windowStart: slots[0],
          windowEnd: slots[slots.length - 1],
        });
      }
    }

    return json({
      slots,
      slotMinutes: intervalMin,
      slotIntervalMinutes: intervalMin,
      dayOfWeek,
      startTime,
      endTime,
      windowStart: slots.length > 0 ? slots[0] : undefined,
      windowEnd: slots.length > 0 ? slots[slots.length - 1] : undefined,
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // POST /api/venues/:venueId/bookings — create booking
  // ══════════════════════════════════════════════════════════════════════════
  if (url.pathname.match(/^\/api\/venues\/[0-9a-f-]+\/bookings$/) && method === 'POST') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const user = await getUser(request);
    const authErr = requireAuthOrFail(request, user);
    if (authErr) return authErr;

    const parts = url.pathname.split('/');
    const venueId = parts[3];
    if (!venueId) return json({ error: 'Missing venue id' }, { status: 400 });

    const rlBook = await applyRateLimit('profile-upsert', request);
    if (rlBook) return rlBook;

    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const bookingType = String(body?.type || '').trim();
    if (!['install', 'pickup'].includes(bookingType)) {
      return json({ error: 'type must be "install" or "pickup"' }, { status: 400 });
    }
    const startAt = String(body?.startAt || '').trim();
    if (!startAt || isNaN(new Date(startAt).getTime())) {
      return json({ error: 'startAt must be a valid ISO date string' }, { status: 400 });
    }

    // Load venue schedule to compute end_at
    const { data: sched } = await supabaseAdmin
      .from('venue_schedules')
      .select('install_slot_interval_minutes,slot_minutes')
      .eq('venue_id', venueId)
      .maybeSingle();

    const intervalMin = sched?.install_slot_interval_minutes ?? sched?.slot_minutes ?? 60;
    const startDate = new Date(startAt);
    const endDate = new Date(startDate.getTime() + intervalMin * 60_000);

    // Check for conflicts
    const { data: conflict } = await supabaseAdmin
      .from('venue_bookings')
      .select('id')
      .eq('venue_id', venueId)
      .eq('start_at', startDate.toISOString())
      .maybeSingle();

    if (conflict) return json({ error: 'This time slot is already booked' }, { status: 409 });

    const bookingId = crypto.randomUUID();
    const { data, error } = await supabaseAdmin
      .from('venue_bookings')
      .insert({
        id: bookingId,
        venue_id: venueId,
        artist_id: user!.id,
        artwork_id: typeof body?.artworkId === 'string' ? body.artworkId : null,
        type: bookingType,
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString(),
        status: 'confirmed',
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) return json({ error: error.message }, { status: 500 });

    return json({ booking: { id: data.id } }, { status: 201 });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // POST /api/venues/request-install-kit — founding venue kit request
  // ══════════════════════════════════════════════════════════════════════════
  if (url.pathname === '/api/venues/request-install-kit' && method === 'POST') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const user = await getUser(request);
    const authErr = requireAuthOrFail(request, user);
    if (authErr) return authErr;
    if (user!.user_metadata?.role !== 'venue') {
      return json({ error: 'Only venues can request install kits' }, { status: 403 });
    }
    const venueId = user!.id;
    const payload = await request.json().catch(() => ({})) as Record<string, unknown>;
    const note = String(payload?.note || '').trim();

    // Prevent duplicate requests
    const { data: existing } = await supabaseAdmin
      .from('venue_requests')
      .select('id')
      .eq('venue_id', venueId)
      .eq('type', 'install_kit')
      .limit(1);
    if (existing && existing.length > 0) {
      return json({ ok: true, alreadyRequested: true });
    }

    const { error: insertErr } = await supabaseAdmin
      .from('venue_requests')
      .insert({ venue_id: venueId, type: 'install_kit', shipping_or_dropoff_note: note || null });
    if (insertErr) return json({ error: insertErr.message }, { status: 500 });

    // Mark the kit as requested on the venue row
    await supabaseAdmin.from('venues').update({ founder_kit_requested_at: new Date().toISOString() }).eq('id', venueId);

    return json({ ok: true });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GET /api/venues/me/performance — venue performance snapshot (scans by day)
  // ══════════════════════════════════════════════════════════════════════════
  if (url.pathname === '/api/venues/me/performance' && method === 'GET') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const user = await getUser(request);
    const authErr = requireAuthOrFail(request, user);
    if (authErr) return authErr;
    if (user!.user_metadata?.role !== 'venue') {
      return json({ error: 'Venue-only endpoint' }, { status: 403 });
    }
    const venueId = user!.id;
    const range = url.searchParams.get('range') === '30d' ? 30 : 7;
    const since = new Date(Date.now() - range * 24 * 60 * 60 * 1000).toISOString();

    const { data: events } = await supabaseAdmin
      .from('events')
      .select('event_type,artwork_id,created_at')
      .eq('venue_id', venueId)
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .limit(10000);

    const rows = events || [];
    let totalScans = 0, totalViews = 0, totalCheckouts = 0, totalPurchases = 0;
    const byDay: Record<string, number> = {};
    const byArtwork: Record<string, number> = {};

    for (const e of rows) {
      const day = e.created_at.slice(0, 10);
      if (e.event_type === 'qr_scan') {
        totalScans++;
        byDay[day] = (byDay[day] || 0) + 1;
        byArtwork[e.artwork_id || 'unknown'] = (byArtwork[e.artwork_id || 'unknown'] || 0) + 1;
      } else if (e.event_type === 'view_artwork') {
        totalViews++;
      } else if (e.event_type === 'start_checkout') {
        totalCheckouts++;
      } else if (e.event_type === 'purchase') {
        totalPurchases++;
      }
    }

    // Fill in missing days
    const scansByDay: { date: string; count: number }[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      scansByDay.push({ date: key, count: byDay[key] || 0 });
    }

    // Fetch artwork titles for top artworks
    const topIds = Object.entries(byArtwork).sort((a, b) => b[1] - a[1]).slice(0, 5);
    let artworkTitles: Record<string, string> = {};
    if (topIds.length > 0) {
      const { data: artworks } = await supabaseAdmin
        .from('artworks')
        .select('id,title')
        .in('id', topIds.map(t => t[0]));
      if (artworks) {
        for (const a of artworks) artworkTitles[a.id] = a.title || '';
      }
    }

    const topArtworks = topIds.map(([id, scans]) => ({
      artworkId: id,
      title: artworkTitles[id] || id,
      scans,
    }));

    return json({ totalScans, totalViews, totalCheckouts, totalPurchases, scansByDay, topArtworks });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GET /api/venues/me/statement — monthly commission statement
  // ══════════════════════════════════════════════════════════════════════════
  if (url.pathname === '/api/venues/me/statement' && method === 'GET') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const user = await getUser(request);
    const authErr = requireAuthOrFail(request, user);
    if (authErr) return authErr;
    if (user!.user_metadata?.role !== 'venue') {
      return json({ error: 'Venue-only endpoint' }, { status: 403 });
    }
    const venueId = user!.id;
    const monthParam = url.searchParams.get('month') || '';
    const match = monthParam.match(/^(\d{4})-(\d{2})$/);
    if (!match) return json({ error: 'month param must be YYYY-MM' }, { status: 400 });

    const year = Number(match[1]);
    const mo = Number(match[2]);
    const startDate = new Date(year, mo - 1, 1).toISOString();
    const endDate = new Date(year, mo, 1).toISOString();

    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('id,created_at,amount_total,venue_commission,artwork_id')
      .eq('venue_id', venueId)
      .gte('created_at', startDate)
      .lt('created_at', endDate)
      .order('created_at', { ascending: false });

    const rows = orders || [];

    // Fetch artwork titles
    const artworkIds = [...new Set(rows.map(o => o.artwork_id).filter(Boolean))];
    let titles: Record<string, string> = {};
    if (artworkIds.length > 0) {
      const { data: artworks } = await supabaseAdmin
        .from('artworks')
        .select('id,title')
        .in('id', artworkIds);
      if (artworks) for (const a of artworks) titles[a.id] = a.title || '';
    }

    let grossSales = 0;
    let totalCommission = 0;
    const orderList = rows.map(o => {
      const amount = (o.amount_total || 0) / 100; // cents to dollars
      const commission = (o.venue_commission || 0) / 100;
      grossSales += amount;
      totalCommission += commission;
      return {
        orderId: o.id,
        date: o.created_at,
        artworkTitle: titles[o.artwork_id] || '',
        amount,
        commission,
      };
    });

    return json({
      month: monthParam,
      grossSales,
      totalCommission,
      orderCount: rows.length,
      orders: orderList,
    });
  }

  // No venue route matched — pass through
  return null;
}
