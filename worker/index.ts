import { verifyAndParseStripeEvent } from './stripeWebhook';
import { mergeTransferRecords } from './orderSettlement';
import {
  calculatePricingBreakdown,
  calculateApplicationFeeCents,
  calculatePlatformFeeBps,
  calculateVenueFeeBps,
  normalizeArtistTier,
} from '../src/lib/pricingCalculations';
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
  REFERRAL_DAILY_LIMIT?: string;
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
    const REFERRAL_DAILY_LIMIT = Number(env.REFERRAL_DAILY_LIMIT || 5);
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

    function generateReferralToken(): string {
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      const base64 = btoa(String.fromCharCode(...bytes));
      return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    function isValidEmail(email: string): boolean {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
    }

    function applyProOverride(profile: any) {
      if (!profile) return { profile, hasProOverride: false };
      const proUntil = profile?.pro_until ? new Date(profile.pro_until).getTime() : 0;
      const hasProOverride = !!proUntil && proUntil > Date.now();
      if (!hasProOverride) return { profile, hasProOverride };
      return {
        profile: { ...profile, subscription_tier: 'pro', subscription_status: 'active' },
        hasProOverride,
      };
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

    async function upsertVenue(venue: { id: string; email?: string | null; name?: string | null; type?: string | null; phoneNumber?: string | null; city?: string | null; stripeAccountId?: string | null; defaultVenueFeeBps?: number | null; labels?: any; suspended?: boolean | null; bio?: string | null; coverPhotoUrl?: string | null; }): Promise<Response> {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured - check SUPABASE_SERVICE_ROLE_KEY secret' }, { status: 500 });
      const payload: Record<string, any> = {
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
      // Only include bio if provided (avoid overwriting with null)
      if (venue.bio !== undefined && venue.bio !== null) {
        payload.bio = venue.bio;
      }
      // Only include cover_photo_url if provided
      if (venue.coverPhotoUrl !== undefined && venue.coverPhotoUrl !== null) {
        payload.cover_photo_url = venue.coverPhotoUrl;
      }
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
        supabaseAdmin.from('artists').select('subscription_tier,subscription_status,pro_until').eq('id', artistId).maybeSingle(),
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
      const subscriptionTier = String(hasProOverride ? 'pro' : (artist?.subscription_tier || 'free')).toLowerCase();
      const subscriptionStatus = String(hasProOverride ? 'active' : (artist?.subscription_status || '')).toLowerCase();
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
      const { profile, hasProOverride } = applyProOverride(data);
      return json({ role: 'artist', profile, proOverride: hasProOverride });
    }

    if (url.pathname === '/api/me' && method === 'GET') {
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
      const { profile, hasProOverride } = applyProOverride(data);
      return json({ role: 'artist', profile, proOverride: hasProOverride });
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
        .select('id,title,status,price_cents,currency,image_url,artist_id,venue_id,artist_name,venue_name,description,purchase_url,qr_svg')
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
        venueId: (data as any).venue_id || null,
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
      const imageUrlsRaw = Array.isArray(payload?.imageUrls) ? payload.imageUrls : [];
      const imageUrls = imageUrlsRaw.map((u: any) => String(u || '').trim()).filter(Boolean);
      const primaryImageUrl = String(payload?.imageUrl || imageUrls[0] || '').trim() || null;
      const normalizedImageUrls = primaryImageUrl
        ? [primaryImageUrl, ...imageUrls.filter((u: string) => u !== primaryImageUrl)]
        : imageUrls;
      const dimensionsWidth = Number(payload?.dimensionsWidth);
      const dimensionsHeight = Number(payload?.dimensionsHeight);
      const dimensionsDepth = payload?.dimensionsDepth !== undefined && payload?.dimensionsDepth !== ''
        ? Number(payload?.dimensionsDepth)
        : null;
      const dimensionsUnit = String(payload?.dimensionsUnit || '').trim();
      const medium = String(payload?.medium || '').trim();
      const materials = String(payload?.materials || '').trim();
      const condition = String(payload?.condition || '').trim();
      const knownFlaws = String(payload?.knownFlaws || '').trim();
      const editionType = String(payload?.editionType || '').trim();
      const editionSize = payload?.editionSize !== undefined && payload?.editionSize !== ''
        ? Number(payload?.editionSize)
        : null;
      const shippingTimeEstimate = String(payload?.shippingTimeEstimate || '').trim();

      const allowedConditions = new Set(['new', 'excellent', 'good', 'fair']);
      const allowedEditionTypes = new Set(['original', 'print']);
      const isPublishable =
        price_cents > 0 &&
        Number.isFinite(dimensionsWidth) && dimensionsWidth > 0 &&
        Number.isFinite(dimensionsHeight) && dimensionsHeight > 0 &&
        Boolean(dimensionsUnit) &&
        Boolean(medium) &&
        Boolean(knownFlaws) &&
        Boolean(shippingTimeEstimate) &&
        allowedConditions.has(condition) &&
        allowedEditionTypes.has(editionType) &&
        (editionType !== 'print' || (Number.isFinite(editionSize) && Number(editionSize) > 0)) &&
        normalizedImageUrls.length >= 3;

      if (!isPublishable) {
        return json({ error: 'Missing required listing details. Please complete dimensions, medium, condition, flaws, edition info, shipping estimate, and at least 3 photos.' }, { status: 400 });
      }
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
        image_url: primaryImageUrl,
        image_urls: normalizedImageUrls,
        dimensions_width: Number.isFinite(dimensionsWidth) ? dimensionsWidth : null,
        dimensions_height: Number.isFinite(dimensionsHeight) ? dimensionsHeight : null,
        dimensions_depth: Number.isFinite(Number(dimensionsDepth)) ? dimensionsDepth : null,
        dimensions_unit: dimensionsUnit || null,
        medium: medium || null,
        materials: materials || null,
        condition: condition || null,
        known_flaws: knownFlaws || null,
        edition_type: editionType || null,
        edition_size: Number.isFinite(Number(editionSize)) ? editionSize : null,
        shipping_time_estimate: shippingTimeEstimate || null,
        in_space_photo_url: payload?.inSpacePhotoUrl || null,
        color_accuracy_ack: Boolean(payload?.colorAccuracyAck),
        is_publishable: true,
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

    // Analytics events (append-only)
    if (url.pathname === '/api/events' && method === 'POST') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const payload = await request.json().catch(() => ({}));
      const eventType = String(payload?.event_type || '').trim();
      if (!eventType) return json({ error: 'Missing event_type' }, { status: 400 });
      const allowed = new Set(['qr_scan', 'view_artwork', 'start_checkout', 'purchase', 'like']);
      if (!allowed.has(eventType)) return json({ error: 'Invalid event_type' }, { status: 400 });

      const rate = rateLimitByIp(getClientIp(request), 60, 60_000);
      if (!rate.ok) return json({ error: 'Rate limit exceeded' }, { status: 429 });

      const user = await getSupabaseUserFromRequest(request);
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
        city: payload?.city || null,
        bio: payload?.bio || null,
        labels: payload?.labels || null,
        coverPhotoUrl: payload?.coverPhoto || payload?.coverPhotoUrl || null,
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

    function toCents(value: unknown): number {
      const num = Number(value);
      if (!Number.isFinite(num)) return 0;
      return Math.max(0, Math.round(num));
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

    // Calls for Art (venue + public)
    if (url.pathname === '/api/calls' && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const venueId = url.searchParams.get('venueId');
      const status = url.searchParams.get('status') || 'open';
      let query = supabaseAdmin.from('calls_for_art').select('*').order('created_at', { ascending: false });
      if (venueId) query = query.eq('venue_id', venueId);
      if (!venueId) query = query.eq('status', status);
      const { data, error } = await query.limit(100);
      if (error) return json({ error: error.message }, { status: 500 });
      return json({ calls: data || [] });
    }

    if (url.pathname === '/api/calls' && method === 'POST') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const venue = await requireVenue(request);
      if (!venue) return json({ error: 'Venue access required' }, { status: 403 });
      const payload = await request.json().catch(() => ({}));
      const nowIso = new Date().toISOString();
      const insert = {
        venue_id: venue.id,
        title: String(payload?.title || '').trim(),
        description: payload?.description || null,
        wall_constraints: payload?.wallConstraints || null,
        max_dimensions: payload?.maxDimensions || null,
        max_pieces: payload?.maxPieces ? Number(payload.maxPieces) : null,
        preferred_tags: Array.isArray(payload?.preferredTags) ? payload.preferredTags : [],
        price_min_cents: payload?.priceMin ? Math.round(Number(payload.priceMin) * 100) : null,
        price_max_cents: payload?.priceMax ? Math.round(Number(payload.priceMax) * 100) : null,
        submission_deadline: payload?.submissionDeadline || null,
        install_window_start: payload?.installWindowStart || null,
        install_window_end: payload?.installWindowEnd || null,
        show_start: payload?.showStart || null,
        show_end: payload?.showEnd || null,
        submission_fee_cents: payload?.submissionFee ? Math.round(Number(payload.submissionFee) * 100) : 0,
        max_applications: payload?.maxApplications ? Number(payload.maxApplications) : null,
        status: payload?.status || 'open',
        created_at: nowIso,
        updated_at: nowIso,
      };
      if (!insert.title) return json({ error: 'Title is required' }, { status: 400 });
      const { data, error } = await supabaseAdmin.from('calls_for_art').insert(insert).select('*').single();
      if (error) return json({ error: error.message }, { status: 500 });
      return json({ call: data });
    }

    if (url.pathname.startsWith('/api/calls/') && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const parts = url.pathname.split('/');
      const callId = parts[3];
      if (!callId) return json({ error: 'Missing call id' }, { status: 400 });
      const { data, error } = await supabaseAdmin
        .from('calls_for_art')
        .select('*')
        .eq('id', callId)
        .maybeSingle();
      if (error) return json({ error: error.message }, { status: 500 });
      if (!data) return json({ error: 'Not found' }, { status: 404 });
      return json({ call: data });
    }

    if (url.pathname.startsWith('/api/calls/') && url.pathname.endsWith('/applications') && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const venue = await requireVenue(request);
      if (!venue) return json({ error: 'Venue access required' }, { status: 403 });
      const parts = url.pathname.split('/');
      const callId = parts[3];
      if (!callId) return json({ error: 'Missing call id' }, { status: 400 });
      const { data: call } = await supabaseAdmin.from('calls_for_art').select('venue_id').eq('id', callId).maybeSingle();
      if (!call || call.venue_id !== venue.id) return json({ error: 'Not authorized' }, { status: 403 });
      const { data, error } = await supabaseAdmin
        .from('call_applications')
        .select('*')
        .eq('call_id', callId)
        .order('created_at', { ascending: false });
      if (error) return json({ error: error.message }, { status: 500 });
      return json({ applications: data || [] });
    }

    if (url.pathname.startsWith('/api/calls/') && url.pathname.endsWith('/apply') && method === 'POST') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const artist = await requireArtist(request);
      if (!artist) return json({ error: 'Artist access required' }, { status: 403 });
      const parts = url.pathname.split('/');
      const callId = parts[3];
      if (!callId) return json({ error: 'Missing call id' }, { status: 400 });
      const payload = await request.json().catch(() => ({}));

      const { data: call, error: callErr } = await supabaseAdmin
        .from('calls_for_art')
        .select('*')
        .eq('id', callId)
        .maybeSingle();
      if (callErr) return json({ error: callErr.message }, { status: 500 });
      if (!call) return json({ error: 'Call not found' }, { status: 404 });
      if (call.status !== 'open') return json({ error: 'Call is not open' }, { status: 400 });

      const applicationId = crypto.randomUUID();
      const nowIso = new Date().toISOString();
      const insert = {
        id: applicationId,
        call_id: callId,
        artist_user_id: artist.id,
        statement: payload?.statement || null,
        portfolio_url: payload?.portfolioUrl || null,
        selected_artwork_ids: Array.isArray(payload?.selectedArtworkIds) ? payload.selectedArtworkIds : [],
        additional_image_urls: Array.isArray(payload?.additionalImageUrls) ? payload.additionalImageUrls : [],
        status: 'submitted',
        paid: false,
        amount_paid_cents: call.submission_fee_cents || 0,
        created_at: nowIso,
        updated_at: nowIso,
      };

      const { error: insertErr } = await supabaseAdmin.from('call_applications').insert(insert);
      if (insertErr) return json({ error: insertErr.message }, { status: 500 });

      if (call.submission_fee_cents && call.submission_fee_cents > 0) {
        const successUrl = `${pagesOrigin}/#/calls/${callId}?payment=success&application=${applicationId}`;
        const cancelUrl = `${pagesOrigin}/#/calls/${callId}?payment=cancel`;
        const sessionForm = toForm({
          mode: 'payment',
          success_url: successUrl,
          cancel_url: cancelUrl,
          'line_items[0][price_data][currency]': 'usd',
          'line_items[0][price_data][unit_amount]': String(call.submission_fee_cents),
          'line_items[0][price_data][product_data][name]': `Submission Fee: ${call.title}`,
          'line_items[0][quantity]': '1',
          'metadata[paymentType]': 'submission_fee',
          'metadata[applicationId]': applicationId,
          'metadata[callId]': callId,
        });
        const resp = await stripeFetch('/v1/checkout/sessions', {
          method: 'POST',
          body: sessionForm,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const session = await resp.json();
        if (!resp.ok) return json(session, { status: resp.status });
        await supabaseAdmin.from('call_applications').update({ stripe_checkout_session_id: session.id }).eq('id', applicationId);
        return json({ url: session.url, applicationId });
      }

      return json({ applicationId });
    }

    if (url.pathname.startsWith('/api/calls/') && url.pathname.includes('/applications/') && url.pathname.endsWith('/status') && method === 'POST') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const venue = await requireVenue(request);
      if (!venue) return json({ error: 'Venue access required' }, { status: 403 });
      const parts = url.pathname.split('/');
      const callId = parts[3];
      const applicationId = parts[5];
      if (!callId || !applicationId) return json({ error: 'Missing ids' }, { status: 400 });
      const { data: call } = await supabaseAdmin.from('calls_for_art').select('venue_id').eq('id', callId).maybeSingle();
      if (!call || call.venue_id !== venue.id) return json({ error: 'Not authorized' }, { status: 403 });
      const payload = await request.json().catch(() => ({}));
      const status = String(payload?.status || '').trim();
      if (!status) return json({ error: 'Missing status' }, { status: 400 });
      const { error } = await supabaseAdmin
        .from('call_applications')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', applicationId);
      if (error) return json({ error: error.message }, { status: 500 });
      return json({ ok: true });
    }

    // Analytics summary endpoints
    if (url.pathname === '/api/analytics/artist' && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const artistId = url.searchParams.get('artistId');
      if (!artistId) return json({ error: 'Missing artistId' }, { status: 400 });
      const user = await getSupabaseUserFromRequest(request);
      if (!user || (user.user_metadata?.role !== 'admin' && user.id !== artistId)) {
        return json({ error: 'Unauthorized' }, { status: 403 });
      }

      const { data: arts } = await supabaseAdmin
        .from('artworks')
        .select('id,venue_id,title')
        .eq('artist_id', artistId);
      const artworkIds = (arts || []).map((a: any) => a.id);

      const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data: events } = artworkIds.length
        ? await supabaseAdmin
            .from('events')
            .select('event_type,artwork_id,venue_id,created_at')
            .in('artwork_id', artworkIds)
        : { data: [] };

      const counts = { week: 0, month: 0, total: 0, checkout: 0, purchase: 0 };
      const perArtwork: Record<string, { scans: number; views: number; checkouts: number; purchases: number }> = {};
      const perVenue: Record<string, { scans: number; purchases: number }> = {};

      (events || []).forEach((e: any) => {
        counts.total += 1;
        if (e.created_at >= since7) counts.week += 1;
        if (e.created_at >= since30) counts.month += 1;
        if (!perArtwork[e.artwork_id]) perArtwork[e.artwork_id] = { scans: 0, views: 0, checkouts: 0, purchases: 0 };
        if (e.event_type === 'qr_scan') perArtwork[e.artwork_id].scans += 1;
        if (e.event_type === 'view_artwork') perArtwork[e.artwork_id].views += 1;
        if (e.event_type === 'start_checkout') perArtwork[e.artwork_id].checkouts += 1;
        if (e.event_type === 'purchase') perArtwork[e.artwork_id].purchases += 1;
        if (e.venue_id) {
          if (!perVenue[e.venue_id]) perVenue[e.venue_id] = { scans: 0, purchases: 0 };
          if (e.event_type === 'qr_scan') perVenue[e.venue_id].scans += 1;
          if (e.event_type === 'purchase') perVenue[e.venue_id].purchases += 1;
        }
        if (e.event_type === 'start_checkout') counts.checkout += 1;
        if (e.event_type === 'purchase') counts.purchase += 1;
      });

      return json({
        cards: {
          scansWeek: counts.week,
          scansMonth: counts.month,
          conversion: counts.checkout ? Math.round((counts.purchase / counts.checkout) * 100) : 0,
        },
        perArtwork,
        perVenue,
      });
    }

    if (url.pathname === '/api/analytics/venue' && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const venueId = url.searchParams.get('venueId');
      if (!venueId) return json({ error: 'Missing venueId' }, { status: 400 });
      const user = await getSupabaseUserFromRequest(request);
      if (!user || (user.user_metadata?.role !== 'admin' && user.id !== venueId)) {
        return json({ error: 'Unauthorized' }, { status: 403 });
      }

      const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data: events } = await supabaseAdmin
        .from('events')
        .select('event_type,artwork_id,created_at')
        .eq('venue_id', venueId);

      const counts = { week: 0, month: 0, checkout: 0, purchase: 0 };
      const perArtwork: Record<string, { scans: number; purchases: number }> = {};

      (events || []).forEach((e: any) => {
        if (e.created_at >= since7) counts.week += 1;
        if (e.created_at >= since30) counts.month += 1;
        if (!perArtwork[e.artwork_id]) perArtwork[e.artwork_id] = { scans: 0, purchases: 0 };
        if (e.event_type === 'qr_scan') perArtwork[e.artwork_id].scans += 1;
        if (e.event_type === 'purchase') perArtwork[e.artwork_id].purchases += 1;
        if (e.event_type === 'start_checkout') counts.checkout += 1;
        if (e.event_type === 'purchase') counts.purchase += 1;
      });

      return json({
        cards: {
          scansWeek: counts.week,
          scansMonth: counts.month,
          conversion: counts.checkout ? Math.round((counts.purchase / counts.checkout) * 100) : 0,
        },
        perArtwork,
      });
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
        .select('id,title,price_cents,currency,status,artist_id,venue_id')
        .eq('id', artworkId)
        .maybeSingle();
      if (artErr) return json({ error: artErr.message }, { status: 500 });
      if (!art) return json({ error: 'Artwork not found' }, { status: 404 });
      if (art.status === 'sold') return json({ error: 'Artwork already sold' }, { status: 400 });

      const listPriceCents = toCents(art.price_cents);
      if (listPriceCents <= 0) {
        return json({ error: 'Invalid artwork price' }, { status: 400 });
      }

      const currency = String(art.currency || 'usd').toLowerCase();
      const success_url = `${allowOrigin}/#/purchase-${artworkId}?status=success`;
      const cancel_url = `${allowOrigin}/#/purchase-${artworkId}?status=cancel`;

      const { data: artist, error: artistErr } = art.artist_id
        ? await supabaseAdmin
            .from('artists')
            .select('id,stripe_account_id,subscription_tier,platform_fee_bps')
            .eq('id', art.artist_id)
            .maybeSingle()
        : { data: null, error: null };
      if (artistErr) return json({ error: artistErr.message }, { status: 500 });

      const { data: venue, error: venueErr } = art.venue_id
        ? await supabaseAdmin
            .from('venues')
            .select('id,stripe_account_id')
            .eq('id', art.venue_id)
            .maybeSingle()
        : { data: null, error: null };
      if (venueErr) return json({ error: venueErr.message }, { status: 500 });

      const artistTier = normalizeArtistTier(
        (payload?.artistTier ?? payload?.artistPlan) ||
          (artist?.subscription_tier ?? artist?.platform_fee_bps) ||
          'starter'
      );
      const breakdown = calculatePricingBreakdown(listPriceCents / 100, artistTier);
      const buyerFeeCents = breakdown.buyerFeeCents;
      const buyerTotalCents = breakdown.customerPaysCents;
      const venuePayoutCents = breakdown.venueCents;
      const artistPayoutCents = breakdown.artistCents;
      const platformRemainderCents = breakdown.platformRemainderCents;
      const platformFeeBps = calculatePlatformFeeBps(breakdown);
      const venueFeeBps = calculateVenueFeeBps(breakdown);
      const applicationFeeCents = calculateApplicationFeeCents(breakdown);

      const orderId = crypto.randomUUID();
      const nowIso = new Date().toISOString();
      const { error: reserveErr } = await supabaseAdmin.from('orders').insert({
        id: orderId,
        artwork_id: art.id,
        artist_id: art.artist_id,
        venue_id: art.venue_id ?? null,
        amount_cents: listPriceCents,
        list_price_cents: listPriceCents,
        buyer_fee_cents: buyerFeeCents,
        buyer_total_cents: buyerTotalCents,
        venue_amount_cents: venuePayoutCents,
        artist_amount_cents: artistPayoutCents,
        platform_gross_before_stripe_cents: platformRemainderCents,
        artist_plan_id_at_purchase: artistTier,
        currency,
        platform_fee_bps: platformFeeBps,
        venue_fee_bps: venueFeeBps,
        platform_fee_cents: platformRemainderCents,
        artist_payout_cents: artistPayoutCents,
        venue_payout_cents: venuePayoutCents,
        status: 'pending',
        stripe_checkout_session_id: null,
        stripe_payment_intent_id: null,
        stripe_charge_id: null,
        transfer_ids: [],
        stripe_receipt_url: null,
        created_at: nowIso,
        updated_at: nowIso,
      });
      if (reserveErr) {
        console.error('Failed to reserve order', reserveErr.message);
        return json({ error: 'Unable to reserve order' }, { status: 500 });
      }

      const sessionForm: Record<string, string> = {
        mode: 'payment',
        success_url,
        cancel_url,
        'payment_intent_data[transfer_group]': `artwork_${artworkId}`,
        'line_items[0][price_data][currency]': currency,
        'line_items[0][price_data][unit_amount]': String(listPriceCents),
        'line_items[0][price_data][product_data][name]': art.title || 'Artwork',
        'line_items[0][quantity]': '1',
        'metadata[orderId]': orderId,
        'metadata[artworkId]': artworkId,
        'metadata[artistId]': art.artist_id || '',
        'metadata[artistTier]': artistTier,
        'metadata[listPriceCents]': String(listPriceCents),
        'metadata[buyerFeeCents]': String(buyerFeeCents),
        'metadata[buyerTotalCents]': String(buyerTotalCents),
        'metadata[venuePayoutCents]': String(venuePayoutCents),
        'metadata[artistPayoutCents]': String(artistPayoutCents),
        'metadata[platformRemainderCents]': String(platformRemainderCents),
        'metadata[platformFeeBps]': String(platformFeeBps),
        'metadata[venueFeeBps]': String(venueFeeBps),
        'metadata[applicationFeeCents]': String(applicationFeeCents),
        'payment_intent_data[metadata][orderId]': orderId,
        'payment_intent_data[metadata][artworkId]': artworkId,
        'payment_intent_data[metadata][artistId]': art.artist_id || '',
        'payment_intent_data[metadata][artistTier]': artistTier,
        'payment_intent_data[metadata][listPriceCents]': String(listPriceCents),
        'payment_intent_data[metadata][buyerFeeCents]': String(buyerFeeCents),
        'payment_intent_data[metadata][buyerTotalCents]': String(buyerTotalCents),
        'payment_intent_data[metadata][venuePayoutCents]': String(venuePayoutCents),
        'payment_intent_data[metadata][artistPayoutCents]': String(artistPayoutCents),
        'payment_intent_data[metadata][platformRemainderCents]': String(platformRemainderCents),
        'payment_intent_data[metadata][platformFeeBps]': String(platformFeeBps),
        'payment_intent_data[metadata][venueFeeBps]': String(venueFeeBps),
        'payment_intent_data[metadata][applicationFeeCents]': String(applicationFeeCents),
      };

      if (art.venue_id) {
        sessionForm['metadata[venueId]'] = art.venue_id;
        sessionForm['payment_intent_data[metadata][venueId]'] = art.venue_id;
      }

      if (buyerFeeCents > 0) {
        sessionForm['line_items[1][price_data][currency]'] = currency;
        sessionForm['line_items[1][price_data][unit_amount]'] = String(buyerFeeCents);
        sessionForm['line_items[1][price_data][product_data][name]'] = 'Service fee';
        sessionForm['line_items[1][quantity]'] = '1';
      }

      if (artist?.stripe_account_id) {
        sessionForm['payment_intent_data[application_fee_amount]'] = String(applicationFeeCents);
        sessionForm['payment_intent_data[transfer_data][destination]'] = artist.stripe_account_id;
      }

      const resp = await stripeFetch('/v1/checkout/sessions', { method: 'POST', body: toForm(sessionForm) });
      const session = await resp.json();
      if (!resp.ok) {
        await supabaseAdmin.from('orders').delete().eq('id', orderId);
        return json(session, { status: resp.status });
      }

      const paymentIntentId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id || null;
      const updatePayload: Record<string, any> = {
        stripe_checkout_session_id: session.id,
        buyer_total_cents: buyerTotalCents,
        stripe_payment_intent_id: paymentIntentId ?? null,
        updated_at: new Date().toISOString(),
      };
      const { error: attachErr } = await supabaseAdmin
        .from('orders')
        .update(updatePayload)
        .eq('id', orderId);
      if (attachErr) {
        console.error('Failed to attach Stripe session to order', attachErr.message);
      }

      return json({ url: session.url });
    }

    // Create Stripe Checkout Session for artwork purchase
    if (url.pathname === '/api/stripe/create-checkout-session' && method === 'POST') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const payload = await request.json().catch(() => ({}));
      const artworkId = String(payload?.artworkId || '').trim();
      if (!artworkId) return json({ error: 'Missing artworkId' }, { status: 400 });

      const { data: art, error: artErr } = await supabaseAdmin
        .from('artworks')
        .select('id,title,price_cents,currency,status,artist_id,venue_id')
        .eq('id', artworkId)
        .maybeSingle();
      if (artErr) return json({ error: artErr.message }, { status: 500 });
      if (!art) return json({ error: 'Artwork not found' }, { status: 404 });
      if (art.status === 'sold') return json({ error: 'Artwork already sold' }, { status: 400 });

      const listPriceCents = toCents(art.price_cents);
      if (listPriceCents <= 0) {
        return json({ error: 'Invalid artwork price' }, { status: 400 });
      }

      const currency = String(art.currency || 'usd').toLowerCase();
      const success_url = `${allowOrigin}/#/purchase-${artworkId}?status=success`;
      const cancel_url = `${allowOrigin}/#/purchase-${artworkId}?status=cancel`;

      const { data: artist, error: artistErr } = art.artist_id
        ? await supabaseAdmin
            .from('artists')
            .select('id,stripe_account_id,subscription_tier,platform_fee_bps')
            .eq('id', art.artist_id)
            .maybeSingle()
        : { data: null, error: null };
      if (artistErr) return json({ error: artistErr.message }, { status: 500 });

      const { data: venue, error: venueErr } = art.venue_id
        ? await supabaseAdmin
            .from('venues')
            .select('id,stripe_account_id')
            .eq('id', art.venue_id)
            .maybeSingle()
        : { data: null, error: null };
      if (venueErr) return json({ error: venueErr.message }, { status: 500 });

      const artistTier = normalizeArtistTier(
        (payload?.artistTier ?? payload?.artistPlan) ||
          (artist?.subscription_tier ?? artist?.platform_fee_bps) ||
          'starter'
      );
      const breakdown = calculatePricingBreakdown(listPriceCents / 100, artistTier);
      const buyerFeeCents = breakdown.buyerFeeCents;
      const buyerTotalCents = breakdown.customerPaysCents;
      const venuePayoutCents = breakdown.venueCents;
      const artistPayoutCents = breakdown.artistCents;
      const platformRemainderCents = breakdown.platformRemainderCents;
      const platformFeeBps = calculatePlatformFeeBps(breakdown);
      const venueFeeBps = calculateVenueFeeBps(breakdown);
      const applicationFeeCents = calculateApplicationFeeCents(breakdown);

      const orderId = crypto.randomUUID();
      const nowIso = new Date().toISOString();
      const { error: reserveErr } = await supabaseAdmin.from('orders').insert({
        id: orderId,
        artwork_id: art.id,
        artist_id: art.artist_id,
        venue_id: art.venue_id ?? null,
        amount_cents: listPriceCents,
        list_price_cents: listPriceCents,
        buyer_fee_cents: buyerFeeCents,
        buyer_total_cents: buyerTotalCents,
        venue_amount_cents: venuePayoutCents,
        artist_amount_cents: artistPayoutCents,
        platform_gross_before_stripe_cents: platformRemainderCents,
        artist_plan_id_at_purchase: artistTier,
        currency,
        platform_fee_bps: platformFeeBps,
        venue_fee_bps: venueFeeBps,
        platform_fee_cents: platformRemainderCents,
        artist_payout_cents: artistPayoutCents,
        venue_payout_cents: venuePayoutCents,
        status: 'pending',
        stripe_checkout_session_id: null,
        stripe_payment_intent_id: null,
        stripe_charge_id: null,
        transfer_ids: [],
        stripe_receipt_url: null,
        created_at: nowIso,
        updated_at: nowIso,
      });
      if (reserveErr) {
        console.error('Failed to reserve order', reserveErr.message);
        return json({ error: 'Unable to reserve order' }, { status: 500 });
      }

      const sessionForm: Record<string, string> = {
        mode: 'payment',
        success_url,
        cancel_url,
        'payment_intent_data[transfer_group]': `artwork_${artworkId}`,
        'line_items[0][price_data][currency]': currency,
        'line_items[0][price_data][unit_amount]': String(listPriceCents),
        'line_items[0][price_data][product_data][name]': art.title || 'Artwork',
        'line_items[0][quantity]': '1',
        'metadata[orderId]': orderId,
        'metadata[artworkId]': artworkId,
        'metadata[artistId]': art.artist_id || '',
        'metadata[artistTier]': artistTier,
        'metadata[listPriceCents]': String(listPriceCents),
        'metadata[buyerFeeCents]': String(buyerFeeCents),
        'metadata[buyerTotalCents]': String(buyerTotalCents),
        'metadata[venuePayoutCents]': String(venuePayoutCents),
        'metadata[artistPayoutCents]': String(artistPayoutCents),
        'metadata[platformRemainderCents]': String(platformRemainderCents),
        'metadata[platformFeeBps]': String(platformFeeBps),
        'metadata[venueFeeBps]': String(venueFeeBps),
        'metadata[applicationFeeCents]': String(applicationFeeCents),
        'payment_intent_data[metadata][orderId]': orderId,
        'payment_intent_data[metadata][artworkId]': artworkId,
        'payment_intent_data[metadata][artistId]': art.artist_id || '',
        'payment_intent_data[metadata][artistTier]': artistTier,
        'payment_intent_data[metadata][listPriceCents]': String(listPriceCents),
        'payment_intent_data[metadata][buyerFeeCents]': String(buyerFeeCents),
        'payment_intent_data[metadata][buyerTotalCents]': String(buyerTotalCents),
        'payment_intent_data[metadata][venuePayoutCents]': String(venuePayoutCents),
        'payment_intent_data[metadata][artistPayoutCents]': String(artistPayoutCents),
        'payment_intent_data[metadata][platformRemainderCents]': String(platformRemainderCents),
        'payment_intent_data[metadata][platformFeeBps]': String(platformFeeBps),
        'payment_intent_data[metadata][venueFeeBps]': String(venueFeeBps),
        'payment_intent_data[metadata][applicationFeeCents]': String(applicationFeeCents),
      };

      if (art.venue_id) {
        sessionForm['metadata[venueId]'] = art.venue_id;
        sessionForm['payment_intent_data[metadata][venueId]'] = art.venue_id;
      }

      if (buyerFeeCents > 0) {
        sessionForm['line_items[1][price_data][currency]'] = currency;
        sessionForm['line_items[1][price_data][unit_amount]'] = String(buyerFeeCents);
        sessionForm['line_items[1][price_data][product_data][name]'] = 'Service fee';
        sessionForm['line_items[1][quantity]'] = '1';
      }

      if (artist?.stripe_account_id) {
        sessionForm['payment_intent_data[application_fee_amount]'] = String(applicationFeeCents);
        sessionForm['payment_intent_data[transfer_data][destination]'] = artist.stripe_account_id;
      }

      const resp = await stripeFetch('/v1/checkout/sessions', { method: 'POST', body: toForm(sessionForm) });
      const session = await resp.json();
      if (!resp.ok) {
        await supabaseAdmin.from('orders').delete().eq('id', orderId);
        return json(session, { status: resp.status });
      }

      const paymentIntentId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id || null;
      const updatePayload: Record<string, any> = {
        stripe_checkout_session_id: session.id,
        buyer_total_cents: buyerTotalCents,
        stripe_payment_intent_id: paymentIntentId ?? null,
        updated_at: new Date().toISOString(),
      };
      const { error: attachErr } = await supabaseAdmin
        .from('orders')
        .update(updatePayload)
        .eq('id', orderId);
      if (attachErr) {
        console.error('Failed to attach Stripe session to order', attachErr.message);
      }

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

    type ProcessResult = { status: 'ok' | 'noop' | 'failed'; message?: string };

    async function processCheckoutSessionCompleted(event: any): Promise<ProcessResult> {
      if (!supabaseAdmin) return { status: 'noop', message: 'supabase-disabled' };

      const sessionObj = event?.data?.object;
      const sessionId = sessionObj?.id;
      if (!sessionId) return { status: 'noop', message: 'missing-session-id' };

      const metadata = sessionObj?.metadata || {};
      const orderIdFromMetadata = metadata.orderId || metadata.order_id || null;

      let orderRow: any = null;
      if (orderIdFromMetadata) {
        const { data, error } = await supabaseAdmin
          .from('orders')
          .select('*')
          .eq('id', orderIdFromMetadata)
          .maybeSingle();
        if (error) return { status: 'failed', message: `order-fetch:${error.message}` };
        orderRow = data;
      }

      if (!orderRow) {
        const { data, error } = await supabaseAdmin
          .from('orders')
          .select('*')
          .eq('stripe_checkout_session_id', sessionId)
          .maybeSingle();
        if (error) return { status: 'failed', message: `order-fetch:${error.message}` };
        orderRow = data;
      }

      const sessionResp = await stripeFetch(`/v1/checkout/sessions/${sessionId}?expand[]=payment_intent.charges`);
      const session = await sessionResp.json();
      if (!sessionResp.ok) {
        console.error('Failed to re-fetch checkout session', sessionResp.status, session);
        return { status: 'failed', message: `session-fetch:${sessionResp.status}` };
      }

      const paymentIntentRaw = session.payment_intent ?? sessionObj?.payment_intent ?? null;
      const paymentIntentId = typeof paymentIntentRaw === 'string' ? paymentIntentRaw : paymentIntentRaw?.id || null;

      if (!orderRow && paymentIntentId) {
        const { data, error } = await supabaseAdmin
          .from('orders')
          .select('*')
          .eq('stripe_payment_intent_id', paymentIntentId)
          .maybeSingle();
        if (error) return { status: 'failed', message: `order-fetch:${error.message}` };
        orderRow = data;
      }

      if (!orderRow) {
        console.error('Checkout session completed without reserved order', { sessionId, orderIdFromMetadata, paymentIntentId });
        return { status: 'failed', message: 'order-missing' };
      }

      if (orderRow.status === 'paid') {
        return { status: 'noop', message: 'already-paid' };
      }

      const paymentIntentObj = typeof paymentIntentRaw === 'object' && paymentIntentRaw !== null ? paymentIntentRaw : null;
      const charge = paymentIntentObj?.charges?.data?.[0] || null;
      const chargeId = charge?.id || orderRow.stripe_charge_id || null;
      const receiptUrl = charge?.receipt_url || orderRow.stripe_receipt_url || null;
      const buyerEmail = session.customer_details?.email || charge?.billing_details?.email || orderRow.buyer_email || null;
      const transferDest = paymentIntentObj?.transfer_data?.destination || null;
      const transferGroup = paymentIntentObj?.transfer_group || sessionObj?.payment_intent?.transfer_group || (orderRow.artwork_id ? `artwork_${orderRow.artwork_id}` : undefined);

      const mergedMetadata = { ...(metadata || {}), ...(session?.metadata || {}) } as Record<string, unknown>;
      const listPriceCents =
        toCents(orderRow.list_price_cents) ||
        toCents(mergedMetadata.listPriceCents) ||
        toCents(orderRow.amount_cents) ||
        toCents(session.amount_subtotal) ||
        toCents(session.amount_total) ||
        0;
      const currency = session.currency || orderRow.currency || 'usd';

      const buyerFeeStored = toCents(orderRow.buyer_fee_cents ?? mergedMetadata.buyerFeeCents);
      const buyerTotalStored = toCents(orderRow.buyer_total_cents ?? mergedMetadata.buyerTotalCents);
      const venueStored = toCents(orderRow.venue_amount_cents ?? mergedMetadata.venuePayoutCents);
      const artistStored = toCents(orderRow.artist_amount_cents ?? mergedMetadata.artistPayoutCents);
      const platformStored = toCents(orderRow.platform_gross_before_stripe_cents ?? mergedMetadata.platformRemainderCents);

      const { data: artwork, error: artworkErr } = orderRow.artwork_id
        ? await supabaseAdmin
            .from('artworks')
            .select('id,title,status')
            .eq('id', orderRow.artwork_id)
            .maybeSingle()
        : { data: null, error: null };
      if (artworkErr) return { status: 'failed', message: `art-fetch:${artworkErr.message}` };

      const { data: artist, error: artistErr } = orderRow.artist_id
        ? await supabaseAdmin
            .from('artists')
            .select('id,name,email,phone_number,stripe_account_id,subscription_tier,platform_fee_bps')
            .eq('id', orderRow.artist_id)
            .maybeSingle()
        : { data: null, error: null };
      if (artistErr) return { status: 'failed', message: `artist-fetch:${artistErr.message}` };

      const { data: venue, error: venueErr } = orderRow.venue_id
        ? await supabaseAdmin
            .from('venues')
            .select('id,name,phone_number,stripe_account_id,default_venue_fee_bps')
            .eq('id', orderRow.venue_id)
            .maybeSingle()
        : { data: null, error: null };
      if (venueErr) return { status: 'failed', message: `venue-fetch:${venueErr.message}` };

      const artistTier = normalizeArtistTier(
        orderRow.artist_plan_id_at_purchase ??
          mergedMetadata.artistTier ??
          artist?.subscription_tier ??
          artist?.platform_fee_bps ??
          'starter'
      );
      const breakdown = calculatePricingBreakdown(listPriceCents / 100, artistTier);

      const buyerFeeCents = buyerFeeStored || breakdown.buyerFeeCents;
      const venuePayoutCents = venueStored || breakdown.venueCents;
      const artistPayoutCents = artistStored || breakdown.artistCents;
      const platformRemainderCents = platformStored || breakdown.platformRemainderCents;
      const platformFeeCents = platformRemainderCents;
      const buyerTotalCents = buyerTotalStored || (listPriceCents + buyerFeeCents);

      const parseBps = (value: unknown): number | null => {
        const num = Number(value);
        if (!Number.isFinite(num) || num < 0) return null;
        return Math.round(num);
      };

      const platformFeeBps =
        parseBps(orderRow.platform_fee_bps) ??
        parseBps(mergedMetadata.platformFeeBps) ??
        calculatePlatformFeeBps(breakdown);

      const venueFeeBps =
        parseBps(orderRow.venue_fee_bps) ??
        parseBps(mergedMetadata.venueFeeBps) ??
        calculateVenueFeeBps(breakdown);

      const existingTransfersArray = mergeTransferRecords(orderRow.transfer_ids, []);
      const transferRecord = existingTransfersArray.length > 0 ? { ...existingTransfersArray[0] } : {};
      let venueTransferId = typeof transferRecord.venue_transfer_id === 'string' ? transferRecord.venue_transfer_id : null;
      let artistTransferId = typeof transferRecord.artist_transfer_id === 'string' ? transferRecord.artist_transfer_id : null;

      if (!venueTransferId && venue?.stripe_account_id && venuePayoutCents > 0) {
        const transferPayload: Record<string, string> = {
          amount: String(venuePayoutCents),
          currency,
          destination: venue.stripe_account_id,
        };
        if (chargeId) transferPayload.source_transaction = chargeId;
        else if (transferGroup) transferPayload.transfer_group = transferGroup;
        const venueTransferResp = await stripeFetch('/v1/transfers', { method: 'POST', body: toForm(transferPayload) });
        const venueTransfer = await venueTransferResp.json();
        if (venueTransferResp.ok) {
          venueTransferId = venueTransfer.id;
          transferRecord.venue_transfer_id = venueTransferId;
        } else {
          console.error('Venue transfer failed', venueTransferResp.status, venueTransfer);
        }
      }

      if (!transferDest && !artistTransferId && artist?.stripe_account_id && artistPayoutCents > 0) {
        const transferPayload: Record<string, string> = {
          amount: String(artistPayoutCents),
          currency,
          destination: artist.stripe_account_id,
        };
        if (chargeId) transferPayload.source_transaction = chargeId;
        else if (transferGroup) transferPayload.transfer_group = transferGroup;
        const artistTransferResp = await stripeFetch('/v1/transfers', { method: 'POST', body: toForm(transferPayload) });
        const artistTransfer = await artistTransferResp.json();
        if (artistTransferResp.ok) {
          artistTransferId = artistTransfer.id;
          transferRecord.artist_transfer_id = artistTransferId;
        } else {
          console.error('Artist transfer failed', artistTransferResp.status, artistTransfer);
        }
      }

      const transferArray = Object.keys(transferRecord).length ? [transferRecord] : [];

      const orderUpdate: Record<string, any> = {
        status: 'paid',
        stripe_checkout_session_id: sessionId,
        stripe_payment_intent_id: paymentIntentId ?? orderRow.stripe_payment_intent_id ?? null,
        stripe_charge_id: chargeId ?? orderRow.stripe_charge_id ?? null,
        stripe_receipt_url: receiptUrl ?? orderRow.stripe_receipt_url ?? null,
        buyer_email: buyerEmail ?? orderRow.buyer_email ?? null,
        currency,
        platform_fee_bps: platformFeeBps,
        venue_fee_bps: venueFeeBps,
        platform_fee_cents: platformFeeCents,
        artist_payout_cents: artistPayoutCents,
        venue_payout_cents: venuePayoutCents,
        list_price_cents: listPriceCents,
        buyer_fee_cents: buyerFeeCents,
        buyer_total_cents: buyerTotalCents,
        venue_amount_cents: venuePayoutCents,
        artist_amount_cents: artistPayoutCents,
        platform_gross_before_stripe_cents: platformRemainderCents,
        artist_plan_id_at_purchase: artistTier,
        transfer_ids: transferArray,
        updated_at: new Date().toISOString(),
      };

      const { error: orderUpdateErr } = await supabaseAdmin
        .from('orders')
        .update(orderUpdate)
        .eq('id', orderRow.id);
      if (orderUpdateErr) {
        return { status: 'failed', message: `order-update:${orderUpdateErr.message}` };
      }

      if (artwork?.id && artwork.status !== 'sold') {
        const { error: markSoldErr } = await supabaseAdmin
          .from('artworks')
          .update({ status: 'sold', updated_at: new Date().toISOString() })
          .eq('id', artwork.id);
        if (markSoldErr) {
          console.error('Failed to mark artwork sold', markSoldErr.message);
        }
      }

      try {
        const saleAmount = (listPriceCents / 100).toFixed(2);
        const createdAt = new Date().toISOString();
        const messages: any[] = [];
        if (orderRow.artist_id) {
          messages.push({
            id: crypto.randomUUID(),
            user_id: orderRow.artist_id,
            role: 'artist',
            title: 'Artwork sold',
            message: `Your artwork "${artwork?.title || 'Artwork'}" sold for $${saleAmount}.`,
            artwork_id: orderRow.artwork_id,
            order_id: orderRow.id,
            created_at: createdAt,
          });
        }
        if (orderRow.venue_id) {
          messages.push({
            id: crypto.randomUUID(),
            user_id: orderRow.venue_id,
            role: 'venue',
            title: 'Artwork sold',
            message: `Artwork "${artwork?.title || 'Artwork'}" sold for $${saleAmount}.`,
            artwork_id: orderRow.artwork_id,
            order_id: orderRow.id,
            created_at: createdAt,
          });
        }
        messages.push({
          id: crypto.randomUUID(),
          user_id: null,
          role: 'platform',
          title: 'Sale completed',
          message: `"${artwork?.title || 'Artwork'}" sold. Platform fee: $${(platformFeeCents / 100).toFixed(2)}.`,
          artwork_id: orderRow.artwork_id,
          order_id: orderRow.id,
          created_at: createdAt,
        });
        await supabaseAdmin.from('notifications').insert(messages);
      } catch (notifyErr) {
        console.error('Notifications insert failed', notifyErr instanceof Error ? notifyErr.message : notifyErr);
      }

      try {
        const saleAmount = (listPriceCents / 100).toFixed(2);
        if (artist?.phone_number) {
          await sendSms(artist.phone_number, `Artwalls: Your artwork "${artwork?.title || 'Artwork'}" sold for $${saleAmount}.`);
        }
        if (venue?.phone_number) {
          await sendSms(venue.phone_number, `Artwalls: Artwork "${artwork?.title || 'Artwork'}" sold for $${saleAmount} at your venue.`);
        }
      } catch (smsErr) {
        console.error('SMS send failed', smsErr instanceof Error ? smsErr.message : smsErr);
      }

      try {
        await supabaseAdmin.from('events').insert({
          event_type: 'purchase',
          user_id: null,
          artwork_id: orderRow.artwork_id || null,
          venue_id: orderRow.venue_id || null,
          created_at: new Date().toISOString(),
        });
      } catch (eventErr) {
        console.error('Purchase event insert failed', eventErr instanceof Error ? eventErr.message : eventErr);
      }

      return { status: 'ok' };
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

        ctx.waitUntil(
          (async () => {
            const eventId = (event as any)?.id || null;
            const eventType = (event as any)?.type || 'unknown';

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
                console.log('Forwarded webhook processed', { id: eventId, type: eventType });
              }
            } catch (forwardErr) {
              console.error('Error forwarding webhook', forwardErr instanceof Error ? forwardErr.message : forwardErr);
            }

            if (!supabaseAdmin || !eventId) {
              return;
            }

            let insertedEvent = false;
            let canProcess = true;
            const { error: insertErr } = await supabaseAdmin
              .from('webhook_events')
              .insert({ id: eventId, type: eventType, note: 'pending' });
            if (insertErr) {
              const duplicate = (insertErr as any)?.code === '23505';
              if (duplicate) {
                console.log('Stripe event already processed', { eventId, eventType });
              } else {
                console.error('Failed to record webhook event', insertErr.message);
              }
              canProcess = false;
            } else {
              insertedEvent = true;
            }

            let note = 'ignored';

            if (canProcess && eventType === 'checkout.session.completed') {
              try {
                const sessionObj = (event as any)?.data?.object;
                const paymentType = sessionObj?.metadata?.paymentType || null;
                const applicationId = sessionObj?.metadata?.applicationId || null;

                if (paymentType === 'submission_fee' && applicationId) {
                  const paymentIntentId = sessionObj?.payment_intent || null;
                  await supabaseAdmin
                    .from('call_applications')
                    .update({
                      paid: true,
                      stripe_payment_intent_id: paymentIntentId,
                      paid_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    })
                    .eq('id', applicationId);

                  await supabaseAdmin.from('platform_payments').insert({
                    payment_type: 'submission_fee',
                    related_id: applicationId,
                    amount_cents: sessionObj?.amount_total || 0,
                    currency: sessionObj?.currency || 'usd',
                    stripe_payment_intent_id: paymentIntentId,
                    stripe_checkout_session_id: sessionObj?.id || null,
                    created_at: new Date().toISOString(),
                  });
                  note = 'submission_fee_ok';
                } else {
                  const result = await processCheckoutSessionCompleted(event);
                  if (result.status === 'ok') note = 'ok';
                  else if (result.status === 'noop') note = result.message || 'noop';
                  else note = `error:${result.message || 'unknown'}`;
                }
              } catch (processErr) {
                note = `error:${processErr instanceof Error ? processErr.message : 'unknown'}`;
                console.error('Unhandled webhook processing error', processErr);
              }
            }

            if (insertedEvent) {
              const { error: updateErr } = await supabaseAdmin
                .from('webhook_events')
                .update({ note, processed_at: new Date().toISOString() })
                .eq('id', eventId);
              if (updateErr) {
                console.error('Failed to update webhook event note', updateErr.message);
              }
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

    // Artist → Venue Referrals (V1)
    if (url.pathname === '/api/referrals/create' && method === 'POST') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const user = await requireArtist(request);
      if (!user) return json({ error: 'Missing or invalid Authorization bearer token (artist required)' }, { status: 401 });

      const payload = await request.json().catch(() => ({}));
      const venueName = String(payload?.venueName || '').trim();
      const venueEmail = String(payload?.venueEmail || '').trim();
      const venueWebsite = payload?.venueWebsite ? String(payload.venueWebsite).trim() : null;
      const venueLocationText = payload?.venueLocationText ? String(payload.venueLocationText).trim() : null;
      const note = payload?.note ? String(payload.note).trim() : null;

      if (!venueName) return json({ error: 'Venue name is required.' }, { status: 400 });
      if (!venueEmail || !isValidEmail(venueEmail)) return json({ error: 'Valid venue email is required.' }, { status: 400 });

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count, error: countErr } = await supabaseAdmin
        .from('venue_referrals')
        .select('id', { count: 'exact', head: true })
        .eq('artist_user_id', user.id)
        .gte('created_at', since);
      if (countErr) return json({ error: countErr.message }, { status: 500 });
      if ((count || 0) >= REFERRAL_DAILY_LIMIT) {
        return json({ error: `Daily invite limit reached (${REFERRAL_DAILY_LIMIT}/day).` }, { status: 429 });
      }

      const nowIso = new Date().toISOString();
      const token = generateReferralToken();
      const { data: referral, error } = await supabaseAdmin
        .from('venue_referrals')
        .insert({
          artist_user_id: user.id,
          venue_name: venueName,
          venue_email: venueEmail,
          venue_website: venueWebsite,
          venue_location_text: venueLocationText,
          note,
          token,
          status: 'sent',
          created_at: nowIso,
          updated_at: nowIso,
        })
        .select('*')
        .single();
      if (error) return json({ error: error.message }, { status: 500 });

      const inviteLink = `${env.PAGES_ORIGIN || 'https://artwalls.space'}/venue/signup?ref=${encodeURIComponent(token)}`;
      console.log('[referrals] invite link:', inviteLink, 'venue:', venueEmail);

      return json({ referral, emailSent: false, emailSkipped: true });
    }

    if (url.pathname === '/api/referrals' && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const user = await requireArtist(request);
      if (!user) return json({ error: 'Missing or invalid Authorization bearer token (artist required)' }, { status: 401 });
      const { data, error } = await supabaseAdmin
        .from('venue_referrals')
        .select('*')
        .eq('artist_user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) return json({ error: error.message }, { status: 500 });
      return json({ referrals: data || [] });
    }

    if (url.pathname.startsWith('/api/referrals/token/') && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const token = url.pathname.split('/')[4] || '';
      if (!token) return json({ error: 'Missing referral token' }, { status: 400 });

      const { data: referral, error } = await supabaseAdmin
        .from('venue_referrals')
        .select('*')
        .eq('token', token)
        .maybeSingle();
      if (error) return json({ error: error.message }, { status: 500 });
      if (!referral || referral.status === 'invalid') return json({ error: 'Referral not found' }, { status: 404 });

      const { data: artist } = await supabaseAdmin
        .from('artists')
        .select('id,name')
        .eq('id', referral.artist_user_id)
        .maybeSingle();

      return json({ referral, artist });
    }

    if (url.pathname === '/api/admin/referrals' && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const admin = await requireAdmin(request);
      if (!admin) return json({ error: 'Admin access required' }, { status: 403 });

      const status = url.searchParams.get('status');
      let query = supabaseAdmin.from('venue_referrals').select('*').order('created_at', { ascending: false });
      if (status) query = query.eq('status', status);
      const { data: referrals, error } = await query;
      if (error) return json({ error: error.message }, { status: 500 });

      const artistIds = Array.from(new Set((referrals || []).map((r: any) => r.artist_user_id).filter(Boolean)));
      const venueIds = Array.from(new Set((referrals || []).map((r: any) => r.venue_id).filter(Boolean)));

      const [{ data: artists }, { data: venues }] = await Promise.all([
        artistIds.length
          ? supabaseAdmin.from('artists').select('id,name,email,pro_until').in('id', artistIds)
          : Promise.resolve({ data: [] }),
        venueIds.length
          ? supabaseAdmin.from('venues').select('id,name,email').in('id', venueIds)
          : Promise.resolve({ data: [] }),
      ]);

      const artistMap = new Map((artists || []).map((a: any) => [a.id, a]));
      const venueMap = new Map((venues || []).map((v: any) => [v.id, v]));

      const enriched = (referrals || []).map((r: any) => ({
        ...r,
        artist: artistMap.get(r.artist_user_id) || null,
        venue: r.venue_id ? venueMap.get(r.venue_id) || null : null,
      }));

      return json({ referrals: enriched });
    }

    if (url.pathname === '/api/admin/referrals/grant' && method === 'POST') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const admin = await requireAdmin(request);
      if (!admin) return json({ error: 'Admin access required' }, { status: 403 });

      const payload = await request.json().catch(() => ({}));
      const referralId = String(payload?.referralId || '').trim();
      if (!referralId) return json({ error: 'Missing referralId' }, { status: 400 });

      const { data: referral, error } = await supabaseAdmin
        .from('venue_referrals')
        .select('*')
        .eq('id', referralId)
        .maybeSingle();
      if (error) return json({ error: error.message }, { status: 500 });
      if (!referral) return json({ error: 'Referral not found' }, { status: 404 });
      if (referral.status !== 'qualified') {
        return json({ error: 'Referral must be qualified before granting reward.' }, { status: 400 });
      }

      const { data: artist, error: artistErr } = await supabaseAdmin
        .from('artists')
        .select('id,pro_until')
        .eq('id', referral.artist_user_id)
        .maybeSingle();
      if (artistErr) return json({ error: artistErr.message }, { status: 500 });
      if (!artist) return json({ error: 'Artist not found' }, { status: 404 });

      const now = new Date();
      const base = artist.pro_until && new Date(artist.pro_until) > now ? new Date(artist.pro_until) : now;
      const newProUntil = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
      const nowIso = now.toISOString();

      await supabaseAdmin
        .from('artists')
        .update({ pro_until: newProUntil.toISOString(), updated_at: nowIso })
        .eq('id', artist.id);

      await supabaseAdmin
        .from('venue_referrals')
        .update({ status: 'reward_granted', updated_at: nowIso })
        .eq('id', referral.id);

      await supabaseAdmin
        .from('referral_rewards')
        .insert({
          referral_id: referral.id,
          artist_user_id: referral.artist_user_id,
          reward_type: 'ONE_MONTH_PRO',
          granted_by_admin_id: admin.id,
          granted_at: nowIso,
        });

      return json({ ok: true, pro_until: newProUntil.toISOString() });
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
      const admin = await requireAdmin(request);
      if (!admin) return json({ error: 'Admin access required' }, { status: 403 });

      const now = new Date();
      const past30Date = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const past60Date = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      const past30 = past30Date.toISOString();
      const past60 = past60Date.toISOString();

      const pendingInviteStatuses = ['DRAFT', 'SENT', 'CLICKED'];
      const openSupportStatuses = ['new', 'open', 'pending'];

      const [
        artistsAgg,
        venuesAgg,
        activeAgg,
        newArtistsAgg,
        prevArtistsAgg,
        newVenuesAgg,
        prevVenuesAgg,
        pendingInvitesAgg,
        supportQueueAgg,
      ] = await Promise.all([
        supabaseAdmin.from('artists').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('venues').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('artworks').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabaseAdmin.from('artists').select('id', { count: 'exact', head: true }).gte('created_at', past30),
        supabaseAdmin.from('artists').select('id', { count: 'exact', head: true }).gte('created_at', past60).lt('created_at', past30),
        supabaseAdmin.from('venues').select('id', { count: 'exact', head: true }).gte('created_at', past30),
        supabaseAdmin.from('venues').select('id', { count: 'exact', head: true }).gte('created_at', past60).lt('created_at', past30),
        supabaseAdmin.from('venue_invites').select('id', { count: 'exact', head: true }).in('status', pendingInviteStatuses),
        supabaseAdmin.from('support_messages').select('id', { count: 'exact', head: true }).in('status', openSupportStatuses),
      ]);

      const countOrZero = (res: any) => {
        if (res?.error) {
          console.warn('[admin.metrics] count query failed', res.error.message);
          return 0;
        }
        return res?.count || 0;
      };

      const [ordersMonthRes, ordersPrevRes] = await Promise.all([
        supabaseAdmin
          .from('orders')
          .select('amount_cents,platform_fee_cents,created_at,artist_id,venue_id,artwork_id')
          .gte('created_at', past30)
          .order('created_at', { ascending: false })
          .limit(1000),
        supabaseAdmin
          .from('orders')
          .select('amount_cents,platform_fee_cents')
          .gte('created_at', past60)
          .lt('created_at', past30)
          .order('created_at', { ascending: false })
          .limit(1000),
      ]);

      if (ordersMonthRes.error) return json({ error: ordersMonthRes.error.message }, { status: 500 });
      if (ordersPrevRes.error) return json({ error: ordersPrevRes.error.message }, { status: 500 });

      const ordersMonth = ordersMonthRes.data || [];
      const ordersPrev = ordersPrevRes.data || [];

      const gmvCents = ordersMonth.reduce((sum: number, o: any) => sum + (o.amount_cents || 0), 0);
      const platformFeeCents = ordersMonth.reduce((sum: number, o: any) => sum + (o.platform_fee_cents || 0), 0);
      const prevGmvCents = ordersPrev.reduce((sum: number, o: any) => sum + (o.amount_cents || 0), 0);

      const gmvDelta = prevGmvCents > 0
        ? Math.round(((gmvCents - prevGmvCents) / prevGmvCents) * 100)
        : (gmvCents > 0 ? 100 : 0);

      const newArtists = countOrZero(newArtistsAgg);
      const prevArtists = countOrZero(prevArtistsAgg);
      const newVenues = countOrZero(newVenuesAgg);
      const prevVenues = countOrZero(prevVenuesAgg);

      const recentActivity = ordersMonth.slice(0, 10).map((o: any) => ({
        type: 'payment',
        timestamp: o.created_at,
        amount_cents: o.amount_cents || 0,
        artist_id: o.artist_id,
        venue_id: o.venue_id,
        artwork_id: o.artwork_id,
      }));

      return json({
        totals: {
          artists: countOrZero(artistsAgg),
          venues: countOrZero(venuesAgg),
          activeDisplays: countOrZero(activeAgg),
        },
        month: {
          gmv: gmvCents,
          platformRevenue: platformFeeCents,
          gvmDelta: gmvDelta,
        },
        monthlyArtistsDelta: newArtists - prevArtists,
        monthlyVenuesDelta: newVenues - prevVenues,
        pendingInvites: countOrZero(pendingInvitesAgg),
        supportQueue: countOrZero(supportQueueAgg),
        recentActivity,
      });
    }

    // Admin: user overview metrics (total users, artists by tier, artists by type)
    if (url.pathname === '/api/admin/user-metrics' && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const admin = await requireAdmin(request);
      if (!admin) return json({ error: 'Admin access required' }, { status: 403 });

      // Try RPC first, fallback to direct queries if RPC doesn't exist
      const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('get_admin_dashboard_metrics');
      
      if (!rpcError && rpcData) {
        return json(rpcData);
      }

      // Fallback: direct queries if RPC is not available
      console.log('[admin.user-metrics] RPC not available, using fallback queries');
      
      // Count total users from auth (requires service role)
      let totalUsers = 0;
      try {
        const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1 });
        totalUsers = authData?.total || 0;
      } catch (e) {
        console.warn('[admin.user-metrics] Could not count auth users');
      }

      // Count artists
      const { count: totalArtists } = await supabaseAdmin
        .from('artists')
        .select('id', { count: 'exact', head: true });

      // Count by subscription tier
      const { data: tierData } = await supabaseAdmin
        .from('artists')
        .select('subscription_tier');
      
      const artistsByTier: Record<string, number> = {};
      for (const row of tierData || []) {
        const tier = (row as any).subscription_tier || 'unknown';
        artistsByTier[tier] = (artistsByTier[tier] || 0) + 1;
      }

      // Count by art type (from art_types array field)
      const { data: typeData } = await supabaseAdmin
        .from('artists')
        .select('art_types');
      
      const artistsByType: Record<string, number> = {};
      let unspecifiedCount = 0;
      for (const row of typeData || []) {
        const types = (row as any).art_types as string[] | null;
        if (!types || types.length === 0) {
          unspecifiedCount++;
        } else {
          for (const t of types) {
            artistsByType[t] = (artistsByType[t] || 0) + 1;
          }
        }
      }
      if (unspecifiedCount > 0) {
        artistsByType['Unspecified'] = unspecifiedCount;
      }

      return json({
        totalUsers,
        totalArtists: totalArtists || 0,
        artistsByTier,
        artistsByType,
      });
    }

    // Admin: list all sales/orders
    if (url.pathname === '/api/admin/sales' && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const admin = await requireAdmin(request);
      if (!admin) return json({ error: 'Admin access required' }, { status: 403 });

      const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 100), 1), 500);
      const offset = Math.max(Number(url.searchParams.get('offset') || 0), 0);
      const search = url.searchParams.get('search') || '';
      const status = url.searchParams.get('status') || '';

      let query = supabaseAdmin
        .from('orders')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq('status', status);
      }

      if (search) {
        query = query.or(`buyer_email.ilike.%${search}%,stripe_session_id.ilike.%${search}%`);
      }

      const { data: orders, error, count } = await query;
      if (error) return json({ error: error.message }, { status: 500 });

      // Enrich with artist and venue names
      const artistIds = Array.from(new Set((orders || []).map((o: any) => o.artist_id).filter(Boolean)));
      const venueIds = Array.from(new Set((orders || []).map((o: any) => o.venue_id).filter(Boolean)));
      const artworkIds = Array.from(new Set((orders || []).map((o: any) => o.artwork_id).filter(Boolean)));

      const [{ data: artists }, { data: venues }, { data: artworks }] = await Promise.all([
        artistIds.length
          ? supabaseAdmin.from('artists').select('id,name,email').in('id', artistIds)
          : Promise.resolve({ data: [] }),
        venueIds.length
          ? supabaseAdmin.from('venues').select('id,name,email').in('id', venueIds)
          : Promise.resolve({ data: [] }),
        artworkIds.length
          ? supabaseAdmin.from('artworks').select('id,title').in('id', artworkIds)
          : Promise.resolve({ data: [] }),
      ]);

      const artistMap = new Map((artists || []).map((a: any) => [a.id, a]));
      const venueMap = new Map((venues || []).map((v: any) => [v.id, v]));
      const artworkMap = new Map((artworks || []).map((aw: any) => [aw.id, aw]));

      const enrichedOrders = (orders || []).map((o: any) => ({
        ...o,
        artist: artistMap.get(o.artist_id) || null,
        venue: o.venue_id ? venueMap.get(o.venue_id) || null : null,
        artwork: o.artwork_id ? artworkMap.get(o.artwork_id) || null : null,
      }));

      // Compute summary stats
      const totalGmv = (orders || []).reduce((sum: number, o: any) => sum + (o.amount_cents || 0), 0);
      const totalPlatformFees = (orders || []).reduce((sum: number, o: any) => sum + (o.platform_fee_cents || 0), 0);
      const totalVenueFees = (orders || []).reduce((sum: number, o: any) => sum + (o.venue_payout_cents || 0), 0);
      const totalArtistPayouts = (orders || []).reduce((sum: number, o: any) => sum + (o.artist_payout_cents || 0), 0);

      return json({
        orders: enrichedOrders,
        total: count || 0,
        limit,
        offset,
        summary: {
          totalGmv,
          totalPlatformFees,
          totalVenueFees,
          totalArtistPayouts,
          orderCount: count || 0,
        },
      });
    }

    // Admin: list auth users
    if (url.pathname === '/api/admin/users' && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const admin = await requireAdmin(request);
      if (!admin) return json({ error: 'Admin access required' }, { status: 403 });

      const perPage = Math.min(Math.max(Number(url.searchParams.get('perPage') || 1000), 1), 1000);
      const page = Math.max(Number(url.searchParams.get('page') || 1), 1);
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) return json({ error: error.message }, { status: 500 });
      const users = (data?.users || []).map((u: any) => ({
        id: u.id,
        email: u.email || null,
        name: u.user_metadata?.name || null,
        role: (u.user_metadata?.role || 'artist') as string,
        createdAt: u.created_at || null,
        lastSignInAt: (u as any).last_sign_in_at || null,
      }));
      return json({ users, page, perPage, total: data?.total || users.length });
    }

    // Admin: sync auth users into artists/venues tables
    if (url.pathname === '/api/admin/sync-users' && method === 'POST') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const admin = await requireAdmin(request);
      if (!admin) return json({ error: 'Admin access required' }, { status: 403 });

      const perPage = 1000;
      let page = 1;
      let artists = 0;
      let venues = 0;
      let total = 0;
      const nowIso = new Date().toISOString();

      while (true) {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
        if (error) return json({ error: error.message }, { status: 500 });
        const users = data?.users || [];
        total += users.length;

        for (const u of users) {
          const role = String(u.user_metadata?.role || '').toLowerCase();
          const name = u.user_metadata?.name || null;
          const email = u.email || null;
          if (role === 'venue') {
            const venuePayload: Record<string, any> = {
              id: u.id,
              email,
              name,
              type: u.user_metadata?.type ?? null,
              phone_number: (u.user_metadata?.phone as string | undefined) || null,
              default_venue_fee_bps: 1000,
              suspended: false,
              updated_at: nowIso,
            };
            const { error: upsertErr } = await supabaseAdmin.from('venues').upsert(venuePayload, { onConflict: 'id' });
            if (!upsertErr) venues += 1;
          } else {
            const artistPayload: Record<string, any> = {
              id: u.id,
              email,
              name,
              role: 'artist',
              phone_number: (u.user_metadata?.phone as string | undefined) || null,
              is_live: true,
              updated_at: nowIso,
            };
            const { error: upsertErr } = await supabaseAdmin.from('artists').upsert(artistPayload, { onConflict: 'id' });
            if (!upsertErr) artists += 1;
          }
        }

        if (users.length < perPage) break;
        page += 1;
      }

      return json({ artists, venues, total });
    }

    // Admin: user detail
    if (url.pathname.startsWith('/api/admin/users/') && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const admin = await requireAdmin(request);
      if (!admin) return json({ error: 'Admin access required' }, { status: 403 });

      const parts = url.pathname.split('/');
      const userId = parts[4];
      if (!userId) return json({ error: 'Missing user id' }, { status: 400 });

      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (authErr) return json({ error: authErr.message }, { status: 500 });
      const authUser = authData?.user;
      if (!authUser) return json({ error: 'User not found' }, { status: 404 });

      const role = (authUser.user_metadata?.role || 'artist') as string;
      let profile: any = null;
      if (role === 'venue') {
        const { data } = await supabaseAdmin
          .from('venues')
          .select('id,name,email,city,created_at,suspended')
          .eq('id', userId)
          .maybeSingle();
        profile = data || null;
      } else {
        const { data } = await supabaseAdmin
          .from('artists')
          .select('id,name,email,city_primary,city_secondary,subscription_tier,subscription_status,created_at')
          .eq('id', userId)
          .maybeSingle();
        profile = data || null;
      }

      let artworksCount = 0;
      if (role !== 'venue') {
        const { count } = await supabaseAdmin
          .from('artworks')
          .select('id', { count: 'exact', head: true })
          .eq('artist_id', userId);
        artworksCount = count || 0;
      }

      return json({
        id: authUser.id,
        email: authUser.email || null,
        name: authUser.user_metadata?.name || profile?.name || null,
        role: role === 'venue' ? 'venue' : 'artist',
        subscriptionTier: profile?.subscription_tier || null,
        subscriptionStatus: profile?.subscription_status || (role === 'venue' ? (profile?.suspended ? 'suspended' : 'active') : null),
        city: profile?.city || profile?.city_primary || null,
        createdAt: authUser.created_at || profile?.created_at || null,
        lastActive: (authUser as any).last_sign_in_at || null,
        artworksCount,
      });
    }

    // Admin: suspend user
    if (url.pathname.match(/^\/api\/admin\/users\/[^/]+\/suspend$/) && method === 'POST') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const admin = await requireAdmin(request);
      if (!admin) return json({ error: 'Admin access required' }, { status: 403 });

      const parts = url.pathname.split('/');
      const userId = parts[4];
      if (!userId) return json({ error: 'Missing user id' }, { status: 400 });

      const { data: authData } = await supabaseAdmin.auth.admin.getUserById(userId);
      const role = (authData?.user?.user_metadata?.role || 'artist') as string;
      if (role === 'venue') {
        const { error } = await supabaseAdmin.from('venues').update({ suspended: true }).eq('id', userId);
        if (error) return json({ error: error.message }, { status: 500 });
      } else {
        const { error } = await supabaseAdmin.from('artists').update({ subscription_status: 'suspended' }).eq('id', userId);
        if (error) return json({ error: error.message }, { status: 500 });
      }
      return json({ ok: true });
    }

    // Admin: activate user
    if (url.pathname.match(/^\/api\/admin\/users\/[^/]+\/activate$/) && method === 'POST') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const admin = await requireAdmin(request);
      if (!admin) return json({ error: 'Admin access required' }, { status: 403 });

      const parts = url.pathname.split('/');
      const userId = parts[4];
      if (!userId) return json({ error: 'Missing user id' }, { status: 400 });

      const { data: authData } = await supabaseAdmin.auth.admin.getUserById(userId);
      const role = (authData?.user?.user_metadata?.role || 'artist') as string;
      if (role === 'venue') {
        const { error } = await supabaseAdmin.from('venues').update({ suspended: false }).eq('id', userId);
        if (error) return json({ error: error.message }, { status: 500 });
      } else {
        const { error } = await supabaseAdmin.from('artists').update({ subscription_status: 'active' }).eq('id', userId);
        if (error) return json({ error: error.message }, { status: 500 });
      }
      return json({ ok: true });
    }

    // Admin: update user tier
    if (url.pathname.match(/^\/api\/admin\/users\/[^/]+\/tier$/) && method === 'POST') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const admin = await requireAdmin(request);
      if (!admin) return json({ error: 'Admin access required' }, { status: 403 });

      const parts = url.pathname.split('/');
      const userId = parts[4];
      if (!userId) return json({ error: 'Missing user id' }, { status: 400 });

      const body = await request.json().catch(() => ({}));
      const tier = String(body?.tier || '').toLowerCase();
      const allowed = ['free', 'starter', 'growth', 'pro'];
      if (!allowed.includes(tier)) return json({ error: 'Invalid tier' }, { status: 400 });

      const { data: authData } = await supabaseAdmin.auth.admin.getUserById(userId);
      const role = (authData?.user?.user_metadata?.role || 'artist') as string;
      if (role === 'venue') return json({ error: 'Tier updates apply to artists only' }, { status: 400 });

      const { data, error } = await supabaseAdmin
        .from('artists')
        .update({ subscription_tier: tier, subscription_status: 'active' })
        .eq('id', userId)
        .select('id,name,email,subscription_tier,subscription_status')
        .single();
      if (error) return json({ error: error.message }, { status: 500 });
      return json({ user: data });
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
