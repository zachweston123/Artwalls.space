import type { WorkerContext } from '../types';

export async function handleAnalytics(wc: WorkerContext): Promise<Response | null> {
  const { url, method, request, json, supabaseAdmin, applyRateLimit, getUser, hashIp } = wc;

  // Health check
  if (url.pathname === '/api/health') {
    return json({ ok: true });
  }

  // =========================================================================
  // Wall-productivity event tracking (writes to app_events)
  // Server-side only, dedupe via unique partial indexes in Postgres.
  // =========================================================================
  if (url.pathname === '/api/track' && method === 'POST') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });

    const payload = await request.json().catch(() => ({}));
    const eventType = String(payload?.event_type || '').trim();
    const allowedTypes = new Set(['qr_scan', 'artwork_view', 'checkout_start']);
    if (!allowedTypes.has(eventType)) {
      return json({ error: 'Invalid event_type' }, { status: 400 });
    }

    const sessionId = String(payload?.session_id || '').trim();
    if (!sessionId) return json({ error: 'Missing session_id' }, { status: 400 });

    const rlTrack = await applyRateLimit('track', request);
    if (rlTrack) return rlTrack;

    const user = await getUser(request);

    const row: Record<string, unknown> = {
      event_type: eventType,
      session_id: sessionId,
      user_id: user?.id || null,
      artwork_id: payload?.artwork_id || null,
      venue_id: payload?.venue_id || null,
      wallspace_id: payload?.wallspace_id || null,
      artist_id: payload?.artist_id || null,
      metadata: payload?.metadata || {},
    };

    // ON CONFLICT DO NOTHING: leverages the dedupe unique indexes
    const { error: insertErr } = await supabaseAdmin.from('app_events').insert(row);

    // 23505 = unique_violation → dedupe hit, not an error
    if (insertErr && insertErr.code !== '23505') {
      return json({ error: insertErr.message }, { status: 500 });
    }

    return json({ ok: true, deduped: insertErr?.code === '23505' });
  }

  // =========================================================================
  // Unified analytics endpoint — accepts batched measurement events.
  // Writes to analytics_events table (separate from app_events).
  // =========================================================================
  if (url.pathname === '/api/analytics' && method === 'POST') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });

    const rlAnalytics = await applyRateLimit('track', request);
    if (rlAnalytics) return rlAnalytics;

    const body = await request.json().catch(() => ({}));
    const events = Array.isArray(body?.events) ? body.events : [];
    if (events.length === 0) return json({ error: 'Empty events array' }, { status: 400 });
    if (events.length > 25) return json({ error: 'Too many events (max 25)' }, { status: 400 });

    const user = await getUser(request);
    const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || null;

    // Validate and build rows
    const allowedNames = new Set([
      'cwv', 'page_view', 'landing_view', 'role_selected', 'auth_complete',
      'onboarding_step', 'onboarding_finished', 'artwork_publish',
      'qr_scan', 'artwork_view', 'checkout_start', 'purchase_success',
    ]);

    const rows: Record<string, unknown>[] = [];
    for (const evt of events) {
      const name = String(evt?.name || '').trim();
      if (!allowedNames.has(name)) continue; // skip unknown events silently

      const sessionId = String(evt?.sessionId || '').trim();
      if (!sessionId) continue;

      rows.push({
        event_name: name,
        session_id: sessionId,
        user_id: user?.id || null,
        user_role: String(evt?.userRole || '').slice(0, 20) || null,
        route: String(evt?.route || '').slice(0, 500),
        properties: evt?.properties || {},
        client_timestamp: evt?.timestamp || null,
        ip_hash: clientIp ? await hashIp(clientIp) : null,
      });
    }

    if (rows.length === 0) return json({ ok: true, inserted: 0 });

    const { error: insertErr } = await supabaseAdmin.from('analytics_events').insert(rows);
    if (insertErr) {
      console.error('analytics_events insert error:', insertErr.message);
      return json({ error: 'Failed to store events' }, { status: 500 });
    }

    return json({ ok: true, inserted: rows.length });
  }

  // =========================================================================
  // Append-only events tracking (writes to events table)
  // =========================================================================
  if (url.pathname === '/api/events' && method === 'POST') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const payload = await request.json().catch(() => ({}));
    const eventType = String(payload?.event_type || '').trim();
    if (!eventType) return json({ error: 'Missing event_type' }, { status: 400 });
    const allowed = new Set(['qr_scan', 'view_artwork', 'start_checkout', 'purchase', 'like']);
    if (!allowed.has(eventType)) return json({ error: 'Invalid event_type' }, { status: 400 });

    const rlEvents = await applyRateLimit('events', request);
    if (rlEvents) return rlEvents;

    const user = await getUser(request);
    const artworkId = payload?.artwork_id || null;
    const venueId = payload?.venue_id || null;
    const sessionId = payload?.session_id || null;
    const ua = request.headers.get('user-agent') || '';
    const userAgentHash = ua ? String(ua).slice(0, 120) : null;

    const { error } = await supabaseAdmin.from('events').insert({
      event_type: eventType,
      user_id: user?.id || null,
      artwork_id: artworkId,
      venue_id: venueId,
      session_id: sessionId,
      user_agent_hash: userAgentHash,
    });
    if (error) return json({ error: error.message }, { status: 500 });
    return json({ ok: true });
  }

  return null;
}
