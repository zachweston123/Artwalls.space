import { verifyAndParseStripeEvent } from './stripeWebhook';
import { mergeTransferRecords } from './orderSettlement';
import {
  isUUID,
  clampStr,
  isValidUrl,
  isValidEmail,
  generateInviteToken,
  generateReferralToken,
  getErrorMessage,
  isValidInviteToken,
  statusAfterOpen,
  isStatusTransitionAllowed,
  mapVenueInviteRow,
} from './helpers';
import {
  checkRateLimit,
  getClientIp,
  userIdFromJwt,
  enforceBodySize,
  stripeIdempotencyKey,
  ROUTE_LIMITS,
  type RateLimitContext,
} from './rateLimit';
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
  // Rate limiting
  RATE_LIMIT_ENABLED?: string;
  RATE_LIMIT_KV?: any;   // KV namespace binding (optional — falls back to in-memory)
  // Founding Artist
  STRIPE_FOUNDING_ARTIST_COUPON_ID?: string;
  FOUNDING_ARTIST_MAX_REDEMPTIONS?: string;
  FOUNDING_ARTIST_CUTOFF?: string;
};

/**
 * Resolve artist subscription tier from a Stripe Price ID.
 * Falls back to metadata.tier or 'free' if the price ID isn't recognized.
 */
function resolveTierFromPriceId(
  priceId: string | undefined | null,
  env: Env,
  metadataTier?: string | null,
): 'free' | 'starter' | 'growth' | 'pro' {
  if (priceId) {
    const map: Record<string, 'starter' | 'growth' | 'pro'> = {};
    const ids = {
      starter: env.STRIPE_PRICE_ID_STARTER || env.STRIPE_SUB_PRICE_STARTER,
      growth: env.STRIPE_PRICE_ID_GROWTH || env.STRIPE_SUB_PRICE_GROWTH,
      pro: env.STRIPE_PRICE_ID_PRO || env.STRIPE_SUB_PRICE_PRO,
    };
    for (const [tier, id] of Object.entries(ids)) {
      if (id) map[id] = tier as 'starter' | 'growth' | 'pro';
    }
    if (map[priceId]) return map[priceId];
  }
  // Fallback to metadata (may be stale after portal plan changes)
  const raw = (metadataTier || '').toLowerCase().trim();
  if (raw === 'starter' || raw === 'growth' || raw === 'pro') return raw;
  // Backward-compat: some older docs/env-vars used 'elite' for the growth tier
  if (raw === 'elite') return 'growth';
  return 'free';
}

/** Platform fee basis points per tier (for analytics column). */
const TIER_PLATFORM_FEE_BPS: Record<string, number> = {
  free: 2500,
  starter: 500,
  growth: 200,
  pro: 0,
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    
    // Determine allowed origin - accept requests from the frontend origin
    const requestOrigin = request.headers.get('origin') || '';
    const pagesOrigin = env.PAGES_ORIGIN || 'https://artwalls.space';

    // CORS: reflect the request origin if it matches an allowed pattern,
    // otherwise fall back to the configured pages origin.
    const allowedOrigins = new Set([
      pagesOrigin,
      'https://artwalls.space',
      'https://www.artwalls.space',
      'http://localhost:5173',   // Vite dev server
      'http://localhost:3000',
    ]);
    const allowOrigin = allowedOrigins.has(requestOrigin) ? requestOrigin : pagesOrigin;

    // Preflight CORS
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': allowOrigin,
          'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
          'Access-Control-Max-Age': '86400',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          Vary: 'Origin',
        },
      });
    }

    /** Apply standard security + CORS headers to any Headers object. */
    function applySecurityHeaders(headers: Headers): void {
      headers.set('Access-Control-Allow-Origin', allowOrigin);
      headers.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'authorization, content-type, x-client-info, apikey');
      headers.set('Vary', 'Origin');
      // Security headers
      headers.set('X-Content-Type-Options', 'nosniff');
      headers.set('X-Frame-Options', 'DENY');
      headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
      headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; connect-src 'self' https://*.supabase.co https://*.stripe.com; frame-src https://js.stripe.com https://hooks.stripe.com; img-src 'self' https://*.supabase.co data: blob:;");
    }

    function json(obj: unknown, init?: ResponseInit): Response {
      const headers = new Headers(init?.headers);
      headers.set('Content-Type', 'application/json');
      applySecurityHeaders(headers);
      const body = JSON.stringify(obj);
      return new Response(body, { status: init?.status ?? 200, headers });
    }

    function text(body: string, init?: ResponseInit): Response {
      const headers = new Headers(init?.headers);
      headers.set('Content-Type', 'text/plain; charset=utf-8');
      applySecurityHeaders(headers);
      return new Response(body, { status: init?.status ?? 200, headers });
    }

    // ── Top-level try-catch: ensures every response has CORS headers,
    //    even on unexpected runtime errors. Without this, unhandled throws
    //    produce a Cloudflare error page with NO CORS headers, which browsers
    //    report as "Failed to fetch" / CORS blocked. ──
    try {

    // ── Rate limiting helpers ──
    const rateLimitEnabled = (env.RATE_LIMIT_ENABLED ?? 'true') !== 'false';
    const kvStore = env.RATE_LIMIT_KV || null;

    /**
     * Check rate limits for a given route preset.
     * Returns null if allowed, or a 429 Response if blocked.
     * artworkId is optional — only pass for checkout-type endpoints.
     */
    async function applyRateLimit(
      preset: string,
      req: Request,
      artworkId?: string | null,
    ): Promise<Response | null> {
      if (!rateLimitEnabled) return null;
      const rules = ROUTE_LIMITS[preset];
      if (!rules) return null;
      const ctx: RateLimitContext = {
        ip: getClientIp(req),
        userId: userIdFromJwt(req),
        artworkId: artworkId || null,
        route: new URL(req.url).pathname,
      };
      const result = await checkRateLimit(rules, ctx, kvStore);
      if (result.allowed) return null;
      console.log(`[rate-limit] 429 on ${preset} by rule=${result.blockedBy} ip=${ctx.ip.slice(0, 8)}…`);
      return json(
        { error: 'rate_limited', retryAfterSec: result.retryAfterSec },
        {
          status: 429,
          headers: {
            'Retry-After': String(result.retryAfterSec),
            'Cache-Control': 'no-store',
          },
        },
      );
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

    /**
     * Canonical purchase deep-link for an artwork.
     * ALL QR codes, Stripe redirects, and purchase URLs MUST use this
     * so the format never drifts from the SPA hash listener.
     */
    function artworkPurchaseUrl(artworkId: string): string {
      return `${pagesOrigin}/#/purchase-${artworkId}`;
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
      if (!key) throw new Error('STRIPE_SECRET_KEY not configured — run: wrangler secret put STRIPE_SECRET_KEY --name artwalls-space');
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

    /**
     * Validate the Supabase access token from the Authorization header.
     * Returns the user object on success, or null if:
     *   - No Authorization header / invalid Bearer scheme
     *   - supabaseAdmin is not initialised (env misconfigured)
     *   - Token validation fails (expired, revoked, etc.)
     *
     * Callers should distinguish between "no user + supabaseAdmin null"
     * (→ 500 SUPABASE_ADMIN_MISCONFIG) and "no user + supabaseAdmin ok"
     * (→ 401 Unauthorized).
     */
    async function getSupabaseUserFromRequest(req: Request): Promise<any | null> {
      try {
        const auth = req.headers.get('authorization') || '';
        const [scheme, token] = auth.split(' ');
        if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null;
        if (!supabaseAdmin) return null;   // caller should check supabaseAdmin separately
        const { data, error } = await supabaseAdmin.auth.getUser(token);
        if (error) {
          console.error('[auth] Token validation failed:', error.message);
          return null;
        }
        return data.user || null;
      } catch (e) {
        console.error('[auth] Unexpected error in getSupabaseUserFromRequest:', e instanceof Error ? e.message : e);
        return null;
      }
    }

    /**
     * Helper that returns a clear 500 when Supabase env vars are missing,
     * or 401 when the user simply isn't authenticated.
     */
    function requireAuthOrFail(req: Request, user: any | null): Response | null {
      if (!supabaseAdmin) {
        return json({
          error: 'Server misconfiguration: Supabase admin client not initialised',
          code: 'SUPABASE_ADMIN_MISCONFIG',
          hint: 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY as Worker secrets',
        }, { status: 500 });
      }
      if (!user) {
        return json({ error: 'Unauthorized — missing or invalid Authorization bearer token' }, { status: 401 });
      }
      return null; // success — caller can proceed
    }

    /**
     * Check admin status.
     * Only the site owner (zweston8136@sdsu.edu) has admin access.
     */
    const ADMIN_EMAILS: string[] = [
      'zweston8136@sdsu.edu',
    ];

    async function isAdminUser(user: any): Promise<boolean> {
      if (!user?.id) return false;
      const email = (user.email || '').toLowerCase().trim();
      return ADMIN_EMAILS.includes(email);
    }

    /**
     * Centralized admin gate — authenticates the request AND verifies admin.
     * Returns null on success (caller proceeds), or a ready-to-return Response
     * (401 / 403 / 500) on failure.
     *
     * Usage:
     *   const guardResp = await requireAdmin(request);
     *   if (guardResp) return guardResp;
     *   // ... admin-only logic ...
     */
    async function requireAdmin(req: Request): Promise<Response | null> {
      if (!supabaseAdmin) {
        return json({
          error: 'Server misconfiguration: Supabase admin client not initialised',
          code: 'SUPABASE_ADMIN_MISCONFIG',
          hint: 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY as Worker secrets',
        }, { status: 500 });
      }
      const user = await getSupabaseUserFromRequest(req);
      if (!user) {
        return json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
      }
      if (!(await isAdminUser(user))) {
        return json({ error: 'Forbidden', code: 'ADMIN_REQUIRED' }, { status: 403 });
      }
      // Stash the validated user on the request for downstream use
      (req as any).__adminUser = user;
      return null; // success
    }

    /** Write a row to admin_audit_log (best-effort, never throws) */
    async function logAdminAction(
      adminId: string,
      action: string,
      targetTable?: string,
      targetId?: string,
      meta?: Record<string, unknown>,
    ) {
      if (!supabaseAdmin) return;
      try {
        await supabaseAdmin.from('admin_audit_log').insert({
          admin_user_id: adminId,
          action,
          target_type: targetTable ?? null,
          target_id: targetId ?? null,
          details: meta ?? {},
          ip_address: null, // could add request IP if needed
        });
      } catch (e) {
        console.warn('[audit] Failed to write audit log:', e instanceof Error ? e.message : e);
      }
    }

    async function upsertArtist(artist: { id: string; email?: string | null; name?: string | null; role?: string; phoneNumber?: string | null; cityPrimary?: string | null; citySecondary?: string | null; stripeAccountId?: string | null; stripeCustomerId?: string | null; subscriptionTier?: string | null; subscriptionStatus?: string | null; stripeSubscriptionId?: string | null; platformFeeBps?: number | null; profilePhotoUrl?: string | null; }): Promise<Response> {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured - check SUPABASE_SERVICE_ROLE_KEY secret' }, { status: 500 });
      // Only include fields that were explicitly provided (not undefined).
      // This prevents partial callers (webhooks, customer-creation flows) from
      // accidentally wiping existing data like email, name, or stripe_account_id.
      const payload: Record<string, any> = {
        id: artist.id,
        is_live: true, // Ensure artists are live by default
        updated_at: new Date().toISOString(),
      };
      if (artist.email !== undefined) payload.email = artist.email;
      if (artist.name !== undefined) payload.name = artist.name;
      if (artist.role !== undefined) payload.role = artist.role;
      if (artist.phoneNumber !== undefined) payload.phone_number = artist.phoneNumber;
      if (artist.stripeAccountId !== undefined) payload.stripe_account_id = artist.stripeAccountId;
      if (artist.stripeCustomerId !== undefined) payload.stripe_customer_id = artist.stripeCustomerId;
      // Subscription fields: normalise null → safe defaults so NOT NULL columns stay happy
      if (artist.subscriptionTier !== undefined) payload.subscription_tier = artist.subscriptionTier || 'free';
      if (artist.subscriptionStatus !== undefined) payload.subscription_status = artist.subscriptionStatus || 'inactive';
      if (artist.stripeSubscriptionId !== undefined) payload.stripe_subscription_id = artist.stripeSubscriptionId;
      if (artist.platformFeeBps !== undefined) payload.platform_fee_bps = artist.platformFeeBps;
      if (artist.cityPrimary !== undefined) payload.city_primary = artist.cityPrimary;
      if (artist.citySecondary !== undefined) payload.city_secondary = artist.citySecondary;
      // Only include profile_photo_url if provided and non-null (avoid overwriting with null)
      if (artist.profilePhotoUrl !== undefined && artist.profilePhotoUrl !== null) {
        payload.profile_photo_url = artist.profilePhotoUrl;
      }
      const { data, error } = await supabaseAdmin.from('artists').upsert(payload, { onConflict: 'id' }).select('*').single();
      if (error) {
        console.error('[upsertArtist] Error:', error.message, error.code, (error as any).hint);
        return json({ error: error.message, code: error.code, hint: (error as any).hint || null }, { status: 500 });
      }
      return json(data);
    }

    async function upsertVenue(venue: { id: string; email?: string | null; name?: string | null; type?: string | null; phoneNumber?: string | null; city?: string | null; stripeAccountId?: string | null; defaultVenueFeeBps?: number | null; labels?: any; suspended?: boolean | null; bio?: string | null; coverPhotoUrl?: string | null; address?: string | null; addressLat?: number | null; addressLng?: number | null; website?: string | null; instagramHandle?: string | null; }): Promise<Response> {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured - check SUPABASE_SERVICE_ROLE_KEY secret' }, { status: 500 });
      // Only include fields that were explicitly provided (not undefined).
      // This prevents partial callers (Stripe Connect create-account, webhooks)
      // from accidentally wiping existing data like type, city, phone, etc.
      const payload: Record<string, any> = {
        id: venue.id,
        updated_at: new Date().toISOString(),
      };
      if (venue.email !== undefined) payload.email = venue.email;
      if (venue.name !== undefined) payload.name = venue.name;
      if (venue.type !== undefined) payload.type = venue.type;
      if (venue.phoneNumber !== undefined) payload.phone_number = venue.phoneNumber;
      if (venue.city !== undefined) payload.city = venue.city;
      if (venue.stripeAccountId !== undefined) payload.stripe_account_id = venue.stripeAccountId;
      if (typeof venue.defaultVenueFeeBps === 'number') payload.default_venue_fee_bps = venue.defaultVenueFeeBps;
      if (venue.labels !== undefined) payload.labels = venue.labels;
      // suspended is NOT NULL in the DB — only include when explicitly set
      if (typeof venue.suspended === 'boolean') payload.suspended = venue.suspended;
      if (venue.bio !== undefined && venue.bio !== null) payload.bio = venue.bio;
      if (venue.coverPhotoUrl !== undefined) payload.cover_photo_url = venue.coverPhotoUrl || null;
      if (venue.address !== undefined && venue.address !== null) payload.address = venue.address;
      if (venue.addressLat !== undefined && venue.addressLat !== null) payload.address_lat = venue.addressLat;
      if (venue.addressLng !== undefined && venue.addressLng !== null) payload.address_lng = venue.addressLng;
      if (venue.website !== undefined && venue.website !== null) payload.website = venue.website;
      if (venue.instagramHandle !== undefined && venue.instagramHandle !== null) payload.instagram_handle = venue.instagramHandle;
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

      const rlTrack = await applyRateLimit('track', request);
      if (rlTrack) return rlTrack;

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
      const guardResp = await requireAdmin(request);
      if (guardResp) return guardResp;

      const days = parseInt(url.searchParams.get('days') || '7', 10);
      const safeDays = Math.min(Math.max(days, 1), 90);

      const { data, error: rpcErr } = await supabaseAdmin.rpc('wall_productivity_metrics', {
        p_days: safeDays,
      });
      if (rpcErr) return json({ error: rpcErr.message }, { status: 500 });
      return json(data);
    }

    // ── Admin-only: unified users list ──
    // Returns ALL artists + venues + auth users in a single merged list.
    // No is_public / is_live / suspended filters — admins see everything.
    if (url.pathname === '/api/admin/users' && method === 'GET') {
      const guardResp = await requireAdmin(request);
      if (guardResp) return guardResp;

      try {
        // Fetch ALL artists (no is_public / is_live filter)
        const { data: allArtists, error: artistErr } = await supabaseAdmin
          .from('artists')
          .select('id,name,email,role,subscription_tier,subscription_status,city_primary,is_live,is_public,created_at')
          .order('created_at', { ascending: false })
          .limit(5000);

        // Fetch ALL venues (no suspended filter)
        const { data: allVenues, error: venueErr } = await supabaseAdmin
          .from('venues')
          .select('id,name,email,city,suspended,created_at')
          .order('created_at', { ascending: false })
          .limit(5000);

        // Fetch auth users for any accounts that may not have artist/venue rows yet
        let authUsers: any[] = [];
        try {
          const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
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

    // ── Admin-only: sync users (no-op placeholder for backfill button) ──
    if (url.pathname === '/api/admin/sync-users' && method === 'POST') {
      const guardResp = await requireAdmin(request);
      if (guardResp) return guardResp;

      // Count current records as a diagnostic
      const { count: artistCount } = await supabaseAdmin
        .from('artists')
        .select('id', { count: 'exact', head: true });
      const { count: venueCount } = await supabaseAdmin
        .from('venues')
        .select('id', { count: 'exact', head: true });

      return json({ ok: true, artists: artistCount || 0, venues: venueCount || 0 });
    }

    // ── Admin-only: dashboard metrics ──
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
          const { data } = await supabaseAdmin
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

    // ── Admin-only: user metrics breakdown ──
    if (url.pathname === '/api/admin/user-metrics' && method === 'GET') {
      const guardResp = await requireAdmin(request);
      if (guardResp) return guardResp;

      try {
        const { data: artists } = await supabaseAdmin
          .from('artists')
          .select('id,subscription_tier,art_types');
        const { count: venueCount } = await supabaseAdmin
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

    // ── Momentum banner dismiss ──
    if (url.pathname === '/api/artists/dismiss-momentum-banner' && method === 'POST') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const user = await getSupabaseUserFromRequest(request);
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

    // Debug/env endpoints removed for security (P0)
    if (url.pathname === '/api/debug/auth' || url.pathname === '/api/debug/supabase') {
      return json({ error: 'Not found' }, { status: 404 });
    }

    // ── Admin-only: verify caller is admin (used by AdminPasswordPrompt) ──
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

    // ── Integration status endpoint (for admin Stripe checklist) ──────────
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

    if (url.pathname === '/') {
      return text('Artwalls API OK');
    }


    // Artist stats (artworks + orders aggregates)
    if (url.pathname === '/api/stats/artist' && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const user = await getSupabaseUserFromRequest(request);
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

    // Venue stats endpoint
    if (url.pathname === '/api/stats/venue' && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const user = await getSupabaseUserFromRequest(request);
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

    // Removed demo endpoint /api/demo/check for production

    // Profile: provision record in artists or venues based on Supabase user role
    if (url.pathname === '/api/profile/provision' && method === 'POST') {
      const user = await getSupabaseUserFromRequest(request);
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
        .select('id,name,type,labels,default_venue_fee_bps,city,bio,cover_photo_url,verified,created_at,is_founding,founding_end,featured_until')
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

    // Public listings: artists (only show live artists)
    if (url.pathname === '/api/artists' && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const q = (url.searchParams.get('q') || '').trim();
      
      let query = supabaseAdmin
        .from('artists')
        .select('id,slug,name,email,city_primary,city_secondary,profile_photo_url,is_live,is_public,bio,art_types,is_founding_artist')
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

      const artists = (data || []).map(a => ({ 
        id: a.id, 
        slug: (a as any).slug || null,
        name: a.name, 
        email: a.email,
        profilePhotoUrl: a.profile_photo_url || null,
        location: a.city_primary || a.city_secondary || 'Local',
        is_live: a.is_live,
        bio: (a as any).bio || '',
        artTypes: Array.isArray((a as any).art_types) ? (a as any).art_types : [],
        portfolioCount: artworkCounts[a.id] || 0,
        isFoundingArtist: !!(a as any).is_founding_artist,
      }));
      return json({ artists });
    }

    // ── Analytics Routes ───────────────────────────────────────────

    // Analytics: Artist — aggregate scan/view/checkout/purchase data
    if (url.pathname === '/api/analytics/artist' && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const user = await getSupabaseUserFromRequest(request);
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

    // Analytics: Venue — aggregate scan/view/checkout/purchase data
    if (url.pathname === '/api/analytics/venue' && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const user = await getSupabaseUserFromRequest(request);
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

    // ── Founding Artist: eligibility status ─────────────────────────

    if (url.pathname === '/api/founding-artist/status' && method === 'GET') {
      const user = await getSupabaseUserFromRequest(request);
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

    // ── Stripe Routes ──────────────────────────────────────────────

    // Stripe webhook – verify signature with Web Crypto, then handle event
    if (url.pathname === '/api/stripe/webhook' && method === 'POST') {
      if (!env.STRIPE_WEBHOOK_SECRET) {
        console.error('[webhook] STRIPE_WEBHOOK_SECRET is not configured — all webhooks will fail');
        return json({ error: 'Webhook secret not configured' }, { status: 500 });
      }
      try {
        const body = await request.text();
        const sig = request.headers.get('stripe-signature') || '';
        const event = await verifyAndParseStripeEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);
        console.log(`[webhook] Event received: ${event.type} (${event.id})`);

        // ── Idempotency: skip events we've already processed ──
        if (supabaseAdmin) {
          const { data: existing } = await supabaseAdmin
            .from('stripe_webhook_events')
            .select('stripe_event_id')
            .eq('stripe_event_id', event.id)
            .maybeSingle();
          if (existing) {
            console.log(`[webhook] Duplicate event ${event.id} (${event.type}) — skipping`);
            return json({ received: true, duplicate: true });
          }
        }

        // ── Handle event types ──

        if (event.type === 'checkout.session.completed') {
          const session = event.data?.object;

          // Subscription checkout completed
          if (session?.mode === 'subscription') {
            const artistId = session?.metadata?.artistId;
            const subscriptionId = session.subscription;
            const customerId = session.customer;
            console.log('[webhook] Subscription checkout completed', { artistId, subscriptionId: subscriptionId ?? null, customerId: customerId ?? null });

            // Resolve tier from the subscription's price ID (authoritative)
            let priceId: string | null = null;
            if (subscriptionId && typeof subscriptionId === 'string') {
              try {
                const subResp = await stripeFetch(`/v1/subscriptions/${subscriptionId}`, { method: 'GET' });
                const sub = await subResp.json() as any;
                priceId = sub?.items?.data?.[0]?.price?.id || null;
              } catch (e) {
                console.warn('[webhook] Unable to fetch subscription price ID:', getErrorMessage(e));
              }
            }
            const tier = resolveTierFromPriceId(priceId, env, session?.metadata?.tier);
            console.log('[webhook] Tier resolved', { priceId, metadataTier: session?.metadata?.tier, resolvedTier: tier });

            if (artistId && subscriptionId && typeof subscriptionId === 'string') {
              console.log('[webhook] Upserting artist subscription', { artistId, tier, subscriptionId });
              const result = await upsertArtist({
                id: artistId,
                stripeCustomerId: typeof customerId === 'string' ? customerId : null,
                stripeSubscriptionId: subscriptionId,
                subscriptionTier: tier,
                subscriptionStatus: 'active',
                platformFeeBps: TIER_PLATFORM_FEE_BPS[tier] ?? null,
              });
              if (result.status >= 400) {
                const errBody = await result.clone().text().catch(() => 'unknown');
                console.error('[webhook] checkout.session.completed upsert FAILED', { status: result.status, body: errBody });
                return json({ error: 'DB update failed' }, { status: 500 });
              }

              // ── Founding Artist redemption finalization ──
              const isFoundingSub = session?.metadata?.foundingArtist === 'true';
              if (isFoundingSub && supabaseAdmin) {
                const nowIso = new Date().toISOString();
                const discountEnds = new Date(Date.now() + 365.25 * 24 * 60 * 60 * 1000).toISOString(); // +12 months
                const couponId = env.STRIPE_FOUNDING_ARTIST_COUPON_ID || 'founding_artist_50';
                const { error: fErr } = await supabaseAdmin
                  .from('artists')
                  .update({
                    founding_offer_redeemed_at: nowIso,
                    founding_discount_ends_at: discountEnds,
                    founding_coupon_id: couponId,
                    is_founding_artist: true,
                    had_paid_subscription: true,
                    updated_at: nowIso,
                  })
                  .eq('id', artistId);
                if (fErr) {
                  console.error('[webhook] Founding artist update failed:', fErr.message);
                } else {
                  console.log('✅ Founding Artist redeemed', { artistId, discountEnds });
                }
              } else if (tier !== 'free' && supabaseAdmin) {
                // Mark had_paid_subscription for non-founding paid subscriptions
                await supabaseAdmin
                  .from('artists')
                  .update({ had_paid_subscription: true, updated_at: new Date().toISOString() })
                  .eq('id', artistId);
              }

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
                // Retrieve the PaymentIntent + latest charge for source_transaction
                const piId = session.payment_intent;
                let chargeId: string | null = null;
                if (piId) {
                  try {
                    const piResp = await stripeFetch(`/v1/payment_intents/${piId}?expand[]=latest_charge`, { method: 'GET' });
                    const pi = await piResp.json() as any;
                    chargeId = typeof pi.latest_charge === 'string'
                      ? pi.latest_charge
                      : pi.latest_charge?.id || null;
                  } catch (e) {
                    console.warn('Unable to retrieve PaymentIntent charge', e);
                  }
                }

                // Create transfers to artist and venue Connect accounts
                const transfers: Array<{ recipient: string; id: string }> = [];
                let payoutStatus = 'pending_connect';
                let payoutError: string | null = null;

                const artistPayoutCents = order.artist_amount_cents || 0;
                const venuePayoutCents = order.venue_amount_cents || order.venue_commission_cents || 0;
                const orderCurrency = (order.currency || 'usd').toLowerCase();

                if (artistPayoutCents > 0 && chargeId) {
                  const { data: artist } = await supabaseAdmin
                    .from('artists')
                    .select('stripe_account_id,stripe_payouts_enabled')
                    .eq('id', order.artist_id)
                    .maybeSingle();
                  // SECURITY: Only transfer to verified accounts with payouts enabled
                  if (artist?.stripe_account_id && artist?.stripe_payouts_enabled) {
                    try {
                      const tResp = await stripeFetch('/v1/transfers', {
                        method: 'POST',
                        body: toForm({
                          amount: String(artistPayoutCents),
                          currency: orderCurrency,
                          destination: artist.stripe_account_id,
                          source_transaction: chargeId,
                          transfer_group: orderId,
                          'metadata[orderId]': orderId,
                          'metadata[artworkId]': artworkId || '',
                          'metadata[recipient]': 'artist',
                          'metadata[recipientId]': order.artist_id,
                        }),
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                      });
                      const t = await tResp.json() as any;
                      if (tResp.ok) {
                        transfers.push({ recipient: 'artist', id: t.id });
                      } else {
                        console.error('Artist transfer failed', t?.error?.message);
                        payoutError = `Artist transfer failed: ${t?.error?.message || 'unknown'}`;
                      }
                    } catch (e: unknown) {
                      payoutError = `Artist transfer error: ${getErrorMessage(e)}`;
                    }
                  } else if (!artist?.stripe_account_id) {
                    payoutError = 'Artist stripe_account_id missing';
                  } else if (!artist?.stripe_payouts_enabled) {
                    const msg = 'Artist payouts disabled or onboarding incomplete';
                    payoutError = msg;
                    payoutStatus = 'blocked_pending_onboarding';
                  }
                }

                if (venuePayoutCents > 0 && order.venue_id && chargeId) {
                  const { data: venue } = await supabaseAdmin
                    .from('venues')
                    .select('stripe_account_id,stripe_payouts_enabled')
                    .eq('id', order.venue_id)
                    .maybeSingle();
                  if (venue?.stripe_account_id && venue?.stripe_payouts_enabled) {
                    try {
                      const tResp = await stripeFetch('/v1/transfers', {
                        method: 'POST',
                        body: toForm({
                          amount: String(venuePayoutCents),
                          currency: orderCurrency,
                          destination: venue.stripe_account_id,
                          source_transaction: chargeId,
                          transfer_group: orderId,
                          'metadata[orderId]': orderId,
                          'metadata[artworkId]': artworkId || '',
                          'metadata[recipient]': 'venue',
                          'metadata[recipientId]': order.venue_id,
                        }),
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                      });
                      const t = await tResp.json() as any;
                      if (tResp.ok) {
                        transfers.push({ recipient: 'venue', id: t.id });
                      } else {
                        console.error('Venue transfer failed', t?.error?.message);
                        payoutError = payoutError
                          ? `${payoutError}; Venue transfer failed: ${t?.error?.message || 'unknown'}`
                          : `Venue transfer failed: ${t?.error?.message || 'unknown'}`;
                      }
                    } catch (e: unknown) {
                      const msg = `Venue transfer error: ${getErrorMessage(e)}`;
                      payoutError = payoutError ? `${payoutError}; ${msg}` : msg;
                    }
                  } else if (!venue?.stripe_account_id || !venue?.stripe_payouts_enabled) {
                    const msg = 'Venue payouts disabled or onboarding incomplete';
                    payoutError = payoutError ? `${payoutError}; ${msg}` : msg;
                    payoutStatus = 'blocked_pending_onboarding';
                  }
                }

                if (!payoutError) payoutStatus = 'paid';

                // Update order with payment + transfer data
                await supabaseAdmin
                  .from('orders')
                  .update({
                    status: 'paid',
                    stripe_payment_intent_id: piId || null,
                    stripe_charge_id: chargeId || null,
                    transfer_ids: transfers.length > 0 ? transfers : null,
                    payout_status: payoutStatus,
                    payout_error: payoutError,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', orderId);

                if (artworkId) {
                  await supabaseAdmin
                    .from('artworks')
                    .update({ status: 'sold', updated_at: new Date().toISOString() })
                    .eq('id', artworkId);
                }
                console.log('✅ Marketplace order paid + transfers created', { orderId, transfers, payoutStatus });
              }
            }
          }
        }

        if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
          const sub = event.data?.object;
          const artistId = sub?.metadata?.artistId;
          console.log(`[webhook] ${event.type}`, { artistId: artistId ?? null, subId: sub?.id ?? null });

          // Resolve tier from the subscription's current price ID (authoritative)
          // This correctly handles plan changes made through the Stripe Customer Portal.
          const priceId = sub?.items?.data?.[0]?.price?.id || null;
          const tier = event.type === 'customer.subscription.deleted'
            ? 'free'
            : resolveTierFromPriceId(priceId, env, sub?.metadata?.tier);
          const status = event.type === 'customer.subscription.deleted'
            ? 'canceled'
            : (sub?.status === 'active' ? 'active' : (sub?.status || 'inactive'));
          console.log(`[webhook] ${event.type} resolved`, { artistId, tier, status, priceId });

          if (artistId) {
            const result = await upsertArtist({
              id: artistId,
              stripeSubscriptionId: sub?.id || null,
              subscriptionTier: tier,
              subscriptionStatus: status,
              platformFeeBps: TIER_PLATFORM_FEE_BPS[tier] ?? null,
            });
            if (result.status >= 400) {
              const errBody = await result.clone().text().catch(() => 'unknown');
              console.error(`[webhook] ${event.type} upsert FAILED`, { status: result.status, body: errBody });
              return json({ error: 'DB update failed' }, { status: 500 });
            }
            console.log('✅ Artist subscription updated', { artistId, tier, status });
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

        // ── Record for idempotency ──
        // If this insert fails, return 500 so Stripe retries (we may have
        // processed the event above but can't guarantee dedup on the next attempt).
        if (supabaseAdmin) {
          const { error: idempError } = await supabaseAdmin.from('stripe_webhook_events').insert({
            stripe_event_id: event.id,
            type: event.type,
            note: 'processed by worker',
            processed_at: new Date().toISOString(),
          });
          if (idempError) {
            // Unique-violation (23505) means a concurrent handler already recorded it — that's fine.
            if (idempError.code !== '23505') {
              console.error('[webhook] Failed to record idempotency:', idempError.message);
              return json({ error: 'Idempotency record failed' }, { status: 500 });
            }
          }
        }

        return json({ received: true });
      } catch (err: unknown) {
        console.error('[webhook] Unhandled error:', getErrorMessage(err));
        // Return 500 for unexpected errors so Stripe retries.
        // 400 is reserved for signature verification failures.
        const msg = getErrorMessage(err);
        const isSignatureError = msg.includes('signature') || msg.includes('Webhook');
        return json({ error: msg }, { status: isSignatureError ? 400 : 500 });
      }
    }

    // ── Stripe Connect: Artist ──

    // Create Connect Express account for artist
    if (url.pathname === '/api/stripe/connect/artist/create-account' && method === 'POST') {
      const user = await getSupabaseUserFromRequest(request);
      const authErr = requireAuthOrFail(request, user);
      if (authErr) return authErr;
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      // Venues are explicitly excluded; all other roles (artist, undefined, null) are treated as artist
      if (user!.user_metadata?.role === 'venue') return json({ error: 'Artist role required (venue accounts cannot use this endpoint)' }, { status: 403 });
      const rlCreate = await applyRateLimit('stripe-connect-artist-create', request);
      if (rlCreate) return rlCreate;

      // Check if already has account
      const { data: artist } = await supabaseAdmin.from('artists').select('stripe_account_id,email,name').eq('id', user!.id).maybeSingle();
      if (artist?.stripe_account_id) return json({ accountId: artist.stripe_account_id, alreadyExists: true });

      try {
        const resp = await stripeFetch('/v1/accounts', {
          method: 'POST',
          body: toForm({
            type: 'express',
            email: artist?.email || user!.email || undefined,
            'capabilities[card_payments][requested]': 'true',
            'capabilities[transfers][requested]': 'true',
            'metadata[artistId]': user!.id,
          }),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const account = await resp.json();
        if (!resp.ok) throw new Error(account?.error?.message || 'Account creation failed');

        await upsertArtist({ id: user!.id, email: artist?.email, name: artist?.name, role: 'artist', stripeAccountId: account.id });
        return json({ accountId: account.id, alreadyExists: false });
      } catch (err: unknown) {
        return json({ error: getErrorMessage(err) }, { status: 500 });
      }
    }

    // Create account link for artist onboarding
    if (url.pathname === '/api/stripe/connect/artist/account-link' && method === 'POST') {
      const user = await getSupabaseUserFromRequest(request);
      const authErr = requireAuthOrFail(request, user);
      if (authErr) return authErr;
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      if (user!.user_metadata?.role === 'venue') return json({ error: 'Artist role required (venue accounts cannot use this endpoint)' }, { status: 403 });
      const rlLink = await applyRateLimit('stripe-connect-artist-link', request);
      if (rlLink) return rlLink;

      const { data: artist } = await supabaseAdmin.from('artists').select('stripe_account_id').eq('id', user!.id).maybeSingle();
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
      } catch (err: unknown) {
        return json({ error: getErrorMessage(err) }, { status: 500 });
      }
    }

    // Login link for artist Connect dashboard
    if (url.pathname === '/api/stripe/connect/artist/login-link' && method === 'POST') {
      const user = await getSupabaseUserFromRequest(request);
      const authErr = requireAuthOrFail(request, user);
      if (authErr) return authErr;
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const rlLogin = await applyRateLimit('stripe-connect-artist-login', request);
      if (rlLogin) return rlLogin;

      const { data: artist } = await supabaseAdmin.from('artists').select('stripe_account_id').eq('id', user!.id).maybeSingle();
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
      } catch (err: unknown) {
        return json({ error: getErrorMessage(err) }, { status: 500 });
      }
    }

    // Artist Connect status
    if (url.pathname === '/api/stripe/connect/artist/status' && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Server misconfiguration: Supabase admin client not initialised', code: 'SUPABASE_ADMIN_MISCONFIG' }, { status: 500 });
      if (!env.STRIPE_SECRET_KEY) return json({ error: 'Server misconfiguration: STRIPE_SECRET_KEY not set', code: 'STRIPE_KEY_MISSING' }, { status: 500 });
      const artistId = url.searchParams.get('artistId') || url.searchParams.get('userId');
      if (!artistId) return json({ error: 'Missing artistId or userId' }, { status: 400 });

      const { data: artist } = await supabaseAdmin.from('artists').select('stripe_account_id').eq('id', artistId).maybeSingle();
      if (!artist?.stripe_account_id) return json({ hasAccount: false, onboardingStatus: 'not_started' });

      try {
        const resp = await stripeFetch(`/v1/accounts/${artist.stripe_account_id}`, { method: 'GET' });
        const account = await resp.json() as any;
        if (!resp.ok) throw new Error(account?.error?.message || 'Status fetch failed');

        const onboardingStatus = account.payouts_enabled && account.charges_enabled
          ? 'complete'
          : account.requirements?.currently_due?.length > 0
            ? 'restricted'
            : account.details_submitted
              ? 'pending'
              : 'not_started';

        return json({
          hasAccount: true,
          accountId: artist.stripe_account_id,
          onboardingStatus,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
          requirements: account.requirements,
        });
      } catch (err: unknown) {
        return json({ error: getErrorMessage(err) }, { status: 500 });
      }
    }

    // ── Stripe Connect: Venue ──

    // Combined onboard endpoint: create account if needed + create account link
    // This is what VenuePayoutsCard calls (single round-trip).
    if (url.pathname === '/api/stripe/connect/venue/onboard' && method === 'POST') {
      const user = await getSupabaseUserFromRequest(request);
      const authErr = requireAuthOrFail(request, user);
      if (authErr) return authErr;
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      if (user!.user_metadata?.role !== 'venue') return json({ error: 'Venue role required' }, { status: 403 });
      const rlOnboard = await applyRateLimit('stripe-connect-venue-onboard', request);
      if (rlOnboard) return rlOnboard;

      const { data: venue } = await supabaseAdmin.from('venues').select('stripe_account_id,email,name,default_venue_fee_bps').eq('id', user!.id).maybeSingle();
      let accountId = venue?.stripe_account_id;

      // Step 1: Create Stripe Express account if one doesn't exist
      if (!accountId) {
        try {
          const resp = await stripeFetch('/v1/accounts', {
            method: 'POST',
            body: toForm({
              type: 'express',
              email: venue?.email || user!.email || undefined,
              'capabilities[card_payments][requested]': 'true',
              'capabilities[transfers][requested]': 'true',
              'metadata[venueId]': user!.id,
              'metadata[role]': 'venue',
            }),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          });
          const account = await resp.json() as any;
          if (!resp.ok) throw new Error(account?.error?.message || 'Account creation failed');
          accountId = account.id;
          await upsertVenue({ id: user!.id, stripeAccountId: accountId });
          console.log('[venue-onboard] Created Stripe account', { venueId: user!.id, accountId });
        } catch (err: unknown) {
          return json({ error: getErrorMessage(err) }, { status: 500 });
        }
      }

      // Step 2: Create account link for onboarding
      const pagesOrigin = env.PAGES_ORIGIN || 'https://artwalls.space';
      try {
        const resp = await stripeFetch('/v1/account_links', {
          method: 'POST',
          body: toForm({
            account: accountId,
            refresh_url: `${pagesOrigin}/#/venue-dashboard?stripe=refresh`,
            return_url: `${pagesOrigin}/#/venue-dashboard?stripe=return`,
            type: 'account_onboarding',
          }),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const link = await resp.json() as any;
        if (!resp.ok) throw new Error(link?.error?.message || 'Account link failed');
        console.log('[venue-onboard] Created account link', { venueId: user!.id, accountId });
        return json({ url: link.url });
      } catch (err: unknown) {
        return json({ error: getErrorMessage(err) }, { status: 500 });
      }
    }

    // Login alias — VenuePayoutsCard calls /login, worker has /login-link
    if (url.pathname === '/api/stripe/connect/venue/login' && method === 'POST') {
      const user = await getSupabaseUserFromRequest(request);
      const authErr = requireAuthOrFail(request, user);
      if (authErr) return authErr;
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const rlVLogin2 = await applyRateLimit('stripe-connect-venue-login', request);
      if (rlVLogin2) return rlVLogin2;

      const { data: venue } = await supabaseAdmin.from('venues').select('stripe_account_id').eq('id', user!.id).maybeSingle();
      if (!venue?.stripe_account_id) return json({ error: 'No Stripe account yet' }, { status: 400 });

      try {
        const resp = await stripeFetch(`/v1/accounts/${venue.stripe_account_id}/login_links`, {
          method: 'POST',
          body: '',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const link = await resp.json() as any;
        if (!resp.ok) throw new Error(link?.error?.message || 'Login link failed');
        return json({ url: link.url });
      } catch (err: unknown) {
        return json({ error: getErrorMessage(err) }, { status: 500 });
      }
    }

    // Create Connect Express account for venue
    if (url.pathname === '/api/stripe/connect/venue/create-account' && method === 'POST') {
      const user = await getSupabaseUserFromRequest(request);
      const authErr = requireAuthOrFail(request, user);
      if (authErr) return authErr;
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      if (user!.user_metadata?.role !== 'venue') return json({ error: 'Venue role required' }, { status: 403 });
      const rlVCreate = await applyRateLimit('stripe-connect-venue-create', request);
      if (rlVCreate) return rlVCreate;

      const { data: venue } = await supabaseAdmin.from('venues').select('stripe_account_id,email,name,default_venue_fee_bps').eq('id', user!.id).maybeSingle();
      if (venue?.stripe_account_id) return json({ accountId: venue.stripe_account_id, alreadyExists: true });

      try {
        const resp = await stripeFetch('/v1/accounts', {
          method: 'POST',
          body: toForm({
            type: 'express',
            email: venue?.email || user!.email || undefined,
            'capabilities[card_payments][requested]': 'true',
            'capabilities[transfers][requested]': 'true',
            'metadata[venueId]': user!.id,
          }),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const account = await resp.json();
        if (!resp.ok) throw new Error(account?.error?.message || 'Account creation failed');

        await upsertVenue({ id: user!.id, email: venue?.email, name: venue?.name, stripeAccountId: account.id, defaultVenueFeeBps: venue?.default_venue_fee_bps ?? 1000 });
        return json({ accountId: account.id, alreadyExists: false });
      } catch (err: unknown) {
        return json({ error: getErrorMessage(err) }, { status: 500 });
      }
    }

    // Create account link for venue onboarding
    if (url.pathname === '/api/stripe/connect/venue/account-link' && method === 'POST') {
      const user = await getSupabaseUserFromRequest(request);
      const authErr = requireAuthOrFail(request, user);
      if (authErr) return authErr;
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      if (user!.user_metadata?.role !== 'venue') return json({ error: 'Venue role required' }, { status: 403 });
      const rlVLink = await applyRateLimit('stripe-connect-venue-link', request);
      if (rlVLink) return rlVLink;

      const { data: venue } = await supabaseAdmin.from('venues').select('stripe_account_id').eq('id', user!.id).maybeSingle();
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
      } catch (err: unknown) {
        return json({ error: getErrorMessage(err) }, { status: 500 });
      }
    }

    // Login link for venue Connect dashboard
    if (url.pathname === '/api/stripe/connect/venue/login-link' && method === 'POST') {
      const user = await getSupabaseUserFromRequest(request);
      const authErr = requireAuthOrFail(request, user);
      if (authErr) return authErr;
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const rlVLogin = await applyRateLimit('stripe-connect-venue-login', request);
      if (rlVLogin) return rlVLogin;

      const { data: venue } = await supabaseAdmin.from('venues').select('stripe_account_id').eq('id', user!.id).maybeSingle();
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
      } catch (err: unknown) {
        return json({ error: getErrorMessage(err) }, { status: 500 });
      }
    }

    // Venue Connect status
    if (url.pathname === '/api/stripe/connect/venue/status' && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Server misconfiguration: Supabase admin client not initialised', code: 'SUPABASE_ADMIN_MISCONFIG' }, { status: 500 });
      if (!env.STRIPE_SECRET_KEY) return json({ error: 'Server misconfiguration: STRIPE_SECRET_KEY not set', code: 'STRIPE_KEY_MISSING' }, { status: 500 });
      const venueId = url.searchParams.get('venueId') || url.searchParams.get('userId');
      if (!venueId) return json({ error: 'Missing venueId or userId' }, { status: 400 });

      const { data: venue } = await supabaseAdmin.from('venues').select('stripe_account_id').eq('id', venueId).maybeSingle();
      if (!venue?.stripe_account_id) return json({ hasAccount: false, onboardingStatus: 'not_started' });

      try {
        const resp = await stripeFetch(`/v1/accounts/${venue.stripe_account_id}`, { method: 'GET' });
        const account = await resp.json() as any;
        if (!resp.ok) throw new Error(account?.error?.message || 'Status fetch failed');

        // Derive onboardingStatus for the frontend badge
        const onboardingStatus = account.payouts_enabled && account.charges_enabled
          ? 'complete'
          : account.requirements?.currently_due?.length > 0
            ? 'restricted'
            : account.details_submitted
              ? 'pending'
              : 'not_started';

        return json({
          hasAccount: true,
          accountId: venue.stripe_account_id,
          onboardingStatus,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
          requirements: account.requirements,
        });
      } catch (err: unknown) {
        return json({ error: getErrorMessage(err) }, { status: 500 });
      }
    }

    // ── Stripe Marketplace Checkout ──

    // Create marketplace checkout session for artwork purchase
    if (url.pathname === '/api/stripe/create-checkout-session' && method === 'POST') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });

      // Enforce body size before parsing
      const bodySizeErr = await enforceBodySize(request, 32_768);
      if (bodySizeErr) return json({ error: bodySizeErr.error }, { status: bodySizeErr.status });

      const body = await request.json().catch(() => ({}));
      const artworkId = body?.artworkId;
      if (!artworkId || !isUUID(artworkId)) return json({ error: 'Invalid artworkId' }, { status: 400 });

      // Per-route rate limit with artworkId dimension
      const rlCheckout = await applyRateLimit('stripe-checkout', request, artworkId);
      if (rlCheckout) return rlCheckout;

      // Look up artwork
      const { data: artwork, error: artErr } = await supabaseAdmin
        .from('artworks')
        .select('id,title,price,currency,status,artist_id,venue_id,image_url')
        .eq('id', artworkId)
        .maybeSingle();
      if (artErr || !artwork) return json({ error: 'Artwork not found' }, { status: 404 });
      if (artwork.status === 'sold') return json({ error: 'Artwork is no longer available' }, { status: 410 });

      const listPriceDollars = Number(artwork.price);
      if (!Number.isFinite(listPriceDollars) || listPriceDollars <= 0) {
        return json({ error: 'Artwork has no valid price' }, { status: 400 });
      }

      // Look up artist tier for economics
      const { data: artist } = await supabaseAdmin
        .from('artists')
        .select('id,subscription_tier,stripe_account_id')
        .eq('id', artwork.artist_id)
        .maybeSingle();

      const artistTier = normalizeArtistTier(artist?.subscription_tier || 'free', 'free');
      const breakdown = calculatePricingBreakdown(listPriceDollars, artistTier);

      // Generate order ID
      const orderId = crypto.randomUUID();
      const nowIso = new Date().toISOString();

      // Insert order with economics snapshot
      const { error: orderErr } = await supabaseAdmin
        .from('orders')
        .insert({
          id: orderId,
          artwork_id: artworkId,
          artist_id: artwork.artist_id,
          venue_id: artwork.venue_id || null,
          status: 'pending',
          currency: (artwork.currency || 'usd').toLowerCase(),
          list_price_cents: breakdown.listPriceCents,
          buyer_fee_cents: breakdown.buyerFeeCents,
          buyer_total_cents: breakdown.customerPaysCents,
          venue_amount_cents: breakdown.venueCents,
          venue_commission_cents: breakdown.venueCents,
          artist_amount_cents: breakdown.artistCents,
          platform_gross_before_stripe_cents: breakdown.platformRemainderCents,
          artist_plan_id_at_purchase: artistTier,
          created_at: nowIso,
          updated_at: nowIso,
        });

      if (orderErr) {
        console.error('Order insert failed', orderErr.message);
        return json({ error: 'Failed to create order' }, { status: 500 });
      }

      // Create Stripe Checkout Session
      const formData: Record<string, any> = {
        mode: 'payment',
        success_url: `${artworkPurchaseUrl(artworkId)}?status=success`,
        cancel_url: `${artworkPurchaseUrl(artworkId)}?status=cancel`,
        'line_items[0][price_data][currency]': (artwork.currency || 'usd').toLowerCase(),
        'line_items[0][price_data][unit_amount]': String(breakdown.customerPaysCents),
        'line_items[0][price_data][product_data][name]': clampStr(artwork.title || 'Artwork', 200),
        'line_items[0][quantity]': '1',
        'metadata[orderId]': orderId,
        'metadata[artworkId]': artworkId,
        'payment_intent_data[transfer_group]': orderId,
      };

      // If artist has a connected account, we'll add them in metadata for the webhook
      if (artist?.stripe_account_id) {
        formData['metadata[artistStripeAccountId]'] = artist.stripe_account_id;
      }

      // Add image if available
      if (artwork.image_url && isValidUrl(artwork.image_url)) {
        formData['line_items[0][price_data][product_data][images][0]'] = artwork.image_url;
      }

      try {
        // Deterministic idempotency key prevents duplicate sessions on retries
        const identity = userIdFromJwt(request) || getClientIp(request);
        const idempotencyKey = await stripeIdempotencyKey(artworkId, identity);
        const sessResp = await stripeFetch('/v1/checkout/sessions', {
          method: 'POST',
          body: toForm(formData),
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Idempotency-Key': idempotencyKey,
          },
        });
        const sess = await sessResp.json() as any;
        if (!sessResp.ok) {
          console.error('Stripe session creation failed', sess?.error?.message);
          // Clean up the pending order
          await supabaseAdmin.from('orders').delete().eq('id', orderId);
          return json({ error: sess?.error?.message || 'Checkout session failed' }, { status: 500 });
        }

        // Update order with Stripe session ID
        await supabaseAdmin
          .from('orders')
          .update({ stripe_checkout_session_id: sess.id, updated_at: new Date().toISOString() })
          .eq('id', orderId);

        return json({ url: sess.url });
      } catch (err: unknown) {
        // Clean up the pending order
        await supabaseAdmin.from('orders').delete().eq('id', orderId);
        return json({ error: getErrorMessage(err) }, { status: 500 });
      }
    }

    // ── Stripe Billing ──

    // Create subscription checkout session
    if (url.pathname === '/api/stripe/billing/create-subscription-session' && method === 'POST') {
      console.log('[subscription] Session creation request received');
      const user = await getSupabaseUserFromRequest(request);
      if (!user) {
        console.warn('[subscription] Auth failed — no valid user from token');
        return json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (user.user_metadata?.role === 'venue') return json({ error: 'Only artists can subscribe' }, { status: 403 });
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const rlSub = await applyRateLimit('stripe-subscription', request);
      if (rlSub) return rlSub;

      const body = await request.json().catch(() => ({}));
      const tier = String(body?.tier || '').toLowerCase();
      console.log('[subscription] Resolved', { artistId: user.id, tierRequested: tier });
      if (!['starter', 'growth', 'pro'].includes(tier)) {
        console.warn('[subscription] Invalid tier rejected:', tier);
        return json({ error: 'Invalid tier' }, { status: 400 });
      }

      const priceMap: Record<string, string | undefined> = {
        starter: env.STRIPE_PRICE_ID_STARTER || env.STRIPE_SUB_PRICE_STARTER,
        growth: env.STRIPE_PRICE_ID_GROWTH || env.STRIPE_SUB_PRICE_GROWTH,
        pro: env.STRIPE_PRICE_ID_PRO || env.STRIPE_SUB_PRICE_PRO,
      };
      const priceId = priceMap[tier];
      if (!priceId) {
        console.error('[subscription] Missing env var — STRIPE_PRICE_ID_' + tier.toUpperCase() + ' / STRIPE_SUB_PRICE_' + tier.toUpperCase() + ' not set');
        return json({ error: `Price ID not configured for ${tier}. Check STRIPE_PRICE_ID_${tier.toUpperCase()} env var.` }, { status: 500 });
      }
      console.log('[subscription] Price resolved', { tier, priceId });

      // Ensure Stripe customer
      const { data: artist } = await supabaseAdmin.from('artists').select('stripe_customer_id,email,name,subscription_status,subscription_tier,founding_offer_redeemed_at,is_founding_artist,had_paid_subscription').eq('id', user.id).maybeSingle();

      // ── Block duplicate subscriptions ──
      // If the artist already has an active subscription, redirect to the
      // billing portal instead of creating a new checkout session.
      if (artist?.subscription_status === 'active' && artist?.subscription_tier && artist.subscription_tier !== 'free') {
        if (artist.stripe_customer_id) {
          const portalOrigin = env.PAGES_ORIGIN || 'https://artwalls.space';
          try {
            const portalResp = await stripeFetch('/v1/billing_portal/sessions', {
              method: 'POST',
              body: toForm({
                customer: artist.stripe_customer_id,
                return_url: `${portalOrigin}/#/artist-dashboard`,
              }),
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });
            const portal = await portalResp.json() as any;
            if (portalResp.ok && portal.url) {
              console.log('[subscription] Active sub exists — redirecting to portal', { artistId: user.id, currentTier: artist.subscription_tier });
              return json({ url: portal.url, redirectedToPortal: true });
            }
          } catch (e) {
            console.warn('[subscription] Portal redirect failed, falling through:', getErrorMessage(e));
          }
        }
        // If portal creation fails, return a clear error rather than creating a duplicate
        return json({ error: 'You already have an active subscription. Use Manage Subscription to change plans.' }, { status: 409 });
      }
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
        // ── Founding Artist coupon eligibility (server-side only) ──
        let applyFoundingCoupon = false;
        const foundingCouponId = env.STRIPE_FOUNDING_ARTIST_COUPON_ID;
        if (foundingCouponId && !artist?.is_founding_artist && !artist?.founding_offer_redeemed_at && !artist?.had_paid_subscription) {
          // Check global settings
          const { data: settingsRows } = await supabaseAdmin
            .from('app_settings')
            .select('key,value')
            .in('key', ['founding_artist_offer_enabled', 'founding_artist_offer_max_redemptions', 'founding_artist_offer_cutoff']);
          const settingsMap: Record<string, any> = {};
          for (const r of settingsRows || []) settingsMap[r.key] = r.value;

          const offerOn = settingsMap.founding_artist_offer_enabled === true || settingsMap.founding_artist_offer_enabled === 'true';
          const maxSlots = Number(env.FOUNDING_ARTIST_MAX_REDEMPTIONS || settingsMap.founding_artist_offer_max_redemptions || 50);
          const cutoffStr = String(env.FOUNDING_ARTIST_CUTOFF || settingsMap.founding_artist_offer_cutoff || '2026-12-31T23:59:59Z').replace(/^"|"$/g, '');

          if (offerOn && new Date() < new Date(cutoffStr)) {
            const { count } = await supabaseAdmin.from('artists').select('id', { count: 'exact', head: true }).eq('is_founding_artist', true);
            if ((count ?? 0) < maxSlots) {
              applyFoundingCoupon = true;
              console.log('[subscription] Founding Artist coupon eligible', { artistId: user.id });
            }
          }
        }

        const checkoutParams: Record<string, string> = {
          mode: 'subscription',
          success_url: `${pagesOrigin}/#/artist-dashboard?sub=success`,
          cancel_url: `${pagesOrigin}/#/artist-dashboard?sub=cancel`,
          customer: customerId as string,
          'line_items[0][price]': priceId,
          'line_items[0][quantity]': '1',
          'metadata[artistId]': user.id,
          'metadata[tier]': tier,
          'subscription_data[metadata][artistId]': user.id,
          'subscription_data[metadata][tier]': tier,
          // Prevent user-entered promo codes when founding coupon is applied
          allow_promotion_codes: applyFoundingCoupon ? 'false' : 'true',
        };

        if (applyFoundingCoupon) {
          checkoutParams['discounts[0][coupon]'] = foundingCouponId as string;
          checkoutParams['metadata[foundingArtist]'] = 'true';
          checkoutParams['subscription_data[metadata][foundingArtist]'] = 'true';
        }

        const sessResp = await stripeFetch('/v1/checkout/sessions', {
          method: 'POST',
          body: toForm(checkoutParams),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const sess = await sessResp.json();
        if (!sessResp.ok) throw new Error(sess?.error?.message || 'Checkout session failed');
        console.log('[subscription] ✅ Checkout session created', { sessionId: sess.id, artistId: user.id, tier });
        return json({ url: sess.url });
      } catch (err: unknown) {
        console.error('[subscription] Checkout session creation failed:', getErrorMessage(err));
        return json({ error: getErrorMessage(err) }, { status: 500 });
      }
    }

    // Create billing portal session
    if (url.pathname === '/api/stripe/billing/create-portal-session' && method === 'POST') {
      const user = await getSupabaseUserFromRequest(request);
      if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const rlPortal = await applyRateLimit('stripe-portal', request);
      if (rlPortal) return rlPortal;

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
      } catch (err: unknown) {
        return json({ error: getErrorMessage(err) }, { status: 500 });
      }
    }

    // ══════════════════════════════════════════════════════════════════
    // Public routes (artwork browsing, artist profiles, sets)
    // ══════════════════════════════════════════════════════════════════
    //
    // NOTE: The following public route handlers (through the end of the
    // venue POST upsert) are the CANONICAL copies.

    // Public: single artist with public artworks, display locations, and sets (lookup by slug or id)
    if (url.pathname.startsWith('/api/public/artists/') && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const parts = url.pathname.split('/');
      const slugOrId = parts[4];
      if (!slugOrId) return json({ error: 'Missing artist id or slug' }, { status: 400 });

      const uid = url.searchParams.get('uid');
      const identifier = decodeURIComponent(slugOrId);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
      
      // Use select('*') so the query works regardless of which optional columns
      // (slug, is_public, art_types) exist in the artists table.
      let artistRow: any = null;
      let artistError: any = null;

      if (isUuid) {
        const res = await supabaseAdmin.from('artists').select('*').eq('id', identifier).maybeSingle();
        artistRow = res.data;
        artistError = res.error;
      } else {
        // Try slug first
        const slugRes = await supabaseAdmin.from('artists').select('*').eq('slug', identifier).maybeSingle();
        if (slugRes.data) {
          artistRow = slugRes.data;
        } else {
          // slug column may not exist — try matching by name as fallback
          const nameRes = await supabaseAdmin.from('artists').select('*').ilike('name', identifier).maybeSingle();
          artistRow = nameRes.data;
          artistError = nameRes.error;
        }
      }

      // If not found by slug/id, and a UID is provided, try finding by UID.
      // artists.id IS the auth user id in this schema.
      if (!artistRow && uid) {
        const { data: artistByUid, error: uidError } = await supabaseAdmin
          .from('artists')
          .select('*')
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
        artTypes: (artistRow as any).art_types || [],
        isFoundingArtist: !!(artistRow as any).is_founding_artist,
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
        .select('id,slug,name,bio,profile_photo_url,portfolio_url,website_url,instagram_handle,city_primary,city_secondary,art_types,is_public,is_founding_artist')
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
        instagramHandle: (data as any).instagram_handle || null,
        cityPrimary: (data as any).city_primary || null,
        citySecondary: (data as any).city_secondary || null,
        artTypes: (data as any).art_types || [],
        isFoundingArtist: !!(data as any).is_founding_artist,
      });
    }

    // Public: single venue profile by id
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

    // Wallspace update (venue-auth). Supports PATCH and POST with X-HTTP-Method-Override: PATCH
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

    // Public listings: artworks
    if (url.pathname === '/api/artworks' && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const artistId = url.searchParams.get('artistId');
      const requester = await getSupabaseUserFromRequest(request);
      // SECURITY: Never trust user_metadata.isAdmin — it's user-editable.
      // Only use the server-side isAdminUser() check for admin elevation.
      const isAdmin = requester ? await isAdminUser(requester) : false;
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
      const rlReact = await applyRateLimit('reactions', request);
      if (rlReact) return rlReact;

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

    // Artwork purchase link + QR (must be before the catch-all artwork GET)
    // ── SECURITY: requires auth + ownership (artist must own the artwork) ──
    if (url.pathname.startsWith('/api/artworks/') && method === 'GET' && url.pathname.endsWith('/link')) {
      const parts = url.pathname.split('/');
      const id = parts[3];
      if (!id) return json({ error: 'Missing artwork id' }, { status: 400 });

      // Require authentication
      const user = await getUser(request);
      if (!user) return json({ error: 'Auth required' }, { status: 401 });

      // Verify ownership: the artwork must belong to the calling user (or caller is admin)
      if (supabaseAdmin) {
        const { data: art } = await supabaseAdmin.from('artworks').select('artist_id').eq('id', id).maybeSingle();
        if (!art) return json({ error: 'Artwork not found' }, { status: 404 });
        const admin = await isAdminUser(user.id);
        if (art.artist_id !== user.id && !admin) {
          return json({ error: 'Forbidden' }, { status: 403 });
        }
      }

      const purchaseUrl = artworkPurchaseUrl(id);
      const qrSvg = await generateQrSvg(purchaseUrl, 300);
      if (supabaseAdmin) {
        await supabaseAdmin.from('artworks').update({ purchase_url: purchaseUrl, qr_svg: qrSvg, updated_at: new Date().toISOString() }).eq('id', id);
      }
      return json({ purchaseUrl, qrSvg });
    }

    // QR Code SVG endpoint — returns inline SVG for any artwork
    if (url.pathname.startsWith('/api/artworks/') && method === 'GET' && url.pathname.endsWith('/qrcode.svg')) {
      const parts = url.pathname.split('/');
      const id = parts[3];
      if (!id) return text('Missing artwork id', { status: 400 });
      if (supabaseAdmin) {
        const { data: art } = await supabaseAdmin.from('artworks').select('id').eq('id', id).maybeSingle();
        if (!art) return text('Artwork not found', { status: 404 });
      }
      const widthParam = url.searchParams.get('w');
      const width = widthParam && Number(widthParam) > 0 ? Number(widthParam) : 300;
      const purchaseUrl = artworkPurchaseUrl(id);
      const svgString = await generateQrSvg(purchaseUrl, width);
      const headers = new Headers();
      headers.set('Content-Type', 'image/svg+xml');
      headers.set('Cache-Control', 'public, max-age=3600');
      headers.set('Access-Control-Allow-Origin', allowOrigin);
      headers.set('Vary', 'Origin');
      return new Response(svgString, { status: 200, headers });
    }

    // QR Code PNG endpoint — returns downloadable PNG for any artwork
    if (url.pathname.startsWith('/api/artworks/') && method === 'GET' && url.pathname.endsWith('/qrcode.png')) {
      const parts = url.pathname.split('/');
      const id = parts[3];
      if (!id) return text('Missing artwork id', { status: 400 });
      if (supabaseAdmin) {
        const { data: art } = await supabaseAdmin.from('artworks').select('id').eq('id', id).maybeSingle();
        if (!art) return text('Artwork not found', { status: 404 });
      }
      const widthParam = url.searchParams.get('w');
      const width = widthParam && Number(widthParam) > 0 ? Number(widthParam) : 1024;
      const marginParam = url.searchParams.get('margin');
      const margin = marginParam && Number(marginParam) >= 0 ? Number(marginParam) : 1;
      const purchaseUrl = artworkPurchaseUrl(id);
      try {
        const buf = await QRCode.toBuffer(purchaseUrl, { type: 'png', margin, width } as any);
        const headers = new Headers();
        headers.set('Content-Type', 'image/png');
        headers.set('Content-Disposition', `attachment; filename="artwork-${id}-qr.png"`);
        headers.set('Cache-Control', 'public, max-age=3600');
        headers.set('Access-Control-Allow-Origin', allowOrigin);
        headers.set('Vary', 'Origin');
        return new Response(buf, { status: 200, headers });
      } catch (e) {
        // Fallback: return SVG if PNG generation fails (e.g. missing canvas in Workers)
        const svgString = await generateQrSvg(purchaseUrl, width);
        const headers = new Headers();
        headers.set('Content-Type', 'image/svg+xml');
        headers.set('Access-Control-Allow-Origin', allowOrigin);
        headers.set('Vary', 'Origin');
        return new Response(svgString, { status: 200, headers });
      }
    }

    // QR poster endpoint — returns printable HTML poster
    if (url.pathname.startsWith('/api/artworks/') && method === 'GET' && url.pathname.endsWith('/qr-poster')) {
      const parts = url.pathname.split('/');
      const id = parts[3];
      if (!id) return text('Missing artwork id', { status: 400 });
      let art: any = null;
      if (supabaseAdmin) {
        const { data } = await supabaseAdmin.from('artworks').select('id,title,artist_name,venue_name,price_cents,currency,image_url').eq('id', id).maybeSingle();
        if (!data) return text('Artwork not found', { status: 404 });
        art = data;
      }
      const purchaseUrl = artworkPurchaseUrl(id);
      const qrSvg = await generateQrSvg(purchaseUrl, 400);
      const title = art?.title || 'Artwork';
      const artist = art?.artist_name || '';
      const venue = art?.venue_name || '';
      const price = art?.price_cents ? `$${(art.price_cents / 100).toFixed(2)}` : '';
      const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>QR Poster — ${title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: system-ui, sans-serif; text-align: center; padding: 2rem; max-width: 600px; margin: 0 auto; }
    h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    .meta { color: #666; font-size: 0.9rem; margin-bottom: 1rem; }
    .qr { margin: 1.5rem auto; }
    .price { font-size: 1.25rem; font-weight: bold; margin-top: 1rem; }
    .url { font-size: 0.75rem; color: #999; word-break: break-all; margin-top: 0.5rem; }
    @media print { body { padding: 1rem; } }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">${[artist, venue].filter(Boolean).join(' · ')}</div>
  <div class="qr">${qrSvg}</div>
  ${price ? `<div class="price">${price}</div>` : ''}
  <div class="url">Scan to view &amp; purchase</div>
</body>
</html>`;
      const posterHeaders = new Headers();
      posterHeaders.set('Content-Type', 'text/html; charset=utf-8');
      posterHeaders.set('Access-Control-Allow-Origin', allowOrigin);
      posterHeaders.set('Vary', 'Origin');
      return new Response(html, { status: 200, headers: posterHeaders });
    }

    // Public: single artwork (catch-all — must come AFTER specific /link, /qrcode.svg, /qrcode.png, /qr-poster endpoints)
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
        // SECURITY: Never trust user_metadata.isAdmin — it's user-editable.
        const isAdmin = requester ? await isAdminUser(requester) : false;
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

      // ── Backfill: generate purchase_url + qr_svg for legacy rows ──
      if (supabaseAdmin && data && !(data as any).purchase_url) {
        const backfillUrl = artworkPurchaseUrl(data.id);
        const backfillSvg = await generateQrSvg(backfillUrl, 300);
        // Non-blocking persist — don't fail the read if the write fails
        ctx.waitUntil(
          supabaseAdmin.from('artworks').update({ purchase_url: backfillUrl, qr_svg: backfillSvg }).eq('id', data.id)
        );
        (data as any).purchase_url = backfillUrl;
        (data as any).qr_svg = backfillSvg;
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

    // Create artwork (artist)
    if (url.pathname === '/api/artworks' && method === 'POST') {
      const user = await getSupabaseUserFromRequest(request);
      if (!user) return json({ error: 'Missing or invalid Authorization bearer token' }, { status: 401 });
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const role = (user.user_metadata?.role as string) || 'artist';
      if (role !== 'artist') return json({ error: 'Only artists can create artworks' }, { status: 403 });
      const rlArtCreate = await applyRateLimit('artwork-create', request);
      if (rlArtCreate) return rlArtCreate;
      const payload = await request.json().catch(() => ({}));
      const priceNumber = Number(payload?.price);
      const price_cents = Number.isFinite(priceNumber) ? Math.round(priceNumber * 100) : 0;
      if (price_cents < 0 || price_cents > 100_000_00) return json({ error: 'Price out of range' }, { status: 400 });
      const imageUrlsRaw = Array.isArray(payload?.imageUrls) ? payload.imageUrls.slice(0, 20) : [];
      const imageUrls = imageUrlsRaw.map((u: any) => String(u || '').trim()).filter(Boolean).filter((u: string) => isValidUrl(u));
      const primaryImageUrl = String(payload?.imageUrl || imageUrls[0] || '').trim() || null;
      if (primaryImageUrl && !isValidUrl(primaryImageUrl)) return json({ error: 'Invalid image URL' }, { status: 400 });
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
      } catch (err: unknown) {
        return json({ error: getErrorMessage(err) }, { status: 500 });
      }

      const insert = {
        id: artworkId,
        artist_id: user.id,
        artist_name: clampStr(payload?.name || user.user_metadata?.name, 200) || null,
        venue_id: null,
        venue_name: null,
        title: clampStr(payload?.title, 300),
        description: clampStr(payload?.description, 5000) || null,
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

      // Generate QR code + purchase URL for every new artwork
      const purchaseUrl = artworkPurchaseUrl(data.id);
      const qrSvg = await generateQrSvg(purchaseUrl, 300);
      await supabaseAdmin.from('artworks').update({ purchase_url: purchaseUrl, qr_svg: qrSvg }).eq('id', data.id);

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
        purchaseUrl,
        qrSvg,
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

      const rlEvents = await applyRateLimit('events', request);
      if (rlEvents) return rlEvents;

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
      const rlApprove = await applyRateLimit('artwork-approve', request);
      if (rlApprove) return rlApprove;
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
      const purchaseUrl = artworkPurchaseUrl(id);
      const { data: updated, error } = await supabaseAdmin
        .from('artworks')
        .update({ status: 'active', published_at: nowIso, archived_at: null, venue_id: user.id, venue_name: venueName, purchase_url: purchaseUrl, updated_at: nowIso })
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (error) return json({ error: error.message }, { status: 500 });
      if (!updated) return json({ error: 'Not found' }, { status: 404 });
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
        const rlArtist = await applyRateLimit('profile-upsert', request);
        if (rlArtist) return rlArtist;

        // SECURITY: Require authentication — no anonymous profile upserts
        const user = await getSupabaseUserFromRequest(request);
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
    // Upsert venue profile (used by app bootstrap)
    if (url.pathname === '/api/venues' && method === 'POST') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      // SECURITY: Require authentication — no anonymous venue upserts
      const user = await getSupabaseUserFromRequest(request);
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
      const user = await getSupabaseUserFromRequest(request);
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

    // GET /api/venues/:venueId/availability — compute available time slots for a week (public)
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

    // POST /api/venues/:venueId/bookings — create a booking (authenticated artist or venue)
    if (url.pathname.match(/^\/api\/venues\/[0-9a-f-]+\/bookings$/) && method === 'POST') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const user = await getSupabaseUserFromRequest(request);
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

    // ── Support System Routes ──────────────────────────────────────────────

    // POST /api/support/messages — public contact form submission
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

      // Honeypot check — silently succeed but don't store
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

    // ── Admin-only: sales & GMV ──
    if (url.pathname === '/api/admin/sales' && method === 'GET') {
      const guardResp = await requireAdmin(request);
      if (guardResp) return guardResp;

      try {
        const search = url.searchParams.get('search') || '';
        const statusParam = url.searchParams.get('status') || '';

        let query = supabaseAdmin
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

    // ── Admin-only: referrals list ──
    if (url.pathname === '/api/admin/referrals' && method === 'GET') {
      const guardResp = await requireAdmin(request);
      if (guardResp) return guardResp;

      try {
        const { data, error: refErr } = await supabaseAdmin
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

    // ── Admin-only: grant referral reward ──
    if (url.pathname === '/api/admin/referrals/grant' && method === 'POST') {
      const guardResp = await requireAdmin(request);
      if (guardResp) return guardResp;

      const payload = await request.json().catch(() => ({}));
      const referralId = payload?.referralId;
      if (!referralId) return json({ error: 'referralId required' }, { status: 400 });

      try {
        const { data: ref } = await supabaseAdmin
          .from('venue_referrals')
          .select('id,artist_user_id,status')
          .eq('id', referralId)
          .maybeSingle();
        if (!ref) return json({ error: 'Referral not found' }, { status: 404 });
        if (ref.status !== 'qualified') return json({ error: 'Referral is not qualified' }, { status: 400 });

        const adminUser = (request as any).__adminUser;
        const now = new Date().toISOString();

        // Insert reward record
        await supabaseAdmin.from('referral_rewards').insert({
          referral_id: ref.id,
          artist_user_id: ref.artist_user_id,
          reward_type: 'pro_month',
          granted_by_admin_id: adminUser?.id || null,
        });

        // Grant 30 days of pro
        const proUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        await supabaseAdmin.from('artists').update({ pro_until: proUntil, updated_at: now }).eq('id', ref.artist_user_id);

        // Update referral status
        await supabaseAdmin.from('venue_referrals').update({ status: 'reward_granted', updated_at: now }).eq('id', ref.id);

        await logAdminAction(adminUser?.id, 'referral_grant', 'venue_referrals', ref.id, { artist_user_id: ref.artist_user_id, pro_until: proUntil });

        return json({ ok: true });
      } catch (e) {
        console.error('[admin/referrals/grant]', e instanceof Error ? e.message : e);
        return json({ error: 'Failed to grant reward' }, { status: 500 });
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Venue Invite Routes (artist → venue outreach)
    // ══════════════════════════════════════════════════════════════════════════

    // GET /api/venue-invites — list invites for the authenticated artist
    if (url.pathname === '/api/venue-invites' && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const user = await getSupabaseUserFromRequest(request);
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

    // POST /api/venue-invites — create a new invite draft
    if (url.pathname === '/api/venue-invites' && method === 'POST') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const user = await getSupabaseUserFromRequest(request);
      const authErr = requireAuthOrFail(request, user);
      if (authErr) return authErr;
      const rlInvite = await applyRateLimit('profile-upsert', request);
      if (rlInvite) return rlInvite;
      const body = await request.json().catch(() => ({})) as Record<string, unknown>;
      const placeId = clampStr(body?.placeId, 500);
      const venueName = clampStr(body?.venueName, 300);
      if (!placeId || !venueName) return json({ error: 'placeId and venueName are required' }, { status: 400 });

      // Daily limit
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const { count: todayCount } = await supabaseAdmin
        .from('venue_invites')
        .select('id', { count: 'exact', head: true })
        .eq('artist_id', user!.id)
        .gte('created_at', todayStart.toISOString());
      if ((todayCount || 0) >= VENUE_INVITE_DAILY_LIMIT) {
        return json({ error: `Daily invite limit reached (${VENUE_INVITE_DAILY_LIMIT})` }, { status: 429 });
      }

      // Duplicate check within window
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

      // Log event
      await supabaseAdmin.from('venue_invite_events').insert({
        invite_id: data.id, type: 'CREATED', meta: {},
      }).catch(() => {});

      return json({ invite: mapVenueInviteRow(data) }, { status: 201 });
    }

    // POST /api/venue-invites/:id/send — mark invite as sent + save composed fields
    if (url.pathname.match(/^\/api\/venue-invites\/[0-9a-f-]+\/send$/) && method === 'POST') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const user = await getSupabaseUserFromRequest(request);
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

    // GET /api/venue-invites/token/:token — public: load invite + artist data
    if (url.pathname.match(/^\/api\/venue-invites\/token\/[a-f0-9]+$/i) && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const token = url.pathname.split('/').pop() || '';
      if (!isValidInviteToken(token)) return json({ error: 'Invalid token' }, { status: 400 });

      const { data: inv } = await supabaseAdmin
        .from('venue_invites').select('*').eq('token', token).maybeSingle();
      if (!inv) return json({ error: 'Invite not found' }, { status: 404 });

      // Fetch artist profile
      const { data: artist } = await supabaseAdmin
        .from('artists')
        .select('id,name,bio,portfolio_url,profile_photo_url')
        .eq('id', inv.artist_id)
        .maybeSingle();

      // Fetch artist artworks (up to 6)
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

    // POST /api/venue-invites/token/:token/open — public: track click
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

    // POST /api/venue-invites/token/:token/accept — public: accept invite
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

    // POST /api/venue-invites/token/:token/decline — public: decline invite
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

    // POST /api/venue-invites/token/:token/question — public: venue asks a question
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

      // Store as a support message linked to the artist
      await supabaseAdmin.from('support_messages').insert({
        id: crypto.randomUUID(),
        email: email || `venue-via-invite@artwalls.space`,
        message: `[Venue Question via Invite] From: ${inv.venue_name}\n\n${message}`,
        role_context: 'venue',
        page_source: `/v/invite/${token}`,
        status: 'new',
        created_at: new Date().toISOString(),
      }).catch(() => {});

      // Also log an invite event
      await supabaseAdmin.from('venue_invite_events').insert({
        invite_id: inv.id, type: 'OPENED', meta: { question: true, email },
      }).catch(() => {});

      return json({ ok: true });
    }

    // POST /api/referrals/create — artist refers a venue
    if (url.pathname === '/api/referrals/create' && method === 'POST') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const user = await getSupabaseUserFromRequest(request);
      const authErr = requireAuthOrFail(request, user);
      if (authErr) return authErr;
      const rlRef = await applyRateLimit('profile-upsert', request);
      if (rlRef) return rlRef;

      const body = await request.json().catch(() => ({})) as Record<string, unknown>;
      const venueName = clampStr(body?.venueName, 300).trim();
      const venueEmail = clampStr(body?.venueEmail, 254).trim();
      if (!venueName || !venueEmail) return json({ error: 'venueName and venueEmail are required' }, { status: 400 });
      if (!isValidEmail(venueEmail)) return json({ error: 'Invalid email address' }, { status: 400 });

      // Daily limit
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

    // ── Admin-only: venue invites summary ──
    if (url.pathname === '/api/admin/venue-invites/summary' && method === 'GET') {
      const guardResp = await requireAdmin(request);
      if (guardResp) return guardResp;

      const rangeDays = Math.min(parseInt(url.searchParams.get('days') || '30', 10), 90);
      const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();

      try {
        const { data: invites } = await supabaseAdmin
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
          const { data: artists } = await supabaseAdmin
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
    // Announcements Routes
    // ══════════════════════════════════════════════════════════════════════════

    // GET /api/announcements — public: list active announcements for a role
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

      // Filter by audience: show 'all' + role-specific
      if (audience === 'artists' || audience === 'venues') {
        query = query.in('audience', ['all', audience]);
      }

      const { data, error: dbErr } = await query;
      if (dbErr) return json({ error: dbErr.message }, { status: 500 });

      // Filter out expired (end_date passed)
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

    // POST /api/admin/announcements — admin: create announcement
    if (url.pathname === '/api/admin/announcements' && method === 'POST') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const guardResp = await requireAdmin(request);
      if (guardResp) return guardResp;
      const adminUser = await getSupabaseUserFromRequest(request);

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

    // ── Admin-only: promo codes ──
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

    // ── Admin-only: activity log ──
    if (url.pathname === '/api/admin/activity-log' && method === 'GET') {
      const guardResp = await requireAdmin(request);
      if (guardResp) return guardResp;

      // Return empty until an activity_log table is created
      return json({ activity: [] });
    }

    // ── Admin-only: test SMS ──
    if (url.pathname === '/api/admin/test-sms' && method === 'POST') {
      const guardResp = await requireAdmin(request);
      if (guardResp) return guardResp;
      // Placeholder — requires Twilio or similar integration
      return json({ ok: true, message: 'SMS integration not yet configured' });
    }

    // ── Admin-only: current displays (wallspaces with active art) ──
    if (url.pathname === '/api/admin/current-displays' && method === 'GET') {
      const guardResp = await requireAdmin(request);
      if (guardResp) return guardResp;

      try {
        const { data, error: wsErr } = await supabaseAdmin
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

    // ── Admin-only: suspend / activate user ──
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
      await supabaseAdmin.from('artists').update({
        subscription_status: isSuspend ? 'suspended' : 'active',
        updated_at: now,
      }).eq('id', userId);

      await supabaseAdmin.from('venues').update({
        suspended: isSuspend,
        updated_at: now,
      }).eq('id', userId);

      return json({ ok: true, action, userId });
    }

    // GET /api/admin/support-tickets — list tickets (grouped from support_messages by email+page_source)
    if (url.pathname === '/api/admin/support-tickets' && method === 'GET') {
      const guardResp = await requireAdmin(request);
      if (guardResp) return guardResp;

      const statusFilter = url.searchParams.get('status') || '';

      // Fetch all messages and group client-side into "tickets"
      let query = supabaseAdmin
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

      let query = supabaseAdmin
        .from('support_messages')
        .select('*')
        .eq('email', email || '')
        .eq('page_source', pageSource || '')
        .order('created_at', { ascending: true });

      const { data: messages, error: fetchErr } = await query;
      if (fetchErr) return json({ error: fetchErr.message }, { status: 500 });

      return json({ messages: messages || [] });
    }

    // GET /api/admin/support/messages — list messages with filters (for SupportInbox)
    if (url.pathname === '/api/admin/support/messages' && method === 'GET') {
      const guardResp = await requireAdmin(request);
      if (guardResp) return guardResp;

      const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);
      const offset = parseInt(url.searchParams.get('offset') || '0', 10);
      const statusFilter = url.searchParams.get('status') || '';
      const searchEmail = url.searchParams.get('searchEmail') || '';
      const searchMessage = url.searchParams.get('searchMessage') || '';

      let query = supabaseAdmin
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

      const { data: msg, error: fetchErr } = await supabaseAdmin
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

      const { error: updateErr } = await supabaseAdmin
        .from('support_messages')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', msgId);

      if (updateErr) return json({ error: updateErr.message }, { status: 500 });

      const adminUser = (request as any).__adminUser;
      await logAdminAction(adminUser?.id, 'support_message_status', 'support_messages', msgId, { newStatus });

      // Return the updated message so the frontend can reflect it
      const { data: updated } = await supabaseAdmin
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

    // ══════════════════════════════════════════════════════════════════════════
    // Founding Venues — install kit request
    // ══════════════════════════════════════════════════════════════════════════
    if (url.pathname === '/api/venues/request-install-kit' && method === 'POST') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const user = await getSupabaseUserFromRequest(request);
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
    // Founding Venues — performance snapshot (scans by day)
    // ══════════════════════════════════════════════════════════════════════════
    if (url.pathname === '/api/venues/me/performance' && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const user = await getSupabaseUserFromRequest(request);
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
    // Founding Venues — monthly commission statement
    // ══════════════════════════════════════════════════════════════════════════
    if (url.pathname === '/api/venues/me/statement' && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const user = await getSupabaseUserFromRequest(request);
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

    // ── Fallback: 404 for unmatched API routes ──
    return json({ error: 'Not found' }, { status: 404 });

    } catch (fatalErr: unknown) {
      // Top-level catch: return a proper CORS-headered JSON response
      // so the browser doesn't interpret the error as a CORS block.
      console.error('[FATAL] Unhandled Worker error:', fatalErr instanceof Error ? fatalErr.message : fatalErr);
      const errHeaders = new Headers({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
        'Vary': 'Origin',
      });
      return new Response(
        JSON.stringify({ error: 'Internal server error', code: 'WORKER_UNHANDLED_EXCEPTION' }),
        { status: 500, headers: errHeaders },
      );
    }
  },
};