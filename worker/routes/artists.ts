import type { WorkerContext } from '../types';
import { isUUID, clampStr, isValidUrl, getErrorMessage } from '../helpers';
import { normalizeArtistTier } from '../../src/lib/pricingCalculations';
import { TIER_LIMITS } from '../../src/lib/entitlements';

export async function handleArtists(wc: WorkerContext): Promise<Response | null> {
  const {
    url,
    method,
    request,
    json,
    supabaseAdmin,
    getUser,
    requireAuthOrFail,
    isAdminUser,
    applyRateLimit,
    upsertArtist,
  } = wc;

  // ── Momentum banner dismiss ──
  if (url.pathname === '/api/artists/dismiss-momentum-banner' && method === 'POST') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const user = await getUser(request);
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
    const rlBanner = await applyRateLimit('misc-write', request);
    if (rlBanner) return rlBanner;

    const { error: updErr } = await supabaseAdmin
      .from('artists')
      .update({
        dismissed_momentum_banner: true,
        dismissed_momentum_banner_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updErr) return json({ error: updErr.message }, { status: 500 });
    return json({ ok: true });
  }

  // ── Artist dashboard stats ──
  if (url.pathname === '/api/stats/artist' && method === 'GET') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const user = await getUser(request);
    const authErr = requireAuthOrFail(request, user);
    if (authErr) return authErr;
    const artistId = url.searchParams.get('artistId');
    if (!artistId) return json({ error: 'Missing artistId' }, { status: 400 });
    // Enforce ownership: artists can only view their own stats (admins exempt)
    if (user!.id !== artistId && !(await isAdminUser(user))) {
      return json({ error: 'Forbidden' }, { status: 403 });
    }

    const [{ count: totalArtworks }, { count: activeArtworks }, { count: soldArtworks }, { count: availableArtworks }, { data: artist }, { count: pendingApplicationsCount }] = await Promise.all([
      supabaseAdmin.from('artworks').select('id', { count: 'exact', head: true }).eq('artist_id', artistId),
      supabaseAdmin.from('artworks').select('id', { count: 'exact', head: true }).eq('artist_id', artistId).eq('status', 'active'),
      supabaseAdmin.from('artworks').select('id', { count: 'exact', head: true }).eq('artist_id', artistId).eq('status', 'sold'),
      supabaseAdmin.from('artworks').select('id', { count: 'exact', head: true }).eq('artist_id', artistId).eq('status', 'available'),
      supabaseAdmin.from('artists').select('subscription_tier,subscription_status,pro_until,momentum_banner_eligible,momentum_banner_reason,momentum_banner_eligible_at,dismissed_momentum_banner').eq('id', artistId).maybeSingle(),
      supabaseAdmin.from('invitations').select('id', { count: 'exact', head: true }).eq('artist_id', artistId).eq('status', 'pending'),
    ]).then((results: any) => results.map((r: any) => r.count !== undefined ? { count: r.count || 0 } : { data: r }));

    // Count active displays (artworks with venue_id assigned and not sold)
    const { data: displayedArtworks, error: displayErr } = await supabaseAdmin
      .from('artworks')
      .select('id', { count: 'exact', head: true })
      .eq('artist_id', artistId)
      .not('venue_id', 'is', null)
      .neq('status', 'sold');
    const activeDisplays = !displayErr ? (displayedArtworks?.length || 0) : 0;

    // Plan limits based on subscription tier
    const proUntil = artist?.pro_until ? new Date(artist.pro_until).getTime() : 0;
    const hasProOverride = !!proUntil && proUntil > Date.now();
    const subscriptionTier = normalizeArtistTier(hasProOverride ? 'pro' : (artist?.subscription_tier || 'free')) as keyof typeof TIER_LIMITS;
    const subscriptionStatus = String(hasProOverride ? 'active' : (artist?.subscription_status || '')).toLowerCase();
    const isActive = subscriptionStatus === 'active';
    const limits = isActive ? (TIER_LIMITS[subscriptionTier] || TIER_LIMITS.free) : TIER_LIMITS.free;
    const activeDisplayLimit = limits.activeDisplays === 'unlimited' ? Number.POSITIVE_INFINITY : limits.activeDisplays;

    const now = new Date();
    const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { count: totalSales } = await supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('artist_id', artistId);

    const { count: recentSales } = await supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('artist_id', artistId)
      .gte('created_at', past30);

    const { data: payouts, error: payoutsErr } = await supabaseAdmin
      .from('orders')
      .select('artist_payout_cents')
      .eq('artist_id', artistId)
      .order('created_at', { ascending: false })
      .limit(1000);
    if (payoutsErr) return json({ error: payoutsErr.message }, { status: 500 });
    const totalArtistPayoutCents = (payouts || []).reduce((sum: number, row: any) => sum + (row.artist_payout_cents || 0), 0);

    // ── Momentum banner: lazy eligibility check ──
    // If artist has active artworks but hasn't been flagged yet, flag them now.
    let momentumEligible = !!artist?.momentum_banner_eligible;
    let momentumReason = artist?.momentum_banner_reason || null;
    const momentumDismissed = !!artist?.dismissed_momentum_banner;

    if (!momentumEligible && (activeArtworks || 0) > 0) {
      try {
        const { data: rpcResult } = await supabaseAdmin.rpc('set_momentum_banner_eligible', {
          p_artist_id: artistId,
          p_reason: 'first_live_listing',
        });
        if (rpcResult) {
          momentumEligible = true;
          momentumReason = 'first_live_listing';
        }
      } catch {
        // Non-critical — will retry next dashboard load
      }
    }

    return json({
      artistId,
      subscription: {
        tier: subscriptionTier,
        status: subscriptionStatus,
        isActive,
        limits,
      },
      artworks: {
        total: totalArtworks || 0,
        active: activeArtworks || 0,
        available: availableArtworks || 0,
        sold: soldArtworks || 0,
      },
      displays: {
        active: activeDisplays,
        limit: activeDisplayLimit === Number.POSITIVE_INFINITY ? -1 : activeDisplayLimit,
        isOverage: activeDisplays > (activeDisplayLimit as number),
      },
      applications: {
        pending: pendingApplicationsCount || 0,
      },
      sales: {
        total: totalSales || 0,
        recent30Days: recentSales || 0,
        totalEarnings: Math.round(totalArtistPayoutCents / 100),
      },
      momentum: {
        eligible: momentumEligible,
        reason: momentumReason,
        dismissed: momentumDismissed,
        showBanner: momentumEligible && !momentumDismissed && subscriptionTier === 'free',
      },
    });
  }

  // ── Public artist listing (used by venue Find Artists) ──
  if (url.pathname === '/api/artists' && method === 'GET') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const q = (url.searchParams.get('q') || '').trim();
    const rawCity = (url.searchParams.get('city') || '').trim();

    // Normalize city: venues store "San Diego, CA" but artists may store
    // just "San Diego" in city_primary. Extract the city name (before comma)
    // so the ilike filter can match both "San Diego" and "San Diego, CA".
    const cityName = rawCity.includes(',') ? rawCity.split(',')[0].trim() : rawCity;
    
    // Select only safe public fields — no email, no Stripe IDs, no payout info
    let query = supabaseAdmin
      .from('artists')
      .select('id,slug,name,city_primary,city_secondary,profile_photo_url,is_live,is_public,bio,art_types,is_founding_artist')
      .order('name', { ascending: true })
      .limit(50);

    // Visibility: treat null is_public as visible (upsertArtist never sets
    // is_public, so most rows are null). Exclude only explicit opt-outs.
    query = query.neq('is_public', false);

    // Liveness: treat null is_live as live (same reasoning — upsertArtist
    // defaults is_live to true but some older rows may be null).
    query = query.neq('is_live', false);

    // City filter — match the extracted city name against primary or
    // secondary city. Using just the city name (without state) ensures
    // "San Diego" matches both "San Diego" and "San Diego, CA".
    if (cityName) {
      query = query.or(`city_primary.ilike.%${cityName}%,city_secondary.ilike.%${cityName}%`);
    }
    
    // Search by name only (never expose email in search)
    if (q) {
      query = query.ilike('name', `%${q}%`);
    }
    
    const { data, error } = await query;
    if (error) {
      console.error('[GET /api/artists] Query error:', error.message);
      return json({ error: error.message }, { status: 500 });
    }

    // Fetch artwork counts for all returned artist IDs
    const artistIds = (data || []).map(a => a.id);
    let artworkCounts: Record<string, number> = {};
    if (artistIds.length > 0) {
      const { data: countData } = await supabaseAdmin
        .from('artworks')
        .select('artist_id')
        .in('artist_id', artistIds)
        .eq('is_public', true);
      if (countData) {
        for (const row of countData) {
          artworkCounts[row.artist_id] = (artworkCounts[row.artist_id] || 0) + 1;
        }
      }
    }

    // Return only safe public fields — no email or sensitive data
    const artists = (data || []).map(a => ({ 
      id: a.id, 
      slug: (a as any).slug || null,
      name: a.name, 
      profilePhotoUrl: a.profile_photo_url || null,
      location: a.city_primary || a.city_secondary || 'Local',
      is_live: a.is_live,
      bio: (a as any).bio || '',
      artTypes: Array.isArray((a as any).art_types) ? (a as any).art_types : [],
      portfolioCount: artworkCounts[a.id] || 0,
      isFoundingArtist: !!(a as any).is_founding_artist,
    }));

    // Include metadata so the frontend can diagnose empty results
    return json({
      artists,
      _meta: {
        cityFilter: cityName || null,
        nameFilter: q || null,
        totalReturned: artists.length,
      },
    });
  }

  // ── Artist analytics aggregation ──
  if (url.pathname === '/api/analytics/artist' && method === 'GET') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const user = await getUser(request);
    const authErrAnalytics = requireAuthOrFail(request, user);
    if (authErrAnalytics) return authErrAnalytics;
    const artistId = url.searchParams.get('artistId') || user!.id;
    if (!artistId) return json({ error: 'Missing artistId' }, { status: 400 });
    // SECURITY: Enforce ownership — artists can only view their own analytics
    if (user!.id !== artistId && !(await isAdminUser(user))) {
      return json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Get all artworks by this artist
    const { data: artworks } = await supabaseAdmin
      .from('artworks')
      .select('id')
      .eq('artist_id', artistId);
    const artworkIds = (artworks || []).map((a: any) => a.id);

    if (artworkIds.length === 0) {
      return json({ cards: { scansWeek: 0, scansMonth: 0, conversion: 0 }, perArtwork: {} });
    }

    const { data: events } = await supabaseAdmin
      .from('events')
      .select('event_type,artwork_id,created_at')
      .in('artwork_id', artworkIds)
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

  // ── Upsert artist profile (POST) ──
  if (url.pathname === '/api/artists' && method === 'POST') {
    try {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const rlArtist = await applyRateLimit('profile-upsert', request);
      if (rlArtist) return rlArtist;

      // SECURITY: Require authentication — no anonymous profile upserts
      const user = await getUser(request);
      const authErr = requireAuthOrFail(request, user);
      if (authErr) return authErr;
      
      let payload: any = {};
      try {
        payload = await request.json();
      } catch (parseErr) {
        console.error('[POST /api/artists] JSON parse error:', parseErr);
        return json({ error: 'Invalid JSON body' }, { status: 400 });
      }
      
      // SECURITY: Only allow users to upsert their own profile.
      // Admin can upsert any profile; normal users are locked to their own ID.
      let id = String(payload?.artistId || '').trim() || user!.id;
      if (!isUUID(id)) return json({ error: 'Invalid artistId format' }, { status: 400 });
      if (id !== user!.id && !(await isAdminUser(user))) {
        return json({ error: 'Forbidden: cannot modify another user\'s profile' }, { status: 403 });
      }
      const photoUrl = clampStr(payload?.profilePhotoUrl || payload?.avatar, 2048) || null;
      if (photoUrl && !isValidUrl(photoUrl)) return json({ error: 'Invalid profile photo URL' }, { status: 400 });
      const resp = await upsertArtist({
        id,
        email: clampStr(payload?.email, 254) || null,
        name: clampStr(payload?.name, 200) || null,
        role: 'artist',
        phoneNumber: clampStr(payload?.phoneNumber, 30) || null,
        cityPrimary: clampStr(payload?.cityPrimary, 100) || null,
        citySecondary: clampStr(payload?.citySecondary, 100) || null,
        // Only pass subscriptionTier if the caller explicitly provided it
        // (e.g. admin override). Profile-update payloads omit this field, so
        // it stays undefined → upsertArtist won't touch the existing tier.
        subscriptionTier: payload?.subscriptionTier ? clampStr(payload.subscriptionTier, 20) : undefined,
        profilePhotoUrl: photoUrl,
      });
      return resp;
    } catch (err: unknown) {
      console.error('[POST /api/artists] Unhandled error:', getErrorMessage(err), err instanceof Error ? err.stack : undefined);
      return json({ error: getErrorMessage(err) }, { status: 500 });
    }
  }

  return null;
}
