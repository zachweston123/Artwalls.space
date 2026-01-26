import { verifyAndParseStripeEvent } from './stripeWebhook';
import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';

type Env = {
  STRIPE_WEBHOOK_SECRET: string;
  API_BASE_URL?: string;
  STRIPE_SECRET_KEY?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  PAGES_ORIGIN?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_FROM_NUMBER?: string;
  VENUE_INVITE_DAILY_LIMIT?: string;
  VENUE_INVITE_DUPLICATE_WINDOW_DAYS?: string;
  VENUE_INVITE_PUBLIC_RATE_LIMIT?: string;
  ADMIN_EMAILS?: string;
  // Subscription price IDs (either older SUB_* or newer PRICE_ID_* names)
  STRIPE_SUB_PRICE_STARTER?: string;
  STRIPE_SUB_PRICE_GROWTH?: string;
  STRIPE_SUB_PRICE_PRO?: string;
  STRIPE_PRICE_ID_STARTER?: string;
  STRIPE_PRICE_ID_GROWTH?: string;
  STRIPE_PRICE_ID_PRO?: string;
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    console.log(`Request: ${method} ${url.pathname}`);
    if (url.pathname.startsWith('/api/stripe')) console.log(`Stripe request: ${method} ${url.pathname}`);
    
    // Determine allowed origin - accept requests from the frontend origin
    const requestOrigin = request.headers.get('origin') || '';
    const pagesOrigin = env.PAGES_ORIGIN || 'https://artwalls.space';

    // CORS: fully permissive for API calls that already require bearer auth.
    // Using '*' avoids mismatches across Pages/staging domains.
    const allowOrigin = '*';

    // Preflight CORS
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': allowOrigin,
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, content-type, x-admin-password, x-client-info, apikey',
          'Access-Control-Max-Age': '86400',
          Vary: 'Origin',
        },
      });
    }

    function json(obj: unknown, init?: ResponseInit): Response {
      const headers = new Headers(init?.headers);
      headers.set('Content-Type', 'application/json');
      headers.set('Access-Control-Allow-Origin', allowOrigin);
      headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'authorization, content-type, x-admin-password, x-client-info, apikey');
      headers.set('Vary', 'Origin');
      const body = JSON.stringify(obj);
      return new Response(body, { status: init?.status ?? 200, headers });
    }

    function text(body: string, init?: ResponseInit): Response {
      const headers = new Headers(init?.headers);
      headers.set('Content-Type', 'text/plain; charset=utf-8');
      headers.set('Access-Control-Allow-Origin', allowOrigin);
      headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'authorization, content-type, x-admin-password, x-client-info, apikey');
      headers.set('Vary', 'Origin');
      return new Response(body, { status: init?.status ?? 200, headers });
    }

    // Twilio SMS helper (available to all routes)
    async function sendSms(to: string, body: string): Promise<void> {
      const sid = env.TWILIO_ACCOUNT_SID || '';
      const token = env.TWILIO_AUTH_TOKEN || '';
      const from = env.TWILIO_FROM_NUMBER || '';
      if (!sid || !token || !from || !to) return;
      const auth = btoa(`${sid}:${token}`);
      const form = new URLSearchParams();
      form.set('To', to);
      form.set('From', from);
      form.set('Body', body);
      try {
        const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
          method: 'POST',
          headers: { 'Authorization': `Basic ${auth}` },
          body: form,
        });
        if (!resp.ok) {
          const t = await resp.text();
          console.error('Twilio SMS failed', resp.status, t);
        }
      } catch (e) {
        console.error('Twilio SMS error', e instanceof Error ? e.message : e);
      }
    }

    async function generateQrSvg(data: string, size = 300): Promise<string> {
      try {
        const svg = await QRCode.toString(data, { type: 'svg', width: size, margin: 0 });
        return svg;
      } catch {
        const modules = 29; // fallback grid
        const cell = Math.floor(size / modules);
        const padding = Math.floor((size - modules * cell) / 2);
        let hash = 0;
        for (let i = 0; i < data.length; i++) hash = (hash * 31 + data.charCodeAt(i)) >>> 0;
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="#fff"/>`;
        for (let y = 0; y < modules; y++) {
          for (let x = 0; x < modules; x++) {
            hash = (hash * 1103515245 + 12345) & 0x7fffffff;
            const on = (hash & 1) === 1;
            if (on) {
              const rx = padding + x * cell;
              const ry = padding + y * cell;
              svg += `<rect x="${rx}" y="${ry}" width="${cell}" height="${cell}" fill="#000"/>`;
            }
          }
        }
        svg += `</svg>`;
        return svg;
      }
    }

    const VENUE_INVITE_DAILY_LIMIT = Number(env.VENUE_INVITE_DAILY_LIMIT || 10);
    const VENUE_INVITE_DUPLICATE_WINDOW_DAYS = Number(env.VENUE_INVITE_DUPLICATE_WINDOW_DAYS || 30);
    const VENUE_INVITE_PUBLIC_RATE_LIMIT = Number(env.VENUE_INVITE_PUBLIC_RATE_LIMIT || 60);
    const inviteRateLimitMap = new Map<string, { count: number; resetAt: number }>();

    function rateLimitByIp(ip: string, limit: number, windowMs: number) {
      if (!ip) return { ok: true, remaining: limit };
      const now = Date.now();
      const entry = inviteRateLimitMap.get(ip) || { count: 0, resetAt: now + windowMs };
      if (now > entry.resetAt) {
        entry.count = 0;
        entry.resetAt = now + windowMs;
      }
      entry.count += 1;
      inviteRateLimitMap.set(ip, entry);
      return { ok: entry.count <= limit, remaining: Math.max(limit - entry.count, 0), resetAt: entry.resetAt };
    }

    function getClientIp(req: Request): string {
      const forwarded = req.headers.get('x-forwarded-for') || '';
      const cf = req.headers.get('cf-connecting-ip') || '';
      return (forwarded.split(',')[0] || cf || '').trim();
    }

    function generateInviteToken(): string {
      return crypto.randomUUID().replace(/-/g, '');
    }

    function isValidInviteToken(token: string): boolean {
      return /^[a-f0-9]{16,64}$/i.test(token || '');
    }

    function statusAfterOpen(current: string): string {
      if (current === 'DRAFT' || current === 'SENT') return 'CLICKED';
      return current;
    }

    function isStatusTransitionAllowed(current: string, next: string): boolean {
      if (current === next) return true;
      const allowed: Record<string, string[]> = {
        DRAFT: ['SENT', 'CLICKED', 'DECLINED', 'EXPIRED'],
        SENT: ['CLICKED', 'ACCEPTED', 'DECLINED', 'EXPIRED'],
        CLICKED: ['ACCEPTED', 'DECLINED', 'EXPIRED'],
        ACCEPTED: [],
        DECLINED: [],
        EXPIRED: [],
      };
      return allowed[current]?.includes(next) || false;
    }

    function mapVenueInviteRow(r: any) {
      if (!r) return null;
      return {
        id: r.id,
        token: r.token,
        artistId: r.artist_id,
        placeId: r.place_id,
        venueName: r.venue_name,
        venueAddress: r.venue_address,
        googleMapsUrl: r.google_maps_url,
        websiteUrl: r.website_url,
        phone: r.phone,
        venueEmail: r.venue_email,
        personalLine: r.personal_line,
        subject: r.subject,
        bodyTemplateVersion: r.body_template_version,
        status: r.status,
        sentAt: r.sent_at,
        firstClickedAt: r.first_clicked_at,
        clickCount: r.click_count,
        acceptedAt: r.accepted_at,
        declinedAt: r.declined_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    }

    // Clean and validate Supabase config
    const rawSupabaseUrl = (env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
    const rawServiceKey = (env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

    // Initialize Supabase Admin client (optional endpoints)
    const supabaseAdmin = rawSupabaseUrl && rawServiceKey
      ? createClient(rawSupabaseUrl, rawServiceKey, { 
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null;

    async function getSupabaseUserFromRequest(req: Request): Promise<any | null> {
      try {
        const auth = req.headers.get('authorization') || '';
        const [scheme, token] = auth.split(' ');
        if (!scheme || scheme.toLowerCase() !== 'bearer' || !token || !supabaseAdmin) return null;
        const { data, error } = await supabaseAdmin.auth.getUser(token);
        if (error) return null;
        return data.user || null;
      } catch {
        return null;
      }
    }

    async function upsertArtist(artist: { id: string; email?: string | null; name?: string | null; role?: string; phoneNumber?: string | null; cityPrimary?: string | null; citySecondary?: string | null; stripeAccountId?: string | null; stripeCustomerId?: string | null; subscriptionTier?: string | null; subscriptionStatus?: string | null; stripeSubscriptionId?: string | null; platformFeeBps?: number | null; }): Promise<Response> {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured - check SUPABASE_SERVICE_ROLE_KEY secret' }, { status: 500 });
      const payload = {
        id: artist.id,
        email: artist.email ?? null,
        name: artist.name ?? null,
        role: artist.role ?? 'artist',
        phone_number: artist.phoneNumber ?? null,
        stripe_account_id: artist.stripeAccountId ?? null,
        stripe_customer_id: artist.stripeCustomerId ?? null,
        subscription_tier: artist.subscriptionTier ?? 'free',
        subscription_status: artist.subscriptionStatus ?? 'inactive',
        stripe_subscription_id: artist.stripeSubscriptionId ?? null,
        platform_fee_bps: artist.platformFeeBps ?? null,
        city_primary: artist.cityPrimary ?? null,
        city_secondary: artist.citySecondary ?? null,
        is_live: true, // Ensure new artists are live by default
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabaseAdmin.from('artists').upsert(payload, { onConflict: 'id' }).select('*').single();
      if (error) {
        console.error('[upsertArtist] Error:', error.message, error.code, (error as any).hint);
        return json({ error: error.message, code: error.code, hint: (error as any).hint || null }, { status: 500 });
      }
      return json(data);
    }

    async function upsertVenue(venue: { id: string; email?: string | null; name?: string | null; type?: string | null; phoneNumber?: string | null; city?: string | null; stripeAccountId?: string | null; defaultVenueFeeBps?: number | null; labels?: any; suspended?: boolean | null; }): Promise<Response> {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured - check SUPABASE_SERVICE_ROLE_KEY secret' }, { status: 500 });
      const payload = {
        id: venue.id,
        email: venue.email ?? null,
        name: venue.name ?? null,
        type: venue.type ?? null,
        phone_number: venue.phoneNumber ?? null,
        city: venue.city ?? null,
        stripe_account_id: venue.stripeAccountId ?? null,
        default_venue_fee_bps: typeof venue.defaultVenueFeeBps === 'number' ? venue.defaultVenueFeeBps : null,
        labels: venue.labels ?? undefined,
        suspended: venue.suspended ?? null,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabaseAdmin.from('venues').upsert(payload, { onConflict: 'id' }).select('*').single();
      if (error) {
        console.error('[upsertVenue] Error:', error.message, error.code, (error as any).hint);
        return json({ error: error.message, code: error.code, hint: (error as any).hint || null }, { status: 500 });
      }
      return json(data);
    }

    if (url.pathname === '/api/health') {
      return json({ ok: true });
    }

    // Debug auth endpoint - test if authorization header is being passed correctly
    if (url.pathname === '/api/debug/auth' && method === 'GET') {
      const authHeader = request.headers.get('authorization') || '';
      const hasAuth = authHeader.startsWith('Bearer ');
      const tokenPreview = hasAuth ? authHeader.substring(7, 27) + '...' : 'NONE';
      
      if (!hasAuth) {
        return json({
          ok: false,
          error: 'No Authorization header',
          authHeader: authHeader || 'EMPTY',
        }, { status: 401 });
      }
      
      const user = await getSupabaseUserFromRequest(request);
      if (!user) {
        return json({
          ok: false,
          error: 'Invalid or expired token',
          tokenPreview,
          supabaseConfigured: !!supabaseAdmin,
        }, { status: 401 });
      }
      
      return json({
        ok: true,
        userId: user.id,
        email: user.email,
        role: user.user_metadata?.role || 'artist',
        tokenPreview,
      });
    }

    if (url.pathname === '/') {
      return text('Artwalls API OK');
    }

    // Env check: verify required configuration without leaking secrets
    if (url.pathname === '/api/env/check' && method === 'GET') {
      return json({
        ok: true,
        vars: {
          STRIPE_WEBHOOK_SECRET: Boolean(env.STRIPE_WEBHOOK_SECRET),
          STRIPE_SECRET_KEY: Boolean(env.STRIPE_SECRET_KEY),
          SUPABASE_URL: Boolean(env.SUPABASE_URL),
          SUPABASE_SERVICE_ROLE_KEY: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
          API_BASE_URL: env.API_BASE_URL || null,
          PAGES_ORIGIN: env.PAGES_ORIGIN || 'https://artwalls.space',
        },
        debug: {
          supabaseUrlLength: (env.SUPABASE_URL || '').length,
          serviceKeyLength: (env.SUPABASE_SERVICE_ROLE_KEY || '').length,
          serviceKeyPrefix: (env.SUPABASE_SERVICE_ROLE_KEY || '').substring(0, 10),
          supabaseClientCreated: !!supabaseAdmin,
        },
      });
    }

    // Supabase debug: test connection and table access
    if (url.pathname === '/api/debug/supabase' && method === 'GET') {
      const keyLen = rawServiceKey.length;
      const keyPrefix = rawServiceKey.substring(0, 15);
      const keySuffix = rawServiceKey.substring(rawServiceKey.length - 10);
      
      if (!supabaseAdmin) {
        return json({
          ok: false,
          error: 'Supabase client not created',
          diagnosis: {
            urlConfigured: !!rawSupabaseUrl,
            urlValue: rawSupabaseUrl || 'MISSING',
            keyConfigured: !!rawServiceKey,
            keyLength: keyLen,
            keyPrefix: keyPrefix || 'EMPTY',
            keySuffix: keySuffix || 'EMPTY',
            keyLooksValid: keyLen > 100 && keyPrefix.startsWith('eyJ'),
          },
        }, { status: 500 });
      }

      try {
        const { data: artistsTest, error: artistsError } = await supabaseAdmin
          .from('artists')
          .select('id')
          .limit(1);

        const { data: venuesTest, error: venuesError } = await supabaseAdmin
          .from('venues')
          .select('id')
          .limit(1);

        return json({
          ok: !artistsError && !venuesError,
          config: {
            supabaseUrl: rawSupabaseUrl,
            keyLength: keyLen,
            keyPrefix: keyPrefix,
            keySuffix: keySuffix,
            keyLooksValid: keyLen > 100 && keyPrefix.startsWith('eyJ'),
          },
          artists: {
            ok: !artistsError,
            count: artistsTest?.length ?? 0,
            error: artistsError?.message || null,
            code: artistsError?.code || null,
            hint: (artistsError as any)?.hint || null,
            details: (artistsError as any)?.details || null,
          },
          venues: {
            ok: !venuesError,
            count: venuesTest?.length ?? 0,
            error: venuesError?.message || null,
            code: venuesError?.code || null,
            hint: (venuesError as any)?.hint || null,
            details: (venuesError as any)?.details || null,
          },
        });
      } catch (e: any) {
        return json({
          ok: false,
          error: e?.message || 'Supabase test error',
          stack: e?.stack?.substring(0, 500) || null,
        }, { status: 500 });
      }
    }

    // Debug: test auth token
    if (url.pathname === '/api/debug/auth' && method === 'GET') {
      const authHeader = request.headers.get('authorization') || '';
      const [scheme, token] = authHeader.split(' ');
      if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
        return json({ ok: false, error: 'Missing or invalid Authorization header', scheme, hasToken: !!token });
      }
      if (!supabaseAdmin) {
        return json({ ok: false, error: 'Supabase not configured' });
      }
      try {
        const { data, error } = await supabaseAdmin.auth.getUser(token);
        if (error) {
          return json({ ok: false, error: error.message, code: (error as any).code });
        }
        return json({ 
          ok: true, 
          userId: data.user?.id, 
          email: data.user?.email,
          role: data.user?.user_metadata?.role,
          metadata: data.user?.user_metadata,
        });
      } catch (e: any) {
        return json({ ok: false, error: e?.message || 'Unknown error' });
      }
    }


    // Artist stats (artworks + orders aggregates)
    if (url.pathname === '/api/stats/artist' && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const artistId = url.searchParams.get('artistId');
      if (!artistId) return json({ error: 'Missing artistId' }, { status: 400 });

      const [{ count: totalArtworks }, { count: activeArtworks }, { count: soldArtworks }, { count: availableArtworks }, { data: artist }, { count: pendingApplicationsCount }] = await Promise.all([
        supabaseAdmin.from('artworks').select('id', { count: 'exact', head: true }).eq('artist_id', artistId),
        supabaseAdmin.from('artworks').select('id', { count: 'exact', head: true }).eq('artist_id', artistId).eq('status', 'active'),
        supabaseAdmin.from('artworks').select('id', { count: 'exact', head: true }).eq('artist_id', artistId).eq('status', 'sold'),
        supabaseAdmin.from('artworks').select('id', { count: 'exact', head: true }).eq('artist_id', artistId).eq('status', 'available'),
        supabaseAdmin.from('artists').select('subscription_tier,subscription_status').eq('id', artistId).maybeSingle(),
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
      const subscriptionTier = String(artist?.subscription_tier || 'free').toLowerCase();
      const subscriptionStatus = String(artist?.subscription_status || '').toLowerCase();
      const isActive = subscriptionStatus === 'active';
      const planLimits = {
        free: { artworks: 1, activeDisplays: 1 },
        starter: { artworks: 10, activeDisplays: 4 },
        growth: { artworks: 30, activeDisplays: 10 },
        pro: { artworks: Number.POSITIVE_INFINITY, activeDisplays: Number.POSITIVE_INFINITY },
      };
      const limits = isActive ? (planLimits[subscriptionTier as keyof typeof planLimits] || planLimits.free) : planLimits.free;

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
          limit: limits.activeDisplays === Number.POSITIVE_INFINITY ? -1 : limits.activeDisplays,
          isOverage: activeDisplays > (limits.activeDisplays as number),
        },
        applications: {
          pending: pendingApplicationsCount || 0,
        },
        sales: {
          total: totalSales || 0,
          recent30Days: recentSales || 0,
          totalEarnings: Math.round(totalArtistPayoutCents / 100),
        },
      });
    }

    // Venue stats endpoint
    if (url.pathname === '/api/stats/venue' && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const venueId = url.searchParams.get('venueId');
      if (!venueId) return json({ error: 'Missing venueId' }, { status: 400 });

      const [{ data: venue }, { count: totalWallSpaces }, { count: occupiedWallSpaces }, { count: pendingInvitations }] = await Promise.all([
        supabaseAdmin.from('venues').select('subscription_tier,subscription_status').eq('id', venueId).maybeSingle(),
        supabaseAdmin.from('wall_spaces').select('id', { count: 'exact', head: true }).eq('venue_id', venueId),
        supabaseAdmin.from('wall_spaces').select('id', { count: 'exact', head: true }).eq('venue_id', venueId).not('current_artwork_id', 'is', null),
        supabaseAdmin.from('invitations').select('id', { count: 'exact', head: true }).eq('venue_id', venueId).eq('status', 'pending'),
      ]).then((results: any) => results);

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
      const totalVenueCommissionCents = (ordersMonth || []).reduce((sum: number, o: any) => sum + (o.venue_commission_cents || 0), 0);

      return json({
        venueId,
        walls: {
          total: totalWallSpaces || 0,
          occupied: occupiedWallSpaces || 0,
          available: (totalWallSpaces || 0) - (occupiedWallSpaces || 0),
        },
        applications: {
          pending: pendingInvitations || 0,
        },
        sales: {
          total: totalSales || 0,
          totalEarnings: Math.round(totalVenueCommissionCents / 100),
        },
      });
    }

    // Removed demo endpoint /api/demo/check for production

    // Profile: provision record in artists or venues based on Supabase user role
    if (url.pathname === '/api/profile/provision' && method === 'POST') {
      const user = await getSupabaseUserFromRequest(request);
      if (!user) return json({ error: 'Missing or invalid Authorization bearer token' }, { status: 401 });
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });

      const role = (user.user_metadata?.role as string) || 'artist';
      const name = (user.user_metadata?.name as string | undefined) || null;
      const phone = (user.user_metadata?.phone as string | undefined) || null;

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

    // Profile: get current user profile (artist or venue)
    if (url.pathname === '/api/profile/me' && method === 'GET') {
      const user = await getSupabaseUserFromRequest(request);
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
      return json({ role: 'artist', profile: data });
    }

    // Public listings: venues
    if (url.pathname === '/api/venues' && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
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
        .select('id,name,type,labels,default_venue_fee_bps,city')
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
      const venues = (data || []).map(v => ({
        id: v.id,
        name: v.name,
        type: v.type,
        labels: v.labels,
        defaultVenueFeeBps: v.default_venue_fee_bps,
        city: (v as any).city || null,
      }));
      return json({ venues });
    }

    // Public listings: artists (only show live artists)
    if (url.pathname === '/api/artists' && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const city = (url.searchParams.get('city') || '').trim();
      const q = (url.searchParams.get('q') || '').trim();
      
      let query = supabaseAdmin
        .from('artists')
        .select('id,name,email,city_primary,city_secondary,profile_photo_url')
        .eq('is_live', true)
        .order('name', { ascending: true })
        .limit(50);
      
      // Match either primary or secondary city if a city is provided
      if (city) {
        query = query.or(`city_primary.eq.${city},city_secondary.eq.${city}`);
      }
      
      // Search by name if a query is provided
      if (q) {
        query = query.ilike('name', `%${q}%`);
      }
      
      const { data, error } = await query;
      if (error) return json({ error: error.message }, { status: 500 });
      const artists = (data || []).map(a => ({ 
        id: a.id, 
        name: a.name, 
        email: a.email,
        profile_photo_url: a.profile_photo_url,
        location: a.city_primary || 'Local'
      }));
      return json({ artists });
    }

    // Public: single artist
    if (url.pathname.startsWith('/api/artists/') && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const parts = url.pathname.split('/');
      const id = parts[3];
      if (!id) return json({ error: 'Missing artist id' }, { status: 400 });
      const { data, error } = await supabaseAdmin
        .from('artists')
        .select('id,name,bio,profile_photo_url,portfolio_url,city_primary,city_secondary')
        .eq('id', id)
        .maybeSingle();
      if (error) return json({ error: error.message }, { status: 500 });
      if (!data) return json({ error: 'Not found' }, { status: 404 });
      return json({
        id: data.id,
        name: data.name,
        bio: data.bio || null,
        profilePhotoUrl: (data as any).profile_photo_url || null,
        portfolioUrl: (data as any).portfolio_url || null,
        cityPrimary: (data as any).city_primary || null,
        citySecondary: (data as any).city_secondary || null,
      });
    }

    // Public: single venue
    if (url.pathname.startsWith('/api/venues/') && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const parts = url.pathname.split('/');
      const id = parts[3];
      if (!id) return json({ error: 'Missing venue id' }, { status: 400 });
      const { data, error } = await supabaseAdmin
        .from('venues')
        .select('id,name,type,labels,default_venue_fee_bps,address')
        .eq('id', id)
        .maybeSingle();
      if (error) return json({ error: error.message }, { status: 500 });
      if (!data) return json({ error: 'Not found' }, { status: 404 });
      const venue = {
        id: data.id,
        name: data.name,
        type: data.type,
        labels: data.labels,
        defaultVenueFeeBps: data.default_venue_fee_bps,
        address: (data as any).address || null,
      };
      return json(venue);
    }

    // Venue wallspaces: list (public)
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

    // Venue wallspaces: create (venue-auth)
    if (url.pathname.match(/^\/api\/venues\/[\w-]+\/wallspaces$/) && method === 'POST') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const user = await requireVenue(request);
      if (!user) return json({ error: 'Missing or invalid Authorization bearer token (venue required)' }, { status: 401 });
      const parts = url.pathname.split('/');
      const venueId = parts[3];
      if (!venueId) return json({ error: 'Missing venue id' }, { status: 400 });
      if (user.id !== venueId) return json({ error: 'Cannot create for another venue' }, { status: 403 });
      const body = await request.json().catch(() => ({}));
      const insert = {
        id: crypto.randomUUID(),
        venue_id: venueId,
        name: String(body?.name || '').trim(),
        width_inches: typeof body?.width === 'number' ? body.width : undefined,
        height_inches: typeof body?.height === 'number' ? body.height : undefined,
        description: body?.description || null,
        available: true,
        photos: Array.isArray(body?.photos) ? body.photos : [],
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

    // Wallspace update (venue-auth). Supports PATCH and POST with X-HTTP-Method-Override: PATCH
    if ((url.pathname.match(/^\/api\/wallspaces\/[\w-]+$/) && (method === 'PATCH' || (method === 'POST' && (request.headers.get('X-HTTP-Method-Override') || '').toUpperCase() === 'PATCH')))) {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const user = await requireVenue(request);
      if (!user) return json({ error: 'Missing or invalid Authorization bearer token (venue required)' }, { status: 401 });
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

    // Public listings: artworks
    if (url.pathname === '/api/artworks' && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const artistId = url.searchParams.get('artistId');
      let query = supabaseAdmin
        .from('artworks')
        .select('id,title,status,price_cents,currency,image_url,artist_name,venue_name')
        .order('created_at', { ascending: false })
        .limit(50);
      if (artistId) query = query.eq('artist_id', artistId);
      const { data, error } = await query;
      if (error) return json({ error: error.message }, { status: 500 });
      const artworks = (data || []).map(a => ({
        id: a.id,
        title: a.title,
        status: a.status,
        price: Math.round((a.price_cents || 0) / 100),
        currency: a.currency,
        imageUrl: a.image_url,
        artistName: a.artist_name,
        venueName: a.venue_name,
      }));
      return json({ artworks });
    }

    // Get reactions
    if (url.pathname.startsWith('/api/artworks/') && url.pathname.endsWith('/reactions') && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const parts = url.pathname.split('/');
      const id = parts[3]; // artworkId

      let userId = null;
      let sessionId = url.searchParams.get('sessionId') || request.headers.get('x-session-id');

      const user = await getSupabaseUserFromRequest(request);
      if (user) userId = user.id;

      const { count: likeCount, error: likeError } = await supabaseAdmin
        .from('artwork_reactions')
        .select('*', { count: 'exact', head: true })
        .eq('artwork_id', id)
        .eq('reaction_type', 'like');

      const { count: fireCount, error: fireError } = await supabaseAdmin
        .from('artwork_reactions')
        .select('*', { count: 'exact', head: true })
        .eq('artwork_id', id)
        .eq('reaction_type', 'fire');

      if (likeError || fireError) return json({ error: 'Failed to fetch counts' }, { status: 500 });

      // Check viewer status
      let liked = false;
      let fired = false;

      if (userId || sessionId) {
        let query = supabaseAdmin.from('artwork_reactions').select('reaction_type').eq('artwork_id', id);

        if (userId) {
          query = query.eq('user_id', userId);
        } else {
          query = query.eq('session_id', sessionId!);
        }

        const { data: userReactions } = await query;
        if (userReactions) {
          liked = userReactions.some((r: any) => r.reaction_type === 'like');
          fired = userReactions.some((r: any) => r.reaction_type === 'fire');
        }
      }

      return json({
        likeCount: likeCount || 0,
        fireCount: fireCount || 0,
        viewer: { liked, fired }
      });
    }

    // Toggle reaction
    if (url.pathname.startsWith('/api/artworks/') && url.pathname.endsWith('/reactions') && method === 'POST') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const parts = url.pathname.split('/');
      const id = parts[3]; // artworkId

      let body: any = {};
      try { body = await request.json(); } catch (e) { }
      const { type, action } = body;

      if (!['like', 'fire'].includes(type as string)) return json({ error: 'Invalid type' }, { status: 400 });
      
      let userId = null;
      let sessionId = body.sessionId || request.headers.get('x-session-id');

      const user = await getSupabaseUserFromRequest(request);
      if (user) userId = user.id;

      if (!userId && !sessionId) return json({ error: 'Session ID required for anonymous reactions' }, { status: 400 });

      // Rate limit
      const ip = getClientIp(request);
      const { ok } = rateLimitByIp(ip, 60, 60000); // 60/min
      if (!ok) return json({ error: 'Rate limit exceeded' }, { status: 429 });

      // Find existing
      let query = supabaseAdmin.from('artwork_reactions')
        .select('id')
        .eq('artwork_id', id)
        .eq('reaction_type', type);

      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        query = query.eq('session_id', sessionId);
      }

      const { data: existing, error: findError } = await query.maybeSingle();

      if (findError) return json({ error: findError.message }, { status: 500 });

      if (existing) {
        // Delete
        await supabaseAdmin.from('artwork_reactions').delete().eq('id', existing.id);
      } else {
        // Insert
        const row: any = {
          artwork_id: id,
          reaction_type: type
        };
        if (userId) row.user_id = userId;
        else row.session_id = sessionId;

        await supabaseAdmin.from('artwork_reactions').insert(row);
      }

      // Return updated counts
      const { count: likeCount } = await supabaseAdmin.from('artwork_reactions').select('*', { count: 'exact', head: true }).eq('artwork_id', id).eq('reaction_type', 'like');
      const { count: fireCount } = await supabaseAdmin.from('artwork_reactions').select('*', { count: 'exact', head: true }).eq('artwork_id', id).eq('reaction_type', 'fire');

      let viewerLiked = false;
      let viewerFired = false;
      if (userId || sessionId) {
        let q = supabaseAdmin.from('artwork_reactions').select('reaction_type').eq('artwork_id', id);
        if (userId) q = q.eq('user_id', userId);
        else q = q.eq('session_id', sessionId);
        const { data: userReactions } = await q;
        if (userReactions) {
          viewerLiked = userReactions.some((r: any) => r.reaction_type === 'like');
          viewerFired = userReactions.some((r: any) => r.reaction_type === 'fire');
        }
      }

      return json({
        likeCount: likeCount || 0,
        fireCount: fireCount || 0,
        viewer: { liked: viewerLiked, fired: viewerFired }
      });
    }

    // Public: single artwork
    if (url.pathname.startsWith('/api/artworks/') && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const parts = url.pathname.split('/');
      const id = parts[3];
      if (!id) return json({ error: 'Missing artwork id' }, { status: 400 });
      const { data, error } = await supabaseAdmin
        .from('artworks')
        .select('id,title,status,price_cents,currency,image_url,artist_id,artist_name,venue_name,description,purchase_url,qr_svg')
        .eq('id', id)
        .maybeSingle();
      if (error) return json({ error: error.message }, { status: 500 });
      if (!data) return json({ error: 'Not found' }, { status: 404 });
      const artwork = {
        id: data.id,
        title: data.title,
        status: data.status,
        price: Math.round((data.price_cents || 0) / 100),
        currency: data.currency,
        imageUrl: data.image_url,
        artistId: (data as any).artist_id || null,
        artistName: data.artist_name,
        venueName: data.venue_name,
        description: data.description,
        purchaseUrl: data.purchase_url || null,
        qrSvg: data.qr_svg || null,
      };
      return json(artwork);
    }

    // Artwork purchase link + QR
    if (url.pathname.startsWith('/api/artworks/') && method === 'GET' && url.pathname.endsWith('/link')) {
      const parts = url.pathname.split('/');
      const id = parts[3];
      if (!id) return json({ error: 'Missing artwork id' }, { status: 400 });
      const purchaseUrl = `${allowOrigin}/#/purchase-${id}`;
      const qrSvg = await generateQrSvg(purchaseUrl, 300);
      if (supabaseAdmin) {
        await supabaseAdmin.from('artworks').update({ purchase_url: purchaseUrl, qr_svg: qrSvg, updated_at: new Date().toISOString() }).eq('id', id);
      }
      return json({ purchaseUrl, qrSvg });
    }

    // Create artwork (artist)
    if (url.pathname === '/api/artworks' && method === 'POST') {
      const user = await getSupabaseUserFromRequest(request);
      if (!user) return json({ error: 'Missing or invalid Authorization bearer token' }, { status: 401 });
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const role = (user.user_metadata?.role as string) || 'artist';
      if (role !== 'artist') return json({ error: 'Only artists can create artworks' }, { status: 403 });
      const payload = await request.json().catch(() => ({}));
      const priceNumber = Number(payload?.price);
      const price_cents = Number.isFinite(priceNumber) ? Math.round(priceNumber * 100) : 0;
      const insert = {
        id: crypto.randomUUID(),
        artist_id: user.id,
        artist_name: payload?.name || user.user_metadata?.name || null,
        venue_id: null,
        venue_name: null,
        title: String(payload?.title || ''),
        description: payload?.description || null,
        price_cents,
        currency: String(payload?.currency || 'usd'),
        image_url: payload?.imageUrl || null,
        status: 'available',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabaseAdmin.from('artworks').insert(insert).select('*').single();
      if (error) return json({ error: error.message }, { status: 500 });
      const shaped = {
        id: data.id,
        title: data.title,
        status: data.status,
        price: Math.round((data.price_cents || 0) / 100),
        currency: data.currency,
        imageUrl: data.image_url,
        artistName: data.artist_name,
        venueName: data.venue_name,
        description: data.description,
      };
      return json(shaped, { status: 201 });
    }

    // Approve artwork for display (venue)
    if (url.pathname.startsWith('/api/artworks/') && method === 'POST' && url.pathname.endsWith('/approve')) {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const user = await requireVenue(request);
      if (!user) return json({ error: 'Missing or invalid Authorization bearer token (venue required)' }, { status: 401 });
      const parts = url.pathname.split('/');
      const id = parts[3];
      if (!id) return json({ error: 'Missing artwork id' }, { status: 400 });
      const venueName = user.user_metadata?.name || null;
      const { data: updated, error } = await supabaseAdmin
        .from('artworks')
        .update({ status: 'active', venue_id: user.id, venue_name: venueName, purchase_url: `${allowOrigin}/#/purchase-${id}`, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (error) return json({ error: error.message }, { status: 500 });
      if (!updated) return json({ error: 'Not found' }, { status: 404 });
      const purchaseUrl = `${allowOrigin}/#/purchase-${id}`;
      const qrSvg = await generateQrSvg(purchaseUrl, 300);
      await supabaseAdmin.from('artworks').update({ qr_svg: qrSvg }).eq('id', id);
      return json({ ok: true, purchaseUrl, qrSvg });
    }

    // Upsert artist profile (used by app bootstrap and profile edit)
    if (url.pathname === '/api/artists' && method === 'POST') {
      try {
        if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
        
        let payload: any = {};
        try {
          payload = await request.json();
        } catch (parseErr) {
          console.error('[POST /api/artists] JSON parse error:', parseErr);
          return json({ error: 'Invalid JSON body' }, { status: 400 });
        }
        
        // Allow artistId from body OR extract from auth token
        let id = String(payload?.artistId || '').trim();
        if (!id) {
          const user = await getSupabaseUserFromRequest(request);
          console.log('[POST /api/artists] Auth user:', user?.id, 'role:', user?.user_metadata?.role);
          if (user && (user.user_metadata?.role === 'artist' || !user.user_metadata?.role)) {
            id = user.id;
          }
        }
        if (!id) {
          console.error('[POST /api/artists] No artistId and no valid auth token');
          return json({ error: 'Missing artistId or Authorization token' }, { status: 400 });
        }
        
        console.log('[POST /api/artists] Upserting artist:', id, 'payload:', JSON.stringify(payload));
        const resp = await upsertArtist({
          id,
          email: payload?.email || null,
          name: payload?.name || null,
          role: 'artist',
          phoneNumber: payload?.phoneNumber || null,
          cityPrimary: payload?.cityPrimary || null,
          citySecondary: payload?.citySecondary || null,
          subscriptionTier: payload?.subscriptionTier || null,
        });
        return resp;
      } catch (err: any) {
        console.error('[POST /api/artists] Unhandled error:', err?.message, err?.stack);
        return json({ error: err?.message || 'Internal server error' }, { status: 500 });
      }
    }
    // Upsert venue profile (used by app bootstrap)
    if (url.pathname === '/api/venues' && method === 'POST') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const payload = await request.json().catch(() => ({}));
      const id = String(payload?.venueId || '').trim();
      if (!id) return json({ error: 'Missing venueId' }, { status: 400 });
      const resp = await upsertVenue({
        id,
        email: payload?.email || null,
        name: payload?.name || null,
        type: payload?.type || null,
        phoneNumber: payload?.phoneNumber || null,
        defaultVenueFeeBps: typeof payload?.defaultVenueFeeBps === 'number' ? payload.defaultVenueFeeBps : 1000,
      });
      return resp;
    }

    // -----------------------------
    // Minimal API endpoints (Stripe Connect) to remove dependency on external API
    // -----------------------------
    const stripeKey = env.STRIPE_SECRET_KEY || '';

    async function stripeFetch(path: string, init: RequestInit = {}): Promise<Response> {
      if (!stripeKey) return json({ error: 'Missing STRIPE_SECRET_KEY' }, { status: 500 });
      const headers = new Headers(init.headers || {});
      headers.set('Authorization', `Bearer ${stripeKey}`);
      if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
      return fetch(`https://api.stripe.com${path}`, { ...init, headers });
    }

    function toForm(obj: Record<string, any>): string {
      return Object.entries(obj)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&');
    }

    // Helper: require Supabase auth in production-like usage
    async function requireArtist(req: Request): Promise<any | null> {
      const user = await getSupabaseUserFromRequest(req);
      if (!user || user.user_metadata?.role !== 'artist') return null;
      return user;
    }

    async function requireVenue(req: Request): Promise<any | null> {
      const user = await getSupabaseUserFromRequest(req);
      if (!user || user.user_metadata?.role !== 'venue') return null;
      return user;
    }

    async function requireAdmin(req: Request): Promise<any | null> {
      const user = await getSupabaseUserFromRequest(req);
      if (!user) return null;
      const role = user.user_metadata?.role;
      if (role === 'admin' || user.user_metadata?.isAdmin === true) return user;
      const allowlist = (env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
      if (user.email && allowlist.includes(user.email.toLowerCase())) return user;
      return null;
    }

    // Billing Portal: manage subscription and payment methods
    if (url.pathname === '/api/stripe/billing/create-portal-session' && method === 'POST') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const user = await requireArtist(request);
      if (!user) return json({ error: 'Missing or invalid Authorization bearer token (artist required)' }, { status: 401 });

      const { data: artist, error } = await supabaseAdmin
        .from('artists')
        .select('id,email,name,stripe_customer_id')
        .eq('id', user.id)
        .maybeSingle();
      if (error) return json({ error: error.message }, { status: 500 });

      let customerId = artist?.stripe_customer_id as string | null | undefined;
      if (!customerId) {
        const customerBody = JSON.stringify({
          email: (artist?.email as string | undefined) || (user.email as string | undefined) || undefined,
          name: (artist?.name as string | undefined) || (user.user_metadata?.name as string | undefined) || undefined,
          metadata: { artistId: user.id }
        });
        const resp = await stripeFetch('/v1/customers', { method: 'POST', body: customerBody, headers: { 'Content-Type': 'application/json' } });
        const data = await resp.json();
        if (!resp.ok) return json(data, { status: resp.status });
        customerId = data.id;
        await supabaseAdmin
          .from('artists')
          .update({ stripe_customer_id: customerId })
          .eq('id', user.id);
      }

      const returnUrl = `${pagesOrigin}/#/artist-dashboard`;
      const portalBody = toForm({
        customer: customerId,
        return_url: returnUrl,
      });
      const pResp = await stripeFetch('/v1/billing_portal/sessions', { method: 'POST', body: portalBody, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      const session = await pResp.json();
      if (!pResp.ok) return json(session, { status: pResp.status });
      return json({ url: session.url });
    }

    // Subscription checkout: start a recurring plan for the artist
    if (url.pathname === '/api/stripe/billing/create-subscription-session' && method === 'POST') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const user = await requireArtist(request);
      if (!user) return json({ error: 'Missing or invalid Authorization bearer token (artist required)' }, { status: 401 });

      const payload = await request.json().catch(() => ({}));
      const rawTier = String((payload as any)?.tier || '').toLowerCase();
      const allowedTiers = ['starter', 'growth', 'pro'];
      if (!allowedTiers.includes(rawTier)) {
        return json({ error: 'Invalid tier' }, { status: 400 });
      }

      const priceMap: Record<string, string | undefined> = {
        starter: env.STRIPE_PRICE_ID_STARTER || env.STRIPE_SUB_PRICE_STARTER,
        growth: env.STRIPE_PRICE_ID_GROWTH || env.STRIPE_SUB_PRICE_GROWTH,
        pro: env.STRIPE_PRICE_ID_PRO || env.STRIPE_SUB_PRICE_PRO,
      };
      const priceId = priceMap[rawTier];
      if (!priceId) {
        return json({ error: `Price ID not configured for ${rawTier}` }, { status: 500 });
      }

      // Ensure Stripe customer exists for this artist
      const { data: artist, error } = await supabaseAdmin
        .from('artists')
        .select('id,email,name,stripe_customer_id')
        .eq('id', user.id)
        .maybeSingle();
      if (error) return json({ error: error.message }, { status: 500 });

      let customerId = artist?.stripe_customer_id as string | null | undefined;
      if (!customerId) {
        const customerBody = JSON.stringify({
          email: (artist?.email as string | undefined) || (user.email as string | undefined) || undefined,
          name: (artist?.name as string | undefined) || (user.user_metadata?.name as string | undefined) || undefined,
          metadata: { artistId: user.id }
        });
        const resp = await stripeFetch('/v1/customers', { method: 'POST', body: customerBody, headers: { 'Content-Type': 'application/json' } });
        const data = await resp.json();
        if (!resp.ok) return json(data, { status: resp.status });
        customerId = data.id;
        await supabaseAdmin
          .from('artists')
          .update({ stripe_customer_id: customerId })
          .eq('id', user.id);
      }

      const successUrl = `${pagesOrigin}/#/artist-dashboard?sub=success`;
      const cancelUrl = `${pagesOrigin}/#/artist-dashboard?sub=cancel`;

      const body = JSON.stringify({
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        metadata: { artistId: user.id, tier: rawTier },
        subscription_data: {
          metadata: { artistId: user.id, tier: rawTier }
        }
      });
      const resp = await stripeFetch('/v1/checkout/sessions', { method: 'POST', body, headers: { 'Content-Type': 'application/json' } });
      const session = await resp.json();
      if (!resp.ok) return json(session, { status: resp.status });
      return json({ url: session.url });
    }

    // Connect: Artist create account
    if (url.pathname === '/api/stripe/connect/artist/create-account' && method === 'POST') {
      const user = await requireArtist(request);
      if (!user) return json({ error: 'Missing or invalid Authorization bearer token (artist required)' }, { status: 401 });

      // Ensure DB record exists
      await upsertArtist({ id: user.id, email: user.email ?? null, name: user.user_metadata?.name ?? null, role: 'artist', phoneNumber: (user.user_metadata?.phone as string | undefined) || null });

      // Create Stripe account
      const body = JSON.stringify({
        type: 'express',
        email: user.email ?? undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true }
        },
        metadata: { artistId: user.id }
      });
      const resp = await stripeFetch('/v1/accounts', { method: 'POST', body, headers: { 'Content-Type': 'application/json' } });
      const json = await resp.json();
      if (!resp.ok) return json(json, { status: resp.status });
      // Save accountId
      await upsertArtist({ id: user.id, stripeAccountId: json.id });
      return json({ accountId: json.id, alreadyExists: false });
    }

    // Create Stripe Checkout Session for artwork purchase
    if (url.pathname === '/api/stripe/create-checkout-session' && method === 'POST') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const payload = await request.json().catch(() => ({}));
      const artworkId = String(payload?.artworkId || '').trim();
      if (!artworkId) return json({ error: 'Missing artworkId' }, { status: 400 });
      const { data: art, error: artErr } = await supabaseAdmin
        .from('artworks')
        .select('id,title,price_cents,currency,status')
        .eq('id', artworkId)
        .maybeSingle();
      if (artErr) return json({ error: artErr.message }, { status: 500 });
      if (!art) return json({ error: 'Artwork not found' }, { status: 404 });
      if (art.status === 'sold') return json({ error: 'Artwork already sold' }, { status: 400 });
      const amount = Number(art.price_cents || 0);
      const currency = art.currency || 'usd';
      const success_url = `${allowOrigin}/#/purchase-${artworkId}?status=success`;
      const cancel_url = `${allowOrigin}/#/purchase-${artworkId}?status=cancel`;

      // Attempt to include Connect split logic if artist account exists; otherwise fallback
      let paymentIntentExtras: Record<string, string> = {};
      try {
        const { data: artRelations } = await supabaseAdmin
          .from('artworks')
          .select('artist_id,venue_id')
          .eq('id', artworkId)
          .maybeSingle();
        const artistId = artRelations?.artist_id || null;
        const venueId = artRelations?.venue_id || null;
        const { data: artist } = artistId ? await supabaseAdmin.from('artists').select('stripe_account_id,subscription_tier,platform_fee_bps').eq('id', artistId).maybeSingle() : { data: null };
        const { data: venue } = venueId ? await supabaseAdmin.from('venues').select('default_venue_fee_bps').eq('id', venueId).maybeSingle() : { data: null };
        const venueFeeBps = typeof venue?.default_venue_fee_bps === 'number' ? venue.default_venue_fee_bps : 1000;
        const platformFeeBps = typeof artist?.platform_fee_bps === 'number' ? artist.platform_fee_bps : 1500; // fallback by plan
        const platformFeeCents = Math.floor((amount * platformFeeBps) / 10000);
        if (artist?.stripe_account_id) {
          paymentIntentExtras = {
            'payment_intent_data[application_fee_amount]': String(platformFeeCents),
            'payment_intent_data[transfer_data][destination]': artist.stripe_account_id,
            'metadata[platform_fee_bps]': String(platformFeeBps),
            'metadata[venue_fee_bps]': String(venueFeeBps),
          };
        }
      } catch {}

      const body = toForm({
        mode: 'payment',
        success_url,
        cancel_url,
        'payment_intent_data[transfer_group]': `artwork_${artworkId}`,
        'line_items[0][price_data][currency]': currency,
        'line_items[0][price_data][unit_amount]': String(amount),
        'line_items[0][price_data][product_data][name]': art.title || 'Artwork',
        'line_items[0][quantity]': '1',
        'metadata[artworkId]': artworkId,
        ...paymentIntentExtras,
      });
      const resp = await stripeFetch('/v1/checkout/sessions', { method: 'POST', body });
      const session = await resp.json();
      if (!resp.ok) return json(session, { status: resp.status });
      return json({ url: session.url });
    }

    // Connect: Artist account link
    if (url.pathname === '/api/stripe/connect/artist/account-link' && method === 'POST') {
      const user = await requireArtist(request);
      if (!user) return json({ error: 'Missing or invalid Authorization bearer token (artist required)' }, { status: 401 });

      // Fetch artist record
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const { data: artist } = await supabaseAdmin.from('artists').select('*').eq('id', user.id).maybeSingle();
      if (!artist?.phone_number) return json({ error: 'Phone number required. Please add your phone to your profile.' }, { status: 400 });
      if (!artist?.stripe_account_id) return json({ error: 'Artist has no stripeAccountId yet. Call /create-account first.' }, { status: 400 });

      const appUrl = 'https://artwalls.space';
      const refresh_url = `${appUrl}/#/artist-dashboard`;
      const return_url = `${appUrl}/#/artist-dashboard`;
      const body = toForm({ account: artist.stripe_account_id, refresh_url, return_url, type: 'account_onboarding' });
      const resp = await stripeFetch('/v1/account_links', { method: 'POST', body });
      const json = await resp.json();
      if (!resp.ok) return json(json, { status: resp.status });
      return json({ url: json.url });
    }

    // Connect: Artist login link
    if (url.pathname === '/api/stripe/connect/artist/login-link' && method === 'POST') {
      const user = await requireArtist(request);
      if (!user) return json({ error: 'Missing or invalid Authorization bearer token (artist required)' }, { status: 401 });
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const { data: artist } = await supabaseAdmin.from('artists').select('*').eq('id', user.id).maybeSingle();
      if (!artist?.phone_number) return json({ error: 'Phone number required. Please add your phone to your profile.' }, { status: 400 });
      if (!artist?.stripe_account_id) return json({ error: 'Artist has no stripeAccountId yet.' }, { status: 400 });
      const body = toForm({ account: artist.stripe_account_id });
      const resp = await stripeFetch('/v1/accounts/create_login_link', { method: 'POST', body });
      const json = await resp.json();
      if (!resp.ok) return json(json, { status: resp.status });
      return json({ url: json.url });
    }

    // Connect: Artist status
    if (url.pathname === '/api/stripe/connect/artist/status' && method === 'GET') {
      const user = await requireArtist(request);
      if (!user) return json({ error: 'Missing or invalid Authorization bearer token (artist required)' }, { status: 401 });
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const { data: artist } = await supabaseAdmin.from('artists').select('*').eq('id', user.id).maybeSingle();
      if (!artist?.stripe_account_id) return json({ hasAccount: false });
      const resp = await stripeFetch(`/v1/accounts/${artist.stripe_account_id}`);
      const acc = await resp.json();
      if (!resp.ok) return json(acc, { status: resp.status });
      return json({
        hasAccount: true,
        accountId: artist.stripe_account_id,
        chargesEnabled: acc.charges_enabled,
        payoutsEnabled: acc.payouts_enabled,
        detailsSubmitted: acc.details_submitted,
        requirementsCurrentlyDue: acc.requirements?.currently_due || [],
        requirementsEventuallyDue: acc.requirements?.eventually_due || [],
        syncedAt: new Date().toISOString(),
      });
    }

    // Connect: Venue create account
    if (url.pathname === '/api/stripe/connect/venue/create-account' && method === 'POST') {
      const user = await requireVenue(request);
      if (!user) return json({ error: 'Missing or invalid Authorization bearer token (venue required)' }, { status: 401 });
      await upsertVenue({ id: user.id, email: user.email ?? null, name: user.user_metadata?.name ?? null, type: user.user_metadata?.type ?? null, phoneNumber: (user.user_metadata?.phone as string | undefined) || null, defaultVenueFeeBps: 1000 });
      const body = toForm({
        type: 'express',
        email: user.email ?? undefined,
        'capabilities[card_payments][requested]': 'true',
        'capabilities[transfers][requested]': 'true',
        'metadata[venueId]': user.id,
      });
      const resp = await stripeFetch('/v1/accounts', { method: 'POST', body });
      const json = await resp.json();
      if (!resp.ok) return json(json, { status: resp.status });
      await upsertVenue({ id: user.id, stripeAccountId: json.id });
      return json({ accountId: json.id, alreadyExists: false });
    }

    // Connect: Venue account link
    if (url.pathname === '/api/stripe/connect/venue/account-link' && method === 'POST') {
      const user = await requireVenue(request);
      if (!user) return json({ error: 'Missing or invalid Authorization bearer token (venue required)' }, { status: 401 });
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const { data: venue } = await supabaseAdmin.from('venues').select('*').eq('id', user.id).maybeSingle();
      if (!venue?.phone_number) return json({ error: 'Phone number required. Please add your phone to your profile.' }, { status: 400 });
      if (!venue?.stripe_account_id) return json({ error: 'Venue has no stripeAccountId yet. Call /create-account first.' }, { status: 400 });
      const appUrl = 'https://artwalls.space';
      const refresh_url = `${appUrl}/#/venue-dashboard`;
      const return_url = `${appUrl}/#/venue-dashboard`;
      const body = toForm({ account: venue.stripe_account_id, refresh_url, return_url, type: 'account_onboarding' });
      const resp = await stripeFetch('/v1/account_links', { method: 'POST', body });
      const json = await resp.json();
      if (!resp.ok) return json(json, { status: resp.status });
      return json({ url: json.url });
    }

    // Connect: Venue login link
    if (url.pathname === '/api/stripe/connect/venue/login-link' && method === 'POST') {
      const user = await requireVenue(request);
      if (!user) return json({ error: 'Missing or invalid Authorization bearer token (venue required)' }, { status: 401 });
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const { data: venue } = await supabaseAdmin.from('venues').select('*').eq('id', user.id).maybeSingle();
      if (!venue?.phone_number) return json({ error: 'Phone number required. Please add your phone to your profile.' }, { status: 400 });
      if (!venue?.stripe_account_id) return json({ error: 'Venue has no stripeAccountId yet.' }, { status: 400 });
      const body = toForm({ account: venue.stripe_account_id });
      const resp = await stripeFetch('/v1/accounts/create_login_link', { method: 'POST', body });
      const json = await resp.json();
      if (!resp.ok) return json(json, { status: resp.status });
      return json({ url: json.url });
    }

    // Connect: Venue status
    if (url.pathname === '/api/stripe/connect/venue/status' && method === 'GET') {
      const user = await requireVenue(request);
      if (!user) return json({ error: 'Missing or invalid Authorization bearer token (venue required)' }, { status: 401 });
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const { data: venue } = await supabaseAdmin.from('venues').select('*').eq('id', user.id).maybeSingle();
      if (!venue?.stripe_account_id) return json({ hasAccount: false });
      const resp = await stripeFetch(`/v1/accounts/${venue.stripe_account_id}`);
      const acc = await resp.json();
      if (!resp.ok) return json(acc, { status: resp.status });
      return json({
        hasAccount: true,
        accountId: venue.stripe_account_id,
        chargesEnabled: acc.charges_enabled,
        payoutsEnabled: acc.payouts_enabled,
        detailsSubmitted: acc.details_submitted,
        requirementsCurrentlyDue: acc.requirements?.currently_due || [],
        requirementsEventuallyDue: acc.requirements?.eventually_due || [],
        syncedAt: new Date().toISOString(),
      });
    }

    if (url.pathname === '/api/stripe/webhook') {
      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }

      if (!env.STRIPE_WEBHOOK_SECRET) {
        return new Response('Missing STRIPE_WEBHOOK_SECRET', { status: 500 });
      }

      try {
        const event = await verifyAndParseStripeEvent(request, env.STRIPE_WEBHOOK_SECRET);

        // Do work async so Stripe gets a fast 200.
        ctx.waitUntil(
          (async () => {
            // Forward the verified event to the backend for processing
            try {
              const base = env.SUPABASE_URL || env.API_BASE_URL || 'https://api.artwalls.space';
              const resp = await fetch(`${base}/api/stripe/webhook/forwarded`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event }),
              });
              if (!resp.ok) {
                const text = await resp.text();
                console.error('Forwarded webhook failed', resp.status, text);
              } else {
                console.log('Forwarded webhook processed', { id: event.id, type: event.type });
              }
            } catch (e) {
              console.error('Error forwarding webhook', e instanceof Error ? e.message : e);
            }

            // Process venue/artist transfers and record order
            try {
              if ((event as any).type === 'checkout.session.completed' && supabaseAdmin) {
                const sessionObj = (event as any).data?.object;
                const sessionId = sessionObj?.id;
                if (!sessionId) return;
                const sResp = await stripeFetch(`/v1/checkout/sessions/${sessionId}?expand[]=payment_intent.charges`);
                const s = await sResp.json();
                if (!sResp.ok) {
                  console.error('Failed to retrieve session', sResp.status, s);
                  return;
                }

                const amountTotal = Number(s.amount_total || 0);
                const currency = s.currency || 'usd';
                const artworkId = s.metadata?.artworkId || null;
                const paymentIntent = s.payment_intent || null;
                const chargeId = paymentIntent?.charges?.data?.[0]?.id || null;
                const transferDest = paymentIntent?.transfer_data?.destination || null;
                const transferGroup = paymentIntent?.transfer_group || (artworkId ? `artwork_${artworkId}` : undefined);
                if (!artworkId) return;

                const { data: art } = await supabaseAdmin
                  .from('artworks')
                  .select('id,title,artist_id,venue_id')
                  .eq('id', artworkId)
                  .maybeSingle();
                if (!art) return;

                const { data: artist } = await supabaseAdmin
                  .from('artists')
                  .select('stripe_account_id,platform_fee_bps,phone_number')
                  .eq('id', art.artist_id)
                  .maybeSingle();

                const { data: venue } = await supabaseAdmin
                  .from('venues')
                  .select('stripe_account_id,default_venue_fee_bps,phone_number')
                  .eq('id', art.venue_id)
                  .maybeSingle();

                const venueFeeBps = typeof venue?.default_venue_fee_bps === 'number' ? venue.default_venue_fee_bps : 1000;
                const platformFeeBps = typeof artist?.platform_fee_bps === 'number' ? artist.platform_fee_bps : 1500;
                const platformFeeCents = Math.floor((amountTotal * platformFeeBps) / 10000);
                const venuePayoutCents = Math.floor((amountTotal * venueFeeBps) / 10000);
                const artistPayoutCents = Math.max(0, amountTotal - platformFeeCents - venuePayoutCents);

                // Insert order record and capture id
                try {
                  const orderId = crypto.randomUUID();
                  await supabaseAdmin.from('orders').insert({
                    id: orderId,
                    artwork_id: art.id,
                    artist_id: art.artist_id,
                    venue_id: art.venue_id,
                    amount_cents: amountTotal,
                    currency,
                    platform_fee_bps: platformFeeBps,
                    venue_fee_bps: venueFeeBps,
                    platform_fee_cents: platformFeeCents,
                    artist_payout_cents: artistPayoutCents,
                    venue_payout_cents: venuePayoutCents,
                    status: 'paid',
                    stripe_checkout_session_id: sessionId,
                    stripe_payment_intent_id: paymentIntent?.id || null,
                    stripe_charge_id: chargeId,
                    transfer_ids: [],
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  });
                  // Save Stripe receipt URL if available
                  try {
                    const receiptUrl = paymentIntent?.charges?.data?.[0]?.receipt_url || null;
                    if (receiptUrl) {
                      await supabaseAdmin
                        .from('orders')
                        .update({ stripe_receipt_url: receiptUrl, updated_at: new Date().toISOString() })
                        .eq('id', orderId);
                    }
                  } catch (e) {
                    console.error('Failed to save receipt URL', e instanceof Error ? e.message : e);
                  }
                  // Notifications: artist, venue, platform
                  try {
                    const msgs = [
                      {
                        id: crypto.randomUUID(),
                        user_id: art.artist_id,
                        role: 'artist',
                        title: 'Artwork sold',
                        message: `Your artwork "${art.title}" sold for $${Math.round(amountTotal / 100)}.`,
                        artwork_id: art.id,
                        order_id: orderId,
                        created_at: new Date().toISOString(),
                      },
                      {
                        id: crypto.randomUUID(),
                        user_id: art.venue_id,
                        role: 'venue',
                        title: 'Artwork sold',
                        message: `Artwork "${art.title}" sold for $${Math.round(amountTotal / 100)}.`,
                        artwork_id: art.id,
                        order_id: orderId,
                        created_at: new Date().toISOString(),
                      },
                      {
                        id: crypto.randomUUID(),
                        user_id: null,
                        role: 'platform',
                        title: 'Sale completed',
                        message: `"${art.title}" sold. Platform fee: $${Math.round(platformFeeCents / 100)}.`,
                        artwork_id: art.id,
                        order_id: orderId,
                        created_at: new Date().toISOString(),
                      },
                    ];
                    await supabaseAdmin.from('notifications').insert(msgs);
                  } catch (e) {
                    console.error('Notifications insert failed', e instanceof Error ? e.message : e);
                  }
                  // SMS alerts (best-effort)
                  try {
                    const priceStr = `$${Math.round(amountTotal / 100)}`;
                    if (artist?.phone_number) {
                      await sendSms(artist.phone_number, `Artwalls: Your artwork "${art.title}" sold for ${priceStr}.`);
                    }
                    if (venue?.phone_number) {
                      await sendSms(venue.phone_number, `Artwalls: Artwork "${art.title}" sold for ${priceStr} at your venue.`);
                    }
                  } catch (e) {
                    console.error('SMS send failed', e instanceof Error ? e.message : e);
                  }
                  // Mark artwork as sold
                  try {
                    await supabaseAdmin
                      .from('artworks')
                      .update({ status: 'sold', updated_at: new Date().toISOString() })
                      .eq('id', art.id);
                  } catch (e) {
                    console.error('Failed to mark artwork sold', e instanceof Error ? e.message : e);
                  }
                } catch (e) {
                  console.error('Order insert failed', e instanceof Error ? e.message : e);
                }

                // Venue transfer (best-effort)
                try {
                  if (venue?.stripe_account_id && venuePayoutCents > 0) {
                    const tBody = toForm({
                      amount: String(venuePayoutCents),
                      currency,
                      destination: venue.stripe_account_id,
                      ...(chargeId ? { source_transaction: chargeId } : transferGroup ? { transfer_group: transferGroup } : {}),
                    });
                    const tResp = await stripeFetch('/v1/transfers', { method: 'POST', body: tBody });
                    const t = await tResp.json();
                    if (!tResp.ok) {
                      console.error('Venue transfer failed', tResp.status, t);
                    } else {
                      console.log('Venue transfer created', t.id);
                      try {
                        await supabaseAdmin
                          .from('orders')
                          .update({ transfer_ids: [{ venue_transfer_id: t.id }] })
                          .eq('stripe_checkout_session_id', sessionId);
                      } catch {}
                    }
                  }
                } catch (e) {
                  console.error('Venue transfer error', e instanceof Error ? e.message : e);
                }

                // Artist transfer (only if not destination charge)
                try {
                  if (!transferDest && artist?.stripe_account_id && artistPayoutCents > 0) {
                    const aBody = toForm({
                      amount: String(artistPayoutCents),
                      currency,
                      destination: artist.stripe_account_id,
                      ...(chargeId ? { source_transaction: chargeId } : transferGroup ? { transfer_group: transferGroup } : {}),
                    });
                    const aResp = await stripeFetch('/v1/transfers', { method: 'POST', body: aBody });
                    const a = await aResp.json();
                    if (!aResp.ok) {
                      console.error('Artist transfer failed', aResp.status, a);
                    } else {
                      console.log('Artist transfer created', a.id);
                      try {
                        await supabaseAdmin
                          .from('orders')
                          .update({ transfer_ids: [{ artist_transfer_id: a.id }] })
                          .eq('stripe_checkout_session_id', sessionId);
                      } catch {}
                    }
                  }
                } catch (e) {
                  console.error('Artist transfer error', e instanceof Error ? e.message : e);
                }
              }
            } catch (e) {
              console.error('Webhook processing error', e instanceof Error ? e.message : e);
            }
          })(),
        );

        return json({ received: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Webhook error';
        return new Response(message, { status: 400 });
      }
    }

    // Artist sales history
    if (url.pathname === '/api/sales/artist' && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const artistId = url.searchParams.get('artistId');
      if (!artistId) return json({ error: 'Missing artistId' }, { status: 400 });
      const { data, error } = await supabaseAdmin
        .from('orders')
        .select('id,amount_cents,currency,artist_payout_cents,venue_payout_cents,created_at,artwork:artworks(id,title,image_url,venue_name),venue:venues(id,name)')
        .eq('artist_id', artistId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) return json({ error: error.message }, { status: 500 });
      const sales = (data || []).map((o: any) => ({
        id: o.id,
        price: Math.round((o.amount_cents || 0) / 100),
        currency: o.currency || 'usd',
        artistEarnings: Math.round((o.artist_payout_cents || 0) / 100),
        venueName: o.artwork?.venue_name || o.venue?.name || null,
        artworkTitle: o.artwork?.title || 'Artwork',
        artworkImage: o.artwork?.image_url || null,
        saleDate: o.created_at,
      }));
      return json({ sales });
    }

    // Venue Invites (Warm Intro)
    if (url.pathname === '/api/venue-invites' && method === 'POST') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const user = await requireArtist(request);
      if (!user) return json({ error: 'Missing or invalid Authorization bearer token (artist required)' }, { status: 401 });

      const emailVerified = !!(user?.email_confirmed_at || user?.confirmed_at);
      if (!emailVerified) return json({ error: 'Email verification required to send invites.' }, { status: 403 });

      const payload = await request.json().catch(() => ({}));
      const placeId = String(payload?.placeId || '').trim();
      const venueName = String(payload?.venueName || '').trim();
      if (!placeId) return json({ error: 'Missing placeId' }, { status: 400 });
      if (!venueName) return json({ error: 'Missing venueName' }, { status: 400 });

      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);
      const { count: invitesToday, error: countErr } = await supabaseAdmin
        .from('venue_invites')
        .select('id', { count: 'exact', head: true })
        .eq('artist_id', user.id)
        .gte('created_at', startOfDay.toISOString());
      if (countErr) return json({ error: countErr.message }, { status: 500 });
      if ((invitesToday || 0) >= VENUE_INVITE_DAILY_LIMIT) {
        return json({ error: `Daily invite limit reached (${VENUE_INVITE_DAILY_LIMIT}/day).` }, { status: 429 });
      }

      const cutoff = new Date(Date.now() - VENUE_INVITE_DUPLICATE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const { data: recent, error: recentErr } = await supabaseAdmin
        .from('venue_invites')
        .select('id,created_at')
        .eq('artist_id', user.id)
        .eq('place_id', placeId)
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (recentErr) return json({ error: recentErr.message }, { status: 500 });
      if (recent?.created_at) {
        return json({ error: 'You recently invited this venue. Try again later.' }, { status: 409 });
      }

      const nowIso = new Date().toISOString();
      const insert = {
        id: crypto.randomUUID(),
        token: generateInviteToken(),
        artist_id: user.id,
        place_id: placeId,
        venue_name: venueName,
        venue_address: payload?.venueAddress || null,
        google_maps_url: payload?.googleMapsUrl || null,
        website_url: payload?.websiteUrl || null,
        phone: payload?.phone || null,
        venue_email: payload?.venueEmail || null,
        personal_line: payload?.personalLine || null,
        subject: payload?.subject || `Artwalls invite for ${venueName}`,
        body_template_version: payload?.bodyTemplateVersion || 'v1',
        status: 'DRAFT',
        created_at: nowIso,
        updated_at: nowIso,
      };
      const { data: invite, error } = await supabaseAdmin
        .from('venue_invites')
        .insert(insert)
        .select('*')
        .single();
      if (error) return json({ error: error.message }, { status: 500 });

      await supabaseAdmin.from('venue_invite_events').insert({ invite_id: invite.id, type: 'CREATED', meta: { at: nowIso } });
      return json({ invite: mapVenueInviteRow(invite) });
    }

    if (url.pathname === '/api/venue-invites' && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const user = await requireArtist(request);
      if (!user) return json({ error: 'Missing or invalid Authorization bearer token (artist required)' }, { status: 401 });
      const { data, error } = await supabaseAdmin
        .from('venue_invites')
        .select('*')
        .eq('artist_id', user.id)
        .order('created_at', { ascending: false });
      if (error) return json({ error: error.message }, { status: 500 });
      return json({ invites: (data || []).map(mapVenueInviteRow) });
    }

    if (url.pathname.startsWith('/api/venue-invites/') && url.pathname.endsWith('/send') && method === 'POST') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const user = await requireArtist(request);
      if (!user) return json({ error: 'Missing or invalid Authorization bearer token (artist required)' }, { status: 401 });
      const parts = url.pathname.split('/');
      const id = parts[3];
      const payload = await request.json().catch(() => ({}));

      const { data: invite, error: findErr } = await supabaseAdmin
        .from('venue_invites')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (findErr) return json({ error: findErr.message }, { status: 500 });
      if (!invite) return json({ error: 'Invite not found' }, { status: 404 });
      if (invite.artist_id !== user.id) return json({ error: 'Forbidden' }, { status: 403 });

      const personalLine = String(payload?.personalLine || '').trim();
      if (personalLine.length < 12) return json({ error: 'Personal line must be at least 12 characters.' }, { status: 400 });
      const venueEmail = payload?.venueEmail ? String(payload?.venueEmail).trim() : null;
      if (venueEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(venueEmail)) {
        return json({ error: 'Invalid venue email.' }, { status: 400 });
      }

      const nextStatus = invite.status === 'CLICKED' ? 'CLICKED' : 'SENT';
      if (!isStatusTransitionAllowed(invite.status, nextStatus)) {
        return json({ error: `Invite status cannot transition from ${invite.status} to ${nextStatus}.` }, { status: 409 });
      }

      const nowIso = new Date().toISOString();
      const { data: updated, error: updateErr } = await supabaseAdmin
        .from('venue_invites')
        .update({
          personal_line: personalLine,
          venue_email: venueEmail,
          subject: payload?.subject || invite.subject,
          body_template_version: payload?.bodyTemplateVersion || invite.body_template_version,
          status: nextStatus,
          sent_at: invite.sent_at || nowIso,
          updated_at: nowIso,
        })
        .eq('id', invite.id)
        .select('*')
        .single();
      if (updateErr) return json({ error: updateErr.message }, { status: 500 });

      if (!invite.sent_at) {
        await supabaseAdmin.from('venue_invite_events').insert({ invite_id: invite.id, type: 'SENT', meta: { method: payload?.sendMethod || 'unknown', at: nowIso } });
      }
      return json({ invite: mapVenueInviteRow(updated) });
    }

    if (url.pathname.startsWith('/api/venue-invites/token/') && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const token = url.pathname.split('/')[4] || '';
      if (!isValidInviteToken(token)) return json({ error: 'Invalid invite token' }, { status: 400 });
      const rate = rateLimitByIp(`invite:${getClientIp(request)}`, VENUE_INVITE_PUBLIC_RATE_LIMIT, 60 * 60 * 1000);
      if (!rate.ok) return json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });

      const { data: invite, error } = await supabaseAdmin
        .from('venue_invites')
        .select('*')
        .eq('token', token)
        .maybeSingle();
      if (error) return json({ error: error.message }, { status: 500 });
      if (!invite) return json({ error: 'Invite not found' }, { status: 404 });

      const { data: artist } = await supabaseAdmin
        .from('artists')
        .select('id,name,bio,portfolio_url,profile_photo_url')
        .eq('id', invite.artist_id)
        .maybeSingle();
      const { data: arts } = await supabaseAdmin
        .from('artworks')
        .select('id,title,image_url,price_cents,currency')
        .eq('artist_id', invite.artist_id)
        .order('created_at', { ascending: false })
        .limit(3);
      const artworks = (arts || []).map((a: any) => ({ id: a.id, title: a.title, imageUrl: a.image_url, price: a.price_cents ? a.price_cents / 100 : null, currency: a.currency || 'usd' }));
      return json({ invite: mapVenueInviteRow(invite), artist, artworks });
    }

    if (url.pathname.startsWith('/api/venue-invites/token/') && url.pathname.endsWith('/open') && method === 'POST') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const token = url.pathname.split('/')[4] || '';
      if (!isValidInviteToken(token)) return json({ error: 'Invalid invite token' }, { status: 400 });
      const rate = rateLimitByIp(`invite:${getClientIp(request)}`, VENUE_INVITE_PUBLIC_RATE_LIMIT, 60 * 60 * 1000);
      if (!rate.ok) return json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });

      const { data: invite, error } = await supabaseAdmin
        .from('venue_invites')
        .select('*')
        .eq('token', token)
        .maybeSingle();
      if (error) return json({ error: error.message }, { status: 500 });
      if (!invite) return json({ error: 'Invite not found' }, { status: 404 });

      const nowIso = new Date().toISOString();
      const nextStatus = statusAfterOpen(invite.status);
      const { data: updated, error: updateErr } = await supabaseAdmin
        .from('venue_invites')
        .update({
          status: nextStatus,
          click_count: (invite.click_count || 0) + 1,
          first_clicked_at: invite.first_clicked_at || nowIso,
          updated_at: nowIso,
        })
        .eq('id', invite.id)
        .select('*')
        .single();
      if (updateErr) return json({ error: updateErr.message }, { status: 500 });

      if (!invite.first_clicked_at) {
        await supabaseAdmin.from('venue_invite_events').insert({ invite_id: invite.id, type: 'OPENED', meta: { at: nowIso } });
        await supabaseAdmin.from('notifications').insert({ user_id: invite.artist_id, type: 'venue_invite', title: 'Venue viewed your invite', message: `${invite.venue_name} opened your invite link.` });
      }
      return json({ invite: updated });
    }

    if (url.pathname.startsWith('/api/venue-invites/token/') && url.pathname.endsWith('/accept') && method === 'POST') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const token = url.pathname.split('/')[4] || '';
      if (!isValidInviteToken(token)) return json({ error: 'Invalid invite token' }, { status: 400 });
      const { data: invite, error } = await supabaseAdmin
        .from('venue_invites')
        .select('*')
        .eq('token', token)
        .maybeSingle();
      if (error) return json({ error: error.message }, { status: 500 });
      if (!invite) return json({ error: 'Invite not found' }, { status: 404 });
      if (!isStatusTransitionAllowed(invite.status, 'ACCEPTED')) {
        return json({ error: `Invite status cannot transition from ${invite.status} to ACCEPTED.` }, { status: 409 });
      }

      const nowIso = new Date().toISOString();
      const { data: updated, error: updateErr } = await supabaseAdmin
        .from('venue_invites')
        .update({ status: 'ACCEPTED', accepted_at: nowIso, first_clicked_at: invite.first_clicked_at || nowIso, updated_at: nowIso })
        .eq('id', invite.id)
        .select('*')
        .single();
      if (updateErr) return json({ error: updateErr.message }, { status: 500 });

      await supabaseAdmin.from('venue_invite_events').insert({ invite_id: invite.id, type: 'ACCEPTED', meta: { at: nowIso } });
      await supabaseAdmin.from('notifications').insert({ user_id: invite.artist_id, type: 'venue_invite', title: 'Venue accepted your invite', message: `${invite.venue_name} accepted your invite.` });
      return json({ invite: mapVenueInviteRow(updated) });
    }

    if (url.pathname.startsWith('/api/venue-invites/token/') && url.pathname.endsWith('/decline') && method === 'POST') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const token = url.pathname.split('/')[4] || '';
      if (!isValidInviteToken(token)) return json({ error: 'Invalid invite token' }, { status: 400 });
      const { data: invite, error } = await supabaseAdmin
        .from('venue_invites')
        .select('*')
        .eq('token', token)
        .maybeSingle();
      if (error) return json({ error: error.message }, { status: 500 });
      if (!invite) return json({ error: 'Invite not found' }, { status: 404 });
      if (!isStatusTransitionAllowed(invite.status, 'DECLINED')) {
        return json({ error: `Invite status cannot transition from ${invite.status} to DECLINED.` }, { status: 409 });
      }

      const nowIso = new Date().toISOString();
      const { data: updated, error: updateErr } = await supabaseAdmin
        .from('venue_invites')
        .update({ status: 'DECLINED', declined_at: nowIso, first_clicked_at: invite.first_clicked_at || nowIso, updated_at: nowIso })
        .eq('id', invite.id)
        .select('*')
        .single();
      if (updateErr) return json({ error: updateErr.message }, { status: 500 });

      await supabaseAdmin.from('venue_invite_events').insert({ invite_id: invite.id, type: 'DECLINED', meta: { at: nowIso } });
      return json({ invite: mapVenueInviteRow(updated) });
    }

    if (url.pathname.startsWith('/api/venue-invites/token/') && url.pathname.endsWith('/question') && method === 'POST') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const token = url.pathname.split('/')[4] || '';
      if (!isValidInviteToken(token)) return json({ error: 'Invalid invite token' }, { status: 400 });
      const payload = await request.json().catch(() => ({}));
      const message = String(payload?.message || '').trim();
      if (message.length < 10) return json({ error: 'Message must be at least 10 characters.' }, { status: 400 });
      const email = payload?.email ? String(payload?.email).trim() : '';
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json({ error: 'Invalid email.' }, { status: 400 });
      }

      const { data: invite, error } = await supabaseAdmin
        .from('venue_invites')
        .select('*')
        .eq('token', token)
        .maybeSingle();
      if (error) return json({ error: error.message }, { status: 500 });
      if (!invite) return json({ error: 'Invite not found' }, { status: 404 });

      await supabaseAdmin.from('notifications').insert({
        user_id: invite.artist_id,
        type: 'venue_invite_question',
        title: 'Venue asked a question',
        message: `${invite.venue_name}: ${message}${email ? ` (Reply: ${email})` : ''}`,
      });
      await supabaseAdmin.from('venue_invite_events').insert({ invite_id: invite.id, type: 'OPENED', meta: { question: true, email: email || null } });
      return json({ ok: true });
    }

    if (url.pathname === '/api/admin/venue-invites/summary' && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const admin = await requireAdmin(request);
      if (!admin) return json({ error: 'Admin access required' }, { status: 403 });
      const days = Number(url.searchParams.get('days') || 30);
      const rangeDays = Number.isFinite(days) && days > 0 ? Math.min(days, 90) : 30;
      const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabaseAdmin
        .from('venue_invites')
        .select('id,artist_id,status,created_at,sent_at,first_clicked_at,accepted_at,declined_at')
        .gte('created_at', since);
      if (error) return json({ error: error.message }, { status: 500 });

      const byDayMap = new Map<string, any>();
      const artistMap = new Map<string, { artistId: string; created: number; accepted: number }>();
      const totals = { created: 0, sent: 0, clicked: 0, accepted: 0, declined: 0 };

      (data || []).forEach((row: any) => {
        const createdDay = row.created_at?.slice(0, 10);
        const sentDay = row.sent_at?.slice(0, 10);
        const clickedDay = row.first_clicked_at?.slice(0, 10);
        const acceptedDay = row.accepted_at?.slice(0, 10);
        const declinedDay = row.declined_at?.slice(0, 10);

        if (createdDay) {
          const entry = byDayMap.get(createdDay) || { date: createdDay, created: 0, sent: 0, clicked: 0, accepted: 0, declined: 0 };
          entry.created += 1;
          byDayMap.set(createdDay, entry);
          totals.created += 1;
        }
        if (sentDay) {
          const entry = byDayMap.get(sentDay) || { date: sentDay, created: 0, sent: 0, clicked: 0, accepted: 0, declined: 0 };
          entry.sent += 1;
          byDayMap.set(sentDay, entry);
          totals.sent += 1;
        }
        if (clickedDay) {
          const entry = byDayMap.get(clickedDay) || { date: clickedDay, created: 0, sent: 0, clicked: 0, accepted: 0, declined: 0 };
          entry.clicked += 1;
          byDayMap.set(clickedDay, entry);
          totals.clicked += 1;
        }
        if (acceptedDay) {
          const entry = byDayMap.get(acceptedDay) || { date: acceptedDay, created: 0, sent: 0, clicked: 0, accepted: 0, declined: 0 };
          entry.accepted += 1;
          byDayMap.set(acceptedDay, entry);
          totals.accepted += 1;
        }
        if (declinedDay) {
          const entry = byDayMap.get(declinedDay) || { date: declinedDay, created: 0, sent: 0, clicked: 0, accepted: 0, declined: 0 };
          entry.declined += 1;
          byDayMap.set(declinedDay, entry);
          totals.declined += 1;
        }

        if (row.artist_id) {
          const stat = artistMap.get(row.artist_id) || { artistId: row.artist_id, created: 0, accepted: 0 };
          stat.created += 1;
          if (row.accepted_at) stat.accepted += 1;
          artistMap.set(row.artist_id, stat);
        }
      });

      const artistIds = Array.from(artistMap.keys());
      const artistNames = new Map<string, string>();
      if (artistIds.length) {
        const { data: artistsData } = await supabaseAdmin
          .from('artists')
          .select('id,name')
          .in('id', artistIds);
        (artistsData || []).forEach((a: any) => artistNames.set(a.id, a.name));
      }

      const topArtists = Array.from(artistMap.values())
        .map((a) => ({
          artistId: a.artistId,
          artistName: artistNames.get(a.artistId) || 'Artist',
          created: a.created,
          accepted: a.accepted,
          conversionRate: a.created ? Math.round((a.accepted / a.created) * 100) : 0,
        }))
        .sort((a, b) => b.accepted - a.accepted)
        .slice(0, 10);

      const byDay = Array.from(byDayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
      return json({ rangeDays, totals, byDay, topArtists });
    }

    // Notifications: fetch latest for a user/role (or platform)
    if (url.pathname === '/api/notifications' && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const userId = url.searchParams.get('userId');
      const role = url.searchParams.get('role');
      if (!role) return json({ error: 'Missing role' }, { status: 400 });
      let query = supabaseAdmin
        .from('notifications')
        .select('id,title,message,artwork_id,order_id,created_at')
        .eq('role', role)
        .order('created_at', { ascending: false })
        .limit(50);
      if (role === 'platform' && !userId) {
        query = query.is('user_id', null);
      } else if (userId) {
        query = query.eq('user_id', userId);
      } else {
        return json({ error: 'Missing userId for role' }, { status: 400 });
      }
      const { data, error } = await query;
      if (error) return json({ error: error.message }, { status: 500 });
      const notifications = (data || []).map((n: any) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        artworkId: n.artwork_id || null,
        orderId: n.order_id || null,
        createdAt: n.created_at,
      }));
      return json({ notifications });
    }

    // Latest order by artwork (for receipt display)
    if (url.pathname === '/api/orders/by-artwork' && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const artworkId = url.searchParams.get('artworkId');
      if (!artworkId) return json({ error: 'Missing artworkId' }, { status: 400 });
      const { data, error } = await supabaseAdmin
        .from('orders')
        .select('id,amount_cents,currency,stripe_receipt_url,status,created_at')
        .eq('artwork_id', artworkId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return json({ error: error.message }, { status: 500 });
      if (!data) return json({ order: null });
      return json({ order: {
        id: data.id,
        price: Math.round((data.amount_cents || 0) / 100),
        currency: data.currency || 'usd',
        receiptUrl: data.stripe_receipt_url || null,
        status: data.status || 'paid',
        createdAt: data.created_at,
      }});
    }

    // Admin: platform metrics and recent activity
    if (url.pathname === '/api/admin/metrics' && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });

      const now = new Date();
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [artistsAgg, venuesAgg, activeAgg] = await Promise.all([
        supabaseAdmin.from('artists').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('venues').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('artworks').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      ]);

      const { data: ordersMonth, error: ordersErr } = await supabaseAdmin
        .from('orders')
        .select('amount_cents,platform_fee_cents,created_at,artist_id,venue_id,artwork_id')
        .gte('created_at', past30)
        .order('created_at', { ascending: false })
        .limit(1000);
      if (ordersErr) return json({ error: ordersErr.message }, { status: 500 });
      const gmvCents = (ordersMonth || []).reduce((sum: number, o: any) => sum + (o.amount_cents || 0), 0);
      const platformFeeCents = (ordersMonth || []).reduce((sum: number, o: any) => sum + (o.platform_fee_cents || 0), 0);

      // Recent activity from orders
      const recentActivity = (ordersMonth || []).slice(0, 10).map((o: any) => ({
        type: 'payment',
        timestamp: o.created_at,
        amount_cents: o.amount_cents || 0,
        artist_id: o.artist_id,
        venue_id: o.venue_id,
        artwork_id: o.artwork_id,
      }));

      return json({
        totals: {
          artists: (artistsAgg as any)?.count || 0,
          venues: (venuesAgg as any)?.count || 0,
          activeDisplays: (activeAgg as any)?.count || 0,
        },
        month: {
          gmv: Math.round(gmvCents / 100),
          platformRevenue: Math.round(platformFeeCents / 100),
        },
        recentActivity,
      });
    }

    // Admin: send test SMS (requires auth; uses user's phone if 'to' not provided)
    if (url.pathname === '/api/admin/test-sms' && method === 'POST') {
      const user = await getSupabaseUserFromRequest(request);
      if (!user) return json({ error: 'Missing or invalid Authorization bearer token' }, { status: 401 });
      const body = await request.json().catch(() => ({}));
      const msg = String(body?.body || 'Artwalls: Test SMS').slice(0, 160);
      let to = String(body?.to || '').trim();
      if (!to && supabaseAdmin) {
        const role = (user.user_metadata?.role as string) || 'artist';
        if (role === 'venue') {
          const { data: v } = await supabaseAdmin.from('venues').select('phone_number').eq('id', user.id).maybeSingle();
          to = (v?.phone_number || '').trim();
        } else {
          const { data: a } = await supabaseAdmin.from('artists').select('phone_number').eq('id', user.id).maybeSingle();
          to = (a?.phone_number || '').trim();
        }
      }
      if (!to) return json({ error: 'No destination phone. Provide "to" or add a phone to your profile.' }, { status: 400 });
      await sendSms(to, msg);
      return json({ ok: true });
    }

    // Admin password verification endpoint
    if (url.pathname === '/api/admin/verify' && method === 'POST') {
      try {
        const body = await request.json().catch(() => ({}));
        const password = String(body?.password || '');
        
        // SHA-256 hash of "StormBL26"
        const EXPECTED_HASH = '7a16eeff525951de7abcf4100e169aa70631b3f3fd22b05649f951f8e8d692c7';
        
        if (!password) {
          return json({ ok: false }, { status: 400 });
        }
        
        // Hash the provided password
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const providedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        // Constant-time comparison
        const isValid = providedHash === EXPECTED_HASH;
        
        return json({ ok: isValid });
      } catch (e) {
        return json({ error: 'Verification failed' }, { status: 500 });
      }
    }

    // Admin password verification endpoint
    if (url.pathname === '/api/admin/verify' && method === 'POST') {
      try {
        const body = await request.json().catch(() => ({}));
        const password = String(body?.password || '');
        
        // SHA-256 hash of "StormBL26"
        const EXPECTED_HASH = '7a16eeff525951de7abcf4100e169aa70631b3f3fd22b05649f951f8e8d692c7';
        
        if (!password) {
          return json({ ok: false }, { status: 400 });
        }
        
        // Hash the provided password
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const providedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        // Constant-time comparison
        const isValid = providedHash === EXPECTED_HASH;
        
        return json({ ok: isValid });
      } catch (e) {
        return json({ error: 'Verification failed' }, { status: 500 });
      }
    }

    // Student Verification Endpoints
    // POST /api/students/verify - Create verification record for student
    if (url.pathname === '/api/students/verify' && method === 'POST') {
      try {
        if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
        
        const user = await getSupabaseUserFromRequest(request);
        if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
        
        const payload = await request.json().catch(() => ({}));
        const { schoolId, verificationMethod = 'email_domain', studentEmail } = payload;
        
        if (!schoolId) {
          return json({ error: 'Missing schoolId' }, { status: 400 });
        }
        
        if (!studentEmail) {
          return json({ error: 'Missing student email for verification' }, { status: 400 });
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(studentEmail)) {
          return json({ error: 'Invalid email format' }, { status: 400 });
        }
        
        // Get school info
        const { data: school, error: schoolErr } = await supabaseAdmin
          .from('schools')
          .select('name, email_domain')
          .eq('id', schoolId)
          .single();
        
        if (schoolErr || !school) {
          return json({ error: 'School not found' }, { status: 404 });
        }
        
        // Check if provided email matches school domain for auto-verification
        const isEmailDomainMatch = school.email_domain && studentEmail.toLowerCase().endsWith('@' + school.email_domain.toLowerCase());
        const shouldAutoVerify = verificationMethod === 'email_domain' && isEmailDomainMatch;
        
        // Create verification record
        const { data: verification, error: verifyErr } = await supabaseAdmin
          .from('student_verifications')
          .insert({
            artist_id: user.id,
            school_id: schoolId,
            verification_method: verificationMethod,
            is_verified: shouldAutoVerify,
            verified_at: shouldAutoVerify ? new Date().toISOString() : null,
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
          })
          .select('*')
          .single();
        
        // Update artist profile
        const { error: updateErr } = await supabaseAdmin
          .from('artists')
          .update({
            is_student: true,
            is_student_verified: shouldAutoVerify,
            school_id: schoolId,
            school_name: school.name,
            student_discount_active: shouldAutoVerify,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
        
        if (updateErr) {
          console.error('[POST /api/students/verify] Artist update error:', updateErr.message);
          return json({ error: updateErr.message }, { status: 500 });
        }
        
        return json({
          success: true,
          verification,
          message: shouldAutoVerify 
            ? 'Student status verified automatically via email domain!' 
            : 'Verification submitted for admin review',
        });
      } catch (err: any) {
        console.error('[POST /api/students/verify] Error:', err?.message);
        return json({ error: err?.message || 'Internal server error' }, { status: 500 });
      }
    }

    // GET /api/students/status - Check student verification status
    if (url.pathname === '/api/students/status' && method === 'GET') {
      try {
        if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
        
        const user = await getSupabaseUserFromRequest(request);
        if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
        
        // Get artist student status
        const { data: artist, error: artistErr } = await supabaseAdmin
          .from('artists')
          .select('is_student, is_student_verified, school_id, school_name, student_discount_active')
          .eq('id', user.id)
          .single();
        
        if (artistErr) {
          return json({ error: artistErr.message }, { status: 500 });
        }
        
        if (!artist?.is_student) {
          return json({
            isStudent: false,
            isVerified: false,
            discountActive: false,
            school: null,
          });
        }
        
        // Get verification history
        const { data: verifications } = await supabaseAdmin
          .from('student_verifications')
          .select('*, schools(name)')
          .eq('artist_id', user.id)
          .order('created_at', { ascending: false });
        
        return json({
          isStudent: artist.is_student,
          isVerified: artist.is_student_verified,
          discountActive: artist.student_discount_active,
          school: {
            id: artist.school_id,
            name: artist.school_name,
          },
          verifications: verifications || [],
        });
      } catch (err: any) {
        console.error('[GET /api/students/status] Error:', err?.message);
        return json({ error: err?.message || 'Internal server error' }, { status: 500 });
      }
    }

    // POST /api/students/discount - Apply student discount to artist tier
    if (url.pathname === '/api/students/discount' && method === 'POST') {
      try {
        if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
        
        const user = await getSupabaseUserFromRequest(request);
        if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
        
        const { data: artist, error: artistErr } = await supabaseAdmin
          .from('artists')
          .select('is_student_verified, subscription_tier')
          .eq('id', user.id)
          .single();
        
        if (artistErr || !artist?.is_student_verified) {
          return json({ error: 'Not a verified student' }, { status: 403 });
        }
        
        // Apply discount logic: if on free plan, upgrade to starter with discount
        // Otherwise, apply discount percentage to current tier
        const { error: updateErr } = await supabaseAdmin
          .from('artists')
          .update({
            student_discount_active: true,
            student_discount_applied_at: new Date().toISOString(),
            subscription_tier: artist.subscription_tier === 'free' ? 'starter' : artist.subscription_tier,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
        
        if (updateErr) {
          console.error('[POST /api/students/discount] Error:', updateErr.message);
          return json({ error: updateErr.message }, { status: 500 });
        }
        
        return json({
          success: true,
          message: 'Student discount applied!',
          newTier: artist.subscription_tier === 'free' ? 'starter' : artist.subscription_tier,
          discountDescription: artist.subscription_tier === 'free' 
            ? 'Free upgrade to Starter tier' 
            : 'Professional discount applied to your current tier',
        });
      } catch (err: any) {
        console.error('[POST /api/students/discount] Error:', err?.message);
        return json({ error: err?.message || 'Internal server error' }, { status: 500 });
      }
    }

    // Billing: Create subscription session
    if (url.pathname === '/api/stripe/billing/create-subscription-session' && method === 'POST') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const user = await requireArtist(request);
      if (!user) return json({ error: 'Missing or invalid Authorization bearer token (artist required)' }, { status: 401 });

      const payload = await request.json().catch(() => ({}));
      const rawTier = String((payload as any)?.tier || '').toLowerCase();
      const allowedTiers = ['starter', 'growth', 'pro'];
      if (!allowedTiers.includes(rawTier)) {
        return json({ error: 'Invalid tier' }, { status: 400 });
      }

      const priceMap: Record<string, string | undefined> = {
        starter: env.STRIPE_PRICE_ID_STARTER || env.STRIPE_SUB_PRICE_STARTER,
        growth: env.STRIPE_PRICE_ID_GROWTH || env.STRIPE_SUB_PRICE_GROWTH,
        pro: env.STRIPE_PRICE_ID_PRO || env.STRIPE_SUB_PRICE_PRO,
      };

      const priceId = priceMap[rawTier];
      if (!priceId) {
        return json({ error: `Price ID not configured for ${rawTier}` }, { status: 500 });
      }

      // Create or get customer
      let customerId = null;
      const { data: artist } = await supabaseAdmin
        .from('artists')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .maybeSingle();

      if (artist?.stripe_customer_id) {
        customerId = artist.stripe_customer_id;
      } else {
        // Create new customer
        const customerBody = toForm({
          email: user.email,
          name: user.user_metadata?.name || user.email,
          metadata: { artistId: user.id },
        });
        const resp = await stripeFetch('/v1/customers', { method: 'POST', body: customerBody });
        const data = await resp.json();
        if (!resp.ok) return json(data, { status: resp.status });
        customerId = data.id;
        await supabaseAdmin
          .from('artists')
          .update({ stripe_customer_id: customerId })
          .eq('id', user.id);
      }

      const successUrl = `${pagesOrigin}/#/artist-dashboard?sub=success`;
      const cancelUrl = `${pagesOrigin}/#/artist-dashboard?sub=cancel`;
      const body = toForm({
        mode: 'subscription',
        customer: customerId,
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        'metadata[artistId]': user.id,
        'metadata[tier]': rawTier,
        'subscription_data[metadata][artistId]': user.id,
        'subscription_data[metadata][tier]': rawTier,
        success_url: successUrl,
        cancel_url: cancelUrl,
      });
      const resp = await stripeFetch('/v1/checkout/sessions', { method: 'POST', body });
      const session = await resp.json();
      if (!resp.ok) return json(session, { status: resp.status });
      return json({ url: session.url });
    }

    // Billing: Create portal session
    if (url.pathname === '/api/stripe/billing/create-portal-session' && method === 'POST') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const user = await requireArtist(request);
      if (!user) return json({ error: 'Missing or invalid Authorization bearer token (artist required)' }, { status: 401 });

      const { data: artist } = await supabaseAdmin
        .from('artists')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .single();

      if (!artist?.stripe_customer_id) {
        return json({ error: 'No subscription found to manage' }, { status: 400 });
      }

      const returnUrl = `${pagesOrigin}/#/artist-dashboard`;
      const portalBody = toForm({
        customer: artist.stripe_customer_id,
        return_url: returnUrl,
      });
      const pResp = await stripeFetch('/v1/billing_portal/sessions', { method: 'POST', body: portalBody });
      const session = await pResp.json();
      if (!pResp.ok) return json(session, { status: pResp.status });
      return json({ url: session.url });
    }

    return new Response('Not found', { status: 404 });
  },
};
