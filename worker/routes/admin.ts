import type { WorkerContext } from '../types';
import { isUUID, clampStr } from '../helpers';

export async function handleAdmin(wc: WorkerContext): Promise<Response | null> {
  const {
    url,
    method,
    request,
    json,
    text,
    supabaseAdmin,
    env,
    pagesOrigin,
    allowedOrigins,
    requireAdmin,
    logAdminAction,
    isAdminUser,
    getUser,
    applyRateLimit,
    sendSms,
    upsertArtist,
    upsertVenue,
    stripeFetch,
    toForm,
    resolveTierFromPriceId,
  } = wc;

  if (!supabaseAdmin) {
    // Most admin routes need supabase — early-exit for routes that check it inline
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Wall Productivity Metrics
  // ══════════════════════════════════════════════════════════════════════════

  if (url.pathname === '/api/admin/wall-productivity' && method === 'GET') {
    const guardResp = await requireAdmin(request);
    if (guardResp) return guardResp;

    const days = parseInt(url.searchParams.get('days') || '7', 10);
    const safeDays = Math.min(Math.max(days, 1), 90);

    const { data, error: rpcErr } = await supabaseAdmin!.rpc('wall_productivity_metrics', {
      p_days: safeDays,
    });
    if (rpcErr) return json({ error: rpcErr.message }, { status: 500 });
    return json(data);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Unified Users List
  // ══════════════════════════════════════════════════════════════════════════

  // Returns ALL artists + venues + auth users in a single merged list.
  // No is_public / is_live / suspended filters — admins see everything.
  if (url.pathname === '/api/admin/users' && method === 'GET') {
    const guardResp = await requireAdmin(request);
    if (guardResp) return guardResp;

    try {
      // Fetch ALL artists (no is_public / is_live filter)
      const { data: allArtists, error: artistErr } = await supabaseAdmin!
        .from('artists')
        .select('id,name,email,role,subscription_tier,subscription_status,city_primary,is_live,is_public,created_at')
        .order('created_at', { ascending: false })
        .limit(5000);

      // Fetch ALL venues (no suspended filter)
      const { data: allVenues, error: venueErr } = await supabaseAdmin!
        .from('venues')
        .select('id,name,email,city,suspended,created_at')
        .order('created_at', { ascending: false })
        .limit(5000);

      // Fetch auth users for any accounts that may not have artist/venue rows yet
      let authUsers: any[] = [];
      try {
        const { data: authData, error: authErr } = await supabaseAdmin!.auth.admin.listUsers({ perPage: 1000 });
        if (!authErr && authData?.users) {
          authUsers = authData.users;
        }
      } catch (e) {
        // listUsers may not be available in all Supabase plans; continue without it
        console.warn('[admin/users] auth.admin.listUsers failed:', e instanceof Error ? e.message : e);
      }

      if (artistErr) console.error('[admin/users] artists query error:', artistErr.message);
      if (venueErr) console.error('[admin/users] venues query error:', venueErr.message);

      const artists = allArtists || [];
      const venues = allVenues || [];

      // Build unified list, deduped by ID
      const seen = new Set<string>();
      const combined: any[] = [];

      for (const a of artists) {
        if (seen.has(a.id)) continue;
        seen.add(a.id);
        combined.push({
          id: a.id,
          name: a.name || 'Artist',
          email: a.email || null,
          role: 'artist',
          plan: (a.subscription_tier || 'free'),
          status: a.subscription_status === 'suspended' ? 'Suspended' : 'Active',
          city: a.city_primary || null,
          is_live: a.is_live,
          is_public: a.is_public,
          admin_role: a.role || null,
          created_at: a.created_at || null,
        });
      }

      for (const v of venues) {
        if (seen.has(v.id)) continue;
        seen.add(v.id);
        combined.push({
          id: v.id,
          name: v.name || 'Venue',
          email: v.email || null,
          role: 'venue',
          plan: null,
          status: v.suspended ? 'Suspended' : 'Active',
          city: v.city || null,
          is_live: null,
          is_public: null,
          admin_role: null,
          created_at: v.created_at || null,
        });
      }

      // Add auth users that don't have artist/venue rows yet
      for (const u of authUsers) {
        if (seen.has(u.id)) continue;
        seen.add(u.id);
        const meta = u.user_metadata || {};
        combined.push({
          id: u.id,
          name: meta.name || meta.full_name || 'User',
          email: u.email || null,
          role: meta.role || 'unknown',
          plan: null,
          status: 'Active',
          city: null,
          is_live: null,
          is_public: null,
          admin_role: null,
          created_at: u.created_at || null,
        });
      }

      return json({
        users: combined,
        counts: { artists: artists.length, venues: venues.length, auth: authUsers.length, total: combined.length },
      });
    } catch (e) {
      console.error('[admin/users] unexpected error:', e instanceof Error ? e.message : e);
      return json({ error: 'Failed to fetch users', detail: e instanceof Error ? e.message : String(e) }, { status: 500 });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Sync Users (no-op placeholder for backfill button)
  // ══════════════════════════════════════════════════════════════════════════

  if (url.pathname === '/api/admin/sync-users' && method === 'POST') {
    const guardResp = await requireAdmin(request);
    if (guardResp) return guardResp;

    // Count current records as a diagnostic
    const { count: artistCount } = await supabaseAdmin!
      .from('artists')
      .select('id', { count: 'exact', head: true });
    const { count: venueCount } = await supabaseAdmin!
      .from('venues')
      .select('id', { count: 'exact', head: true });

    return json({ ok: true, artists: artistCount || 0, venues: venueCount || 0 });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Dashboard Metrics
  // ══════════════════════════════════════════════════════════════════════════

  if (url.pathname === '/api/admin/metrics' && method === 'GET') {
    const guardResp = await requireAdmin(request);
    if (guardResp) return guardResp;

    // Helper: safe count that returns 0 if the table doesn't exist
    async function safeCount(table: string, filter?: (q: any) => any): Promise<number> {
      try {
        let q = supabaseAdmin!.from(table).select('id', { count: 'exact', head: true });
        if (filter) q = filter(q);
        const { count } = await q;
        return count || 0;
      } catch { return 0; }
    }

    try {
      // Total counts (artists & venues are core — always exist)
      const artistCount = await safeCount('artists');
      const venueCount = await safeCount('venues');

      // Optional tables — graceful zero if missing
      const activeDisplays = await safeCount('wallspaces', q => q.not('current_artwork_id', 'is', null));

      // Artists/venues created this month
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthStartISO = monthStart.toISOString();

      const newArtistsMonth = await safeCount('artists', q => q.gte('created_at', monthStartISO));
      const newVenuesMonth = await safeCount('venues', q => q.gte('created_at', monthStartISO));

      // Optional tables
      const pendingInvites = await safeCount('venue_invites', q => q.eq('status', 'pending'));
      const supportQueue = await safeCount('support_messages', q => q.in('status', ['new', 'open']));

      // Recent sales activity (last 30 days) — orders may not exist yet
      let recentOrders: any[] = [];
      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data } = await supabaseAdmin!
          .from('orders')
          .select('id,created_at,amount_cents')
          .gte('created_at', thirtyDaysAgo)
          .order('created_at', { ascending: false })
          .limit(10);
        recentOrders = data || [];
      } catch { /* table may not exist */ }

      const gmv = recentOrders.reduce((sum: number, o: any) => sum + (o.amount_cents || 0), 0);
      const platformRevenue = Math.round(gmv * 0.10);

      return json({
        totals: {
          artists: artistCount,
          venues: venueCount,
          activeDisplays,
        },
        month: {
          gmv,
          platformRevenue,
          gvmDelta: 0,
        },
        monthlyArtistsDelta: newArtistsMonth,
        monthlyVenuesDelta: newVenuesMonth,
        pendingInvites,
        supportQueue,
        recentActivity: recentOrders.map((o: any) => ({
          type: 'sale',
          timestamp: o.created_at,
          amount_cents: o.amount_cents || 0,
        })),
      });
    } catch (e) {
      console.error('[admin/metrics] error:', e instanceof Error ? e.message : e);
      return json({ error: 'Failed to load metrics' }, { status: 500 });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // User Metrics Breakdown
  // ══════════════════════════════════════════════════════════════════════════

  if (url.pathname === '/api/admin/user-metrics' && method === 'GET') {
    const guardResp = await requireAdmin(request);
    if (guardResp) return guardResp;

    try {
      const { data: artists } = await supabaseAdmin!
        .from('artists')
        .select('id,subscription_tier,art_types');
      const { count: venueCount } = await supabaseAdmin!
        .from('venues')
        .select('id', { count: 'exact', head: true });

      const allArtists = artists || [];
      const totalArtists = allArtists.length;
      const totalUsers = totalArtists + (venueCount || 0);

      // Breakdown by tier
      const artistsByTier: Record<string, number> = {};
      for (const a of allArtists) {
        const tier = (a.subscription_tier || 'free').toLowerCase();
        artistsByTier[tier] = (artistsByTier[tier] || 0) + 1;
      }

      // Breakdown by art type
      const artistsByType: Record<string, number> = {};
      for (const a of allArtists) {
        const types = Array.isArray(a.art_types) ? a.art_types : [];
        for (const t of types) {
          if (t) artistsByType[String(t)] = (artistsByType[String(t)] || 0) + 1;
        }
      }

      return json({ totalUsers, totalArtists, artistsByTier, artistsByType });
    } catch (e) {
      console.error('[admin/user-metrics] error:', e instanceof Error ? e.message : e);
      return json({ error: 'Failed to load user metrics' }, { status: 500 });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Debug Endpoints (disabled — return 404)
  // ══════════════════════════════════════════════════════════════════════════

  if (url.pathname === '/api/debug/auth' || url.pathname === '/api/debug/supabase') {
    return json({ error: 'Not found' }, { status: 404 });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Admin Verify (used by AdminPasswordPrompt)
  // ══════════════════════════════════════════════════════════════════════════

  if (url.pathname === '/api/admin/verify' && method === 'POST') {
    const guardResp = await requireAdmin(request);
    if (guardResp) return guardResp;

    // Ensure the admin's user_metadata.role is set to 'admin' so the
    // frontend SPA renders the admin layout (App.tsx checks this field).
    const adminUser = (request as any).__adminUser;
    if (adminUser && supabaseAdmin) {
      const currentRole = adminUser.user_metadata?.role;
      if (currentRole !== 'admin') {
        try {
          await supabaseAdmin.auth.admin.updateUserById(adminUser.id, {
            user_metadata: { ...adminUser.user_metadata, role: 'admin' },
          });
        } catch (e) {
          console.warn('[admin/verify] Failed to set admin role metadata:', e instanceof Error ? e.message : e);
        }
      }
    }

    await logAdminAction(adminUser?.id, 'admin_verify', 'auth.users', adminUser?.id, { roleUpdated: true });
    return json({ ok: true, roleUpdated: true });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Integration Status (for admin Stripe checklist)
  // ══════════════════════════════════════════════════════════════════════════

  // Requires admin auth so it doesn't leak config to the public
  if (url.pathname === '/api/debug/env' || url.pathname === '/api/integration/status') {
    const guardResp = await requireAdmin(request);
    if (guardResp) return guardResp;

    return json({
      ok: true,
      env: {
        appUrl: pagesOrigin,
        corsOrigin: Array.from(allowedOrigins),
        stripe: {
          secretKey: !!env.STRIPE_SECRET_KEY,
          webhookSecret: !!env.STRIPE_WEBHOOK_SECRET,
        },
        supabase: {
          url: !!env.SUPABASE_URL,
          serviceRoleKey: !!env.SUPABASE_SERVICE_ROLE_KEY,
        },
        workerName: 'artwalls-space',
        priceIds: {
          starter: !!(env.STRIPE_SUB_PRICE_STARTER || env.STRIPE_PRICE_ID_STARTER),
          growth: !!(env.STRIPE_SUB_PRICE_GROWTH || env.STRIPE_PRICE_ID_GROWTH),
          pro: !!(env.STRIPE_SUB_PRICE_PRO || env.STRIPE_PRICE_ID_PRO),
        },
      },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Sales & GMV
  // ══════════════════════════════════════════════════════════════════════════

  if (url.pathname === '/api/admin/sales' && method === 'GET') {
    const guardResp = await requireAdmin(request);
    if (guardResp) return guardResp;

    try {
      const search = url.searchParams.get('search') || '';
      const statusParam = url.searchParams.get('status') || '';

      let query = supabaseAdmin!
        .from('orders')
        .select('*,artist:artists(id,name,email),venue:venues(id,name,email),artwork:artworks(id,title)')
        .order('created_at', { ascending: false })
        .limit(200);

      if (statusParam) query = query.eq('status', statusParam);
      if (search) query = query.ilike('buyer_email', `%${search}%`);

      const { data: orders, error: ordErr } = await query;
      if (ordErr) return json({ error: ordErr.message }, { status: 500 });

      const rows = orders || [];
      const summary = {
        totalGmv: rows.reduce((s: number, o: any) => s + (o.amount_cents || 0), 0),
        totalPlatformFees: rows.reduce((s: number, o: any) => s + (o.platform_fee_cents || 0), 0),
        totalVenueFees: rows.reduce((s: number, o: any) => s + (o.venue_payout_cents || 0), 0),
        totalArtistPayouts: rows.reduce((s: number, o: any) => s + (o.artist_payout_cents || 0), 0),
        orderCount: rows.length,
      };

      return json({ orders: rows, summary, total: rows.length });
    } catch (e) {
      console.error('[admin/sales]', e instanceof Error ? e.message : e);
      return json({ error: 'Failed to load sales' }, { status: 500 });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Referrals List
  // ══════════════════════════════════════════════════════════════════════════

  if (url.pathname === '/api/admin/referrals' && method === 'GET') {
    const guardResp = await requireAdmin(request);
    if (guardResp) return guardResp;

    try {
      const { data, error: refErr } = await supabaseAdmin!
        .from('venue_referrals')
        .select('*,artist:artists!venue_referrals_artist_user_id_fkey(id,name,email),venue:venues(id,name,email)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (refErr) {
        // Table may not exist — return empty
        return json({ referrals: [] });
      }
      return json({ referrals: data || [] });
    } catch {
      return json({ referrals: [] });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Grant Referral Reward
  // ══════════════════════════════════════════════════════════════════════════

  if (url.pathname === '/api/admin/referrals/grant' && method === 'POST') {
    const guardResp = await requireAdmin(request);
    if (guardResp) return guardResp;

    const payload = await request.json().catch(() => ({}));
    const referralId = payload?.referralId;
    if (!referralId) return json({ error: 'referralId required' }, { status: 400 });

    try {
      const { data: ref } = await supabaseAdmin!
        .from('venue_referrals')
        .select('id,artist_user_id,status')
        .eq('id', referralId)
        .maybeSingle();
      if (!ref) return json({ error: 'Referral not found' }, { status: 404 });
      if (ref.status !== 'qualified') return json({ error: 'Referral is not qualified' }, { status: 400 });

      const adminUser = (request as any).__adminUser;
      const now = new Date().toISOString();

      // Insert reward record
      await supabaseAdmin!.from('referral_rewards').insert({
        referral_id: ref.id,
        artist_user_id: ref.artist_user_id,
        reward_type: 'pro_month',
        granted_by_admin_id: adminUser?.id || null,
      });

      // Grant 30 days of pro
      const proUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await supabaseAdmin!.from('artists').update({ pro_until: proUntil, updated_at: now }).eq('id', ref.artist_user_id);

      // Update referral status
      await supabaseAdmin!.from('venue_referrals').update({ status: 'reward_granted', updated_at: now }).eq('id', ref.id);

      await logAdminAction(adminUser?.id, 'referral_grant', 'venue_referrals', ref.id, { artist_user_id: ref.artist_user_id, pro_until: proUntil });

      return json({ ok: true });
    } catch (e) {
      console.error('[admin/referrals/grant]', e instanceof Error ? e.message : e);
      return json({ error: 'Failed to grant reward' }, { status: 500 });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Venue Invite Analytics
  // ══════════════════════════════════════════════════════════════════════════

  if (url.pathname === '/api/admin/venue-invites/summary' && method === 'GET') {
    const guardResp = await requireAdmin(request);
    if (guardResp) return guardResp;

    const rangeDays = Math.min(parseInt(url.searchParams.get('days') || '30', 10), 90);
    const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();

    try {
      const { data: invites } = await supabaseAdmin!
        .from('venue_invites')
        .select('id,artist_id,status,created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: true });

      const all = invites || [];
      const totals = {
        created: all.length,
        sent: all.filter((i: any) => i.status !== 'DRAFT').length,
        accepted: all.filter((i: any) => i.status === 'ACCEPTED').length,
      };

      // Group by day
      const dayMap = new Map<string, { created: number; sent: number; accepted: number }>();
      for (const inv of all) {
        const day = inv.created_at?.substring(0, 10) || 'unknown';
        if (!dayMap.has(day)) dayMap.set(day, { created: 0, sent: 0, accepted: 0 });
        const d = dayMap.get(day)!;
        d.created++;
        if ((inv as any).status !== 'DRAFT') d.sent++;
        if ((inv as any).status === 'ACCEPTED') d.accepted++;
      }
      const byDay = Array.from(dayMap.entries()).map(([date, counts]) => ({ date, ...counts }));

      // Top artists
      const artistMap = new Map<string, { artistId: string; created: number; accepted: number }>();
      for (const inv of all) {
        const aid = (inv as any).artist_id || 'unknown';
        if (!artistMap.has(aid)) artistMap.set(aid, { artistId: aid, created: 0, accepted: 0 });
        const a = artistMap.get(aid)!;
        a.created++;
        if ((inv as any).status === 'ACCEPTED') a.accepted++;
      }

      // Resolve artist names
      const artistIds = Array.from(artistMap.keys()).filter(id => id !== 'unknown');
      let artistNames: Record<string, string> = {};
      if (artistIds.length > 0) {
        const { data: artists } = await supabaseAdmin!
          .from('artists')
          .select('id,name')
          .in('id', artistIds.slice(0, 50));
        for (const a of (artists || [])) {
          artistNames[a.id] = a.name || 'Artist';
        }
      }

      const topArtists = Array.from(artistMap.values())
        .sort((a, b) => b.created - a.created)
        .slice(0, 10)
        .map(a => ({
          artistId: a.artistId,
          artistName: artistNames[a.artistId] || 'Artist',
          created: a.created,
          accepted: a.accepted,
          conversionRate: a.created > 0 ? Math.round((a.accepted / a.created) * 100) : 0,
        }));

      return json({ rangeDays, totals, byDay, topArtists });
    } catch (e) {
      console.error('[admin/venue-invites/summary]', e instanceof Error ? e.message : e);
      return json({ rangeDays, totals: { created: 0, sent: 0, accepted: 0 }, byDay: [], topArtists: [] });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Announcements CRUD
  // ══════════════════════════════════════════════════════════════════════════

  // POST /api/admin/announcements — create announcement
  if (url.pathname === '/api/admin/announcements' && method === 'POST') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const guardResp = await requireAdmin(request);
    if (guardResp) return guardResp;
    const adminUser = await getUser(request);

    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const title = clampStr(body?.title, 300).trim();
    const announcementBody = clampStr(body?.body, 5000).trim();
    if (!title) return json({ error: 'Title is required' }, { status: 400 });

    const type = (['info', 'success', 'warning', 'critical'].includes(String(body?.type || '')))
      ? String(body.type) : 'info';
    const audience = (['all', 'artists', 'venues'].includes(String(body?.audience || '')))
      ? String(body.audience) : 'all';

    const startDate = typeof body?.startDate === 'string' && !isNaN(new Date(body.startDate).getTime())
      ? new Date(body.startDate).toISOString()
      : new Date().toISOString();
    const endDate = typeof body?.endDate === 'string' && !isNaN(new Date(body.endDate).getTime())
      ? new Date(body.endDate).toISOString()
      : null;

    const { data, error: dbErr } = await supabaseAdmin
      .from('announcements')
      .insert({
        title,
        body: announcementBody,
        type,
        audience,
        status: 'active',
        start_date: startDate,
        end_date: endDate,
        created_by: adminUser?.id || null,
      })
      .select('*')
      .single();
    if (dbErr) return json({ error: dbErr.message }, { status: 500 });

    return json({
      announcement: {
        id: data.id,
        title: data.title,
        body: data.body,
        type: data.type,
        audience: data.audience,
        status: data.status,
        startDate: data.start_date,
        endDate: data.end_date,
        createdBy: data.created_by,
        createdAt: data.created_at,
      },
    }, { status: 201 });
  }

  // GET /api/admin/announcements — admin: list all announcements
  if (url.pathname === '/api/admin/announcements' && method === 'GET') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const guardResp = await requireAdmin(request);
    if (guardResp) return guardResp;

    const { data, error: dbErr } = await supabaseAdmin
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (dbErr) return json({ error: dbErr.message }, { status: 500 });

    return json({
      announcements: (data || []).map((a: any) => ({
        id: a.id,
        title: a.title,
        body: a.body,
        type: a.type,
        audience: a.audience,
        status: a.status,
        startDate: a.start_date,
        endDate: a.end_date,
        createdBy: a.created_by,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
      })),
    });
  }

  // DELETE /api/admin/announcements/:id — admin: archive an announcement
  if (url.pathname.match(/^\/api\/admin\/announcements\/[0-9a-f-]+$/) && method === 'DELETE') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const guardResp = await requireAdmin(request);
    if (guardResp) return guardResp;
    const announcementId = url.pathname.split('/').pop();
    if (!announcementId || !isUUID(announcementId)) return json({ error: 'Invalid id' }, { status: 400 });

    const { error: dbErr } = await supabaseAdmin
      .from('announcements')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', announcementId);
    if (dbErr) return json({ error: dbErr.message }, { status: 500 });
    return json({ ok: true });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Promo Codes
  // ══════════════════════════════════════════════════════════════════════════

  if (url.pathname === '/api/admin/promo-codes' && method === 'GET') {
    const guardResp = await requireAdmin(request);
    if (guardResp) return guardResp;

    // Return empty until a promo_codes table is created
    return json({ promoCodes: [] });
  }

  if (url.pathname.match(/^\/api\/admin\/promo-codes\/[^/]+\/deactivate$/) && method === 'POST') {
    const guardResp = await requireAdmin(request);
    if (guardResp) return guardResp;
    return json({ ok: true });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Activity Log
  // ══════════════════════════════════════════════════════════════════════════

  if (url.pathname === '/api/admin/activity-log' && method === 'GET') {
    const guardResp = await requireAdmin(request);
    if (guardResp) return guardResp;

    // Return empty until an activity_log table is created
    return json({ activity: [] });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Test SMS
  // ══════════════════════════════════════════════════════════════════════════

  if (url.pathname === '/api/admin/test-sms' && method === 'POST') {
    const guardResp = await requireAdmin(request);
    if (guardResp) return guardResp;
    // Placeholder — requires Twilio or similar integration
    return json({ ok: true, message: 'SMS integration not yet configured' });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Current Displays (wallspaces with active art)
  // ══════════════════════════════════════════════════════════════════════════

  if (url.pathname === '/api/admin/current-displays' && method === 'GET') {
    const guardResp = await requireAdmin(request);
    if (guardResp) return guardResp;

    try {
      const { data, error: wsErr } = await supabaseAdmin!
        .from('wallspaces')
        .select('*,venue:venues(id,name,city)')
        .not('current_artwork_id', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(200);
      if (wsErr) return json({ displays: [] });
      return json({ displays: data || [] });
    } catch {
      return json({ displays: [] });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Suspend / Activate User
  // ══════════════════════════════════════════════════════════════════════════

  if (url.pathname.match(/^\/api\/admin\/users\/[^/]+\/(suspend|activate)$/) && method === 'POST') {
    const guardResp = await requireAdmin(request);
    if (guardResp) return guardResp;

    const pathParts = url.pathname.split('/');
    const userId = pathParts[pathParts.length - 2];
    const action = pathParts[pathParts.length - 1]; // 'suspend' or 'activate'
    if (!isUUID(userId)) return json({ error: 'Invalid user ID' }, { status: 400 });

    const isSuspend = action === 'suspend';
    const now = new Date().toISOString();

    // Try updating both tables — one will match
    await supabaseAdmin!.from('artists').update({
      subscription_status: isSuspend ? 'suspended' : 'active',
      updated_at: now,
    }).eq('id', userId);

    await supabaseAdmin!.from('venues').update({
      suspended: isSuspend,
      updated_at: now,
    }).eq('id', userId);

    return json({ ok: true, action, userId });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Support Tickets
  // ══════════════════════════════════════════════════════════════════════════

  // GET /api/admin/support-tickets — list tickets (grouped from support_messages by email+page_source)
  if (url.pathname === '/api/admin/support-tickets' && method === 'GET') {
    const guardResp = await requireAdmin(request);
    if (guardResp) return guardResp;

    const statusFilter = url.searchParams.get('status') || '';

    // Fetch all messages and group client-side into "tickets"
    let query = supabaseAdmin!
      .from('support_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (statusFilter && ['new', 'open', 'closed'].includes(statusFilter)) {
      query = query.eq('status', statusFilter);
    }

    const { data: messages, error: fetchErr } = await query;
    if (fetchErr) return json({ error: fetchErr.message }, { status: 500 });

    // Group by email + page_source to compute tickets
    const ticketMap = new Map<string, any>();
    for (const msg of (messages || [])) {
      const key = `${msg.email}::${msg.page_source}`;
      if (!ticketMap.has(key)) {
        // Stable ticket ID derived from first message in group
        ticketMap.set(key, {
          id: key,
          email: msg.email,
          pageSource: msg.page_source,
          roleContext: msg.role_context,
          subject: `${msg.role_context} inquiry from ${msg.page_source}`,
          description: msg.message.substring(0, 200),
          status: msg.status,
          severity: 'medium',
          userId: msg.email,
          messageCount: 0,
          latestMessageId: msg.id,
          createdAt: msg.created_at,
          updatedAt: msg.updated_at,
        });
      }
      const ticket = ticketMap.get(key)!;
      ticket.messageCount++;
      // Escalate severity if any message is new
      if (msg.status === 'new') ticket.severity = 'high';
      // Ticket status = worst status
      if (msg.status === 'new' && ticket.status !== 'new') ticket.status = 'new';
    }

    return json(Array.from(ticketMap.values()));
  }

  // GET /api/admin/support-tickets/:id/messages — messages for a ticket group
  if (url.pathname.match(/^\/api\/admin\/support-tickets\/(.+)\/messages$/) && method === 'GET') {
    const guardResp = await requireAdmin(request);
    if (guardResp) return guardResp;

    const ticketId = decodeURIComponent(url.pathname.split('/support-tickets/')[1].split('/messages')[0]);
    const [email, pageSource] = ticketId.split('::');

    let query = supabaseAdmin!
      .from('support_messages')
      .select('*')
      .eq('email', email || '')
      .eq('page_source', pageSource || '')
      .order('created_at', { ascending: true });

    const { data: messages, error: fetchErr } = await query;
    if (fetchErr) return json({ error: fetchErr.message }, { status: 500 });

    return json({ messages: messages || [] });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Support Inbox
  // ══════════════════════════════════════════════════════════════════════════

  // GET /api/admin/support/messages — list messages with filters (for SupportInbox)
  if (url.pathname === '/api/admin/support/messages' && method === 'GET') {
    const guardResp = await requireAdmin(request);
    if (guardResp) return guardResp;

    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    const statusFilter = url.searchParams.get('status') || '';
    const searchEmail = url.searchParams.get('searchEmail') || '';
    const searchMessage = url.searchParams.get('searchMessage') || '';

    let query = supabaseAdmin!
      .from('support_messages')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (statusFilter && ['new', 'open', 'closed'].includes(statusFilter)) {
      query = query.eq('status', statusFilter);
    }
    if (searchEmail) {
      query = query.ilike('email', `%${searchEmail}%`);
    }
    if (searchMessage) {
      query = query.ilike('message', `%${searchMessage}%`);
    }

    const { data: messages, count, error: fetchErr } = await query;
    if (fetchErr) return json({ error: fetchErr.message }, { status: 500 });

    // Map to camelCase for frontend compatibility
    const mapped = (messages || []).map((m: any) => ({
      id: m.id,
      email: m.email,
      message: m.message,
      roleContext: m.role_context,
      pageSource: m.page_source,
      status: m.status,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
    }));

    return json({ messages: mapped, total: count || 0 });
  }

  // GET /api/admin/support/messages/:id — single message detail
  if (url.pathname.match(/^\/api\/admin\/support\/messages\/[^/]+$/) && method === 'GET') {
    const guardResp = await requireAdmin(request);
    if (guardResp) return guardResp;

    const msgId = url.pathname.split('/messages/')[1];
    if (!isUUID(msgId)) return json({ error: 'Invalid message ID' }, { status: 400 });

    const { data: msg, error: fetchErr } = await supabaseAdmin!
      .from('support_messages')
      .select('*')
      .eq('id', msgId)
      .maybeSingle();

    if (fetchErr) return json({ error: fetchErr.message }, { status: 500 });
    if (!msg) return json({ error: 'Not found' }, { status: 404 });

    return json({
      id: msg.id,
      email: msg.email,
      message: msg.message,
      roleContext: msg.role_context,
      pageSource: msg.page_source,
      status: msg.status,
      createdAt: msg.created_at,
      updatedAt: msg.updated_at,
    });
  }

  // PATCH /api/admin/support/messages/:id/status — update message status
  if (url.pathname.match(/^\/api\/admin\/support\/messages\/[^/]+\/status$/) && method === 'PATCH') {
    const guardResp = await requireAdmin(request);
    if (guardResp) return guardResp;

    const parts = url.pathname.split('/messages/')[1].split('/status');
    const msgId = parts[0];
    if (!isUUID(msgId)) return json({ error: 'Invalid message ID' }, { status: 400 });

    const payload = await request.json().catch(() => ({}));
    const newStatus = String(payload?.status || '').trim();
    if (!['new', 'open', 'closed'].includes(newStatus)) {
      return json({ error: 'Status must be new, open, or closed' }, { status: 400 });
    }

    const { error: updateErr } = await supabaseAdmin!
      .from('support_messages')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', msgId);

    if (updateErr) return json({ error: updateErr.message }, { status: 500 });

    const adminUser = (request as any).__adminUser;
    await logAdminAction(adminUser?.id, 'support_message_status', 'support_messages', msgId, { newStatus });

    // Return the updated message so the frontend can reflect it
    const { data: updated } = await supabaseAdmin!
      .from('support_messages')
      .select('*')
      .eq('id', msgId)
      .maybeSingle();

    if (updated) {
      return json({
        id: updated.id,
        email: updated.email,
        message: updated.message,
        roleContext: updated.role_context,
        pageSource: updated.page_source,
        status: updated.status,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
      });
    }
    return json({ ok: true, status: newStatus });
  }

  // ── No admin route matched ──
  return null;
}
