/**
 * Venue invite + referral + announcement endpoints.
 */

import type { WorkerContext } from '../types';
import {
  isUUID,
  clampStr,
  isValidEmail,
  generateInviteToken,
  generateReferralToken,
  isValidInviteToken,
  statusAfterOpen,
  isStatusTransitionAllowed,
  mapVenueInviteRow,
} from '../helpers';

export async function handleVenueInvites(wc: WorkerContext): Promise<Response | null> {
  const {
    url, method, request, json, supabaseAdmin,
    getUser, requireAuthOrFail, applyRateLimit,
    VENUE_INVITE_DAILY_LIMIT, VENUE_INVITE_DUPLICATE_WINDOW_DAYS, REFERRAL_DAILY_LIMIT,
  } = wc;

  // ── GET /api/venue-invites ──
  if (url.pathname === '/api/venue-invites' && method === 'GET') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const user = await getUser(request);
    const authErr = requireAuthOrFail(request, user);
    if (authErr) return authErr;
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 500);
    const { data, error: dbErr } = await supabaseAdmin
      .from('venue_invites')
      .select('*')
      .eq('artist_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (dbErr) return json({ error: dbErr.message }, { status: 500 });
    return json({ invites: (data || []).map(mapVenueInviteRow) });
  }

  // ── POST /api/venue-invites ──
  if (url.pathname === '/api/venue-invites' && method === 'POST') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const user = await getUser(request);
    const authErr = requireAuthOrFail(request, user);
    if (authErr) return authErr;
    const rlInvite = await applyRateLimit('profile-upsert', request);
    if (rlInvite) return rlInvite;
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const placeId = clampStr(body?.placeId, 500);
    const venueName = clampStr(body?.venueName, 300);
    if (!placeId || !venueName) return json({ error: 'placeId and venueName are required' }, { status: 400 });

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const { count: todayCount } = await supabaseAdmin
      .from('venue_invites')
      .select('id', { count: 'exact', head: true })
      .eq('artist_id', user!.id)
      .gte('created_at', todayStart.toISOString());
    if ((todayCount || 0) >= VENUE_INVITE_DAILY_LIMIT) {
      return json({ error: `Daily invite limit reached (${VENUE_INVITE_DAILY_LIMIT})` }, { status: 429 });
    }

    const windowStart = new Date(Date.now() - VENUE_INVITE_DUPLICATE_WINDOW_DAYS * 86400000).toISOString();
    const { data: dup } = await supabaseAdmin
      .from('venue_invites')
      .select('id')
      .eq('artist_id', user!.id)
      .eq('place_id', placeId)
      .gte('created_at', windowStart)
      .limit(1);
    if (dup && dup.length > 0) {
      return json({ error: 'You already invited this venue recently' }, { status: 409 });
    }

    const token = generateInviteToken();
    const { data, error: dbErr } = await supabaseAdmin
      .from('venue_invites')
      .insert({
        artist_id: user!.id,
        token,
        place_id: placeId,
        venue_name: venueName,
        venue_address: clampStr(body?.venueAddress, 500) || null,
        google_maps_url: clampStr(body?.googleMapsUrl, 2048) || null,
        website_url: clampStr(body?.websiteUrl, 2048) || null,
        phone: clampStr(body?.phone, 30) || null,
        status: 'DRAFT',
      })
      .select('*')
      .single();
    if (dbErr) return json({ error: dbErr.message }, { status: 500 });

    await supabaseAdmin.from('venue_invite_events').insert({
      invite_id: data.id, type: 'CREATED', meta: {},
    }).catch(() => {});

    return json({ invite: mapVenueInviteRow(data) }, { status: 201 });
  }

  // ── POST /api/venue-invites/:id/send ──
  if (url.pathname.match(/^\/api\/venue-invites\/[0-9a-f-]+\/send$/) && method === 'POST') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const user = await getUser(request);
    const authErr = requireAuthOrFail(request, user);
    if (authErr) return authErr;
    const inviteId = url.pathname.split('/')[3];
    if (!isUUID(inviteId)) return json({ error: 'Invalid invite id' }, { status: 400 });

    const { data: existing } = await supabaseAdmin
      .from('venue_invites').select('id,artist_id,status').eq('id', inviteId).single();
    if (!existing) return json({ error: 'Invite not found' }, { status: 404 });
    if (existing.artist_id !== user!.id) return json({ error: 'Not your invite' }, { status: 403 });
    if (!isStatusTransitionAllowed(existing.status, 'SENT')) {
      return json({ error: `Cannot send invite with status ${existing.status}` }, { status: 400 });
    }

    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const { data, error: dbErr } = await supabaseAdmin
      .from('venue_invites')
      .update({
        personal_line: clampStr(body?.personalLine, 2000) || null,
        venue_email: clampStr(body?.venueEmail, 254) || null,
        subject: clampStr(body?.subject, 300) || null,
        body_template_version: clampStr(body?.bodyTemplateVersion, 20) || 'v1',
        status: 'SENT',
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', inviteId)
      .select('*')
      .single();
    if (dbErr) return json({ error: dbErr.message }, { status: 500 });

    await supabaseAdmin.from('venue_invite_events').insert({
      invite_id: inviteId, type: 'SENT',
      meta: { method: body?.sendMethod || 'unknown' },
    }).catch(() => {});

    return json({ invite: mapVenueInviteRow(data) });
  }

  // ── GET /api/venue-invites/token/:token ──
  if (url.pathname.match(/^\/api\/venue-invites\/token\/[a-f0-9]+$/i) && method === 'GET') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const token = url.pathname.split('/').pop() || '';
    if (!isValidInviteToken(token)) return json({ error: 'Invalid token' }, { status: 400 });

    const { data: inv } = await supabaseAdmin
      .from('venue_invites').select('*').eq('token', token).maybeSingle();
    if (!inv) return json({ error: 'Invite not found' }, { status: 404 });

    const { data: artist } = await supabaseAdmin
      .from('artists')
      .select('id,name,bio,portfolio_url,profile_photo_url')
      .eq('id', inv.artist_id)
      .maybeSingle();

    const { data: artworksRaw } = await supabaseAdmin
      .from('artworks')
      .select('id,title,image_url,price_cents,currency')
      .eq('artist_id', inv.artist_id)
      .eq('status', 'available')
      .limit(6);
    const artworks = (artworksRaw || []).map((a: any) => ({
      id: a.id, title: a.title, imageUrl: a.image_url,
      price: a.price_cents ? a.price_cents / 100 : null,
    }));

    return json({ invite: mapVenueInviteRow(inv), artist: artist || null, artworks });
  }

  // ── POST /api/venue-invites/token/:token/open ──
  if (url.pathname.match(/^\/api\/venue-invites\/token\/[a-f0-9]+\/open$/i) && method === 'POST') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const parts = url.pathname.split('/');
    const token = parts[4] || '';
    if (!isValidInviteToken(token)) return json({ error: 'Invalid token' }, { status: 400 });

    const { data: inv } = await supabaseAdmin
      .from('venue_invites').select('id,status,click_count,first_clicked_at').eq('token', token).maybeSingle();
    if (!inv) return json({ error: 'Invite not found' }, { status: 404 });

    const newStatus = statusAfterOpen(inv.status);
    const updates: Record<string, unknown> = {
      click_count: (inv.click_count || 0) + 1,
      updated_at: new Date().toISOString(),
    };
    if (newStatus !== inv.status) updates.status = newStatus;
    if (!inv.first_clicked_at) updates.first_clicked_at = new Date().toISOString();

    await supabaseAdmin.from('venue_invites').update(updates).eq('id', inv.id);
    await supabaseAdmin.from('venue_invite_events').insert({
      invite_id: inv.id, type: 'OPENED', meta: {},
    }).catch(() => {});

    return json({ ok: true });
  }

  // ── POST /api/venue-invites/token/:token/accept ──
  if (url.pathname.match(/^\/api\/venue-invites\/token\/[a-f0-9]+\/accept$/i) && method === 'POST') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const parts = url.pathname.split('/');
    const token = parts[4] || '';
    if (!isValidInviteToken(token)) return json({ error: 'Invalid token' }, { status: 400 });

    const { data: inv } = await supabaseAdmin
      .from('venue_invites').select('*').eq('token', token).maybeSingle();
    if (!inv) return json({ error: 'Invite not found' }, { status: 404 });
    if (!isStatusTransitionAllowed(inv.status, 'ACCEPTED')) {
      return json({ error: `Cannot accept invite with status ${inv.status}` }, { status: 400 });
    }

    const { data, error: dbErr } = await supabaseAdmin
      .from('venue_invites')
      .update({ status: 'ACCEPTED', accepted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', inv.id)
      .select('*')
      .single();
    if (dbErr) return json({ error: dbErr.message }, { status: 500 });

    await supabaseAdmin.from('venue_invite_events').insert({
      invite_id: inv.id, type: 'ACCEPTED', meta: {},
    }).catch(() => {});

    return json({ invite: mapVenueInviteRow(data) });
  }

  // ── POST /api/venue-invites/token/:token/decline ──
  if (url.pathname.match(/^\/api\/venue-invites\/token\/[a-f0-9]+\/decline$/i) && method === 'POST') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const parts = url.pathname.split('/');
    const token = parts[4] || '';
    if (!isValidInviteToken(token)) return json({ error: 'Invalid token' }, { status: 400 });

    const { data: inv } = await supabaseAdmin
      .from('venue_invites').select('*').eq('token', token).maybeSingle();
    if (!inv) return json({ error: 'Invite not found' }, { status: 404 });
    if (!isStatusTransitionAllowed(inv.status, 'DECLINED')) {
      return json({ error: `Cannot decline invite with status ${inv.status}` }, { status: 400 });
    }

    const { data, error: dbErr } = await supabaseAdmin
      .from('venue_invites')
      .update({ status: 'DECLINED', declined_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', inv.id)
      .select('*')
      .single();
    if (dbErr) return json({ error: dbErr.message }, { status: 500 });

    await supabaseAdmin.from('venue_invite_events').insert({
      invite_id: inv.id, type: 'DECLINED', meta: {},
    }).catch(() => {});

    return json({ invite: mapVenueInviteRow(data) });
  }

  // ── POST /api/venue-invites/token/:token/question ──
  if (url.pathname.match(/^\/api\/venue-invites\/token\/[a-f0-9]+\/question$/i) && method === 'POST') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const parts = url.pathname.split('/');
    const token = parts[4] || '';
    if (!isValidInviteToken(token)) return json({ error: 'Invalid token' }, { status: 400 });

    const { data: inv } = await supabaseAdmin
      .from('venue_invites').select('id,artist_id,venue_name').eq('token', token).maybeSingle();
    if (!inv) return json({ error: 'Invite not found' }, { status: 404 });

    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const message = clampStr(body?.message, 2000).trim();
    if (!message || message.length < 10) return json({ error: 'Message must be at least 10 characters' }, { status: 400 });
    const email = clampStr(body?.email, 254).trim() || null;
    if (email && !isValidEmail(email)) return json({ error: 'Invalid email' }, { status: 400 });

    await supabaseAdmin.from('support_messages').insert({
      id: crypto.randomUUID(),
      email: email || 'venue-via-invite@artwalls.space',
      message: `[Venue Question via Invite] From: ${inv.venue_name}\n\n${message}`,
      role_context: 'venue',
      page_source: `/v/invite/${token}`,
      status: 'new',
      created_at: new Date().toISOString(),
    }).catch(() => {});

    await supabaseAdmin.from('venue_invite_events').insert({
      invite_id: inv.id, type: 'OPENED', meta: { question: true, email },
    }).catch(() => {});

    return json({ ok: true });
  }

  // ── POST /api/referrals/create ──
  if (url.pathname === '/api/referrals/create' && method === 'POST') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const user = await getUser(request);
    const authErr = requireAuthOrFail(request, user);
    if (authErr) return authErr;
    const rlRef = await applyRateLimit('profile-upsert', request);
    if (rlRef) return rlRef;

    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const venueName = clampStr(body?.venueName, 300).trim();
    const venueEmail = clampStr(body?.venueEmail, 254).trim();
    if (!venueName || !venueEmail) return json({ error: 'venueName and venueEmail are required' }, { status: 400 });
    if (!isValidEmail(venueEmail)) return json({ error: 'Invalid email address' }, { status: 400 });

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const { count } = await supabaseAdmin
      .from('venue_referrals')
      .select('id', { count: 'exact', head: true })
      .eq('artist_user_id', user!.id)
      .gte('created_at', todayStart.toISOString());
    if ((count || 0) >= REFERRAL_DAILY_LIMIT) {
      return json({ error: `Daily referral limit reached (${REFERRAL_DAILY_LIMIT})` }, { status: 429 });
    }

    const token = generateReferralToken();
    const { data, error: dbErr } = await supabaseAdmin
      .from('venue_referrals')
      .insert({
        artist_user_id: user!.id,
        venue_name: venueName,
        venue_email: venueEmail,
        venue_website: clampStr(body?.venueWebsite, 2048) || null,
        venue_location_text: clampStr(body?.venueLocation, 300) || null,
        note: clampStr(body?.note, 2000) || null,
        token,
        status: 'sent',
      })
      .select('*')
      .single();
    if (dbErr) return json({ error: dbErr.message }, { status: 500 });

    return json({
      referral: {
        id: data.id,
        token: data.token,
        venueName: data.venue_name,
        venueEmail: data.venue_email,
        status: data.status,
        createdAt: data.created_at,
      },
    }, { status: 201 });
  }

  // ── GET /api/announcements — public ──
  if (url.pathname === '/api/announcements' && method === 'GET') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const audience = (url.searchParams.get('audience') || 'all').toLowerCase();
    const now = new Date().toISOString();

    let query = supabaseAdmin
      .from('announcements')
      .select('id,title,body,type,audience,status,start_date,end_date,created_at')
      .eq('status', 'active')
      .lte('start_date', now)
      .order('created_at', { ascending: false })
      .limit(20);

    if (audience === 'artists' || audience === 'venues') {
      query = query.in('audience', ['all', audience]);
    }

    const { data, error: dbErr } = await query;
    if (dbErr) return json({ error: dbErr.message }, { status: 500 });

    const active = (data || []).filter((a: any) => !a.end_date || new Date(a.end_date) > new Date());

    return json({
      announcements: active.map((a: any) => ({
        id: a.id,
        title: a.title,
        body: a.body,
        type: a.type,
        audience: a.audience,
        startDate: a.start_date,
        endDate: a.end_date,
        createdAt: a.created_at,
      })),
    });
  }

  // ── POST /api/support/messages — public contact form ──
  if (url.pathname === '/api/support/messages' && method === 'POST') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const rlSupport = await applyRateLimit('support', request);
    if (rlSupport) return rlSupport;

    const payload = await request.json().catch(() => ({}));
    const email = clampStr(payload?.email, 254)?.trim() || '';
    const message = clampStr(payload?.message, 5000)?.trim() || '';
    const roleContext = clampStr(payload?.role_context, 50) || 'other';
    const pageSource = clampStr(payload?.page_source, 100) || 'unknown';
    const honeypot = payload?.honeypot || payload?.website || '';

    if (!email || !isValidEmail(email)) return json({ error: 'Valid email required' }, { status: 400 });
    if (!message || message.length < 10) return json({ error: 'Message must be at least 10 characters' }, { status: 400 });

    if (honeypot) return json({ ok: true });

    const { data, error: insertErr } = await supabaseAdmin
      .from('support_messages')
      .insert({
        email,
        message,
        role_context: roleContext,
        page_source: pageSource,
        status: 'new',
      })
      .select('id')
      .single();

    if (insertErr) return json({ error: insertErr.message }, { status: 500 });
    return json({ ok: true, id: data?.id });
  }

  return null;
}
