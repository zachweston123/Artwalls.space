/**
 * socialLinks.ts – URL normalisation, Instagram detection, and deduplication
 * for artist social links.
 *
 * Single source of truth used by ArtistSocialLinks component (and anywhere
 * else that needs to render or compare social URLs).
 */

// ── Normalise ────────────────────────────────────────────────

/** Trim whitespace and ensure the URL has a protocol prefix. */
export function normalizeUrl(url: string | null | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

// ── Instagram detection ──────────────────────────────────────

const IG_HOST_RE = /^(www\.)?(instagram\.com|instagr\.am)$/i;

/** Returns `true` when the URL points to Instagram. */
export function isInstagramUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(normalizeUrl(url));
    return IG_HOST_RE.test(parsed.hostname);
  } catch {
    return false;
  }
}

// ── Handle → full Instagram URL ─────────────────────────────

/** Convert an `@handle` or bare `handle` into `https://instagram.com/handle`. */
export function instagramHandleToUrl(handle: string | null | undefined): string {
  if (!handle) return '';
  const clean = handle.trim().replace(/^@/, '');
  if (!clean) return '';
  return `https://instagram.com/${clean}`;
}

// ── Compare helper ───────────────────────────────────────────

function canonical(url: string): string {
  try {
    const u = new URL(normalizeUrl(url));
    // Strip trailing slash, lowercase host
    return `${u.protocol}//${u.hostname.toLowerCase()}${u.pathname.replace(/\/+$/, '')}`;
  } catch {
    return url.trim().toLowerCase().replace(/\/+$/, '');
  }
}

function urlsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return canonical(a) === canonical(b);
}

// ── Deduplicated link set ────────────────────────────────────

export interface SocialLink {
  label: string;
  url: string;
  type: 'instagram' | 'website';
}

export interface SocialLinkInput {
  instagramHandle?: string | null;
  portfolioUrl?: string | null;
  websiteUrl?: string | null;
}

/**
 * Produce a deduplicated, ordered list of social links for display.
 *
 * Rules:
 * 1. If `portfolioUrl` / `websiteUrl` is empty → show only Instagram (if present).
 * 2. If `portfolioUrl` / `websiteUrl` equals `instagramHandle` URL → show ONLY Instagram.
 * 3. If `portfolioUrl` / `websiteUrl` is an IG URL *and* `instagramHandle` is also present
 *    → show ONLY ONE Instagram link (prefer `instagramHandle`).
 * 4. Otherwise → Instagram + Website.
 */
export function getDeduplicatedLinks(input: SocialLinkInput): SocialLink[] {
  const links: SocialLink[] = [];

  const igUrl = instagramHandleToUrl(input.instagramHandle);
  // Pick the first non-empty "other" URL (portfolio takes precedence)
  const otherRaw = (input.portfolioUrl?.trim() || input.websiteUrl?.trim()) || '';
  const otherUrl = otherRaw ? normalizeUrl(otherRaw) : '';

  const hasIg = !!igUrl;
  const hasOther = !!otherUrl;

  if (hasIg) {
    links.push({ label: 'Instagram', url: igUrl, type: 'instagram' });
  }

  if (hasOther) {
    // Skip if it's a duplicate of the IG handle URL
    if (hasIg && urlsMatch(otherUrl, igUrl)) {
      // duplicate – already covered by the IG link above
    }
    // Skip if the other URL is *also* an Instagram URL (show only IG handle link)
    else if (hasIg && isInstagramUrl(otherUrl)) {
      // duplicate Instagram domain – already covered
    }
    // If no IG handle was provided but the other URL is IG, show it as Instagram
    else if (!hasIg && isInstagramUrl(otherUrl)) {
      links.push({ label: 'Instagram', url: otherUrl, type: 'instagram' });
    }
    // Genuinely different non-IG URL → show as Website
    else {
      links.push({ label: 'Website', url: otherUrl, type: 'website' });
    }
  }

  return links;
}
