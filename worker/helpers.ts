/**
 * Shared input-validation and utility helpers for the Cloudflare Worker.
 * Extracted from index.ts to keep the router lean.
 */

// ── Input-validation helpers ──

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUUID(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v);
}

export function clampStr(v: unknown, maxLen: number): string {
  return typeof v === 'string' ? v.slice(0, maxLen).trim() : '';
}

export function isValidUrl(v: unknown): boolean {
  if (typeof v !== 'string') return false;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

export function generateInviteToken(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

export function generateReferralToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ── Rate limiting ──

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function rateLimitByIp(ip: string, limit: number, windowMs: number) {
  if (!ip) return { ok: true, remaining: limit };
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }
  entry.count += 1;
  rateLimitMap.set(ip, entry);
  return {
    ok: entry.count <= limit,
    remaining: Math.max(limit - entry.count, 0),
    resetAt: entry.resetAt,
  };
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for') || '';
  const cf = req.headers.get('cf-connecting-ip') || '';
  return (forwarded.split(',')[0] || cf || '').trim();
}

// ── Error handling ──

/** Extract a human-readable message from an unknown caught value. */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'An unexpected error occurred';
}

// ── Venue-invite helpers ──

export function isValidInviteToken(token: string): boolean {
  return /^[a-f0-9]{16,64}$/i.test(token || '');
}

export function statusAfterOpen(current: string): string {
  if (current === 'DRAFT' || current === 'SENT') return 'CLICKED';
  return current;
}

const INVITE_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['SENT', 'CLICKED', 'DECLINED', 'EXPIRED'],
  SENT: ['CLICKED', 'ACCEPTED', 'DECLINED', 'EXPIRED'],
  CLICKED: ['ACCEPTED', 'DECLINED', 'EXPIRED'],
  ACCEPTED: [],
  DECLINED: [],
  EXPIRED: [],
};

export function isStatusTransitionAllowed(current: string, next: string): boolean {
  if (current === next) return true;
  return INVITE_TRANSITIONS[current]?.includes(next) || false;
}

export function mapVenueInviteRow(r: any) {
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
