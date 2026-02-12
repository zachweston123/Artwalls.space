/**
 * Production-grade, per-route rate limiting for Cloudflare Workers.
 *
 * Uses Cloudflare KV for durable counters when the RATE_LIMIT_KV binding
 * is present; falls back to a per-isolate in-memory Map for local dev
 * (with an eviction sweep so it doesn't leak).
 *
 * Keying:
 *   Every bucket key encodes  route + dimension  so different endpoints
 *   never share a counter.
 *
 * Algorithm: fixed-window counters with configurable windowSec.
 *
 * 429 responses include a JSON body { error, retryAfterSec } and a
 * Retry-After header per RFC 6585 § 4.
 */

// ── Types ──────────────────────────────────────────────────────────────

export interface RateLimitRule {
  /** Human label, e.g. "checkout-ip" (used in logs). */
  name: string;
  /** Maximum requests allowed in the window. */
  limit: number;
  /** Window length in seconds. */
  windowSec: number;
  /**
   * Build the dimension key(s) from request context.
   * Return `null` to skip this rule (e.g. no userId available).
   */
  key: (ctx: RateLimitContext) => string | null;
}

export interface RateLimitContext {
  /** Client IP (from CF-Connecting-IP / X-Forwarded-For). */
  ip: string;
  /** User ID extracted from JWT `sub` claim (cheap, no Supabase call). */
  userId: string | null;
  /** Artwork ID from URL path or body (caller provides). */
  artworkId: string | null;
  /** Normalised pathname, e.g. "/api/stripe/create-checkout-session". */
  route: string;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Name of the rule that blocked, or null if allowed. */
  blockedBy: string | null;
  /** Seconds until the window resets (only meaningful when blocked). */
  retryAfterSec: number;
}

// ── KV-backed store ────────────────────────────────────────────────────

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

// ── In-memory fallback (dev / no KV) ───────────────────────────────────

const memStore = new Map<string, { count: number; expiresAt: number }>();
const MAX_MEM_ENTRIES = 10_000;

function memEvict() {
  if (memStore.size < MAX_MEM_ENTRIES) return;
  const now = Date.now();
  for (const [k, v] of memStore) {
    if (v.expiresAt <= now) memStore.delete(k);
  }
  // If still over limit, drop oldest half
  if (memStore.size >= MAX_MEM_ENTRIES) {
    const entries = [...memStore.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    const toDrop = Math.floor(entries.length / 2);
    for (let i = 0; i < toDrop; i++) memStore.delete(entries[i][0]);
  }
}

// ── Core check function ────────────────────────────────────────────────

async function checkRule(
  rule: RateLimitRule,
  ctx: RateLimitContext,
  kv: KVNamespace | null,
): Promise<{ allowed: boolean; retryAfterSec: number }> {
  const dimension = rule.key(ctx);
  if (dimension === null) return { allowed: true, retryAfterSec: 0 };

  const bucketKey = `rl:${rule.name}:${dimension}`;
  const now = Date.now();
  const windowMs = rule.windowSec * 1000;

  if (kv) {
    // ── KV path (production) ──
    const raw = await kv.get(bucketKey);
    let count = 0;
    let windowStart = now;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.windowStart && now - parsed.windowStart < windowMs) {
          count = parsed.count || 0;
          windowStart = parsed.windowStart;
        }
        // else: window expired, reset
      } catch { /* corrupted entry, reset */ }
    }
    count += 1;
    const ttlSec = Math.max(rule.windowSec, 60); // KV min TTL is 60s
    await kv.put(bucketKey, JSON.stringify({ count, windowStart: windowStart === now ? now : windowStart }), {
      expirationTtl: ttlSec,
    });
    if (count > rule.limit) {
      const elapsed = (now - windowStart) / 1000;
      const retryAfterSec = Math.max(Math.ceil(rule.windowSec - elapsed), 1);
      return { allowed: false, retryAfterSec };
    }
    return { allowed: true, retryAfterSec: 0 };
  }

  // ── In-memory fallback (dev) ──
  memEvict();
  const entry = memStore.get(bucketKey);
  if (entry && entry.expiresAt > now) {
    entry.count += 1;
    if (entry.count > rule.limit) {
      const retryAfterSec = Math.max(Math.ceil((entry.expiresAt - now) / 1000), 1);
      return { allowed: false, retryAfterSec };
    }
    return { allowed: true, retryAfterSec: 0 };
  }
  memStore.set(bucketKey, { count: 1, expiresAt: now + windowMs });
  return { allowed: true, retryAfterSec: 0 };
}

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Check an array of rate-limit rules for a given request context.
 * Returns on the FIRST rule that blocks (short-circuit).
 */
export async function checkRateLimit(
  rules: RateLimitRule[],
  ctx: RateLimitContext,
  kv: KVNamespace | null,
): Promise<RateLimitResult> {
  for (const rule of rules) {
    const { allowed, retryAfterSec } = await checkRule(rule, ctx, kv);
    if (!allowed) {
      return { allowed: false, blockedBy: rule.name, retryAfterSec };
    }
  }
  return { allowed: true, blockedBy: null, retryAfterSec: 0 };
}

/**
 * Extract userId from a JWT without calling Supabase.
 * Just base64-decodes the payload and reads `sub`.
 * Returns null if anything fails — never throws.
 */
export function userIdFromJwt(req: Request): string | null {
  try {
    const auth = req.headers.get('authorization') || '';
    const parts = auth.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return null;
    const token = parts[1];
    const payloadB64 = token.split('.')[1];
    if (!payloadB64) return null;
    // Handle URL-safe base64
    const padded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(padded);
    const payload = JSON.parse(decoded);
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

/**
 * Get the client IP from Cloudflare headers.
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
    'unknown'
  );
}

// ── Pre-built rule factories ───────────────────────────────────────────

/** Per-IP limit scoped to a specific route. */
export function ipRule(name: string, route: string, limit: number, windowSec: number): RateLimitRule {
  return { name, limit, windowSec, key: (ctx) => `${route}:ip:${ctx.ip}` };
}

/** Per-userId limit scoped to a specific route. Skips if no userId. */
export function userRule(name: string, route: string, limit: number, windowSec: number): RateLimitRule {
  return { name, limit, windowSec, key: (ctx) => ctx.userId ? `${route}:user:${ctx.userId}` : null };
}

/** Per-artworkId limit. Skips if no artworkId. */
export function artworkRule(name: string, route: string, limit: number, windowSec: number): RateLimitRule {
  return { name, limit, windowSec, key: (ctx) => ctx.artworkId ? `${route}:art:${ctx.artworkId}` : null };
}

// ── Route-specific limit presets ───────────────────────────────────────
// All are tunable — override via env RATE_LIMIT_DEFAULTS JSON if needed.

export const ROUTE_LIMITS: Record<string, RateLimitRule[]> = {
  // ── Stripe Connect (artist) ──
  'stripe-connect-artist-create': [
    ipRule('connect-create-ip', 'connect-artist-create', 10, 60),
    userRule('connect-create-user', 'connect-artist-create', 20, 3600),
  ],
  'stripe-connect-artist-link': [
    ipRule('connect-link-ip', 'connect-artist-link', 15, 60),
    userRule('connect-link-user', 'connect-artist-link', 30, 3600),
  ],
  'stripe-connect-artist-login': [
    ipRule('connect-login-ip', 'connect-artist-login', 15, 60),
  ],
  // ── Stripe Connect (venue) ──
  'stripe-connect-venue-create': [
    ipRule('connect-vcreate-ip', 'connect-venue-create', 10, 60),
    userRule('connect-vcreate-user', 'connect-venue-create', 20, 3600),
  ],
  'stripe-connect-venue-link': [
    ipRule('connect-vlink-ip', 'connect-venue-link', 15, 60),
  ],
  'stripe-connect-venue-login': [
    ipRule('connect-vlogin-ip', 'connect-venue-login', 15, 60),
  ],
  // ── Stripe Checkout / Billing ──
  'stripe-checkout': [
    ipRule('checkout-ip', 'checkout', 5, 60),
    userRule('checkout-user', 'checkout', 20, 3600),
    artworkRule('checkout-artwork', 'checkout', 10, 3600),
  ],
  'stripe-subscription': [
    ipRule('subscription-ip', 'subscription', 5, 60),
    userRule('subscription-user', 'subscription', 10, 3600),
  ],
  'stripe-portal': [
    ipRule('portal-ip', 'portal', 10, 60),
    userRule('portal-user', 'portal', 20, 3600),
  ],
  // ── Profile / Auth ──
  'profile-provision': [
    ipRule('provision-ip', 'provision', 10, 60),
    userRule('provision-user', 'provision', 20, 3600),
  ],
  'profile-upsert': [
    ipRule('upsert-ip', 'profile-upsert', 20, 60),
  ],
  // ── Analytics / Events ──
  'track': [
    ipRule('track-ip', 'track', 60, 60),
  ],
  'events': [
    ipRule('events-ip', 'events', 60, 60),
  ],
  // ── Public writes ──
  'reactions': [
    ipRule('reactions-ip', 'reactions', 60, 60),
  ],
  'support': [
    ipRule('support-ip', 'support', 5, 3600),   // 5/hour per IP
  ],
  // ── Artworks CRUD ──
  'artwork-create': [
    ipRule('art-create-ip', 'artwork-create', 20, 60),
    userRule('art-create-user', 'artwork-create', 50, 3600),
  ],
  'artwork-approve': [
    ipRule('art-approve-ip', 'artwork-approve', 20, 60),
  ],
  // ── Wallspaces ──
  'wallspace-write': [
    ipRule('ws-write-ip', 'wallspace-write', 20, 60),
  ],
  // ── Invites / Referrals ──
  'invite-write': [
    ipRule('invite-ip', 'invite-write', 10, 60),
  ],
  // ── Public reads (generous but not unlimited) ──
  'public-read': [
    ipRule('public-read-ip', 'public-read', 120, 60),
  ],
  'public-read-heavy': [
    ipRule('public-heavy-ip', 'public-heavy', 30, 60),
  ],
  // ── Admin (auth-gated but still limit brute force) ──
  'admin': [
    ipRule('admin-ip', 'admin', 60, 60),
  ],
  // ── Momentum / misc writes ──
  'misc-write': [
    ipRule('misc-write-ip', 'misc-write', 30, 60),
  ],
};

/**
 * Generate a Stripe idempotency key for checkout sessions.
 * Deterministic within a 10-minute window so retries reuse the same session.
 */
export async function stripeIdempotencyKey(
  artworkId: string,
  identity: string, // userId or IP
): Promise<string> {
  const window10m = Math.floor(Date.now() / (10 * 60 * 1000));
  const raw = `cs:${artworkId}:${identity}:${window10m}`;
  const encoder = new TextEncoder();
  const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(raw));
  const hashArr = Array.from(new Uint8Array(hashBuf));
  const hex = hashArr.map(b => b.toString(16).padStart(2, '0')).join('');
  return `cs_${hex.slice(0, 32)}`;
}

/**
 * Enforce a max body size BEFORE parsing JSON.
 * Returns null if OK, or a { error, status } object to return early.
 */
export async function enforceBodySize(
  req: Request,
  maxBytes: number,
): Promise<{ error: string; status: number } | null> {
  const cl = req.headers.get('content-length');
  if (cl && parseInt(cl, 10) > maxBytes) {
    return { error: `Request body too large (max ${Math.round(maxBytes / 1024)}KB)`, status: 413 };
  }
  return null;
}
