/**
 * WorkerContext factory — creates the context object passed to every
 * route handler.  All helpers that were previously closure-scoped inside
 * the monolithic `fetch()` are created here and bundled into the context.
 */

import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import {
  checkRateLimit,
  getClientIp,
  userIdFromJwt,
  ROUTE_LIMITS,
  type RateLimitContext,
} from './rateLimit';
import {
  getArtworkLimit,
} from '../src/lib/entitlements';
import {
  normalizeArtistTier,
} from '../src/lib/pricingCalculations';
import type { Env, WorkerContext, UpsertArtistPayload, UpsertVenuePayload } from './types';

/* ── Top-level constants (no per-request state) ────────────────────── */

/** Platform fee basis points per tier (for analytics column). */
const TIER_PLATFORM_FEE_BPS: Record<string, number> = {
  free: 2500,
  starter: 500,
  growth: 200,
  pro: 0,
};

const PUBLIC_ARTWORK_STATUSES = ['available', 'active', 'published'];

/* ── Factory ─────────────────────────────────────────────────────────── */

export function createWorkerContext(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): WorkerContext {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  // ── Origin / CORS ──
  const requestOrigin = request.headers.get('origin') || '';
  const pagesOrigin = env.PAGES_ORIGIN || 'https://artwalls.space';

  const allowedOrigins = new Set([
    pagesOrigin,
    'https://artwalls.space',
    'https://www.artwalls.space',
    'http://localhost:5173',
    'http://localhost:3000',
  ]);
  const allowOrigin = allowedOrigins.has(requestOrigin) ? requestOrigin : pagesOrigin;

  // ── Supabase admin ──
  const rawSupabaseUrl = (env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const rawServiceKey = (env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const supabaseAdmin =
    rawSupabaseUrl && rawServiceKey
      ? createClient(rawSupabaseUrl, rawServiceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null;

  // ── Config constants ──
  const ADMIN_EMAILS: string[] = (env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const VENUE_INVITE_DAILY_LIMIT = Number(env.VENUE_INVITE_DAILY_LIMIT || 10);
  const VENUE_INVITE_DUPLICATE_WINDOW_DAYS = Number(env.VENUE_INVITE_DUPLICATE_WINDOW_DAYS || 30);
  const VENUE_INVITE_PUBLIC_RATE_LIMIT = Number(env.VENUE_INVITE_PUBLIC_RATE_LIMIT || 60);
  const REFERRAL_DAILY_LIMIT = Number(env.REFERRAL_DAILY_LIMIT || 5);

  const rateLimitEnabled = (env.RATE_LIMIT_ENABLED ?? 'true') !== 'false';
  const kvStore = env.RATE_LIMIT_KV || null;

  /* ── Response helpers ─────────────────────────────────────────────── */

  function applySecurityHeaders(headers: Headers): void {
    headers.set('Access-Control-Allow-Origin', allowOrigin);
    headers.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'authorization, content-type, x-client-info, apikey');
    headers.set('Vary', 'Origin');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; connect-src 'self' https://*.supabase.co https://*.stripe.com; frame-src https://js.stripe.com https://hooks.stripe.com; img-src 'self' https://*.supabase.co data: blob:;",
    );
  }

  function json(obj: unknown, init?: ResponseInit): Response {
    const headers = new Headers(init?.headers);
    headers.set('Content-Type', 'application/json');
    applySecurityHeaders(headers);
    return new Response(JSON.stringify(obj), { status: init?.status ?? 200, headers });
  }

  function text(body: string, init?: ResponseInit): Response {
    const headers = new Headers(init?.headers);
    headers.set('Content-Type', 'text/plain; charset=utf-8');
    applySecurityHeaders(headers);
    return new Response(body, { status: init?.status ?? 200, headers });
  }

  /* ── Rate limiting ──────────────────────────────────────────────── */

  async function applyRateLimit(
    preset: string,
    req: Request,
    artworkId?: string | null,
  ): Promise<Response | null> {
    if (!rateLimitEnabled) return null;
    const rules = ROUTE_LIMITS[preset];
    if (!rules) return null;
    const rlCtx: RateLimitContext = {
      ip: getClientIp(req),
      userId: userIdFromJwt(req),
      artworkId: artworkId || null,
      route: new URL(req.url).pathname,
    };
    const result = await checkRateLimit(rules, rlCtx, kvStore);
    if (result.allowed) return null;
    console.log(`[rate-limit] 429 on ${preset} by rule=${result.blockedBy} ip=${rlCtx.ip.slice(0, 8)}…`);
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

  /* ── SMS ─────────────────────────────────────────────────────────── */

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
      const resp = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        { method: 'POST', headers: { Authorization: `Basic ${auth}` }, body: form },
      );
      if (!resp.ok) {
        const t = await resp.text();
        console.error('Twilio SMS failed', resp.status, t);
      }
    } catch (e) {
      console.error('Twilio SMS error', e instanceof Error ? e.message : e);
    }
  }

  /* ── QR / purchase URL ──────────────────────────────────────────── */

  function artworkPurchaseUrl(artworkId: string): string {
    return `${pagesOrigin}/#/purchase-${artworkId}`;
  }

  async function generateQrSvg(data: string, size = 300): Promise<string> {
    try {
      return await QRCode.toString(data, { type: 'svg', width: size, margin: 0 });
    } catch {
      const modules = 29;
      const cell = Math.floor(size / modules);
      const padding = Math.floor((size - modules * cell) / 2);
      let hash = 0;
      for (let i = 0; i < data.length; i++) hash = (hash * 31 + data.charCodeAt(i)) >>> 0;
      let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="#fff"/>`;
      for (let y = 0; y < modules; y++) {
        for (let x = 0; x < modules; x++) {
          hash = (hash * 1103515245 + 12345) & 0x7fffffff;
          if ((hash & 1) === 1) {
            svg += `<rect x="${padding + x * cell}" y="${padding + y * cell}" width="${cell}" height="${cell}" fill="#000"/>`;
          }
        }
      }
      svg += '</svg>';
      return svg;
    }
  }

  /* ── Pro override ───────────────────────────────────────────────── */

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

  /* ── Stripe helpers ─────────────────────────────────────────────── */

  function toForm(obj: Record<string, any>): string {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined && v !== null) params.set(k, String(v));
    }
    return params.toString();
  }

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

  /* ── Analytics ──────────────────────────────────────────────────── */

  async function hashIp(ip: string): Promise<string> {
    const data = new TextEncoder().encode(ip);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 16);
  }

  /* ── Auth helpers ───────────────────────────────────────────────── */

  async function getUser(req: Request): Promise<any | null> {
    try {
      const auth = req.headers.get('authorization') || '';
      const [scheme, token] = auth.split(' ');
      if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null;
      if (!supabaseAdmin) return null;
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (error) {
        console.error('[auth] Token validation failed:', error.message);
        return null;
      }
      return data.user || null;
    } catch (e) {
      console.error('[auth] Unexpected error:', e instanceof Error ? e.message : e);
      return null;
    }
  }

  function requireAuthOrFail(req: Request, user: any | null): Response | null {
    if (!supabaseAdmin) {
      return json(
        {
          error: 'Server misconfiguration: Supabase admin client not initialised',
          code: 'SUPABASE_ADMIN_MISCONFIG',
          hint: 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY as Worker secrets',
        },
        { status: 500 },
      );
    }
    if (!user) {
      return json({ error: 'Unauthorized — missing or invalid Authorization bearer token' }, { status: 401 });
    }
    return null;
  }

  async function isAdminUser(user: any): Promise<boolean> {
    if (!user?.id) return false;
    const email = (user.email || '').toLowerCase().trim();
    return ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.includes(email);
  }

  async function requireAdmin(req: Request): Promise<Response | null> {
    if (!supabaseAdmin) {
      return json(
        {
          error: 'Server misconfiguration: Supabase admin client not initialised',
          code: 'SUPABASE_ADMIN_MISCONFIG',
          hint: 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY as Worker secrets',
        },
        { status: 500 },
      );
    }
    const user = await getUser(req);
    if (!user) {
      return json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
    }
    if (!(await isAdminUser(user))) {
      return json({ error: 'Forbidden', code: 'ADMIN_REQUIRED' }, { status: 403 });
    }
    (req as any).__adminUser = user;
    return null;
  }

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
        ip_address: null,
      });
    } catch (e) {
      console.warn('[audit] Failed to write audit log:', e instanceof Error ? e.message : e);
    }
  }

  /* ── DB upsert helpers ──────────────────────────────────────────── */

  async function upsertArtist(artist: UpsertArtistPayload): Promise<Response> {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const payload: Record<string, any> = {
      id: artist.id,
      is_live: true,
      updated_at: new Date().toISOString(),
    };
    if (artist.email !== undefined) payload.email = artist.email;
    if (artist.name !== undefined) payload.name = artist.name;
    if (artist.role !== undefined) payload.role = artist.role;
    if (artist.phoneNumber !== undefined) payload.phone_number = artist.phoneNumber;
    if (artist.stripeAccountId !== undefined) payload.stripe_account_id = artist.stripeAccountId;
    if (artist.stripeCustomerId !== undefined) payload.stripe_customer_id = artist.stripeCustomerId;
    if (artist.subscriptionTier !== undefined) payload.subscription_tier = artist.subscriptionTier || 'free';
    if (artist.subscriptionStatus !== undefined) payload.subscription_status = artist.subscriptionStatus || 'inactive';
    if (artist.stripeSubscriptionId !== undefined) payload.stripe_subscription_id = artist.stripeSubscriptionId;
    if (artist.platformFeeBps !== undefined) payload.platform_fee_bps = artist.platformFeeBps;
    if (artist.cityPrimary !== undefined) payload.city_primary = artist.cityPrimary;
    if (artist.citySecondary !== undefined) payload.city_secondary = artist.citySecondary;
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

  async function upsertVenue(venue: UpsertVenuePayload): Promise<Response> {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
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
    if (typeof venue.suspended === 'boolean') payload.suspended = venue.suspended;
    if (venue.bio !== undefined && venue.bio !== null) payload.bio = venue.bio;
    if (venue.coverPhotoUrl !== undefined) payload.cover_photo_url = venue.coverPhotoUrl || null;
    if (venue.address !== undefined && venue.address !== null) payload.address = venue.address;
    if (venue.addressLat !== undefined && venue.addressLat !== null) payload.address_lat = venue.addressLat;
    if (venue.addressLng !== undefined && venue.addressLng !== null) payload.address_lng = venue.addressLng;
    if (venue.website !== undefined && venue.website !== null) payload.website = venue.website;
    if (venue.instagramHandle !== undefined && venue.instagramHandle !== null) payload.instagram_handle = venue.instagramHandle;
    if (venue.artGuidelines !== undefined) payload.art_guidelines = venue.artGuidelines;
    if (venue.preferredStyles !== undefined) payload.preferred_styles = venue.preferredStyles;
    const { data, error } = await supabaseAdmin.from('venues').upsert(payload, { onConflict: 'id' }).select('*').single();
    if (error) {
      console.error('[upsertVenue] Error:', error.message, error.code, (error as any).hint);
      return json({ error: error.message, code: error.code, hint: (error as any).hint || null }, { status: 500 });
    }
    return json(data);
  }

  /* ── Role-based auth shortcuts ──────────────────────────────────── */

  async function requireVenue(req: Request): Promise<any | null> {
    const user = await getUser(req);
    if (!user) return null;
    if (user.user_metadata?.role !== 'venue') return null;
    return user;
  }

  async function requireArtist(req: Request): Promise<any | null> {
    const user = await getUser(req);
    if (!user) return null;
    if (user.user_metadata?.role === 'venue') return null;
    return user;
  }

  /* ── Public artwork shaping ─────────────────────────────────────── */

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
      imageUrls: Array.isArray(a.image_urls) ? a.image_urls : a.image_url ? [a.image_url] : [],
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

  /* ── Artwork limits ─────────────────────────────────────────────── */

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

  /* ── Tier resolution ────────────────────────────────────────────── */

  function resolveTierFromPriceId(
    priceId: string | undefined | null,
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
    const raw = (metadataTier || '').toLowerCase().trim();
    if (raw === 'starter' || raw === 'growth' || raw === 'pro') return raw;
    if (raw === 'elite') return 'growth';
    return 'free';
  }

  /* ── Assemble context ───────────────────────────────────────────── */

  return {
    env,
    url,
    method,
    request,
    ctx,
    supabaseAdmin,
    allowOrigin,
    pagesOrigin,
    allowedOrigins,

    // Response
    json,
    text,
    applySecurityHeaders,

    // Auth
    getUser,
    requireAuthOrFail,
    requireAdmin,
    isAdminUser,
    requireVenue,
    requireArtist,

    // DB
    upsertArtist,
    upsertVenue,
    logAdminAction,

    // Stripe
    stripeFetch,
    toForm,

    // SMS
    sendSms,

    // Rate limiting
    applyRateLimit,

    // QR / URL
    artworkPurchaseUrl,
    generateQrSvg,

    // Shaping
    shapePublicArtwork,
    shapePublicArtworkDetail,
    applyProOverride,

    // Artwork limits
    getArtistArtworkLimit,
    getArtistActiveArtworkCount,

    // Analytics
    hashIp,

    // Tier
    resolveTierFromPriceId,

    // Constants
    ADMIN_EMAILS,
    VENUE_INVITE_DAILY_LIMIT,
    VENUE_INVITE_DUPLICATE_WINDOW_DAYS,
    VENUE_INVITE_PUBLIC_RATE_LIMIT,
    REFERRAL_DAILY_LIMIT,
    PUBLIC_ARTWORK_STATUSES,
    TIER_PLATFORM_FEE_BPS,
  };
}
