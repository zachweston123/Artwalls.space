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
