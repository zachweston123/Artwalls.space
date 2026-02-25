import type { WorkerContext } from '../types';

export async function handleAuth(wc: WorkerContext): Promise<Response | null> {
  const { url, method, request, json, supabaseAdmin, getUser, applyRateLimit, upsertArtist, upsertVenue, env, applyProOverride } = wc;

  // ── Profile provisioning (POST /api/profile/provision) ──────────
  if (url.pathname === '/api/profile/provision' && method === 'POST') {
    const user = await getUser(request);
    if (!user) return json({ error: 'Missing or invalid Authorization bearer token' }, { status: 401 });
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const rlProv = await applyRateLimit('profile-provision', request);
    if (rlProv) return rlProv;

    const body = await request.json().catch(() => ({} as any));
    const role = (user.user_metadata?.role as string) || 'artist';
    const name = (user.user_metadata?.name as string | undefined) || null;
    const phone = (user.user_metadata?.phone as string | undefined) || null;
    const referralToken = String(body?.referralToken || '').trim();

    if (role === 'venue') {
      const { data: venue } = await supabaseAdmin
        .from('venues')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      const updated = await upsertVenue({
        id: user.id,
        email: user.email ?? null,
        name,
        type: user.user_metadata?.type ?? null,
        phoneNumber: phone,
        defaultVenueFeeBps: 1000,
      });

      if (referralToken) {
        const { data: referral } = await supabaseAdmin
          .from('venue_referrals')
          .select('id,status,venue_id')
          .eq('token', referralToken)
          .maybeSingle();

        if (referral && !referral.venue_id) {
          const nowIso = new Date().toISOString();
          await supabaseAdmin
            .from('venues')
            .update({ referral_id: referral.id, updated_at: nowIso })
            .eq('id', user.id);

          const nextStatus = ['sent', 'opened'].includes(referral.status) ? 'venue_signed_up' : referral.status;
          await supabaseAdmin
            .from('venue_referrals')
            .update({ venue_id: user.id, status: nextStatus, updated_at: nowIso })
            .eq('id', referral.id);
        }
      }

      return updated;
    }

    const updated = await upsertArtist({
      id: user.id,
      email: user.email ?? null,
      name,
      role: 'artist',
      phoneNumber: phone,
    });
    return updated;
  }

  // ── Profile: get current user profile — artist or venue (GET /api/profile/me) ──
  if (url.pathname === '/api/profile/me' && method === 'GET') {
    const user = await getUser(request);
    if (!user) return json({ error: 'Missing or invalid Authorization bearer token' }, { status: 401 });
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const role = (user.user_metadata?.role as string) || 'artist';
    if (role === 'venue') {
      const { data, error } = await supabaseAdmin.from('venues').select('*').eq('id', user.id).maybeSingle();
      if (error) return json({ error: error.message }, { status: 500 });
      return json({ role: 'venue', profile: data });
    }
    const { data, error } = await supabaseAdmin.from('artists').select('*').eq('id', user.id).maybeSingle();
    if (error) return json({ error: error.message }, { status: 500 });
    const { profile, hasProOverride } = applyProOverride(data);
    return json({ role: 'artist', profile, proOverride: hasProOverride });
  }

  // ── Alias: GET /api/me ──
  if (url.pathname === '/api/me' && method === 'GET') {
    const user = await getUser(request);
    if (!user) return json({ error: 'Missing or invalid Authorization bearer token' }, { status: 401 });
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const role = (user.user_metadata?.role as string) || 'artist';
    if (role === 'venue') {
      const { data, error } = await supabaseAdmin.from('venues').select('*').eq('id', user.id).maybeSingle();
      if (error) return json({ error: error.message }, { status: 500 });
      return json({ role: 'venue', profile: data });
    }
    const { data, error } = await supabaseAdmin.from('artists').select('*').eq('id', user.id).maybeSingle();
    if (error) return json({ error: error.message }, { status: 500 });
    const { profile, hasProOverride } = applyProOverride(data);
    return json({ role: 'artist', profile, proOverride: hasProOverride });
  }

  // ── Founding Artist eligibility (GET /api/founding-artist/status) ──
  if (url.pathname === '/api/founding-artist/status' && method === 'GET') {
    const user = await getUser(request);
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });

    // Fetch artist row
    const { data: artist } = await supabaseAdmin
      .from('artists')
      .select('founding_offer_eligible,founding_offer_redeemed_at,founding_discount_ends_at,is_founding_artist,had_paid_subscription,subscription_status,subscription_tier')
      .eq('id', user.id)
      .maybeSingle();

    // Fetch global settings
    const { data: settingsRows } = await supabaseAdmin
      .from('app_settings')
      .select('key,value')
      .in('key', [
        'founding_artist_offer_enabled',
        'founding_artist_offer_max_redemptions',
        'founding_artist_offer_cutoff',
      ]);

    const settings: Record<string, any> = {};
    for (const row of settingsRows || []) settings[row.key] = row.value;

    const offerEnabled  = settings.founding_artist_offer_enabled === true || settings.founding_artist_offer_enabled === 'true';
    const maxRedemptions = Number(env.FOUNDING_ARTIST_MAX_REDEMPTIONS || settings.founding_artist_offer_max_redemptions || 50);
    const cutoff = String(env.FOUNDING_ARTIST_CUTOFF || settings.founding_artist_offer_cutoff || '2026-12-31T23:59:59Z').replace(/^"|"$/g, '');

    // Count current redemptions
    const { count: redemptionCount } = await supabaseAdmin
      .from('artists')
      .select('id', { count: 'exact', head: true })
      .eq('is_founding_artist', true);

    const slotsRemaining = Math.max(0, maxRedemptions - (redemptionCount ?? 0));
    const now = new Date();
    const cutoffDate = new Date(cutoff);

    // Already redeemed?
    if (artist?.is_founding_artist || artist?.founding_offer_redeemed_at) {
      return json({
        eligible: false,
        redeemed: true,
        discountEndsAt: artist.founding_discount_ends_at,
        slotsRemaining,
        cutoff,
        reason: null,
      });
    }

    // Determine eligibility
    let eligible = true;
    let reason: string | null = null;

    if (!offerEnabled) { eligible = false; reason = 'offer_disabled'; }
    else if (now > cutoffDate) { eligible = false; reason = 'expired'; }
    else if (slotsRemaining <= 0) { eligible = false; reason = 'slots_full'; }
    else if (artist?.had_paid_subscription) { eligible = false; reason = 'already_paid_before'; }
    else if (artist?.subscription_status === 'active' && artist?.subscription_tier && artist.subscription_tier !== 'free') {
      eligible = false; reason = 'already_paid_before';
    }

    return json({
      eligible,
      redeemed: false,
      discountEndsAt: null,
      slotsRemaining,
      cutoff,
      reason,
    });
  }

  // Not handled by this module
  return null;
}
