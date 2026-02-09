import { verifyAndParseStripeEvent } from './stripeWebhook';
import { mergeTransferRecords } from './orderSettlement';
import {
  calculatePricingBreakdown,
  calculateApplicationFeeCents,
  calculatePlatformFeeBps,
  calculateVenueFeeBps,
  normalizeArtistTier,
} from '../src/lib/pricingCalculations';
import { getArtworkLimit, TIER_LIMITS } from '../src/lib/entitlements';
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

    // ── Stripe API helpers ──
    // Encode an object as application/x-www-form-urlencoded (Stripe API format)
    function toForm(obj: Record<string, any>): string {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(obj)) {
        if (v !== undefined && v !== null) params.set(k, String(v));
      }
      return params.toString();
    }

    // Authenticated fetch against the Stripe REST API
    async function stripeFetch(path: string, init: RequestInit): Promise<Response> {
      const key = env.STRIPE_SECRET_KEY;
      if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
      const headers = new Headers(init.headers);
      headers.set('Authorization', `Bearer ${key}`);
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/x-www-form-urlencoded');
      }
      return fetch(`https://api.stripe.com${path}`, { ...init, headers });
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

    async function upsertVenue(venue: { id: string; email?: string | null; name?: string | null; type?: string | null; phoneNumber?: string | null; city?: string | null; stripeAccountId?: string | null; defaultVenueFeeBps?: number | null; labels?: any; suspended?: boolean | null; bio?: string | null; coverPhotoUrl?: string | null; address?: string | null; addressLat?: number | null; addressLng?: number | null; }): Promise<Response> {
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
      // Only include address fields if provided
      if (venue.address !== undefined && venue.address !== null) {
        payload.address = venue.address;
      }
      if (venue.addressLat !== undefined && venue.addressLat !== null) {
        payload.address_lat = venue.addressLat;
      }
      if (venue.addressLng !== undefined && venue.addressLng !== null) {
        payload.address_lng = venue.addressLng;
      }
      const { data, error } = await supabaseAdmin.from('venues').upsert(payload, { onConflict: 'id' }).select('*').single();
      if (error) {
        console.error('[upsertVenue] Error:', error.message, error.code, (error as any).hint);
        return json({ error: error.message, code: error.code, hint: (error as any).hint || null }, { status: 500 });
      }
      return json(data);
    }

    // ── Helper: authenticate venue user from request ──
    async function requireVenue(req: Request): Promise<any | null> {
      const user = await getSupabaseUserFromRequest(req);
      if (!user) return null;
      if (user.user_metadata?.role !== 'venue') return null;
      return user;
    }

    // ── Helper: authenticate artist user from request ──
    async function requireArtist(req: Request): Promise<any | null> {
      const user = await getSupabaseUserFromRequest(req);
      if (!user) return null;
      if (user.user_metadata?.role === 'venue') return null; // not an artist
      return user;
    }

    // ── Public artwork statuses & shaping helpers ──
    const PUBLIC_ARTWORK_STATUSES = ['available', 'active', 'published'];

    function shapePublicArtwork(a: any) {
      if (!a) return null;
      return {
        id: a.id,
        title: a.title,
        status: a.status,
        price: typeof a.price_cents === 'number' ? Math.round(a.price_cents / 100) : null,
        priceCents: a.price_cents ?? null,
        currency: a.currency || 'usd',
        imageUrl: a.image_url,
        imageUrls: Array.isArray(a.image_urls) ? a.image_urls : (a.image_url ? [a.image_url] : []),
        artistId: a.artist_id,
        artistName: a.artist_name,
        venueId: a.venue_id,
        venueName: a.venue_name || (a.venue as any)?.name || null,
        description: a.description || null,
        medium: a.medium || null,
        dimensionsWidth: a.dimensions_width ?? null,
        dimensionsHeight: a.dimensions_height ?? null,
        dimensionsDepth: a.dimensions_depth ?? null,
        dimensionsUnit: a.dimensions_unit || null,
        condition: a.condition || null,
        editionType: a.edition_type || null,
        editionSize: a.edition_size ?? null,
        archivedAt: a.archived_at || null,
        setId: a.set_id || null,
        venueCity: (a.venue as any)?.city || null,
        venueNeighborhood: (a.venue as any)?.neighborhood || null,
        venueSlug: (a.venue as any)?.slug || null,
      };
    }

    function shapePublicArtworkDetail(a: any) {
      const base = shapePublicArtwork(a);
      if (!base) return null;
      return {
        ...base,
        knownFlaws: a.known_flaws || null,
        materials: a.materials || null,
        shippingTimeEstimate: a.shipping_time_estimate || null,
        inSpacePhotoUrl: a.in_space_photo_url || null,
        colorAccuracyAck: !!a.color_accuracy_ack,
        purchaseUrl: a.purchase_url || null,
        qrSvg: a.qr_svg || null,
        stripeProductId: a.stripe_product_id || null,
        stripePriceId: a.stripe_price_id || null,
      };
    }

    // ── Artwork limit helpers ──
    async function getArtistArtworkLimit(artistId: string): Promise<number> {
      if (!supabaseAdmin) return 1;
      const { data: artist } = await supabaseAdmin
        .from('artists')
        .select('subscription_tier,subscription_status,pro_until')
        .eq('id', artistId)
        .maybeSingle();
      if (!artist) return 1;
      const proUntil = artist.pro_until ? new Date(artist.pro_until).getTime() : 0;
      const hasProOverride = !!proUntil && proUntil > Date.now();
      const tier = normalizeArtistTier(hasProOverride ? 'pro' : (artist.subscription_tier || 'free'));
      const status = String(hasProOverride ? 'active' : (artist.subscription_status || '')).toLowerCase();
      const isActive = status === 'active';
      return getArtworkLimit(tier as any, isActive);
    }

    async function getArtistActiveArtworkCount(artistId: string): Promise<number> {
      if (!supabaseAdmin) return 0;
      const { count, error } = await supabaseAdmin
        .from('artworks')
        .select('id', { count: 'exact', head: true })
        .eq('artist_id', artistId)
        .in('status', ['available', 'active', 'published']);
      if (error) return 0;
      return count || 0;
    }

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

      const rate = rateLimitByIp(getClientIp(request), 30, 60_000);
      if (!rate.ok) return json({ error: 'Rate limit exceeded' }, { status: 429 });

      const user = await getSupabaseUserFromRequest(request);

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

    // Admin-only: wall productivity metrics (proxies the RPC)
    if (url.pathname === '/api/admin/wall-productivity' && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });

      const user = await getSupabaseUserFromRequest(request);
      if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
      const { data: artist } = await supabaseAdmin
        .from('artists')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      if (artist?.role !== 'admin') return json({ error: 'Forbidden' }, { status: 403 });

      const days = parseInt(url.searchParams.get('days') || '7', 10);
      const safeDays = Math.min(Math.max(days, 1), 90);

      const { data, error: rpcErr } = await supabaseAdmin.rpc('wall_productivity_metrics', {
        p_days: safeDays,
      });
      if (rpcErr) return json({ error: rpcErr.message }, { status: 500 });
      return json(data);
    }

    // ── Momentum banner dismiss ──
    if (url.pathname === '/api/artists/dismiss-momentum-banner' && method === 'POST') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const user = await getSupabaseUserFromRequest(request);
      if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

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

    // Public listings: venues (restricted from venue accounts)
    if (url.pathname === '/api/venues' && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const requester = await getSupabaseUserFromRequest(request);
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
      const q = (url.searchParams.get('q') || '').trim();
      
      let query = supabaseAdmin
        .from('artists')
        .select('id,slug,name,email,city_primary,city_secondary,profile_photo_url,is_live,is_public')
        .order('name', { ascending: true })
        .limit(50);

      query = query.eq('is_public', true);

      // Allow discovery of active artists; if is_live is null, still include for visibility
      query = query.or('is_live.eq.true,is_live.is.null');
      
      // Search by name or email if a query is provided
      if (q) {
        query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%`);
      }
      
      const { data, error } = await query;
      if (error) return json({ error: error.message }, { status: 500 });
      const artists = (data || []).map(a => ({ 
        id: a.id, 
        slug: (a as any).slug || null,
        name: a.name, 
        email: a.email,
        profile_photo_url: a.profile_photo_url,
        location: a.city_primary || a.city_secondary || 'Local',
        is_live: a.is_live,
      }));
      return json({ artists });
    }

    // ── Stripe Routes ──────────────────────────────────────────────

    // Stripe webhook – verify signature with Web Crypto, then handle event
    if (url.pathname === '/api/stripe/webhook' && method === 'POST') {
      try {
        const body = await request.text();
        const sig = request.headers.get('stripe-signature') || '';
        const event = await verifyAndParseStripeEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);
        if (!event) return json({ error: 'Invalid signature' }, { status: 400 });

        // Idempotency check
        if (supabaseAdmin) {
          const { data: existing } = await supabaseAdmin
            .from('stripe_webhook_events')
            .select('stripe_event_id')
            .eq('stripe_event_id', event.id)
            .maybeSingle();
          if (existing) return json({ received: true, duplicate: true });
        }

        // ── Handle event types ──

        if (event.type === 'checkout.session.completed') {
          const session = event.data?.object;

          // Subscription checkout completed
          if (session?.mode === 'subscription') {
            const artistId = session?.metadata?.artistId;
            const tier = session?.metadata?.tier || 'free';
            const subscriptionId = session.subscription;
            const customerId = session.customer;
            if (artistId && subscriptionId && typeof subscriptionId === 'string') {
              await upsertArtist({
                id: artistId,
                stripeCustomerId: typeof customerId === 'string' ? customerId : null,
                stripeSubscriptionId: subscriptionId,
                subscriptionTier: tier,
                subscriptionStatus: 'active',
              });
              console.log('✅ Artist subscription activated', { artistId, tier, subscriptionId });
            }
          }

          // Marketplace payment checkout completed
          if (session?.mode === 'payment') {
            const orderId = session?.metadata?.orderId;
            const artworkId = session?.metadata?.artworkId;
            if (orderId && supabaseAdmin) {
              const { data: order } = await supabaseAdmin
                .from('orders')
                .select('*')
                .eq('id', orderId)
                .maybeSingle();
              if (order && order.status !== 'paid') {
                await supabaseAdmin
                  .from('orders')
                  .update({ status: 'paid', updated_at: new Date().toISOString() })
                  .eq('id', orderId);
                if (artworkId) {
                  await supabaseAdmin
                    .from('artworks')
                    .update({ status: 'sold', updated_at: new Date().toISOString() })
                    .eq('id', artworkId);
                }
                console.log('✅ Marketplace order paid', { orderId });
              }
            }
          }
        }

        if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
          const sub = event.data?.object;
          const artistId = sub?.metadata?.artistId;
          const tier = sub?.metadata?.tier || 'free';
          if (artistId) {
            await upsertArtist({
              id: artistId,
              stripeSubscriptionId: sub?.id || null,
              subscriptionTier: tier,
              subscriptionStatus: sub?.status === 'active' ? 'active' : (sub?.status || 'inactive'),
            });
            console.log('✅ Artist subscription updated', { artistId, status: sub?.status });
          }
        }

        if (event.type === 'account.updated') {
          const account = event.data?.object;
          if (account?.id && supabaseAdmin) {
            const nowIso = new Date().toISOString();
            const updates = {
              stripe_charges_enabled: !!account.charges_enabled,
              stripe_payouts_enabled: !!account.payouts_enabled,
              stripe_details_submitted: !!account.details_submitted,
              updated_at: nowIso,
            };
            await supabaseAdmin.from('artists').update(updates).eq('stripe_account_id', account.id);
            await supabaseAdmin.from('venues').update(updates).eq('stripe_account_id', account.id);
            console.log('✅ Connect account updated', account.id);
          }
        }

        // Record for idempotency
        if (supabaseAdmin) {
          await supabaseAdmin.from('stripe_webhook_events').insert({
            stripe_event_id: event.id,
            type: event.type,
            note: 'processed by worker',
            processed_at: new Date().toISOString(),
          }).then(() => {}).catch(() => {});
        }

        return json({ received: true });
      } catch (err: any) {
        console.error('Stripe webhook error:', err?.message);
        return json({ error: err?.message || 'Webhook processing failed' }, { status: 400 });
      }
    }

    // ── Stripe Connect: Artist ──

    // Create Connect Express account for artist
    if (url.pathname === '/api/stripe/connect/artist/create-account' && method === 'POST') {
      const user = await getSupabaseUserFromRequest(request);
      if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
      if (user.user_metadata?.role !== 'artist') return json({ error: 'Artist role required' }, { status: 403 });
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });

      // Check if already has account
      const { data: artist } = await supabaseAdmin.from('artists').select('stripe_account_id,email,name').eq('id', user.id).maybeSingle();
      if (artist?.stripe_account_id) return json({ accountId: artist.stripe_account_id, alreadyExists: true });

      try {
        const resp = await stripeFetch('/v1/accounts', {
          method: 'POST',
          body: toForm({
            type: 'express',
            email: artist?.email || user.email || undefined,
            'capabilities[card_payments][requested]': 'true',
            'capabilities[transfers][requested]': 'true',
            'metadata[artistId]': user.id,
          }),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const account = await resp.json();
        if (!resp.ok) throw new Error(account?.error?.message || 'Account creation failed');

        await upsertArtist({ id: user.id, email: artist?.email, name: artist?.name, role: 'artist', stripeAccountId: account.id });
        return json({ accountId: account.id, alreadyExists: false });
      } catch (err: any) {
        return json({ error: err?.message || 'Stripe Connect error' }, { status: 500 });
      }
    }

    // Create account link for artist onboarding
    if (url.pathname === '/api/stripe/connect/artist/account-link' && method === 'POST') {
      const user = await getSupabaseUserFromRequest(request);
      if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
      if (user.user_metadata?.role !== 'artist') return json({ error: 'Artist role required' }, { status: 403 });
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });

      const { data: artist } = await supabaseAdmin.from('artists').select('stripe_account_id').eq('id', user.id).maybeSingle();
      if (!artist?.stripe_account_id) return json({ error: 'No Stripe account. Call /create-account first.' }, { status: 400 });

      const pagesOrigin = env.PAGES_ORIGIN || 'https://artwalls.space';
      try {
        const resp = await stripeFetch('/v1/account_links', {
          method: 'POST',
          body: toForm({
            account: artist.stripe_account_id,
            refresh_url: `${pagesOrigin}/#/artist-dashboard`,
            return_url: `${pagesOrigin}/#/artist-dashboard`,
            type: 'account_onboarding',
          }),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const link = await resp.json();
        if (!resp.ok) throw new Error(link?.error?.message || 'Account link failed');
        return json({ url: link.url });
      } catch (err: any) {
        return json({ error: err?.message || 'Stripe account link error' }, { status: 500 });
      }
    }

    // Login link for artist Connect dashboard
    if (url.pathname === '/api/stripe/connect/artist/login-link' && method === 'POST') {
      const user = await getSupabaseUserFromRequest(request);
      if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });

      const { data: artist } = await supabaseAdmin.from('artists').select('stripe_account_id').eq('id', user.id).maybeSingle();
      if (!artist?.stripe_account_id) return json({ error: 'No Stripe account yet' }, { status: 400 });

      try {
        const resp = await stripeFetch(`/v1/accounts/${artist.stripe_account_id}/login_links`, {
          method: 'POST',
          body: '',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const link = await resp.json();
        if (!resp.ok) throw new Error(link?.error?.message || 'Login link failed');
        return json({ url: link.url });
      } catch (err: any) {
        return json({ error: err?.message || 'Stripe login link error' }, { status: 500 });
      }
    }

    // Artist Connect status
    if (url.pathname === '/api/stripe/connect/artist/status' && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const artistId = url.searchParams.get('artistId');
      if (!artistId) return json({ error: 'Missing artistId' }, { status: 400 });

      const { data: artist } = await supabaseAdmin.from('artists').select('stripe_account_id').eq('id', artistId).maybeSingle();
      if (!artist?.stripe_account_id) return json({ hasAccount: false });

      try {
        const resp = await stripeFetch(`/v1/accounts/${artist.stripe_account_id}`, { method: 'GET' });
        const account = await resp.json();
        if (!resp.ok) throw new Error(account?.error?.message || 'Status fetch failed');
        return json({
          hasAccount: true,
          accountId: artist.stripe_account_id,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
          requirements: account.requirements,
        });
      } catch (err: any) {
        return json({ error: err?.message || 'Stripe status error' }, { status: 500 });
      }
    }

    // ── Stripe Connect: Venue ──

    // Create Connect Express account for venue
    if (url.pathname === '/api/stripe/connect/venue/create-account' && method === 'POST') {
      const user = await getSupabaseUserFromRequest(request);
      if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
      if (user.user_metadata?.role !== 'venue') return json({ error: 'Venue role required' }, { status: 403 });
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });

      const { data: venue } = await supabaseAdmin.from('venues').select('stripe_account_id,email,name,default_venue_fee_bps').eq('id', user.id).maybeSingle();
      if (venue?.stripe_account_id) return json({ accountId: venue.stripe_account_id, alreadyExists: true });

      try {
        const resp = await stripeFetch('/v1/accounts', {
          method: 'POST',
          body: toForm({
            type: 'express',
            email: venue?.email || user.email || undefined,
            'capabilities[card_payments][requested]': 'true',
            'capabilities[transfers][requested]': 'true',
            'metadata[venueId]': user.id,
          }),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const account = await resp.json();
        if (!resp.ok) throw new Error(account?.error?.message || 'Account creation failed');

        await upsertVenue({ id: user.id, email: venue?.email, name: venue?.name, stripeAccountId: account.id, defaultVenueFeeBps: venue?.default_venue_fee_bps ?? 1000 });
        return json({ accountId: account.id, alreadyExists: false });
      } catch (err: any) {
        return json({ error: err?.message || 'Stripe Connect error' }, { status: 500 });
      }
    }

    // Create account link for venue onboarding
    if (url.pathname === '/api/stripe/connect/venue/account-link' && method === 'POST') {
      const user = await getSupabaseUserFromRequest(request);
      if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
      if (user.user_metadata?.role !== 'venue') return json({ error: 'Venue role required' }, { status: 403 });
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });

      const { data: venue } = await supabaseAdmin.from('venues').select('stripe_account_id').eq('id', user.id).maybeSingle();
      if (!venue?.stripe_account_id) return json({ error: 'No Stripe account. Call /create-account first.' }, { status: 400 });

      const pagesOrigin = env.PAGES_ORIGIN || 'https://artwalls.space';
      try {
        const resp = await stripeFetch('/v1/account_links', {
          method: 'POST',
          body: toForm({
            account: venue.stripe_account_id,
            refresh_url: `${pagesOrigin}/#/venue-dashboard`,
            return_url: `${pagesOrigin}/#/venue-dashboard`,
            type: 'account_onboarding',
          }),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const link = await resp.json();
        if (!resp.ok) throw new Error(link?.error?.message || 'Account link failed');
        return json({ url: link.url });
      } catch (err: any) {
        return json({ error: err?.message || 'Stripe account link error' }, { status: 500 });
      }
    }

    // Login link for venue Connect dashboard
    if (url.pathname === '/api/stripe/connect/venue/login-link' && method === 'POST') {
      const user = await getSupabaseUserFromRequest(request);
      if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });

      const { data: venue } = await supabaseAdmin.from('venues').select('stripe_account_id').eq('id', user.id).maybeSingle();
      if (!venue?.stripe_account_id) return json({ error: 'No Stripe account yet' }, { status: 400 });

      try {
        const resp = await stripeFetch(`/v1/accounts/${venue.stripe_account_id}/login_links`, {
          method: 'POST',
          body: '',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const link = await resp.json();
        if (!resp.ok) throw new Error(link?.error?.message || 'Login link failed');
        return json({ url: link.url });
      } catch (err: any) {
        return json({ error: err?.message || 'Stripe login link error' }, { status: 500 });
      }
    }

    // Venue Connect status
    if (url.pathname === '/api/stripe/connect/venue/status' && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const venueId = url.searchParams.get('venueId');
      if (!venueId) return json({ error: 'Missing venueId' }, { status: 400 });

      const { data: venue } = await supabaseAdmin.from('venues').select('stripe_account_id').eq('id', venueId).maybeSingle();
      if (!venue?.stripe_account_id) return json({ hasAccount: false });

      try {
        const resp = await stripeFetch(`/v1/accounts/${venue.stripe_account_id}`, { method: 'GET' });
        const account = await resp.json();
        if (!resp.ok) throw new Error(account?.error?.message || 'Status fetch failed');
        return json({
          hasAccount: true,
          accountId: venue.stripe_account_id,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
          requirements: account.requirements,
        });
      } catch (err: any) {
        return json({ error: err?.message || 'Stripe status error' }, { status: 500 });
      }
    }

    // ── Stripe Billing ──

    // Create subscription checkout session
    if (url.pathname === '/api/stripe/billing/create-subscription-session' && method === 'POST') {
      const user = await getSupabaseUserFromRequest(request);
      if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
      if (user.user_metadata?.role === 'venue') return json({ error: 'Only artists can subscribe' }, { status: 403 });
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });

      const body = await request.json().catch(() => ({}));
      const tier = String(body?.tier || '').toLowerCase();
      if (!['starter', 'growth', 'pro'].includes(tier)) return json({ error: 'Invalid tier' }, { status: 400 });

      const priceMap: Record<string, string | undefined> = {
        starter: env.STRIPE_PRICE_ID_STARTER || env.STRIPE_SUB_PRICE_STARTER,
        growth: env.STRIPE_PRICE_ID_GROWTH || env.STRIPE_SUB_PRICE_GROWTH,
        pro: env.STRIPE_PRICE_ID_PRO || env.STRIPE_SUB_PRICE_PRO,
      };
      const priceId = priceMap[tier];
      if (!priceId) return json({ error: `Price ID not configured for ${tier}` }, { status: 500 });

      // Ensure Stripe customer
      const { data: artist } = await supabaseAdmin.from('artists').select('stripe_customer_id,email,name').eq('id', user.id).maybeSingle();
      let customerId = artist?.stripe_customer_id;
      if (!customerId) {
        const custResp = await stripeFetch('/v1/customers', {
          method: 'POST',
          body: toForm({
            email: artist?.email || user.email || undefined,
            name: artist?.name || undefined,
            'metadata[artistId]': user.id,
          }),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const cust = await custResp.json();
        if (!custResp.ok) return json({ error: cust?.error?.message || 'Customer creation failed' }, { status: 500 });
        customerId = cust.id;
        await upsertArtist({ id: user.id, stripeCustomerId: customerId });
      }

      const pagesOrigin = env.PAGES_ORIGIN || 'https://artwalls.space';
      try {
        const sessResp = await stripeFetch('/v1/checkout/sessions', {
          method: 'POST',
          body: toForm({
            mode: 'subscription',
            success_url: `${pagesOrigin}/#/artist-dashboard?sub=success`,
            cancel_url: `${pagesOrigin}/#/artist-dashboard?sub=cancel`,
            customer: customerId,
            'line_items[0][price]': priceId,
            'line_items[0][quantity]': '1',
            'metadata[artistId]': user.id,
            'metadata[tier]': tier,
            'subscription_data[metadata][artistId]': user.id,
            'subscription_data[metadata][tier]': tier,
          }),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const sess = await sessResp.json();
        if (!sessResp.ok) throw new Error(sess?.error?.message || 'Checkout session failed');
        return json({ url: sess.url });
      } catch (err: any) {
        return json({ error: err?.message || 'Unable to start subscription checkout' }, { status: 500 });
      }
    }

    // Create billing portal session
    if (url.pathname === '/api/stripe/billing/create-portal-session' && method === 'POST') {
      const user = await getSupabaseUserFromRequest(request);
      if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });

      const { data: artist } = await supabaseAdmin.from('artists').select('stripe_customer_id,email,name').eq('id', user.id).maybeSingle();
      let customerId = artist?.stripe_customer_id;
      if (!customerId) {
        const custResp = await stripeFetch('/v1/customers', {
          method: 'POST',
          body: toForm({
            email: artist?.email || user.email || undefined,
            name: artist?.name || undefined,
            'metadata[artistId]': user.id,
          }),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const cust = await custResp.json();
        if (!custResp.ok) return json({ error: cust?.error?.message || 'Customer creation failed' }, { status: 500 });
        customerId = cust.id;
        await upsertArtist({ id: user.id, stripeCustomerId: customerId });
      }

      const pagesOrigin = env.PAGES_ORIGIN || 'https://artwalls.space';
      try {
        const portalResp = await stripeFetch('/v1/billing_portal/sessions', {
          method: 'POST',
          body: toForm({
            customer: customerId,
            return_url: `${pagesOrigin}/#/artist-dashboard`,
          }),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const portal = await portalResp.json();
        if (!portalResp.ok) throw new Error(portal?.error?.message || 'Billing portal error');
        return json({ url: portal.url });
      } catch (err: any) {
        return json({ error: err?.message || 'Billing portal error' }, { status: 500 });
      }
    }

    // ══════════════════════════════════════════════════════════════════
    // Public routes (artwork browsing, artist profiles, sets)
    // ══════════════════════════════════════════════════════════════════
    //
    // NOTE: The following public route handlers (through the end of the
    // venue POST upsert) are the CANONICAL copies. Any duplicate blocks
    // that follow are stale copies that should be removed.

    // Public: single artist with public artworks, display locations, and sets (lookup by slug or id)
    if (url.pathname.startsWith('/api/public/artists/') && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const parts = url.pathname.split('/');
      const slugOrId = parts[4];
      if (!slugOrId) return json({ error: 'Missing artist id or slug' }, { status: 400 });

      const uid = url.searchParams.get('uid');
      const identifier = decodeURIComponent(slugOrId);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
      
      let matchFilter = isUuid ? { id: identifier } : { slug: identifier }; // CANONICAL_COPY

      let { data: artistRow, error: artistError } = await supabaseAdmin // CANONICAL
        .from('artists')
        .select('id,slug,name,bio,profile_photo_url,portfolio_url,website_url,instagram_handle,city_primary,city_secondary,is_public')
        .match(matchFilter)
        .maybeSingle();

      // If not found by slug/id, and a UID is provided, try finding by UID.
      // This handles cases where the primary link might be stale but the user context is valid.
      if (!artistRow && uid) {
        const { data: artistByUid, error: uidError } = await supabaseAdmin
          .from('artists')
          .select('id,slug,name,bio,profile_photo_url,portfolio_url,website_url,instagram_handle,city_primary,city_secondary,is_public')
          .eq('id', uid)
          .maybeSingle();
        
        if (uidError) {
          // Log the secondary error but proceed with the original "not found"
          console.warn(`Secondary lookup by UID failed: ${uidError.message}`);
        } else if (artistByUid) {
          artistRow = artistByUid;
          artistError = null; // Clear original error
        }
      }

      if (artistError) return json({ error: artistError.message }, { status: 500 });
      if (!artistRow) return json({ error: 'Not found' }, { status: 404 });

      const artistId = artistRow.id;

      const [artworksRes, displayRes, setsRes] = await Promise.all([
        supabaseAdmin
          .from('artworks')
          .select('id,title,status,price_cents,currency,image_url,artist_id,artist_name,venue_id,venue_name,is_public,archived_at,published_at,set_id,venue:venues(name,city,state,neighborhood,slug,is_public)')
          .eq('artist_id', artistId)
          .eq('is_public', true)
          .is('archived_at', null)
          .in('status', PUBLIC_ARTWORK_STATUSES)
          .order('published_at', { ascending: false })
          .limit(60),
        supabaseAdmin
          .from('v_artist_current_displays')
          .select('artwork_id,venue_id,set_id,status')
          .eq('artist_id', artistId),
        supabaseAdmin
          .from('artwork_sets')
          .select('id,title,description,hero_image_url,visibility,status,items:artwork_set_items(set_id, artwork_id, sort_order, artwork:artworks(id,title,status,price_cents,currency,image_url,archived_at,set_id)))')
          .eq('artist_id', artistId)
          .eq('status', 'published')
          .eq('visibility', 'public')
          .order('updated_at', { ascending: false }),
      ]);

      if (artworksRes.error) return json({ error: artworksRes.error.message }, { status: 500 });
      if (displayRes.error) return json({ error: displayRes.error.message }, { status: 500 });
      if (setsRes.error) return json({ error: setsRes.error.message }, { status: 500 });

      const artworks = Array.isArray(artworksRes.data) ? artworksRes.data.map(shapePublicArtwork) : [];
      const artworkMap = new Map<string, any>();
      artworks.forEach((a) => artworkMap.set(a.id, { ...a }));

      const displayRows = Array.isArray(displayRes.data) ? displayRes.data : [];
      const displayArtworkIds = Array.from(new Set(displayRows.map((r: any) => r.artwork_id).filter(Boolean)));
      const missingArtIds = displayArtworkIds.filter((id) => !artworkMap.has(id));

      if (missingArtIds.length) {
        const { data: missingArts, error: missingErr } = await supabaseAdmin
          .from('artworks')
          .select('id,title,status,price_cents,currency,image_url,artist_id,artist_name,venue_id,venue_name,is_public,archived_at,published_at,set_id,venue:venues(name,city,state,neighborhood,slug,is_public)')
          .in('id', missingArtIds);
        if (missingErr) return json({ error: missingErr.message }, { status: 500 });
        (missingArts || []).map(shapePublicArtwork).forEach((a) => artworkMap.set(a.id, { ...a }));
      }

      // Venue metadata for grouping/badges
      const venueIds = new Set<string>();
      artworkMap.forEach((a) => { if (a.venueId) venueIds.add(a.venueId); });
      displayRows.forEach((r: any) => { if (r.venue_id) venueIds.add(r.venue_id); });
      const venueMap = new Map<string, any>();
      if (venueIds.size) {
        const { data: venues, error: venueErr } = await supabaseAdmin
          .from('venues')
          .select('id,name,city,state,neighborhood,slug,is_public')
          .in('id', Array.from(venueIds));
        if (venueErr) return json({ error: venueErr.message }, { status: 500 });
        (venues || []).forEach((v) => venueMap.set(v.id, v));
      }

      // Sets metadata for display grouping and tab
      const setMetaMap = new Map<string, { id: string; title: string; visibility?: string; status?: string }>();
      const sets = (Array.isArray(setsRes.data) ? setsRes.data : []).map((row: any) => {
        const items = Array.isArray(row.items) ? row.items : [];
        const availableItems = items
          .map((i: any) => ({ ...i, artwork: i.artwork ? shapePublicArtwork(i.artwork) : null }))
          .filter((i: any) => i.artwork && PUBLIC_ARTWORK_STATUSES.includes(String(i.artwork.status || '').toLowerCase()) && !(i.artwork as any).archivedAt);
        const heroImage = row.hero_image_url || availableItems.find((i: any) => i.artwork?.imageUrl)?.artwork?.imageUrl || null;
        setMetaMap.set(row.id, { id: row.id, title: row.title, visibility: row.visibility, status: row.status });
        return {
          id: row.id,
          title: row.title,
          description: row.description || null,
          heroImageUrl: heroImage,
          pieceCount: availableItems.length,
          items: availableItems.slice(0, 6).map((i: any) => i.artwork),
        };
      });

      const displaySetIds = Array.from(new Set(displayRows.map((r: any) => r.set_id).filter(Boolean)));
      const missingSetIds = displaySetIds.filter((id) => !setMetaMap.has(id));
      if (missingSetIds.length) {
        const { data: extraSets, error: extraErr } = await supabaseAdmin
          .from('artwork_sets')
          .select('id,title,visibility,status')
          .in('id', missingSetIds);
        if (extraErr) return json({ error: extraErr.message }, { status: 500 });
        (extraSets || []).forEach((s) => setMetaMap.set(s.id, { id: s.id, title: s.title, visibility: s.visibility, status: s.status }));
      }

      const groups = new Map<string, any>();
      displayRows.forEach((r: any) => {
        const art = artworkMap.get(r.artwork_id);
        if (!art) return;
        const setId = r.set_id || art.setId || null;
        const venue = r.venue_id ? venueMap.get(r.venue_id) : null;
        const venueKey = venue?.id || r.venue_id;
        if (!venueKey) return;

        art.display = {
          venueId: venue?.id || r.venue_id || null,
          venueName: venue?.name || art.venueName || null,
          setId,
          setTitle: setId ? (setMetaMap.get(setId)?.title || null) : null,
        };
        artworkMap.set(art.id, art);

        if (!groups.has(venueKey)) {
          groups.set(venueKey, {
            venue: venue || { id: r.venue_id, name: art.venueName || 'Venue' },
            sets: new Map<string, any>(),
            artworks: [] as any[],
          });
        }
        const group = groups.get(venueKey);
        if (setId) {
          if (!group.sets.has(setId)) {
            group.sets.set(setId, { id: setId, title: setMetaMap.get(setId)?.title || 'Collection', artworks: [] as any[] });
          }
          const setGroup = group.sets.get(setId);
          setGroup.artworks.push(art);
        } else {
          group.artworks.push(art);
        }
      });

      const onDisplay = Array.from(groups.values()).map((g: any) => ({
        venue: g.venue,
        sets: Array.from(g.sets.values()).map((s: any) => ({ ...s, pieceCount: s.artworks.length })),
        artworks: g.artworks,
      }));

      const forSale = Array.from(artworkMap.values());

      const artist = {
        id: artistRow.id,
        slug: (artistRow as any).slug || null,
        name: artistRow.name,
        bio: artistRow.bio || null,
        profilePhotoUrl: (artistRow as any).profile_photo_url || null,
        portfolioUrl: (artistRow as any).portfolio_url || null,
        websiteUrl: (artistRow as any).website_url || null,
        instagramHandle: (artistRow as any).instagram_handle || null,
        cityPrimary: (artistRow as any).city_primary || null,
        citySecondary: (artistRow as any).city_secondary || null,
      };

      return json({ artist, forSale, onDisplay, sets });
    }

    // Public: single published set (by id) with artworks and display venues
    if (url.pathname.startsWith('/api/public/sets/') && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const parts = url.pathname.split('/');
      const setId = parts[4];
      if (!setId) return json({ error: 'Missing set id' }, { status: 400 });

      const { data, error } = await supabaseAdmin
        .from('artwork_sets')
        .select('id,artist_id,title,description,hero_image_url,visibility,status,items:artwork_set_items(set_id, artwork_id, sort_order, artwork:artworks(id,title,status,price_cents,currency,image_url,artist_id,artist_name,venue_id,venue_name,archived_at,set_id,venue:venues(name,city,state,neighborhood,slug,is_public)))')
        .eq('id', setId)
        .eq('status', 'published')
        .eq('visibility', 'public')
        .maybeSingle();

      if (error) return json({ error: error.message }, { status: 500 });
      if (!data) return json({ error: 'Not found' }, { status: 404 });

      const rawItems = Array.isArray((data as any).items) ? (data as any).items : [];
      const allowedItems = rawItems
        .map((i: any) => ({ ...i, artwork: i.artwork ? shapePublicArtwork(i.artwork) : null }))
        .filter((i: any) => i.artwork && PUBLIC_ARTWORK_STATUSES.includes(String(i.artwork.status || '').toLowerCase()) && !i.artwork.archivedAt);

      const artworkIds = allowedItems.map((i: any) => i.artwork.id);
      const { data: displayRows, error: displayErr } = artworkIds.length
        ? await supabaseAdmin
            .from('v_artist_current_displays')
            .select('artwork_id,venue_id,set_id,status')
            .in('artwork_id', artworkIds)
        : { data: [], error: null } as any;
      if (displayErr) return json({ error: displayErr.message }, { status: 500 });

      const venueIds = new Set<string>();
      (displayRows || []).forEach((r: any) => { if (r.venue_id) venueIds.add(r.venue_id); });
      const venueMap = new Map<string, any>();
      if (venueIds.size) {
        const { data: venues, error: venueErr } = await supabaseAdmin
          .from('venues')
          .select('id,name,city,state,neighborhood,slug,is_public')
          .in('id', Array.from(venueIds));
        if (venueErr) return json({ error: venueErr.message }, { status: 500 });
        (venues || []).forEach((v) => venueMap.set(v.id, v));
      }

      const items = allowedItems.map((i: any) => {
        const displays = (displayRows || []).filter((r: any) => r.artwork_id === i.artwork.id);
        const displayVenues = displays.map((r: any) => venueMap.get(r.venue_id) || { id: r.venue_id, name: i.artwork.venueName || null, city: null, neighborhood: null, slug: null });
        return { artwork: i.artwork, displayVenues };
      });

      const heroImage = (data as any).hero_image_url || items.find((i: any) => i.artwork?.imageUrl)?.artwork?.imageUrl || null;

      return json({
        set: {
          id: data.id,
          artistId: (data as any).artist_id,
          title: data.title,
          description: (data as any).description || null,
          heroImageUrl: heroImage,
          pieceCount: items.length,
          items,
        },
      });
    }

    // Public: single artist (basic profile, lookup by slug or id)
    if (url.pathname.startsWith('/api/artists/') && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const parts = url.pathname.split('/');
      const slugOrId = parts[3];
      if (!slugOrId) return json({ error: 'Missing artist id or slug' }, { status: 400 });
      const identifier = decodeURIComponent(slugOrId);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
      const matchFilter = isUuid ? { id: identifier } : { slug: identifier };
      const { data, error } = await supabaseAdmin
        .from('artists')
        .select('id,slug,name,bio,profile_photo_url,portfolio_url,website_url,city_primary,city_secondary,is_public')
        .match(matchFilter)
        .eq('is_public', true)
        .maybeSingle();
      if (error) return json({ error: error.message }, { status: 500 });
      if (!data) return json({ error: 'Not found' }, { status: 404 });
      return json({
        id: data.id,
        slug: (data as any).slug || null,
        name: data.name,
        bio: data.bio || null,
        profilePhotoUrl: (data as any).profile_photo_url || null,
        portfolioUrl: (data as any).portfolio_url || null,
        websiteUrl: (data as any).website_url || null,
        cityPrimary: (data as any).city_primary || null,
        citySecondary: (data as any).city_secondary || null,
      });
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
      const requester = await getSupabaseUserFromRequest(request);
      const isAdmin = requester?.user_metadata?.role === 'admin' || requester?.user_metadata?.isAdmin === true;
      const isOwner = requester?.id && artistId && requester.id === artistId;
      const isPublicQuery = !(isAdmin || isOwner);
      let query = supabaseAdmin
        .from('artworks')
        .select('id,title,status,price_cents,currency,image_url,artist_id,artist_name,venue_id,venue_name,is_public,archived_at,published_at,venue:venues(name,city,state,neighborhood,slug,is_public)')
        .order('published_at', { ascending: false })
        .limit(50);
      if (isPublicQuery) {
        query = query.eq('is_public', true).in('status', PUBLIC_ARTWORK_STATUSES);
      }
      query = query.is('archived_at', null);
      if (artistId) query = query.eq('artist_id', artistId);
      const { data, error } = await query;
      if (error) return json({ error: error.message }, { status: 500 });
      const artworks = (data || []).map(shapePublicArtwork);
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
      const baseSelect = 'id,title,status,price_cents,currency,image_url,image_urls,artist_id,venue_id,artist_name,venue_name,description,purchase_url,qr_svg,is_public,published_at,archived_at,venue:venues(name,city,state,neighborhood,slug,is_public)';
      let { data, error } = await supabaseAdmin
        .from('artworks')
        .select(baseSelect)
        .eq('id', id)
        .eq('is_public', true)
        .is('archived_at', null)
        .in('status', PUBLIC_ARTWORK_STATUSES)
        .maybeSingle();
      if (error) return json({ error: error.message }, { status: 500 });

      // If not public, allow owner/admin to view their own listing
      if (!data) {
        const requester = await getSupabaseUserFromRequest(request);
        const isAdmin = requester?.user_metadata?.role === 'admin' || requester?.user_metadata?.isAdmin === true;
        const { data: privateData, error: privateError } = await supabaseAdmin
          .from('artworks')
          .select(baseSelect)
          .eq('id', id)
          .maybeSingle();
        if (privateError) return json({ error: privateError.message }, { status: 500 });
        if (!privateData) return json({ error: 'Not found' }, { status: 404 });
        if (!isAdmin && requester?.id !== (privateData as any).artist_id) return json({ error: 'Forbidden' }, { status: 403 });
        data = privateData;
      }

      const artwork = shapePublicArtworkDetail(data);

      let otherWorks: any[] = [];
      if ((data as any).artist_id) {
        const { data: siblings } = await supabaseAdmin
          .from('artworks')
          .select('id,title,status,price_cents,currency,image_url,artist_id,artist_name,venue_id,venue_name,is_public,archived_at,published_at,set_id,venue:venues(name,city,state,neighborhood,slug,is_public)')
          .eq('artist_id', (data as any).artist_id)
          .neq('id', data.id)
          .eq('is_public', true)
          .is('archived_at', null)
          .in('status', PUBLIC_ARTWORK_STATUSES)
          .order('published_at', { ascending: false })
          .limit(6);
        otherWorks = (siblings || []).map(shapePublicArtwork);
      }

      return json({ ...artwork, otherWorks });
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

      // Enforce plan artwork limit before creating Stripe entities
      const [artworkLimit, activeCount] = await Promise.all([
        getArtistArtworkLimit(user.id),
        getArtistActiveArtworkCount(user.id),
      ]);
      if (Number.isFinite(artworkLimit) && activeCount + 1 > artworkLimit) {
        return json({ error: 'Artwork limit reached for your plan. Upgrade to add more artworks.' }, { status: 403 });
      }
      // Create Stripe Product + Price for marketplace listing
      const artworkId = crypto.randomUUID();
      let stripeProductId: string | null = null;
      let stripePriceId: string | null = null;
      try {
        const productResp = await stripeFetch('/v1/products', {
          method: 'POST',
          body: toForm({
            name: String(payload?.title || 'Artwork'),
            description: payload?.description || undefined,
            'images[]': primaryImageUrl || undefined,
            'metadata[artworkId]': artworkId,
            'metadata[artistId]': user.id,
          }),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const productJson = await productResp.json();
        if (!productResp.ok) throw new Error(productJson?.error?.message || 'Stripe product create failed');
        stripeProductId = productJson.id;

        const priceResp = await stripeFetch('/v1/prices', {
          method: 'POST',
          body: toForm({
            product: stripeProductId,
            unit_amount: price_cents,
            currency: String(payload?.currency || 'usd').toLowerCase(),
          }),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const priceJson = await priceResp.json();
        if (!priceResp.ok) throw new Error(priceJson?.error?.message || 'Stripe price create failed');
        stripePriceId = priceJson.id;
      } catch (err: any) {
        return json({ error: err?.message || 'Unable to create Stripe product/price' }, { status: 500 });
      }

      const insert = {
        id: artworkId,
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
        stripe_product_id: stripeProductId,
        stripe_price_id: stripePriceId,
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
    // Security: RLS on events table enforces service-role INSERT only (see 20260205_fix_p0_rls_and_idempotency.sql)
    // This endpoint uses service-role key, so writes succeed despite RLS
    // Client-side queries via anon key will fail (read-only access for own events)
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
      const { data: existing, error: fetchErr } = await supabaseAdmin
        .from('artworks')
        .select('id,artist_id,archived_at,status')
        .eq('id', id)
        .maybeSingle();
      if (fetchErr) return json({ error: fetchErr.message }, { status: 500 });
      if (!existing) return json({ error: 'Not found' }, { status: 404 });

      const [artworkLimit, activeCount] = await Promise.all([
        getArtistArtworkLimit(existing.artist_id),
        getArtistActiveArtworkCount(existing.artist_id),
      ]);
      if (Number.isFinite(artworkLimit) && activeCount > artworkLimit) {
        return json({ error: 'Artwork limit reached for this artist plan. Please upgrade to approve additional artworks.' }, { status: 403 });
      }
      const venueName = user.user_metadata?.name || null;
      const nowIso = new Date().toISOString();
      const { data: updated, error } = await supabaseAdmin
        .from('artworks')
        .update({ status: 'active', published_at: nowIso, archived_at: null, venue_id: user.id, venue_name: venueName, purchase_url: `${allowOrigin}/#/purchase-${id}`, updated_at: nowIso })
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (error) return json({ error: error.message }, { status: 500 });
      if (!updated) return json({ error: 'Not found' }, { status: 404 });
      const purchaseUrl = `${allowOrigin}/#/purchase-${id}`;
      const qrSvg = await generateQrSvg(purchaseUrl, 300);
      await supabaseAdmin.from('artworks').update({ qr_svg: qrSvg }).eq('id', id);
      if (updated.artist_id) {
        await supabaseAdmin.from('notifications').insert({
          id: crypto.randomUUID(),
          user_id: updated.artist_id,
          role: 'artist',
          type: 'artwork_approved',
          title: 'Artwork approved for display',
          message: `${updated.title || 'Artwork'} was approved to display at ${venueName || 'a venue'}.`,
          artwork_id: updated.id,
          created_at: nowIso,
        });
      }
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
        address: payload?.address || null,
        addressLat: typeof payload?.addressLat === 'number' ? payload.addressLat : null,
        addressLng: typeof payload?.addressLng === 'number' ? payload.addressLng : null,
        defaultVenueFeeBps: typeof payload?.defaultVenueFeeBps === 'number' ? payload.defaultVenueFeeBps : 1000,
      });
      return resp;
    }

    // Public: single artist with public artworks, display locations, and sets (lookup by slug or id)
    if (url.pathname.startsWith('/api/public/artists/') && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const parts = url.pathname.split('/');
      const slugOrId = parts[4];
      if (!slugOrId) return json({ error: 'Missing artist id or slug' }, { status: 400 });

      const uid = url.searchParams.get('uid');
      const identifier = decodeURIComponent(slugOrId);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
      
      let matchFilter = isUuid ? { id: identifier } : { slug: identifier };

      let { data: artistRow, error: artistError } = await supabaseAdmin
        .from('artists')
        .select('id,slug,name,bio,profile_photo_url,portfolio_url,website_url,instagram_handle,city_primary,city_secondary,is_public')
        .match(matchFilter)
        .maybeSingle();

      // If not found by slug/id, and a UID is provided, try finding by UID.
      // This handles cases where the primary link might be stale but the user context is valid.
      if (!artistRow && uid) {
        const { data: artistByUid, error: uidError } = await supabaseAdmin
          .from('artists')
          .select('id,slug,name,bio,profile_photo_url,portfolio_url,website_url,instagram_handle,city_primary,city_secondary,is_public')
          .eq('id', uid)
          .maybeSingle();
        
        if (uidError) {
          // Log the secondary error but proceed with the original "not found"
          console.warn(`Secondary lookup by UID failed: ${uidError.message}`);
        } else if (artistByUid) {
          artistRow = artistByUid;
          artistError = null; // Clear original error
        }
      }

      if (artistError) return json({ error: artistError.message }, { status: 500 });
      if (!artistRow) return json({ error: 'Not found' }, { status: 404 });

      const artistId = artistRow.id;

      const [artworksRes, displayRes, setsRes] = await Promise.all([
        supabaseAdmin
          .from('artworks')
          .select('id,title,status,price_cents,currency,image_url,artist_id,artist_name,venue_id,venue_name,is_public,archived_at,published_at,set_id,venue:venues(name,city,state,neighborhood,slug,is_public)')
          .eq('artist_id', artistId)
          .eq('is_public', true)
          .is('archived_at', null)
          .in('status', PUBLIC_ARTWORK_STATUSES)
          .order('published_at', { ascending: false })
          .limit(60),
        supabaseAdmin
          .from('v_artist_current_displays')
          .select('artwork_id,venue_id,set_id,status')
          .eq('artist_id', artistId),
        supabaseAdmin
          .from('artwork_sets')
          .select('id,title,description,hero_image_url,visibility,status,items:artwork_set_items(set_id, artwork_id, sort_order, artwork:artworks(id,title,status,price_cents,currency,image_url,archived_at,set_id)))')
          .eq('artist_id', artistId)
          .eq('status', 'published')
          .eq('visibility', 'public')
          .order('updated_at', { ascending: false }),
      ]);

      if (artworksRes.error) return json({ error: artworksRes.error.message }, { status: 500 });
      if (displayRes.error) return json({ error: displayRes.error.message }, { status: 500 });
      if (setsRes.error) return json({ error: setsRes.error.message }, { status: 500 });

      const artworks = Array.isArray(artworksRes.data) ? artworksRes.data.map(shapePublicArtwork) : [];
      const artworkMap = new Map<string, any>();
      artworks.forEach((a) => artworkMap.set(a.id, { ...a }));

      const displayRows = Array.isArray(displayRes.data) ? displayRes.data : [];
      const displayArtworkIds = Array.from(new Set(displayRows.map((r: any) => r.artwork_id).filter(Boolean)));
      const missingArtIds = displayArtworkIds.filter((id) => !artworkMap.has(id));

      if (missingArtIds.length) {
        const { data: missingArts, error: missingErr } = await supabaseAdmin
          .from('artworks')
          .select('id,title,status,price_cents,currency,image_url,artist_id,artist_name,venue_id,venue_name,is_public,archived_at,published_at,set_id,venue:venues(name,city,state,neighborhood,slug,is_public)')
          .in('id', missingArtIds);
        if (missingErr) return json({ error: missingErr.message }, { status: 500 });
        (missingArts || []).map(shapePublicArtwork).forEach((a) => artworkMap.set(a.id, { ...a }));
      }

      // Venue metadata for grouping/badges
      const venueIds = new Set<string>();
      artworkMap.forEach((a) => { if (a.venueId) venueIds.add(a.venueId); });
      displayRows.forEach((r: any) => { if (r.venue_id) venueIds.add(r.venue_id); });
      const venueMap = new Map<string, any>();
      if (venueIds.size) {
        const { data: venues, error: venueErr } = await supabaseAdmin
          .from('venues')
          .select('id,name,city,state,neighborhood,slug,is_public')
          .in('id', Array.from(venueIds));
        if (venueErr) return json({ error: venueErr.message }, { status: 500 });
        (venues || []).forEach((v) => venueMap.set(v.id, v));
      }

      // Sets metadata for display grouping and tab
      const setMetaMap = new Map<string, { id: string; title: string; visibility?: string; status?: string }>();
      const sets = (Array.isArray(setsRes.data) ? setsRes.data : []).map((row: any) => {
        const items = Array.isArray(row.items) ? row.items : [];
        const availableItems = items
          .map((i: any) => ({ ...i, artwork: i.artwork ? shapePublicArtwork(i.artwork) : null }))
          .filter((i: any) => i.artwork && PUBLIC_ARTWORK_STATUSES.includes(String(i.artwork.status || '').toLowerCase()) && !(i.artwork as any).archivedAt);
        const heroImage = row.hero_image_url || availableItems.find((i: any) => i.artwork?.imageUrl)?.artwork?.imageUrl || null;
        setMetaMap.set(row.id, { id: row.id, title: row.title, visibility: row.visibility, status: row.status });
        return {
          id: row.id,
          title: row.title,
          description: row.description || null,
          heroImageUrl: heroImage,
          pieceCount: availableItems.length,
          items: availableItems.slice(0, 6).map((i: any) => i.artwork),
        };
      });

      const displaySetIds = Array.from(new Set(displayRows.map((r: any) => r.set_id).filter(Boolean)));
      const missingSetIds = displaySetIds.filter((id) => !setMetaMap.has(id));
      if (missingSetIds.length) {
        const { data: extraSets, error: extraErr } = await supabaseAdmin
          .from('artwork_sets')
          .select('id,title,visibility,status')
          .in('id', missingSetIds);
        if (extraErr) return json({ error: extraErr.message }, { status: 500 });
        (extraSets || []).forEach((s) => setMetaMap.set(s.id, { id: s.id, title: s.title, visibility: s.visibility, status: s.status }));
      }

      const groups = new Map<string, any>();
      displayRows.forEach((r: any) => {
        const art = artworkMap.get(r.artwork_id);
        if (!art) return;
        const setId = r.set_id || art.setId || null;
        const venue = r.venue_id ? venueMap.get(r.venue_id) : null;
        const venueKey = venue?.id || r.venue_id;
        if (!venueKey) return;

        art.display = {
          venueId: venue?.id || r.venue_id || null,
          venueName: venue?.name || art.venueName || null,
          setId,
          setTitle: setId ? (setMetaMap.get(setId)?.title || null) : null,
        };
        artworkMap.set(art.id, art);

        if (!groups.has(venueKey)) {
          groups.set(venueKey, {
            venue: venue || { id: r.venue_id, name: art.venueName || 'Venue' },
            sets: new Map<string, any>(),
            artworks: [] as any[],
          });
        }
        const group = groups.get(venueKey);
        if (setId) {
          if (!group.sets.has(setId)) {
            group.sets.set(setId, { id: setId, title: setMetaMap.get(setId)?.title || 'Collection', artworks: [] as any[] });
          }
          const setGroup = group.sets.get(setId);
          setGroup.artworks.push(art);
        } else {
          group.artworks.push(art);
        }
      });

      const onDisplay = Array.from(groups.values()).map((g: any) => ({
        venue: g.venue,
        sets: Array.from(g.sets.values()).map((s: any) => ({ ...s, pieceCount: s.artworks.length })),
        artworks: g.artworks,
      }));

      const forSale = Array.from(artworkMap.values());

      const artist = {
        id: artistRow.id,
        slug: (artistRow as any).slug || null,
        name: artistRow.name,
        bio: artistRow.bio || null,
        profilePhotoUrl: (artistRow as any).profile_photo_url || null,
        portfolioUrl: (artistRow as any).portfolio_url || null,
        websiteUrl: (artistRow as any).website_url || null,
        instagramHandle: (artistRow as any).instagram_handle || null,
        cityPrimary: (artistRow as any).city_primary || null,
        citySecondary: (artistRow as any).city_secondary || null,
      };

      return json({ artist, forSale, onDisplay, sets });
    }

    // Public: single published set (by id) with artworks and display venues
    if (url.pathname.startsWith('/api/public/sets/') && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const parts = url.pathname.split('/');
      const setId = parts[4];
      if (!setId) return json({ error: 'Missing set id' }, { status: 400 });

      const { data, error } = await supabaseAdmin
        .from('artwork_sets')
        .select('id,artist_id,title,description,hero_image_url,visibility,status,items:artwork_set_items(set_id, artwork_id, sort_order, artwork:artworks(id,title,status,price_cents,currency,image_url,artist_id,artist_name,venue_id,venue_name,archived_at,set_id,venue:venues(name,city,state,neighborhood,slug,is_public)))')
        .eq('id', setId)
        .eq('status', 'published')
        .eq('visibility', 'public')
        .maybeSingle();

      if (error) return json({ error: error.message }, { status: 500 });
      if (!data) return json({ error: 'Not found' }, { status: 404 });

      const rawItems = Array.isArray((data as any).items) ? (data as any).items : [];
      const allowedItems = rawItems
        .map((i: any) => ({ ...i, artwork: i.artwork ? shapePublicArtwork(i.artwork) : null }))
        .filter((i: any) => i.artwork && PUBLIC_ARTWORK_STATUSES.includes(String(i.artwork.status || '').toLowerCase()) && !(i.artwork as any).archivedAt);

      const artworkIds = allowedItems.map((i: any) => i.artwork.id);
      const { data: displayRows, error: displayErr } = artworkIds.length
        ? await supabaseAdmin
            .from('v_artist_current_displays')
            .select('artwork_id,venue_id,set_id,status')
            .in('artwork_id', artworkIds)
        : { data: [], error: null } as any;
      if (displayErr) return json({ error: displayErr.message }, { status: 500 });

      const venueIds = new Set<string>();
      (displayRows || []).forEach((r: any) => { if (r.venue_id) venueIds.add(r.venue_id); });
      const venueMap = new Map<string, any>();
      if (venueIds.size) {
        const { data: venues, error: venueErr } = await supabaseAdmin
          .from('venues')
          .select('id,name,city,state,neighborhood,slug,is_public')
          .in('id', Array.from(venueIds));
        if (venueErr) return json({ error: venueErr.message }, { status: 500 });
        (venues || []).forEach((v) => venueMap.set(v.id, v));
      }

      const items = allowedItems.map((i: any) => {
        const displays = (displayRows || []).filter((r: any) => r.artwork_id === i.artwork.id);
        const displayVenues = displays.map((r: any) => venueMap.get(r.venue_id) || { id: r.venue_id, name: i.artwork.venueName || null, city: null, neighborhood: null, slug: null });
        return { artwork: i.artwork, displayVenues };
      });

      const heroImage = (data as any).hero_image_url || items.find((i: any) => i.artwork?.imageUrl)?.artwork?.imageUrl || null;

      return json({
        set: {
          id: data.id,
          artistId: (data as any).artist_id,
          title: data.title,
          description: (data as any).description || null,
          heroImageUrl: heroImage,
          pieceCount: items.length,
          items,
        },
      });
    }

    // Public: single artist (basic profile, lookup by slug or id)
    if (url.pathname.startsWith('/api/artists/') && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const parts = url.pathname.split('/');
      const slugOrId = parts[3];
      if (!slugOrId) return json({ error: 'Missing artist id or slug' }, { status: 400 });
      const identifier = decodeURIComponent(slugOrId);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
      const matchFilter = isUuid ? { id: identifier } : { slug: identifier };
      const { data, error } = await supabaseAdmin
        .from('artists')
        .select('id,slug,name,bio,profile_photo_url,portfolio_url,website_url,city_primary,city_secondary,is_public')
        .match(matchFilter)
        .eq('is_public', true)
        .maybeSingle();
      if (error) return json({ error: error.message }, { status: 500 });
      if (!data) return json({ error: 'Not found' }, { status: 404 });
      return json({
        id: data.id,
        slug: (data as any).slug || null,
        name: data.name,
        bio: data.bio || null,
        profilePhotoUrl: (data as any).profile_photo_url || null,
        portfolioUrl: (data as any).portfolio_url || null,
        websiteUrl: (data as any).website_url || null,
        cityPrimary: (data as any).city_primary || null,
        citySecondary: (data as any).city_secondary || null,
      });
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
      const requester = await getSupabaseUserFromRequest(request);
      const isAdmin = requester?.user_metadata?.role === 'admin' || requester?.user_metadata?.isAdmin === true;
      const isOwner = requester?.id && artistId && requester.id === artistId;
      const isPublicQuery = !(isAdmin || isOwner);
      let query = supabaseAdmin
        .from('artworks')
        .select('id,title,status,price_cents,currency,image_url,artist_id,artist_name,venue_id,venue_name,is_public,archived_at,published_at,venue:venues(name,city,state,neighborhood,slug,is_public)')
        .order('published_at', { ascending: false })
        .limit(50);
      if (isPublicQuery) {
        query = query.eq('is_public', true).in('status', PUBLIC_ARTWORK_STATUSES);
      }
      query = query.is('archived_at', null);
      if (artistId) query = query.eq('artist_id', artistId);
      const { data, error } = await query;
      if (error) return json({ error: error.message }, { status: 500 });
      const artworks = (data || []).map(shapePublicArtwork);
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
      const baseSelect = 'id,title,status,price_cents,currency,image_url,image_urls,artist_id,venue_id,artist_name,venue_name,description,purchase_url,qr_svg,is_public,published_at,archived_at,venue:venues(name,city,state,neighborhood,slug,is_public)';
      let { data, error } = await supabaseAdmin
        .from('artworks')
        .select(baseSelect)
        .eq('id', id)
        .eq('is_public', true)
        .is('archived_at', null)
        .in('status', PUBLIC_ARTWORK_STATUSES)
        .maybeSingle();
      if (error) return json({ error: error.message }, { status: 500 });

      // If not public, allow owner/admin to view their own listing
      if (!data) {
        const requester = await getSupabaseUserFromRequest(request);
        const isAdmin = requester?.user_metadata?.role === 'admin' || requester?.user_metadata?.isAdmin === true;
        const { data: privateData, error: privateError } = await supabaseAdmin
          .from('artworks')
          .select(baseSelect)
          .eq('id', id)
          .maybeSingle();
        if (privateError) return json({ error: privateError.message }, { status: 500 });
        if (!privateData) return json({ error: 'Not found' }, { status: 404 });
        if (!isAdmin && requester?.id !== (privateData as any).artist_id) return json({ error: 'Forbidden' }, { status: 403 });
        data = privateData;
      }

      const artwork = shapePublicArtworkDetail(data);

      let otherWorks: any[] = [];
      if ((data as any).artist_id) {
        const { data: siblings } = await supabaseAdmin
          .from('artworks')
          .select('id,title,status,price_cents,currency,image_url,artist_id,artist_name,venue_id,venue_name,is_public,archived_at,published_at,set_id,venue:venues(name,city,state,neighborhood,slug,is_public)')
          .eq('artist_id', (data as any).artist_id)
          .neq('id', data.id)
          .eq('is_public', true)
          .is('archived_at', null)
          .in('status', PUBLIC_ARTWORK_STATUSES)
          .order('published_at', { ascending: false })
          .limit(6);
        otherWorks = (siblings || []).map(shapePublicArtwork);
      }

      return json({ ...artwork, otherWorks });
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

      // Enforce plan artwork limit before creating Stripe entities
      const [artworkLimit, activeCount] = await Promise.all([
        getArtistArtworkLimit(user.id),
        getArtistActiveArtworkCount(user.id),
      ]);
      if (Number.isFinite(artworkLimit) && activeCount + 1 > artworkLimit) {
        return json({ error: 'Artwork limit reached for your plan. Upgrade to add more artworks.' }, { status: 403 });
      }
      // Create Stripe Product + Price for marketplace listing
      const artworkId = crypto.randomUUID();
      let stripeProductId: string | null = null;
      let stripePriceId: string | null = null;
      try {
        const productResp = await stripeFetch('/v1/products', {
          method: 'POST',
          body: toForm({
            name: String(payload?.title || 'Artwork'),
            description: payload?.description || undefined,
            'images[]': primaryImageUrl || undefined,
            'metadata[artworkId]': artworkId,
            'metadata[artistId]': user.id,
          }),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const productJson = await productResp.json();
        if (!productResp.ok) throw new Error(productJson?.error?.message || 'Stripe product create failed');
        stripeProductId = productJson.id;

        const priceResp = await stripeFetch('/v1/prices', {
          method: 'POST',
          body: toForm({
            product: stripeProductId,
            unit_amount: price_cents,
            currency: String(payload?.currency || 'usd').toLowerCase(),
          }),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const priceJson = await priceResp.json();
        if (!priceResp.ok) throw new Error(priceJson?.error?.message || 'Stripe price create failed');
        stripePriceId = priceJson.id;
      } catch (err: any) {
        return json({ error: err?.message || 'Unable to create Stripe product/price' }, { status: 500 });
      }

      const insert = {
        id: artworkId,
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
        stripe_product_id: stripeProductId,
        stripe_price_id: stripePriceId,
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
    // Security: RLS on events table enforces service-role INSERT only (see 20260205_fix_p0_rls_and_idempotency.sql)
    // This endpoint uses service-role key, so writes succeed despite RLS
    // Client-side queries via anon key will fail (read-only access for own events)
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
      const { data: existing, error: fetchErr } = await supabaseAdmin
        .from('artworks')
        .select('id,artist_id,archived_at,status')
        .eq('id', id)
        .maybeSingle();
      if (fetchErr) return json({ error: fetchErr.message }, { status: 500 });
      if (!existing) return json({ error: 'Not found' }, { status: 404 });

      const [artworkLimit, activeCount] = await Promise.all([
        getArtistArtworkLimit(existing.artist_id),
        getArtistActiveArtworkCount(existing.artist_id),
      ]);
      if (Number.isFinite(artworkLimit) && activeCount > artworkLimit) {
        return json({ error: 'Artwork limit reached for this artist plan. Please upgrade to approve additional artworks.' }, { status: 403 });
      }
      const venueName = user.user_metadata?.name || null;
      const nowIso = new Date().toISOString();
      const { data: updated, error } = await supabaseAdmin
        .from('artworks')
        .update({ status: 'active', published_at: nowIso, archived_at: null, venue_id: user.id, venue_name: venueName, purchase_url: `${allowOrigin}/#/purchase-${id}`, updated_at: nowIso })
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (error) return json({ error: error.message }, { status: 500 });
      if (!updated) return json({ error: 'Not found' }, { status: 404 });
      const purchaseUrl = `${allowOrigin}/#/purchase-${id}`;
      const qrSvg = await generateQrSvg(purchaseUrl, 300);
      await supabaseAdmin.from('artworks').update({ qr_svg: qrSvg }).eq('id', id);
      if (updated.artist_id) {
        await supabaseAdmin.from('notifications').insert({
          id: crypto.randomUUID(),
          user_id: updated.artist_id,
          role: 'artist',
          type: 'artwork_approved',
          title: 'Artwork approved for display',
          message: `${updated.title || 'Artwork'} was approved to display at ${venueName || 'a venue'}.`,
          artwork_id: updated.id,
          created_at: nowIso,
        });
      }
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
        address: payload?.address || null,
        addressLat: typeof payload?.addressLat === 'number' ? payload.addressLat : null,
        addressLng: typeof payload?.addressLng === 'number' ? payload.addressLng : null,
        defaultVenueFeeBps: typeof payload?.defaultVenueFeeBps === 'number' ? payload.defaultVenueFeeBps : 1000,
      });
      return resp;
    }

    // Public: single artist with public artworks, display locations, and sets (lookup by slug or id)
    if (url.pathname.startsWith('/api/public/artists/') && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const parts = url.pathname.split('/');
      const slugOrId = parts[4];
      if (!slugOrId) return json({ error: 'Missing artist id or slug' }, { status: 400 });

      const uid = url.searchParams.get('uid');
      const identifier = decodeURIComponent(slugOrId);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
      
      let matchFilter = isUuid ? { id: identifier } : { slug: identifier };

      let { data: artistRow, error: artistError } = await supabaseAdmin
        .from('artists')
        .select('id,slug,name,bio,profile_photo_url,portfolio_url,website_url,instagram_handle,city_primary,city_secondary,is_public')
        .match(matchFilter)
        .maybeSingle();

      // If not found by slug/id, and a UID is provided, try finding by UID.
      // This handles cases where the primary link might be stale but the user context is valid.
      if (!artistRow && uid) {
        const { data: artistByUid, error: uidError } = await supabaseAdmin
          .from('artists')
          .select('id,slug,name,bio,profile_photo_url,portfolio_url,website_url,instagram_handle,city_primary,city_secondary,is_public')
          .eq('id', uid)
          .maybeSingle();
        
        if (uidError) {
          // Log the secondary error but proceed with the original "not found"
          console.warn(`Secondary lookup by UID failed: ${uidError.message}`);
        } else if (artistByUid) {
          artistRow = artistByUid;
          artistError = null; // Clear original error
        }
      }

      if (artistError) return json({ error: artistError.message }, { status: 500 });
      if (!artistRow) return json({ error: 'Not found' }, { status: 404 });

      const artistId = artistRow.id;

      const [artworksRes, displayRes, setsRes] = await Promise.all([
        supabaseAdmin
          .from('artworks')
          .select('id,title,status,price_cents,currency,image_url,artist_id,artist_name,venue_id,venue_name,is_public,archived_at,published_at,set_id,venue:venues(name,city,state,neighborhood,slug,is_public)')
          .eq('artist_id', artistId)
          .eq('is_public', true)
          .is('archived_at', null)
          .in('status', PUBLIC_ARTWORK_STATUSES)
          .order('published_at', { ascending: false })
          .limit(60),
        supabaseAdmin
          .from('v_artist_current_displays')
          .select('artwork_id,venue_id,set_id,status')
          .eq('artist_id', artistId),
        supabaseAdmin
          .from('artwork_sets')
          .select('id,title,description,hero_image_url,visibility,status,items:artwork_set_items(set_id, artwork_id, sort_order, artwork:artworks(id,title,status,price_cents,currency,image_url,archived_at,set_id)))')
          .eq('artist_id', artistId)
          .eq('status', 'published')
          .eq('visibility', 'public')
          .order('updated_at', { ascending: false }),
      ]);

      if (artworksRes.error) return json({ error: artworksRes.error.message }, { status: 500 });
      if (displayRes.error) return json({ error: displayRes.error.message }, { status: 500 });
      if (setsRes.error) return json({ error: setsRes.error.message }, { status: 500 });

      const artworks = Array.isArray(artworksRes.data) ? artworksRes.data.map(shapePublicArtwork) : [];
      const artworkMap = new Map<string, any>();
      artworks.forEach((a) => artworkMap.set(a.id, { ...a }));

      const displayRows = Array.isArray(displayRes.data) ? displayRes.data : [];
      const displayArtworkIds = Array.from(new Set(displayRows.map((r: any) => r.artwork_id).filter(Boolean)));
      const missingArtIds = displayArtworkIds.filter((id) => !artworkMap.has(id));

      if (missingArtIds.length) {
        const { data: missingArts, error: missingErr } = await supabaseAdmin
          .from('artworks')
          .select('id,title,status,price_cents,currency,image_url,artist_id,artist_name,venue_id,venue_name,is_public,archived_at,published_at,set_id,venue:venues(name,city,state,neighborhood,slug,is_public)')
          .in('id', missingArtIds);
        if (missingErr) return json({ error: missingErr.message }, { status: 500 });
        (missingArts || []).map(shapePublicArtwork).forEach((a) => artworkMap.set(a.id, { ...a }));
      }

      // Venue metadata for grouping/badges
      const venueIds = new Set<string>();
      artworkMap.forEach((a) => { if (a.venueId) venueIds.add(a.venueId); });
      displayRows.forEach((r: any) => { if (r.venue_id) venueIds.add(r.venue_id); });
      const venueMap = new Map<string, any>();
      if (venueIds.size) {
        const { data: venues, error: venueErr } = await supabaseAdmin
          .from('venues')
          .select('id,name,city,state,neighborhood,slug,is_public')
          .in('id', Array.from(venueIds));
        if (venueErr) return json({ error: venueErr.message }, { status: 500 });
        (venues || []).forEach((v) => venueMap.set(v.id, v));
      }

      // Sets metadata for display grouping and tab
      const setMetaMap = new Map<string, { id: string; title: string; visibility?: string; status?: string }>();
      const sets = (Array.isArray(setsRes.data) ? setsRes.data : []).map((row: any) => {
        const items = Array.isArray(row.items) ? row.items : [];
        const availableItems = items
          .map((i: any) => ({ ...i, artwork: i.artwork ? shapePublicArtwork(i.artwork) : null }))
          .filter((i: any) => i.artwork && PUBLIC_ARTWORK_STATUSES.includes(String(i.artwork.status || '').toLowerCase()) && !(i.artwork as any).archivedAt);
        const heroImage = row.hero_image_url || availableItems.find((i: any) => i.artwork?.imageUrl)?.artwork?.imageUrl || null;
        setMetaMap.set(row.id, { id: row.id, title: row.title, visibility: row.visibility, status: row.status });
        return {
          id: row.id,
          title: row.title,
          description: row.description || null,
          heroImageUrl: heroImage,
          pieceCount: availableItems.length,
          items: availableItems.slice(0, 6).map((i: any) => i.artwork),
        };
      });

      const displaySetIds = Array.from(new Set(displayRows.map((r: any) => r.set_id).filter(Boolean)));
      const missingSetIds = displaySetIds.filter((id) => !setMetaMap.has(id));
      if (missingSetIds.length) {
        const { data: extraSets, error: extraErr } = await supabaseAdmin
          .from('artwork_sets')
          .select('id,title,visibility,status')
          .in('id', missingSetIds);
        if (extraErr) return json({ error: extraErr.message }, { status: 500 });
        (extraSets || []).forEach((s) => setMetaMap.set(s.id, { id: s.id, title: s.title, visibility: s.visibility, status: s.status }));
      }

      const groups = new Map<string, any>();
      displayRows.forEach((r: any) => {
        const art = artworkMap.get(r.artwork_id);
        if (!art) return;
        const setId = r.set_id || art.setId || null;
        const venue = r.venue_id ? venueMap.get(r.venue_id) : null;
        const venueKey = venue?.id || r.venue_id;
        if (!venueKey) return;

        art.display = {
          venueId: venue?.id || r.venue_id || null,
          venueName: venue?.name || art.venueName || null,
          setId,
          setTitle: setId ? (setMetaMap.get(setId)?.title || null) : null,
        };
        artworkMap.set(art.id, art);

        if (!groups.has(venueKey)) {
          groups.set(venueKey, {
            venue: venue || { id: r.venue_id, name: art.venueName || 'Venue' },
            sets: new Map<string, any>(),
            artworks: [] as any[],
          });
        }
        const group = groups.get(venueKey);
        if (setId) {
          if (!group.sets.has(setId)) {
            group.sets.set(setId, { id: setId, title: setMetaMap.get(setId)?.title || 'Collection', artworks: [] as any[] });
          }
          const setGroup = group.sets.get(setId);
          setGroup.artworks.push(art);
        } else {
          group.artworks.push(art);
        }
      });

      const onDisplay = Array.from(groups.values()).map((g: any) => ({
        venue: g.venue,
        sets: Array.from(g.sets.values()).map((s: any) => ({ ...s, pieceCount: s.artworks.length })),
        artworks: g.artworks,
      }));

      const forSale = Array.from(artworkMap.values());

      const artist = {
        id: artistRow.id,
        slug: (artistRow as any).slug || null,
        name: artistRow.name,
        bio: artistRow.bio || null,
        profilePhotoUrl: (artistRow as any).profile_photo_url || null,
        portfolioUrl: (artistRow as any).portfolio_url || null,
        websiteUrl: (artistRow as any).website_url || null,
        instagramHandle: (artistRow as any).instagram_handle || null,
        cityPrimary: (artistRow as any).city_primary || null,
        citySecondary: (artistRow as any).city_secondary || null,
      };

      return json({ artist, forSale, onDisplay, sets });
    }

    // Public: single published set (by id) with artworks and display venues
    if (url.pathname.startsWith('/api/public/sets/') && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const parts = url.pathname.split('/');
      const setId = parts[4];
      if (!setId) return json({ error: 'Missing set id' }, { status: 400 });

      const { data, error } = await supabaseAdmin
        .from('artwork_sets')
        .select('id,artist_id,title,description,hero_image_url,visibility,status,items:artwork_set_items(set_id, artwork_id, sort_order, artwork:artworks(id,title,status,price_cents,currency,image_url,artist_id,artist_name,venue_id,venue_name,archived_at,set_id,venue:venues(name,city,state,neighborhood,slug,is_public)))')
        .eq('id', setId)
        .eq('status', 'published')
        .eq('visibility', 'public')
        .maybeSingle();

      if (error) return json({ error: error.message }, { status: 500 });
      if (!data) return json({ error: 'Not found' }, { status: 404 });

      const rawItems = Array.isArray((data as any).items) ? (data as any).items : [];
      const allowedItems = rawItems
        .map((i: any) => ({ ...i, artwork: i.artwork ? shapePublicArtwork(i.artwork) : null }))
        .filter((i: any) => i.artwork && PUBLIC_ARTWORK_STATUSES.includes(String(i.artwork.status || '').toLowerCase()) && !(i.artwork as any).archivedAt);

      const artworkIds = allowedItems.map((i: any) => i.artwork.id);
      const { data: displayRows, error: displayErr } = artworkIds.length
        ? await supabaseAdmin
            .from('v_artist_current_displays')
            .select('artwork_id,venue_id,set_id,status')
            .in('artwork_id', artworkIds)
        : { data: [], error: null } as any;
      if (displayErr) return json({ error: displayErr.message }, { status: 500 });

      const venueIds = new Set<string>();
      (displayRows || []).forEach((r: any) => { if (r.venue_id) venueIds.add(r.venue_id); });
      const venueMap = new Map<string, any>();
      if (venueIds.size) {
        const { data: venues, error: venueErr } = await supabaseAdmin
          .from('venues')
          .select('id,name,city,state,neighborhood,slug,is_public')
          .in('id', Array.from(venueIds));
        if (venueErr) return json({ error: venueErr.message }, { status: 500 });
        (venues || []).forEach((v) => venueMap.set(v.id, v));
      }

      const items = allowedItems.map((i: any) => {
        const displays = (displayRows || []).filter((r: any) => r.artwork_id === i.artwork.id);
        const displayVenues = displays.map((r: any) => venueMap.get(r.venue_id) || { id: r.venue_id, name: i.artwork.venueName || null, city: null, neighborhood: null, slug: null });
        return { artwork: i.artwork, displayVenues };
      });

      const heroImage = (data as any).hero_image_url || items.find((i: any) => i.artwork?.imageUrl)?.artwork?.imageUrl || null;

      return json({
        set: {
          id: data.id,
          artistId: (data as any).artist_id,
          title: data.title,
          description: (data as any).description || null,
          heroImageUrl: heroImage,
          pieceCount: items.length,
          items,
        },
      });
    }

    // Public: single artist (basic profile, lookup by slug or id)
    if (url.pathname.startsWith('/api/artists/') && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const parts = url.pathname.split('/');
      const slugOrId = parts[3];
      if (!slugOrId) return json({ error: 'Missing artist id or slug' }, { status: 400 });
      const identifier = decodeURIComponent(slugOrId);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
      const matchFilter = isUuid ? { id: identifier } : { slug: identifier };
      const { data, error } = await supabaseAdmin
        .from('artists')
        .select('id,slug,name,bio,profile_photo_url,portfolio_url,website_url,city_primary,city_secondary,is_public')
        .match(matchFilter)
        .eq('is_public', true)
        .maybeSingle();
      if (error) return json({ error: error.message }, { status: 500 });
      if (!data) return json({ error: 'Not found' }, { status: 404 });
      return json({
        id: data.id,
        slug: (data as any).slug || null,
        name: data.name,
        bio: data.bio || null,
        profilePhotoUrl: (data as any).profile_photo_url || null,
        portfolioUrl: (data as any).portfolio_url || null,
        websiteUrl: (data as any).website_url || null,
        cityPrimary: (data as any).city_primary || null,
        citySecondary: (data as any).city_secondary || null,
      });
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
      const requester = await getSupabaseUserFromRequest(request);
      const isAdmin = requester?.user_metadata?.role === 'admin' || requester?.user_metadata?.isAdmin === true;
      const isOwner = requester?.id && artistId && requester.id === artistId;
      const isPublicQuery = !(isAdmin || isOwner);
      let query = supabaseAdmin
        .from('artworks')
        .select('id,title,status,price_cents,currency,image_url,artist_id,artist_name,venue_id,venue_name,is_public,archived_at,published_at,venue:venues(name,city,state,neighborhood,slug,is_public)')
        .order('published_at', { ascending: false })
        .limit(50);
      if (isPublicQuery) {
        query = query.eq('is_public', true).in('status', PUBLIC_ARTWORK_STATUSES);
      }
      query = query.is('archived_at', null);
      if (artistId) query = query.eq('artist_id', artistId);
      const { data, error } = await query;
      if (error) return json({ error: error.message }, { status: 500 });
      const artworks = (data || []).map(shapePublicArtwork);
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
      const baseSelect = 'id,title,status,price_cents,currency,image_url,image_urls,artist_id,venue_id,artist_name,venue_name,description,purchase_url,qr_svg,is_public,published_at,archived_at,venue:venues(name,city,state,neighborhood,slug,is_public)';
      let { data, error } = await supabaseAdmin
        .from('artworks')
        .select(baseSelect)
        .eq('id', id)
        .eq('is_public', true)
        .is('archived_at', null)
        .in('status', PUBLIC_ARTWORK_STATUSES)
        .maybeSingle();
      if (error) return json({ error: error.message }, { status: 500 });

      // If not public, allow owner/admin to view their own listing
      if (!data) {
        const requester = await getSupabaseUserFromRequest(request);
        const isAdmin = requester?.user_metadata?.role === 'admin' || requester?.user_metadata?.isAdmin === true;
        const { data: privateData, error: privateError } = await supabaseAdmin
          .from('artworks')
          .select(baseSelect)
          .eq('id', id)
          .maybeSingle();
        if (privateError) return json({ error: privateError.message }, { status: 500 });
        if (!privateData) return json({ error: 'Not found' }, { status: 404 });
        if (!isAdmin && requester?.id !== (privateData as any).artist_id) return json({ error: 'Forbidden' }, { status: 403 });
        data = privateData;
      }

      const artwork = shapePublicArtworkDetail(data);

      let otherWorks: any[] = [];
      if ((data as any).artist_id) {
        const { data: siblings } = await supabaseAdmin
          .from('artworks')
          .select('id,title,status,price_cents,currency,image_url,artist_id,artist_name,venue_id,venue_name,is_public,archived_at,published_at,set_id,venue:venues(name,city,state,neighborhood,slug,is_public)')
          .eq('artist_id', (data as any).artist_id)
          .neq('id', data.id)
          .eq('is_public', true)
          .is('archived_at', null)
          .in('status', PUBLIC_ARTWORK_STATUSES)
          .order('published_at', { ascending: false })
          .limit(6);
        otherWorks = (siblings || []).map(shapePublicArtwork);
      }

      return json({ ...artwork, otherWorks });
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

      // Enforce plan artwork limit before creating Stripe entities
      const [artworkLimit, activeCount] = await Promise.all([
        getArtistArtworkLimit(user.id),
        getArtistActiveArtworkCount(user.id),
      ]);
      if (Number.isFinite(artworkLimit) && activeCount + 1 > artworkLimit) {
        return json({ error: 'Artwork limit reached for your plan. Upgrade to add more artworks.' }, { status: 403 });
      }
      // Create Stripe Product + Price for marketplace listing
      const artworkId = crypto.randomUUID();
      let stripeProductId: string | null = null;
      let stripePriceId: string | null = null;
      try {
        const productResp = await stripeFetch('/v1/products', {
          method: 'POST',
          body: toForm({
            name: String(payload?.title || 'Artwork'),
            description: payload?.description || undefined,
            'images[]': primaryImageUrl || undefined,
            'metadata[artworkId]': artworkId,
            'metadata[artistId]': user.id,
          }),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const productJson = await productResp.json();
        if (!productResp.ok) throw new Error(productJson?.error?.message || 'Stripe product create failed');
        stripeProductId = productJson.id;

        const priceResp = await stripeFetch('/v1/prices', {
          method: 'POST',
          body: toForm({
            product: stripeProductId,
            unit_amount: price_cents,
            currency: String(payload?.currency || 'usd').toLowerCase(),
          }),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const priceJson = await priceResp.json();
        if (!priceResp.ok) throw new Error(priceJson?.error?.message || 'Stripe price create failed');
        stripePriceId = priceJson.id;
      } catch (err: any) {
        return json({ error: err?.message || 'Unable to create Stripe product/price' }, { status: 500 });
      }

      const insert = {
        id: artworkId,
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
        stripe_product_id: stripeProductId,
        stripe_price_id: stripePriceId,
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
    // Security: RLS on events table enforces service-role INSERT only (see 20260205_fix_p0_rls_and_idempotency.sql)
    // This endpoint uses service-role key, so writes succeed despite RLS
    // Client-side queries via anon key will fail (read-only access for own events)
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
      const { data: existing, error: fetchErr } = await supabaseAdmin
        .from('artworks')
        .select('id,artist_id,archived_at,status')
        .eq('id', id)
        .maybeSingle();
      if (fetchErr) return json({ error: fetchErr.message }, { status: 500 });
      if (!existing) return json({ error: 'Not found' }, { status: 404 });

      const [artworkLimit, activeCount] = await Promise.all([
        getArtistArtworkLimit(existing.artist_id),
        getArtistActiveArtworkCount(existing.artist_id),
      ]);
      if (Number.isFinite(artworkLimit) && activeCount > artworkLimit) {
        return json({ error: 'Artwork limit reached for this artist plan. Please upgrade to approve additional artworks.' }, { status: 403 });
      }
      const venueName = user.user_metadata?.name || null;
      const nowIso = new Date().toISOString();
      const { data: updated, error } = await supabaseAdmin
        .from('artworks')
        .update({ status: 'active', published_at: nowIso, archived_at: null, venue_id: user.id, venue_name: venueName, purchase_url: `${allowOrigin}/#/purchase-${id}`, updated_at: nowIso })
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (error) return json({ error: error.message }, { status: 500 });
      if (!updated) return json({ error: 'Not found' }, { status: 404 });
      const purchaseUrl = `${allowOrigin}/#/purchase-${id}`;
      const qrSvg = await generateQrSvg(purchaseUrl, 300);
      await supabaseAdmin.from('artworks').update({ qr_svg: qrSvg }).eq('id', id);
      if (updated.artist_id) {
        await supabaseAdmin.from('notifications').insert({
          id: crypto.randomUUID(),
          user_id: updated.artist_id,
          role: 'artist',
          type: 'artwork_approved',
          title: 'Artwork approved for display',
          message: `${updated.title || 'Artwork'} was approved to display at ${venueName || 'a venue'}.`,
          artwork_id: updated.id,
          created_at: nowIso,
        });
      }
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
        address: payload?.address || null,
        addressLat: typeof payload?.addressLat === 'number' ? payload.addressLat : null,
        addressLng: typeof payload?.addressLng === 'number' ? payload.addressLng : null,
        defaultVenueFeeBps: typeof payload?.defaultVenueFeeBps === 'number' ? payload.defaultVenueFeeBps : 1000,
      });
      return resp;
    }

    // Public: single artist with public artworks, display locations, and sets (lookup by slug or id)
    if (url.pathname.startsWith('/api/public/artists/') && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const parts = url.pathname.split('/');
      const slugOrId = parts[4];
      if (!slugOrId) return json({ error: 'Missing artist id or slug' }, { status: 400 });

      const uid = url.searchParams.get('uid');
      const identifier = decodeURIComponent(slugOrId);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
      
      let matchFilter = isUuid ? { id: identifier } : { slug: identifier };

      let { data: artistRow, error: artistError } = await supabaseAdmin
        .from('artists')
        .select('id,slug,name,bio,profile_photo_url,portfolio_url,website_url,instagram_handle,city_primary,city_secondary,is_public')
        .match(matchFilter)
        .maybeSingle();

      // If not found by slug/id, and a UID is provided, try finding by UID.
      // This handles cases where the primary link might be stale but the user context is valid.
      if (!artistRow && uid) {
        const { data: artistByUid, error: uidError } = await supabaseAdmin
          .from('artists')
          .select('id,slug,name,bio,profile_photo_url,portfolio_url,website_url,instagram_handle,city_primary,city_secondary,is_public')
          .eq('id', uid)
          .maybeSingle();
        
        if (uidError) {
          // Log the secondary error but proceed with the original "not found"
          console.warn(`Secondary lookup by UID failed: ${uidError.message}`);
        } else if (artistByUid) {
          artistRow = artistByUid;
          artistError = null; // Clear original error
        }
      }

      if (artistError) return json({ error: artistError.message }, { status: 500 });
      if (!artistRow) return json({ error: 'Not found' }, { status: 404 });

      const artistId = artistRow.id;

      const [artworksRes, displayRes, setsRes] = await Promise.all([
        supabaseAdmin
          .from('artworks')
          .select('id,title,status,price_cents,currency,image_url,artist_id,artist_name,venue_id,venue_name,is_public,archived_at,published_at,set_id,venue:venues(name,city,state,neighborhood,slug,is_public)')
          .eq('artist_id', artistId)
          .eq('is_public', true)
          .is('archived_at', null)
          .in('status', PUBLIC_ARTWORK_STATUSES)
          .order('published_at', { ascending: false })
          .limit(60),
        supabaseAdmin
          .from('v_artist_current_displays')
          .select('artwork_id,venue_id,set_id,status')
          .eq('artist_id', artistId),
        supabaseAdmin
          .from('artwork_sets')
          .select('id,title,description,hero_image_url,visibility,status,items:artwork_set_items(set_id, artwork_id, sort_order, artwork:artworks(id,title,status,price_cents,currency,image_url,archived_at,set_id)))')
          .eq('artist_id', artistId)
          .eq('status', 'published')
          .eq('visibility', 'public')
          .order('updated_at', { ascending: false }),
      ]);

      if (artworksRes.error) return json({ error: artworksRes.error.message }, { status: 500 });
      if (displayRes.error) return json({ error: displayRes.error.message }, { status: 500 });
      if (setsRes.error) return json({ error: setsRes.error.message }, { status: 500 });

      const artworks = Array.isArray(artworksRes.data) ? artworksRes.data.map(shapePublicArtwork) : [];
      const artworkMap = new Map<string, any>();
      artworks.forEach((a) => artworkMap.set(a.id, { ...a }));

      const displayRows = Array.isArray(displayRes.data) ? displayRes.data : [];
      const displayArtworkIds = Array.from(new Set(displayRows.map((r: any) => r.artwork_id).filter(Boolean)));
      const missingArtIds = displayArtworkIds.filter((id) => !artworkMap.has(id));

      if (missingArtIds.length) {
        const { data: missingArts, error: missingErr } = await supabaseAdmin
          .from('artworks')
          .select('id,title,status,price_cents,currency,image_url,artist_id,artist_name,venue_id,venue_name,is_public,archived_at,published_at,set_id,venue:venues(name,city,state,neighborhood,slug,is_public)')
          .in('id', missingArtIds);
        if (missingErr) return json({ error: missingErr.message }, { status: 500 });
        (missingArts || []).map(shapePublicArtwork).forEach((a) => artworkMap.set(a.id, { ...a }));
      }

      // Venue metadata for grouping/badges
      const venueIds = new Set<string>();
      artworkMap.forEach((a) => { if (a.venueId) venueIds.add(a.venueId); });
      displayRows.forEach((r: any) => { if (r.venue_id) venueIds.add(r.venue_id); });
      const venueMap = new Map<string, any>();
      if (venueIds.size) {
        const { data: venues, error: venueErr } = await supabaseAdmin
          .from('venues')
          .select('id,name,city,state,neighborhood,slug,is_public')
          .in('id', Array.from(venueIds));
        if (venueErr) return json({ error: venueErr.message }, { status: 500 });
        (venues || []).forEach((v) => venueMap.set(v.id, v));
      }

      // Sets metadata for display grouping and tab
      const setMetaMap = new Map<string, { id: string; title: string; visibility?: string; status?: string }>();
      const sets = (Array.isArray(setsRes.data) ? setsRes.data : []).map((row: any) => {
        const items = Array.isArray(row.items) ? row.items : [];
        const availableItems = items
          .map((i: any) => ({ ...i, artwork: i.artwork ? shapePublicArtwork(i.artwork) : null }))
          .filter((i: any) => i.artwork && PUBLIC_ARTWORK_STATUSES.includes(String(i.artwork.status || '').toLowerCase()) && !(i.artwork as any).archivedAt);
        const heroImage = row.hero_image_url || availableItems.find((i: any) => i.artwork?.imageUrl)?.artwork?.imageUrl || null;
        setMetaMap.set(row.id, { id: row.id, title: row.title, visibility: row.visibility, status: row.status });
        return {
          id: row.id,
          title: row.title,
          description: row.description || null,
          heroImageUrl: heroImage,
          pieceCount: availableItems.length,
          items: availableItems.slice(0, 6).map((i: any) => i.artwork),
        };
      });

      const displaySetIds = Array.from(new Set(displayRows.map((r: any) => r.set_id).filter(Boolean)));
      const missingSetIds = displaySetIds.filter((id) => !setMetaMap.has(id));
      if (missingSetIds.length) {
        const { data: extraSets, error: extraErr } = await supabaseAdmin
          .from('artwork_sets')
          .select('id,title,visibility,status')
          .in('id', missingSetIds);
        if (extraErr) return json({ error: extraErr.message }, { status: 500 });
        (extraSets || []).forEach((s) => setMetaMap.set(s.id, { id: s.id, title: s.title, visibility: s.visibility, status: s.status }));
      }

      const groups = new Map<string, any>();
      displayRows.forEach((r: any) => {
        const art = artworkMap.get(r.artwork_id);
        if (!art) return;
        const setId = r.set_id || art.setId || null;
        const venue = r.venue_id ? venueMap.get(r.venue_id) : null;
        const venueKey = venue?.id || r.venue_id;
        if (!venueKey) return;

        art.display = {
          venueId: venue?.id || r.venue_id || null,
          venueName: venue?.name || art.venueName || null,
          setId,
          setTitle: setId ? (setMetaMap.get(setId)?.title || null) : null,
        };
        artworkMap.set(art.id, art);

        if (!groups.has(venueKey)) {
          groups.set(venueKey, {
            venue: venue || { id: r.venue_id, name: art.venueName || 'Venue' },
            sets: new Map<string, any>(),
            artworks: [] as any[],
          });
        }
        const group = groups.get(venueKey);
        if (setId) {
          if (!group.sets.has(setId)) {
            group.sets.set(setId, { id: setId, title: setMetaMap.get(setId)?.title || 'Collection', artworks: [] as any[] });
          }
          const setGroup = group.sets.get(setId);
          setGroup.artworks.push(art);
        } else {
          group.artworks.push(art);
        }
      });

      const onDisplay = Array.from(groups.values()).map((g: any) => ({
        venue: g.venue,
        sets: Array.from(g.sets.values()).map((s: any) => ({ ...s, pieceCount: s.artworks.length })),
        artworks: g.artworks,
      }));

      const forSale = Array.from(artworkMap.values());

      const artist = {
        id: artistRow.id,
        slug: (artistRow as any).slug || null,
        name: artistRow.name,
        bio: artistRow.bio || null,
        profilePhotoUrl: (artistRow as any).profile_photo_url || null,
        portfolioUrl: (artistRow as any).portfolio_url || null,
        websiteUrl: (artistRow as any).website_url || null,
        instagramHandle: (artistRow as any).instagram_handle || null,
        cityPrimary: (artistRow as any).city_primary || null,
        citySecondary: (artistRow as any).city_secondary || null,
      };

      return json({ artist, forSale, onDisplay, sets });
    }

    // Public: single published set (by id) with artworks and display venues
    if (url.pathname.startsWith('/api/public/sets/') && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const parts = url.pathname.split('/');
      const setId = parts[4];
      if (!setId) return json({ error: 'Missing set id' }, { status: 400 });

      const { data, error } = await supabaseAdmin
        .from('artwork_sets')
        .select('id,artist_id,title,description,hero_image_url,visibility,status,items:artwork_set_items(set_id, artwork_id, sort_order, artwork:artworks(id,title,status,price_cents,currency,image_url,artist_id,artist_name,venue_id,venue_name,archived_at,set_id,venue:venues(name,city,state,neighborhood,slug,is_public)))')
        .eq('id', setId)
        .eq('status', 'published')
        .eq('visibility', 'public')
        .maybeSingle();

      if (error) return json({ error: error.message }, { status: 500 });
      if (!data) return json({ error: 'Not found' }, { status: 404 });

      const rawItems = Array.isArray((data as any).items) ? (data as any).items : [];
      const allowedItems = rawItems
        .map((i: any) => ({ ...i, artwork: i.artwork ? shapePublicArtwork(i.artwork) : null }))
        .filter((i: any) => i.artwork && PUBLIC_ARTWORK_STATUSES.includes(String(i.artwork.status || '').toLowerCase()) && !(i.artwork as any).archivedAt);

      const artworkIds = allowedItems.map((i: any) => i.artwork.id);
      const { data: displayRows, error: displayErr } = artworkIds.length
        ? await supabaseAdmin
            .from('v_artist_current_displays')
            .select('artwork_id,venue_id,set_id,status')
            .in('artwork_id', artworkIds)
        : { data: [], error: null } as any;
      if (displayErr) return json({ error: displayErr.message }, { status: 500 });

      const venueIds = new Set<string>();
      (displayRows || []).forEach((r: any) => { if (r.venue_id) venueIds.add(r.venue_id); });
      const venueMap = new Map<string, any>();
      if (venueIds.size) {
        const { data: venues, error: venueErr } = await supabaseAdmin
          .from('venues')
          .select('id,name,city,state,neighborhood,slug,is_public')
          .in('id', Array.from(venueIds));
        if (venueErr) return json({ error: venueErr.message }, { status: 500 });
        (venues || []).forEach((v) => venueMap.set(v.id, v));
      }

      const items = allowedItems.map((i: any) => {
        const displays = (displayRows || []).filter((r: any) => r.artwork_id === i.artwork.id);
        const displayVenues = displays.map((r: any) => venueMap.get(r.venue_id) || { id: r.venue_id, name: i.artwork.venueName || null, city: null, neighborhood: null, slug: null });
        return { artwork: i.artwork, displayVenues };
      });

      const heroImage = (data as any).hero_image_url || items.find((i: any) => i.artwork?.imageUrl)?.artwork?.imageUrl || null;

      return json({
        set: {
          id: data.id,
          artistId: (data as any).artist_id,
          title: data.title,
          description: (data as any).description || null,
          heroImageUrl: heroImage,
          pieceCount: items.length,
          items,
        },
      });
    }

    // Public: single artist (basic profile, lookup by slug or id)
    if (url.pathname.startsWith('/api/artists/') && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const parts = url.pathname.split('/');
      const slugOrId = parts[3];
      if (!slugOrId) return json({ error: 'Missing artist id or slug' }, { status: 400 });
      const identifier = decodeURIComponent(slugOrId);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
      const matchFilter = isUuid ? { id: identifier } : { slug: identifier };
      const { data, error } = await supabaseAdmin
        .from('artists')
        .select('id,slug,name,bio,profile_photo_url,portfolio_url,website_url,city_primary,city_secondary,is_public')
        .match(matchFilter)
        .eq('is_public', true)
        .maybeSingle();
      if (error) return json({ error: error.message }, { status: 500 });
      if (!data) return json({ error: 'Not found' }, { status: 404 });
      return json({
        id: data.id,
        slug: (data as any).slug || null,
        name: data.name,
        bio: data.bio || null,
        profilePhotoUrl: (data as any).profile_photo_url || null,
        portfolioUrl: (data as any).portfolio_url || null,
        websiteUrl: (data as any).website_url || null,
        cityPrimary: (data as any).city_primary || null,
        citySecondary: (data as any).city_secondary || null,
      });
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
      const requester = await getSupabaseUserFromRequest(request);
      const isAdmin = requester?.user_metadata?.role === 'admin' || requester?.user_metadata?.isAdmin === true;
      const isOwner = requester?.id && artistId && requester.id === artistId;
      const isPublicQuery = !(isAdmin || isOwner);
      let query = supabaseAdmin
        .from('artworks')
        .select('id,title,status,price_cents,currency,image_url,artist_id,artist_name,venue_id,venue_name,is_public,archived_at,published_at,venue:venues(name,city,state,neighborhood,slug,is_public)')
        .order('published_at', { ascending: false })
        .limit(50);
      if (isPublicQuery) {
        query = query.eq('is_public', true).in('status', PUBLIC_ARTWORK_STATUSES);
      }
      query = query.is('archived_at', null);
      if (artistId) query = query.eq('artist_id', artistId);
      const { data, error } = await query;
      if (error) return json({ error: error.message }, { status: 500 });
      const artworks = (data || []).map(shapePublicArtwork);
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
      const baseSelect = 'id,title,status,price_cents,currency,image_url,image_urls,artist_id,venue_id,artist_name,venue_name,description,purchase_url,qr_svg,is_public,published_at,archived_at,venue:venues(name,city,state,neighborhood,slug,is_public)';
      let { data, error } = await supabaseAdmin
        .from('artworks')
        .select(baseSelect)
        .eq('id', id)
        .eq('is_public', true)
        .is('archived_at', null)
        .in('status', PUBLIC_ARTWORK_STATUSES)
        .maybeSingle();
      if (error) return json({ error: error.message }, { status: 500 });

      // If not public, allow owner/admin to view their own listing
      if (!data) {
        const requester = await getSupabaseUserFromRequest(request);
        const isAdmin = requester?.user_metadata?.role === 'admin' || requester?.user_metadata?.isAdmin === true;
        const { data: privateData, error: privateError } = await supabaseAdmin
          .from('artworks')
          .select(baseSelect)
          .eq('id', id)
          .maybeSingle();
        if (privateError) return json({ error: privateError.message }, { status: 500 });
        if (!privateData) return json({ error: 'Not found' }, { status: 404 });
        if (!isAdmin && requester?.id !== (privateData as any).artist_id) return json({ error: 'Forbidden' }, { status: 403 });
        data = privateData;
      }

      const artwork = shapePublicArtworkDetail(data);

      let otherWorks: any[] = [];
      if ((data as any).artist_id) {
        const { data: siblings } = await supabaseAdmin
          .from('artworks')
          .select('id,title,status,price_cents,currency,image_url,artist_id,artist_name,venue_id,venue_name,is_public,archived_at,published_at,set_id,venue:venues(name,city,state,neighborhood,slug,is_public)')
          .eq('artist_id', (data as any).artist_id)
          .neq('id', data.id)
          .eq('is_public', true)
          .is('archived_at', null)
          .in('status', PUBLIC_ARTWORK_STATUSES)
          .order('published_at', { ascending: false })
          .limit(6);
        otherWorks = (siblings || []).map(shapePublicArtwork);
      }

      return json({ ...artwork, otherWorks });
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

      // Enforce plan artwork limit before creating Stripe entities
      const [artworkLimit, activeCount] = await Promise.all([
        getArtistArtworkLimit(user.id),
        getArtistActiveArtworkCount(user.id),
      ]);
      if (Number.isFinite(artworkLimit) && activeCount + 1 > artworkLimit) {
        return json({ error: 'Artwork limit reached for your plan. Upgrade to add more artworks.' }, { status: 403 });
      }
      // Create Stripe Product + Price for marketplace listing
      const artworkId = crypto.randomUUID();
      let stripeProductId: string | null = null;
      let stripePriceId: string | null = null;
      try {
        const productResp = await stripeFetch('/v1/products', {
          method: 'POST',
          body: toForm({
            name: String(payload?.title || 'Artwork'),
            description: payload?.description || undefined,
            'images[]': primaryImageUrl || undefined,
            'metadata[artworkId]': artworkId,
            'metadata[artistId]': user.id,
          }),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const productJson = await productResp.json();
        if (!productResp.ok) throw new Error(productJson?.error?.message || 'Stripe product create failed');
        stripeProductId = productJson.id;

        const priceResp = await stripeFetch('/v1/prices', {
          method: 'POST',
          body: toForm({
            product: stripeProductId,
            unit_amount: price_cents,
            currency: String(payload?.currency || 'usd').toLowerCase(),
          }),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const priceJson = await priceResp.json();
        if (!priceResp.ok) throw new Error(priceJson?.error?.message || 'Stripe price create failed');
        stripePriceId = priceJson.id;
      } catch (err: any) {
        return json({ error: err?.message || 'Unable to create Stripe product/price' }, { status: 500 });
      }

      const insert = {
        id: artworkId,
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
        stripe_product_id: stripeProductId,
        stripe_price_id: stripePriceId,
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
    // Security: RLS on events table enforces service-role INSERT only (see 20260205_fix_p0_rls_and_idempotency.sql)
    // This endpoint uses service-role key, so writes succeed despite RLS
    // Client-side queries via anon key will fail (read-only access for own events)
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
      const { data: existing, error: fetchErr } = await supabaseAdmin
        .from('artworks')
        .select('id,artist_id,archived_at,status')
        .eq('id', id)
        .maybeSingle();
      if (fetchErr) return json({ error: fetchErr.message }, { status: 500 });
      if (!existing) return json({ error: 'Not found' }, { status: 404 });

      const [artworkLimit, activeCount] = await Promise.all([
        getArtistArtworkLimit(existing.artist_id),
        getArtistActiveArtworkCount(existing.artist_id),
      ]);
      if (Number.isFinite(artworkLimit) && activeCount > artworkLimit) {
        return json({ error: 'Artwork limit reached for this artist plan. Please upgrade to approve additional artworks.' }, { status: 403 });
      }
      const venueName = user.user_metadata?.name || null;
      const nowIso = new Date().toISOString();
      const { data: updated, error } = await supabaseAdmin
        .from('artworks')
        .update({ status: 'active', published_at: nowIso, archived_at: null, venue_id: user.id, venue_name: venueName, purchase_url: `${allowOrigin}/#/purchase-${id}`, updated_at: nowIso })
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (error) return json({ error: error.message }, { status: 500 });
      if (!updated) return json({ error: 'Not found' }, { status: 404 });
      const purchaseUrl = `${allowOrigin}/#/purchase-${id}`;
      const qrSvg = await generateQrSvg(purchaseUrl, 300);
      await supabaseAdmin.from('artworks').update({ qr_svg: qrSvg }).eq('id', id);
      if (updated.artist_id) {
        await supabaseAdmin.from('notifications').insert({
          id: crypto.randomUUID(),
          user_id: updated.artist_id,
          role: 'artist',
          type: 'artwork_approved',
          title: 'Artwork approved for display',
          message: `${updated.title || 'Artwork'} was approved to display at ${venueName || 'a venue'}.`,
          artwork_id: updated.id,
          created_at: nowIso,
        });
      }
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
        address: payload?.address || null,
        addressLat: typeof payload?.addressLat === 'number' ? payload.addressLat : null,
        addressLng: typeof payload?.addressLng === 'number' ? payload.addressLng : null,
        defaultVenueFeeBps: typeof payload?.defaultVenueFeeBps === 'number' ? payload.defaultVenueFeeBps : 1000,
      });
      return resp;
    }

    // Public: single artist with public artworks, display locations, and sets (lookup by slug or id)
    if (url.pathname.startsWith('/api/public/artists/') && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const parts = url.pathname.split('/');
      const slugOrId = parts[4];
      if (!slugOrId) return json({ error: 'Missing artist id or slug' }, { status: 400 });

      const uid = url.searchParams.get('uid');
      const identifier = decodeURIComponent(slugOrId);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
      
      let matchFilter = isUuid ? { id: identifier } : { slug: identifier };

      let { data: artistRow, error: artistError } = await supabaseAdmin
        .from('artists')
        .select('id,slug,name,bio,profile_photo_url,portfolio_url,website_url,instagram_handle,city_primary,city_secondary,is_public')
        .match(matchFilter)
        .maybeSingle();

      // If not found by slug/id, and a UID is provided, try finding by UID.
      // This handles cases where the primary link might be stale but the user context is valid.
      if (!artistRow && uid) {
        const { data: artistByUid, error: uidError } = await supabaseAdmin
          .from('artists')
          .select('id,slug,name,bio,profile_photo_url,portfolio_url,website_url,instagram_handle,city_primary,city_secondary,is_public')
          .eq('id', uid)
          .maybeSingle();
        
        if (uidError) {
          // Log the secondary error but proceed with the original "not found"
          console.warn(`Secondary lookup by UID failed: ${uidError.message}`);
        } else if (artistByUid) {
          artistRow = artistByUid;
          artistError = null; // Clear original error
        }
      }

      if (artistError) return json({ error: artistError.message }, { status: 500 });
      if (!artistRow) return json({ error: 'Not found' }, { status: 404 });

      const artistId = artistRow.id;

      const [artworksRes, displayRes, setsRes] = await Promise.all([
        supabaseAdmin
          .from('artworks')
          .select('id,title,status,price_cents,currency,image_url,artist_id,artist_name,venue_id,venue_name,is_public,archived_at,published_at,set_id,venue:venues(name,city,state,neighborhood,slug,is_public)')
          .eq('artist_id', artistId)
          .eq('is_public', true)
          .is('archived_at', null)
          .in('status', PUBLIC_ARTWORK_STATUSES)
          .order('published_at', { ascending: false })
          .limit(60),
        supabaseAdmin
          .from('v_artist_current_displays')
          .select('artwork_id,venue_id,set_id,status')
          .eq('artist_id', artistId),
        supabaseAdmin
          .from('artwork_sets')
          .select('id,title,description,hero_image_url,visibility,status,items:artwork_set_items(set_id, artwork_id, sort_order, artwork:artworks(id,title,status,price_cents,currency,image_url,archived_at,set_id)))')
          .eq('artist_id', artistId)
          .eq('status', 'published')
          .eq('visibility', 'public')
          .order('updated_at', { ascending: false }),
      ]);

      if (artworksRes.error) return json({ error: artworksRes.error.message }, { status: 500 });
      if (displayRes.error) return json({ error: displayRes.error.message }, { status: 500 });
      if (setsRes.error) return json({ error: setsRes.error.message }, { status: 500 });

      const artworks = Array.isArray(artworksRes.data) ? artworksRes.data.map(shapePublicArtwork) : [];
      const artworkMap = new Map<string, any>();
      artworks.forEach((a) => artworkMap.set(a.id, { ...a }));

      const displayRows = Array.isArray(displayRes.data) ? displayRes.data : [];
      const displayArtworkIds = Array.from(new Set(displayRows.map((r: any) => r.artwork_id).filter(Boolean)));
      const missingArtIds = displayArtworkIds.filter((id) => !artworkMap.has(id));

      if (missingArtIds.length) {
        const { data: missingArts, error: missingErr } = await supabaseAdmin
          .from('artworks')
          .select('id,title,status,price_cents,currency,image_url,artist_id,artist_name,venue_id,venue_name,is_public,archived_at,published_at,set_id,venue:venues(name,city,state,neighborhood,slug,is_public)')
          .in('id', missingArtIds);
        if (missingErr) return json({ error: missingErr.message }, { status: 500 });
        (missingArts || []).map(shapePublicArtwork).forEach((a) => artworkMap.set(a.id, { ...a }));
      }

      // Venue metadata for grouping/badges
      const venueIds = new Set<string>();
      artworkMap.forEach((a) => { if (a.venueId) venueIds.add(a.venueId); });
      displayRows.forEach((r: any) => { if (r.venue_id) venueIds.add(r.venue_id); });
      const venueMap = new Map<string, any>();
      if (venueIds.size) {
        const { data: venues, error: venueErr } = await supabaseAdmin
          .from('venues')
          .select('id,name,city,state,neighborhood,slug,is_public')
          .in('id', Array.from(venueIds));
        if (venueErr) return json({ error: venueErr.message }, { status: 500 });
        (venues || []).forEach((v) => venueMap.set(v.id, v));
      }

      // Sets metadata for display grouping and tab
      const setMetaMap = new Map<string, { id: string; title: string; visibility?: string; status?: string }>();
      const sets = (Array.isArray(setsRes.data) ? setsRes.data : []).map((row: any) => {
        const items = Array.isArray(row.items) ? row.items : [];
        const availableItems = items
          .map((i: any) => ({ ...i, artwork: i.artwork ? shapePublicArtwork(i.artwork) : null }))
          .filter((i: any) => i.artwork && PUBLIC_ARTWORK_STATUSES.includes(String(i.artwork.status || '').toLowerCase()) && !(i.artwork as any).archivedAt);
        const heroImage = row.hero_image_url || availableItems.find((i: any) => i.artwork?.imageUrl)?.artwork?.imageUrl || null;
        setMetaMap.set(row.id, { id: row.id, title: row.title, visibility: row.visibility, status: row.status });
        return {
          id: row.id,
          title: row.title,
          description: row.description || null,
          heroImageUrl: heroImage,
          pieceCount: availableItems.length,
          items: availableItems.slice(0, 6).map((i: any) => i.artwork),
        };
      });

      const displaySetIds = Array.from(new Set(displayRows.map((r: any) => r.set_id).filter(Boolean)));
      const missingSetIds = displaySetIds.filter((id) => !setMetaMap.has(id));
      if (missingSetIds.length) {
        const { data: extraSets, error: extraErr } = await supabaseAdmin
          .from('artwork_sets')
          .select('id,title,visibility,status')
          .in('id', missingSetIds);
        if (extraErr) return json({ error: extraErr.message }, { status: 500 });
        (extraSets || []).forEach((s) => setMetaMap.set(s.id, { id: s.id, title: s.title, visibility: s.visibility, status: s.status }));
      }

      const groups = new Map<string, any>();
      displayRows.forEach((r: any) => {
        const art = artworkMap.get(r.artwork_id);
        if (!art) return;
        const setId = r.set_id || art.setId || null;
        const venue = r.venue_id ? venueMap.get(r.venue_id) : null;
        const venueKey = venue?.id || r.venue_id;
        if (!venueKey) return;

        art.display = {
          venueId: venue?.id || r.venue_id || null,
          venueName: venue?.name || art.venueName || null,
          setId,
          setTitle: setId ? (setMetaMap.get(setId)?.title || null) : null,
        };
        artworkMap.set(art.id, art);

        if (!groups.has(venueKey)) {
          groups.set(venueKey, {
            venue: venue || { id: r.venue_id, name: art.venueName || 'Venue' },
            sets: new Map<string, any>(),
            artworks: [] as any[],
          });
        }
        const group = groups.get(venueKey);
        if (setId) {
          if (!group.sets.has(setId)) {
            group.sets.set(setId, { id: setId, title: setMetaMap.get(setId)?.title || 'Collection', artworks: [] as any[] });
          }
          const setGroup = group.sets.get(setId);
          setGroup.artworks.push(art);
        } else {
          group.artworks.push(art);
        }
      });

      const onDisplay = Array.from(groups.values()).map((g: any) => ({
        venue: g.venue,
        sets: Array.from(g.sets.values()).map((s: any) => ({ ...s, pieceCount: s.artworks.length })),
        artworks: g.artworks,
      }));

      const forSale = Array.from(artworkMap.values());

      const artist = {
        id: artistRow.id,
        slug: (artistRow as any).slug || null,
        name: artistRow.name,
        bio: artistRow.bio || null,
        profilePhotoUrl: (artistRow as any).profile_photo_url || null,
        portfolioUrl: (artistRow as any).portfolio_url || null,
        websiteUrl: (artistRow as any).website_url || null,
        instagramHandle: (artistRow as any).instagram_handle || null,
        cityPrimary: (artistRow as any).city_primary || null,
        citySecondary: (artistRow as any).city_secondary || null,
      };

      return json({ artist, forSale, onDisplay, sets });
    }

    // Public: single published set (by id) with artworks and display venues
    if (url.pathname.startsWith('/api/public/sets/') && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const parts = url.pathname.split('/');
      const setId = parts[4];
      if (!setId) return json({ error: 'Missing set id' }, { status: 400 });

      const { data, error } = await supabaseAdmin
        .from('artwork_sets')
        .select('id,artist_id,title,description,hero_image_url,visibility,status,items:artwork_set_items(set_id, artwork_id, sort_order, artwork:artworks(id,title,status,price_cents,currency,image_url,artist_id,artist_name,venue_id,venue_name,archived_at,set_id,venue:venues(name,city,state,neighborhood,slug,is_public)))')
        .eq('id', setId)
        .eq('status', 'published')
        .eq('visibility', 'public')
        .maybeSingle();

      if (error) return json({ error: error.message }, { status: 500 });
      if (!data) return json({ error: 'Not found' }, { status: 404 });

      const rawItems = Array.isArray((data as any).items) ? (data as any).items : [];
      const allowedItems = rawItems
        .map((i: any) => ({ ...i, artwork: i.artwork ? shapePublicArtwork(i.artwork) : null }))
        .filter((i: any) => i.artwork && PUBLIC_ARTWORK_STATUSES.includes(String(i.artwork.status || '').toLowerCase()) && !(i.artwork as any).archivedAt);

      const artworkIds = allowedItems.map((i: any) => i.artwork.id);
      const { data: displayRows, error: displayErr } = artworkIds.length
        ? await supabaseAdmin
            .from('v_artist_current_displays')
            .select('artwork_id,venue_id,set_id,status')
            .in('artwork_id', artworkIds)
        : { data: [], error: null } as any;
      if (displayErr) return json({ error: displayErr.message }, { status: 500 });

      const venueIds = new Set<string>();
      (displayRows || []).forEach((r: any) => { if (r.venue_id) venueIds.add(r.venue_id); });
      const venueMap = new Map<string, any>();
      if (venueIds.size) {
        const { data: venues, error: venueErr } = await supabaseAdmin
          .from('venues')
          .select('id,name,city,state,neighborhood,slug,is_public')
          .in('id', Array.from(venueIds));
        if (venueErr) return json({ error: venueErr.message }, { status: 500 });
        (venues || []).forEach((v) => venueMap.set(v.id, v));
      }

      const items = allowedItems.map((i: any) => {
        const displays = (displayRows || []).filter((r: any) => r.artwork_id === i.artwork.id);
        const displayVenues = displays.map((r: any) => venueMap.get(r.venue_id) || { id: r.venue_id, name: i.artwork.venueName || null, city: null, neighborhood: null, slug: null });
        return { artwork: i.artwork, displayVenues };
      });

      const heroImage = (data as any).hero_image_url || items.find((i: any) => i.artwork?.imageUrl)?.artwork?.imageUrl || null;

      return json({
        set: {
          id: data.id,
          artistId: (data as any).artist_id,
          title: data.title,
          description: (data as any).description || null,
          heroImageUrl: heroImage,
          pieceCount: items.length,
          items,
        },
      });
    }

    // Public: single artist (basic profile, lookup by slug or id)
    if (url.pathname.startsWith('/api/artists/') && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const parts = url.pathname.split('/');
      const slugOrId = parts[3];
      if (!slugOrId) return json({ error: 'Missing artist id or slug' }, { status: 400 });
      const identifier = decodeURIComponent(slugOrId);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
      const matchFilter = isUuid ? { id: identifier } : { slug: identifier };
      const { data, error } = await supabaseAdmin
        .from('artists')
        .select('id,slug,name,bio,profile_photo_url,portfolio_url,website_url,city_primary,city_secondary,is_public')
        .match(matchFilter)
        .eq('is_public', true)
        .maybeSingle();
      if (error) return json({ error: error.message }, { status: 500 });
      if (!data) return json({ error: 'Not found' }, { status: 404 });
      return json({
        id: data.id,
        slug: (data as any).slug || null,
        name: data.name,
        bio: data.bio || null,
        profilePhotoUrl: (data as any).profile_photo_url || null,
        portfolioUrl: (data as any).portfolio_url || null,
        websiteUrl: (data as any).website_url || null,
        cityPrimary: (data as any).city_primary || null,
        citySecondary: (data as any).city_secondary || null,
      });
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
      const requester = await getSupabaseUserFromRequest(request);
      const isAdmin = requester?.user_metadata?.role === 'admin' || requester?.user_metadata?.isAdmin === true;
      const isOwner = requester?.id && artistId && requester.id === artistId;
      const isPublicQuery = !(isAdmin || isOwner);
      let query = supabaseAdmin
        .from('artworks')
        .select('id,title,status,price_cents,currency,image_url,artist_id,artist_name,venue_id,venue_name,is_public,archived_at,published_at,venue:venues(name,city,state,neighborhood,slug,is_public)')
        .order('published_at', { ascending: false })
        .limit(50);
      if (isPublicQuery) {
        query = query.eq('is_public', true).in('status', PUBLIC_ARTWORK_STATUSES);
      }
      query = query.is('archived_at', null);
      if (artistId) query = query.eq('artist_id', artistId);
      const { data, error } = await query;
      if (error) return json({ error: error.message }, { status: 500 });
      const artworks = (data || []).map(shapePublicArtwork);
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
      const baseSelect = 'id,title,status,price_cents,currency,image_url,image_urls,artist_id,venue_id,artist_name,venue_name,description,purchase_url,qr_svg,is_public,published_at,archived_at,venue:venues(name,city,state,neighborhood,slug,is_public)';
      let { data, error } = await supabaseAdmin
        .from('artworks')
        .select(baseSelect)
        .eq('id', id)
        .eq('is_public', true)
        .is('archived_at', null)
        .in('status', PUBLIC_ARTWORK_STATUSES)
        .maybeSingle();
      if (error) return json({ error: error.message }, { status: 500 });

      // If not public, allow owner/admin to view their own listing
      if (!data) {
        const requester = await getSupabaseUserFromRequest(request);
        const isAdmin = requester?.user_metadata?.role === 'admin' || requester?.user_metadata?.isAdmin === true;
        const { data: privateData, error: privateError } = await supabaseAdmin
          .from('artworks')
          .select(baseSelect)
          .eq('id', id)
          .maybeSingle();
        if (privateError) return json({ error: privateError.message }, { status: 500 });
        if (!privateData) return json({ error: 'Not found' }, { status: 404 });
        if (!isAdmin && requester?.id !== (privateData as any).artist_id) return json({ error: 'Forbidden' }, { status: 403 });
        data = privateData;
      }

      const artwork = shapePublicArtworkDetail(data);

      let otherWorks: any[] = [];
      if ((data as any).artist_id) {
        const { data: siblings } = await supabaseAdmin
          .from('artworks')
          .select('id,title,status,price_cents,currency,image_url,artist_id,artist_name,venue_id,venue_name,is_public,archived_at,published_at,set_id,venue:venues(name,city,state,neighborhood,slug,is_public)')
          .eq('artist_id', (data as any).artist_id)
          .neq('id', data.id)
          .eq('is_public', true)
          .is('archived_at', null)
          .in('status', PUBLIC_ARTWORK_STATUSES)
          .order('published_at', { ascending: false })
          .limit(6);
        otherWorks = (siblings || []).map(shapePublicArtwork);
      }

      return json({ ...artwork, otherWorks });
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

      // Enforce plan artwork limit before creating Stripe entities
      const [artworkLimit, activeCount] = await Promise.all([
        getArtistArtworkLimit(user.id),
        getArtistActiveArtworkCount(user.id),
      ]);
      if (Number.isFinite(artworkLimit) && activeCount + 1 > artworkLimit) {
        return json({ error: 'Artwork limit reached for your plan. Upgrade to add more artworks.' }, { status: 403 });
      }
      // Create Stripe Product + Price for marketplace listing
      const artworkId = crypto.randomUUID();
      let stripeProductId: string | null = null;
      let stripePriceId: string | null = null;
      try {
        const productResp = await stripeFetch('/v1/products', {
          method: 'POST',
          body: toForm({
            name: String(payload?.title || 'Artwork'),
            description: payload?.description || undefined,
            'images[]': primaryImageUrl || undefined,
            'metadata[artworkId]': artworkId,
            'metadata[artistId]': user.id,
          }),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const productJson = await productResp.json();
        if (!productResp.ok) throw new Error(productJson?.error?.message || 'Stripe product create failed');
        stripeProductId = productJson.id;

        const priceResp = await stripeFetch('/v1/prices', {
          method: 'POST',
          body: toForm({
            product: stripeProductId,
            unit_amount: price_cents,
            currency: String(payload?.currency || 'usd').toLowerCase(),
          }),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const priceJson = await priceResp.json();
        if (!priceResp.ok) throw new Error(priceJson?.error?.message || 'Stripe price create failed');
        stripePriceId = priceJson.id;
      } catch (err: any) {
        return json({ error: err?.message || 'Unable to create Stripe product/price' }, { status: 500 });
      }

      const insert = {
        id: artworkId,
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
        stripe_product_id: stripeProductId,
        stripe_price_id: stripePriceId,
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
    // Security: RLS on events table enforces service-role INSERT only (see 20260205_fix_p0_rls_and_idempotency.sql)
    // This endpoint uses service-role key, so writes succeed despite RLS
    // Client-side queries via anon key will fail (read-only access for own events)
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
      const { data: existing, error: fetchErr } = await supabaseAdmin
        .from('artworks')
        .select('id,artist_id,archived_at,status')
        .eq('id', id)
        .maybeSingle();
      if (fetchErr) return json({ error: fetchErr.message }, { status: 500 });
      if (!existing) return json({ error: 'Not found' }, { status: 404 });

      const [artworkLimit, activeCount] = await Promise.all([
        getArtistArtworkLimit(existing.artist_id),
        getArtistActiveArtworkCount(existing.artist_id),
      ]);
      if (Number.isFinite(artworkLimit) && activeCount > artworkLimit) {
        return json({ error: 'Artwork limit reached for this artist plan. Please upgrade to approve additional artworks.' }, { status: 403 });
      }
      const venueName = user.user_metadata?.name || null;
      const nowIso = new Date().toISOString();
      const { data: updated, error } = await supabaseAdmin
        .from('artworks')
        .update({ status: 'active', published_at: nowIso, archived_at: null, venue_id: user.id, venue_name: venueName, purchase_url: `${allowOrigin}/#/purchase-${id}`, updated_at: nowIso })
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (error) return json({ error: error.message }, { status: 500 });
      if (!updated) return json({ error: 'Not found' }, { status: 404 });
      const purchaseUrl = `${allowOrigin}/#/purchase-${id}`;
      const qrSvg = await generateQrSvg(purchaseUrl, 300);
      await supabaseAdmin.from('artworks').update({ qr_svg: qrSvg }).eq('id', id);
      if (updated.artist_id) {
        await supabaseAdmin.from('notifications').insert({
          id: crypto.randomUUID(),
          user_id: updated.artist_id,
          role: 'artist',
          type: 'artwork_approved',
          title: 'Artwork approved for display',
          message: `${updated.title || 'Artwork'} was approved to display at ${venueName || 'a venue'}.`,
          artwork_id: updated.id,
          created_at: nowIso,
        });
      }
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
        address: payload?.address || null,
        addressLat: typeof payload?.addressLat === 'number' ? payload.addressLat : null,
        addressLng: typeof payload?.addressLng === 'number' ? payload.addressLng : null,
        defaultVenueFeeBps: typeof payload?.defaultVenueFeeBps === 'number' ? payload.defaultVenueFeeBps : 1000,
      });
      return resp;
    }

    // Public: single artist with public artworks, display locations, and sets (lookup by slug or id)
    if (url.pathname.startsWith('/api/public/artists/') && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const parts = url.pathname.split('/');
      const slugOrId = parts[4];
      if (!slugOrId) return json({ error: 'Missing artist id or slug' }, { status: 400 });

      const uid = url.searchParams.get('uid');
      const identifier = decodeURIComponent(slugOrId);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
      
      let matchFilter = isUuid ? { id: identifier } : { slug: identifier };

      let { data: artistRow, error: artistError } = await supabaseAdmin
        .from('artists')
        .select('id,slug,name,bio,profile_photo_url,portfolio_url,website_url,instagram_handle,city_primary,city_secondary,is_public')
        .match(matchFilter)
        .maybeSingle();

      // If not found by slug/id, and a UID is provided, try finding by UID.
      // This handles cases where the primary link might be stale but the user context is valid.
      if (!artistRow && uid) {
        const { data: artistByUid, error: uidError } = await supabaseAdmin
          .from('artists')
          .select('id,slug,name,bio,profile_photo_url,portfolio_url,website_url,instagram_handle,city_primary,city_secondary,is_public')
          .eq('id', uid)
          .maybeSingle();
        
        if (uidError) {
          // Log the secondary error but proceed with the original "not found"
          console.warn(`Secondary lookup by UID failed: ${uidError.message}`);
        } else if (artistByUid) {
          artistRow = artistByUid;
          artistError = null; // Clear original error
        }
      }

      if (artistError) return json({ error: artistError.message }, { status: 500 });
      if (!artistRow) return json({ error: 'Not found' }, { status: 404 });

      const artistId = artistRow.id;

      const [artworksRes, displayRes, setsRes] = await Promise.all([
        supabaseAdmin
          .from('artworks')
          .select('id,title,status,price_cents,currency,image_url,artist_id,artist_name,venue_id,venue_name,is_public,archived_at,published_at,set_id,venue:venues(name,city,state,neighborhood,slug,is_public)')
          .eq('artist_id', artistId)
          .eq('is_public', true)
          .is('archived_at', null)
          .in('status', PUBLIC_ARTWORK_STATUSES)
          .order('published_at', { ascending: false })
          .limit(60),
        supabaseAdmin
          .from('v_artist_current_displays')
          .select('artwork_id,venue_id,set_id,status')
          .eq('artist_id', artistId),
        supabaseAdmin
          .from('artwork_sets')
          .select('id,title,description,hero_image_url,visibility,status,items:artwork_set_items(set_id, artwork_id, sort_order, artwork:artworks(id,title,status,price_cents,currency,image_url,archived_at,set_id)))')
          .eq('artist_id', artistId)
          .eq('status', 'published')
          .eq('visibility', 'public')
          .order('updated_at', { ascending: false }),
      ]);

      if (artworksRes.error) return json({ error: artworksRes.error.message }, { status: 500 });
      if (displayRes.error) return json({ error: displayRes.error.message }, { status: 500 });
      if (setsRes.error) return json({ error: setsRes.error.message }, { status: 500 });

      const artworks = Array.isArray(artworksRes.data) ? artworksRes.data.map(shapePublicArtwork) : [];
      const artworkMap = new Map<string, any>();
      artworks.forEach((a) => artworkMap.set(a.id, { ...a }));

      const displayRows = Array.isArray(displayRes.data) ? displayRes.data : [];
      const displayArtworkIds = Array.from(new Set(displayRows.map((r: any) => r.artwork_id).filter(Boolean)));
      const missingArtIds = displayArtworkIds.filter((id) => !artworkMap.has(id));

      if (missingArtIds.length) {
        const { data: missingArts, error: missingErr } = await supabaseAdmin
          .from('artworks')
          .select('id,title,status,price_cents,currency,image_url,artist_id,artist_name,venue_id,venue_name,is_public,archived_at,published_at,set_id,venue:venues(name,city,state,neighborhood,slug,is_public)')
          .in('id', missingArtIds);
        if (missingErr) return json({ error: missingErr.message }, { status: 500 });
        (missingArts || []).map(shapePublicArtwork).forEach((a) => artworkMap.set(a.id, { ...a }));
      }

      // Venue metadata for grouping/badges
      const venueIds = new Set<string>();
      artworkMap.forEach((a) => { if (a.venueId) venueIds.add(a.venueId); });
      displayRows.forEach((r: any) => { if (r.venue_id) venueIds.add(r.venue_id); });
      const venueMap = new Map<string, any>();
      if (venueIds.size) {
        const { data: venues, error: venueErr } = await supabaseAdmin
          .from('venues')
          .select('id,name,city,state,neighborhood,slug,is_public')
          .in('id', Array.from(venueIds));
        if (venueErr) return json({ error: venueErr.message }, { status: 500 });
        (venues || []).forEach((v) => venueMap.set(v.id, v));
      }

      // Sets metadata for display grouping and tab
      const setMetaMap = new Map<string, { id: string; title: string; visibility?: string; status?: string }>();
      const sets = (Array.isArray(setsRes.data) ? setsRes.data : []).map((row: any) => {
        const items = Array.isArray(row.items) ? row.items : [];
        const availableItems = items
          .map((i: any) => ({ ...i, artwork: i.artwork ? shapePublicArtwork(i.artwork) : null }))
          .filter((i: any) => i.artwork && PUBLIC_ARTWORK_STATUSES.includes(String(i.artwork.status || '').toLowerCase()) && !(i.artwork as any).archivedAt);
        const heroImage = row.hero_image_url || availableItems.find((i: any) => i.artwork?.imageUrl)?.artwork?.imageUrl || null;
        setMetaMap.set(row.id, { id: row.id, title: row.title, visibility: row.visibility, status: row.status });
        return {
          id: row.id,
          title: row.title,
          description: row.description || null,
          heroImageUrl: heroImage,
          pieceCount: availableItems.length,
          items: availableItems.slice(0, 6).map((i: any) => i.artwork),
        };
      });

      const displaySetIds = Array.from(new Set(displayRows.map((r: any) => r.set_id).filter(Boolean)));
      const missingSetIds = displaySetIds.filter((id) => !setMetaMap.has(id));
      if (missingSetIds.length) {
        const { data: extraSets, error: extraErr } = await supabaseAdmin
          .from('artwork_sets')
          .select('id,title,visibility,status')
          .in('id', missingSetIds);
        if (extraErr) return json({ error: extraErr.message }, { status: 500 });
        (extraSets || []).forEach((s) => setMetaMap.set(s.id, { id: s.id, title: s.title, visibility: s.visibility, status: s.status }));
      }

      const groups = new Map<string, any>();
      displayRows.forEach((r: any) => {
        const art = artworkMap.get(r.artwork_id);
        if (!art) return;
        const setId = r.set_id || art.setId || null;
        const venue = r.venue_id ? venueMap.get(r.venue_id) : null;
        const venueKey = venue?.id || r.venue_id;
        if (!venueKey) return;

        art.display = {
          venueId: venue?.id || r.venue_id || null,
          venueName: venue?.name || art.venueName || null,
          setId,
          setTitle: setId ? (setMetaMap.get(setId)?.title || null) : null,
        };
        artworkMap.set(art.id, art);

        if (!groups.has(venueKey)) {
          groups.set(venueKey, {
            venue: venue || { id: r.venue_id, name: art.venueName || 'Venue' },
            sets: new Map<string, any>(),
            artworks: [] as any[],
          });
        }
        const group = groups.get(venueKey);
        if (setId) {
          if (!group.sets.has(setId)) {
            group.sets.set(setId, { id: setId, title: setMetaMap.get(setId)?.title || 'Collection', artworks: [] as any[] });
          }
          const setGroup = group.sets.get(setId);
          setGroup.artworks.push(art);
        } else {
          group.artworks.push(art);
        }
      });

      const onDisplay = Array.from(groups.values()).map((g: any) => ({
        venue: g.venue,
        sets: Array.from(g.sets.values()).map((s: any) => ({ ...s, pieceCount: s.artworks.length })),
        artworks: g.artworks,
      }));

      const forSale = Array.from(artworkMap.values());

      const artist = {
        id: artistRow.id,
        slug: (artistRow as any).slug || null,
        name: artistRow.name,
        bio: artistRow.bio || null,
        profilePhotoUrl: (artistRow as any).profile_photo_url || null,
        portfolioUrl: (artistRow as any).portfolio_url || null,
        websiteUrl: (artistRow as any).website_url || null,
        instagramHandle: (artistRow as any).instagram_handle || null,
        cityPrimary: (artistRow as any).city_primary || null,
        citySecondary: (artistRow as any).city_secondary || null,
      };

      return json({ artist, forSale, onDisplay, sets });
    }

    // Public: single published set (by id) with artworks and display venues
    if (url.pathname.startsWith('/api/public/sets/') && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const parts = url.pathname.split('/');
      const setId = parts[4];
      if (!setId) return json({ error: 'Missing set id' }, { status: 400 });

      const { data, error } = await supabaseAdmin
        .from('artwork_sets')
        .select('id,artist_id,title,description,hero_image_url,visibility,status,items