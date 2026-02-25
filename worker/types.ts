/**
 * Shared types for the modularised Cloudflare Worker.
 *
 * Every route handler receives a `WorkerContext` that provides access
 * to env vars, the Supabase admin client, response helpers, auth gates,
 * and all other utilities that were previously closure-scoped inside the
 * monolithic `fetch()` handler.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/* ── Environment variables (Wrangler secrets + bindings) ──────────── */

export type Env = {
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

/* ── Worker context — passed to every route handler ───────────────── */

export interface WorkerContext {
  env: Env;
  url: URL;
  method: string;
  request: Request;
  ctx: ExecutionContext;
  supabaseAdmin: SupabaseClient | null;
  allowOrigin: string;
  pagesOrigin: string;
  allowedOrigins: Set<string>;

  // ── Response helpers ──
  json(obj: unknown, init?: ResponseInit): Response;
  text(body: string, init?: ResponseInit): Response;
  applySecurityHeaders(headers: Headers): void;

  // ── Auth helpers ──
  getUser(req: Request): Promise<any | null>;
  requireAuthOrFail(req: Request, user: any | null): Response | null;
  requireAdmin(req: Request): Promise<Response | null>;
  isAdminUser(user: any): Promise<boolean>;
  requireVenue(req: Request): Promise<any | null>;
  requireArtist(req: Request): Promise<any | null>;

  // ── DB helpers ──
  upsertArtist(artist: UpsertArtistPayload): Promise<Response>;
  upsertVenue(venue: UpsertVenuePayload): Promise<Response>;
  logAdminAction(
    adminId: string,
    action: string,
    targetTable?: string,
    targetId?: string,
    meta?: Record<string, unknown>,
  ): Promise<void>;

  // ── Stripe helpers ──
  stripeFetch(path: string, init: RequestInit): Promise<Response>;
  toForm(obj: Record<string, any>): string;

  // ── SMS ──
  sendSms(to: string, body: string): Promise<void>;

  // ── Rate limiting ──
  applyRateLimit(preset: string, req: Request, artworkId?: string | null): Promise<Response | null>;

  // ── QR / URL helpers ──
  artworkPurchaseUrl(artworkId: string): string;
  generateQrSvg(data: string, size?: number): Promise<string>;

  // ── Shaping helpers ──
  shapePublicArtwork(a: any): any;
  shapePublicArtworkDetail(a: any): any;
  applyProOverride(profile: any): { profile: any; hasProOverride: boolean };

  // ── Artwork limits ──
  getArtistArtworkLimit(artistId: string): Promise<number>;
  getArtistActiveArtworkCount(artistId: string): Promise<number>;

  // ── Analytics ──
  hashIp(ip: string): Promise<string>;

  // ── Tier resolution ──
  resolveTierFromPriceId(
    priceId: string | undefined | null,
    metadataTier?: string | null,
  ): 'free' | 'starter' | 'growth' | 'pro';

  // ── Config constants ──
  ADMIN_EMAILS: string[];
  VENUE_INVITE_DAILY_LIMIT: number;
  VENUE_INVITE_DUPLICATE_WINDOW_DAYS: number;
  VENUE_INVITE_PUBLIC_RATE_LIMIT: number;
  REFERRAL_DAILY_LIMIT: number;
  PUBLIC_ARTWORK_STATUSES: string[];
  TIER_PLATFORM_FEE_BPS: Record<string, number>;
}

/* ── Route handler signature ──────────────────────────────────────── */

/**
 * Each route module exports one or more `RouteHandler` functions.
 * Return a `Response` if the route is handled, or `null` to pass
 * through to the next module.
 */
export type RouteHandler = (wc: WorkerContext) => Promise<Response | null>;

/* ── Payload types for upsert helpers ─────────────────────────────── */

export interface UpsertArtistPayload {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string;
  phoneNumber?: string | null;
  cityPrimary?: string | null;
  citySecondary?: string | null;
  stripeAccountId?: string | null;
  stripeCustomerId?: string | null;
  subscriptionTier?: string | null;
  subscriptionStatus?: string | null;
  stripeSubscriptionId?: string | null;
  platformFeeBps?: number | null;
  profilePhotoUrl?: string | null;
}

export interface UpsertVenuePayload {
  id: string;
  email?: string | null;
  name?: string | null;
  type?: string | null;
  phoneNumber?: string | null;
  city?: string | null;
  stripeAccountId?: string | null;
  defaultVenueFeeBps?: number | null;
  labels?: any;
  suspended?: boolean | null;
  bio?: string | null;
  coverPhotoUrl?: string | null;
  address?: string | null;
  addressLat?: number | null;
  addressLng?: number | null;
  website?: string | null;
  instagramHandle?: string | null;
  artGuidelines?: string | null;
  preferredStyles?: string[] | null;
}
