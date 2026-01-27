/**
 * Shared pricing calculations utility
 * Source of truth for all economic calculations across the app
 * 
 * Economics Model:
 * - Buyer Support Fee: 4.5% (paid by buyer at checkout)
 * - Venue Commission: 15% (always)
 * - Artist Take-Home: varies by plan (60%, 80%, 83%, 85%)
 * - Platform + Processing: remainder after all payouts
 */

export type ArtistTierKey = 'free' | 'starter' | 'growth' | 'pro';

const ARTIST_TIER_CONFIG: Record<ArtistTierKey, { takeHomePercent: number; platformBps: number }> = {
  free: { takeHomePercent: 0.6, platformBps: 2500 },
  starter: { takeHomePercent: 0.8, platformBps: 500 },
  growth: { takeHomePercent: 0.83, platformBps: 200 },
  pro: { takeHomePercent: 0.85, platformBps: 0 },
};

const VENUE_COMMISSION_PERCENT = 0.15;
const BUYER_FEE_PERCENT = 0.045;

const ARTIST_TIER_ALIASES: Record<string, ArtistTierKey> = {
  free: 'free',
  freetier: 'free',
  tier1: 'free',
  starter: 'starter',
  basictier: 'starter',
  basic: 'starter',
  tier2: 'starter',
  growth: 'growth',
  tier3: 'growth',
  scale: 'growth',
  pro: 'pro',
  professional: 'pro',
  premium: 'pro',
  tier4: 'pro',
};

function findNearestTierByTakeHome(takeHomePercent: number, fallback: ArtistTierKey): ArtistTierKey {
  let best: ArtistTierKey = fallback;
  let smallestDiff = Number.POSITIVE_INFINITY;
  for (const [tier, config] of Object.entries(ARTIST_TIER_CONFIG) as [ArtistTierKey, { takeHomePercent: number; platformBps: number }][]) {
    const diff = Math.abs(config.takeHomePercent - takeHomePercent);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      best = tier;
    }
  }
  return best;
}

function findNearestTierByPlatformBps(platformBps: number, fallback: ArtistTierKey): ArtistTierKey {
  let best: ArtistTierKey = fallback;
  let smallestDiff = Number.POSITIVE_INFINITY;
  for (const [tier, config] of Object.entries(ARTIST_TIER_CONFIG) as [ArtistTierKey, { takeHomePercent: number; platformBps: number }][]) {
    const diff = Math.abs(config.platformBps - platformBps);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      best = tier;
    }
  }
  return best;
}

export function normalizeArtistTier(raw: unknown, fallback: ArtistTierKey = 'starter'): ArtistTierKey {
  if (raw && typeof raw === 'object') {
    const candidate = (raw as any).tier ?? (raw as any).plan ?? (raw as any).id ?? (raw as any).name;
    if (candidate) return normalizeArtistTier(candidate, fallback);
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return fallback;
    const lower = trimmed.toLowerCase();
    const normalized = lower.replace(/[^a-z0-9]+/g, '');
    if (normalized in ARTIST_TIER_ALIASES) {
      return ARTIST_TIER_ALIASES[normalized];
    }

    if (lower.includes('%')) {
      const numeric = Number(lower.replace(/[^0-9.]+/g, ''));
      if (Number.isFinite(numeric)) {
        return findNearestTierByTakeHome(numeric / 100, fallback);
      }
    }

    if (lower.endsWith('bps')) {
      const numeric = Number(lower.replace(/[^0-9.-]+/g, ''));
      if (Number.isFinite(numeric)) {
        return findNearestTierByPlatformBps(Math.abs(Math.round(numeric)), fallback);
      }
    }

    const numeric = Number(lower.replace(/[^0-9.-]+/g, ''));
    if (Number.isFinite(numeric)) {
      if (numeric >= 100) {
        return findNearestTierByPlatformBps(Math.abs(Math.round(numeric)), fallback);
      }
      if (numeric > 1) {
        return findNearestTierByTakeHome(numeric / 100, fallback);
      }
      if (numeric >= 0 && numeric <= 1) {
        return findNearestTierByTakeHome(numeric, fallback);
      }
    }
  }

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    if (raw >= 100) {
      return findNearestTierByPlatformBps(Math.abs(Math.round(raw)), fallback);
    }
    if (raw > 1) {
      return findNearestTierByTakeHome(raw / 100, fallback);
    }
    if (raw >= 0 && raw <= 1) {
      return findNearestTierByTakeHome(raw, fallback);
    }
  }

  return fallback;
}

export interface PricingBreakdown {
  listPriceCents: number;
  buyerFeeCents: number;
  customerPaysCents: number;
  venueCents: number;
  artistCents: number;
  platformRemainderCents: number;
  artistTakeHomePercent: number;
}

/**
 * Calculate complete pricing breakdown for an artwork sale
 * 
 * @param listPriceDollars - The list price of the artwork in dollars
 * @param artistTierKey - The artist's plan tier (free, starter, growth, pro)
 * @param buyerFeePct - Buyer support fee percentage (default 4.5%)
 * @param venuePct - Venue commission percentage (default 15%)
 * @returns Complete pricing breakdown with all amounts in cents
 */
export function calculatePricingBreakdown(
  listPriceDollars: number,
  artistTierKey: ArtistTierKey,
  buyerFeePct: number = BUYER_FEE_PERCENT,
  venuePct: number = VENUE_COMMISSION_PERCENT
): PricingBreakdown {
  // Convert to cents for precise integer math
  const listPriceCents = Math.round(listPriceDollars * 100);

  // Calculate each component
  const buyerFeeCents = Math.round(listPriceCents * buyerFeePct);
  const customerPaysCents = listPriceCents + buyerFeeCents;
  const venueCents = Math.round(listPriceCents * venuePct);
  const artistTakeHomePercent = ARTIST_TIER_CONFIG[artistTierKey]?.takeHomePercent ?? ARTIST_TIER_CONFIG.starter.takeHomePercent;
  const artistCents = Math.round(listPriceCents * artistTakeHomePercent);

  // Platform + Processing is what's left after venue and artist take-home
  const platformRemainderCents = listPriceCents - venueCents - artistCents;

  return {
    listPriceCents,
    buyerFeeCents,
    customerPaysCents,
    venueCents,
    artistCents,
    platformRemainderCents,
    artistTakeHomePercent,
  };
}

export function calculateApplicationFeeCents(breakdown: PricingBreakdown): number {
  return Math.max(0, breakdown.platformRemainderCents + breakdown.venueCents);
}

export function calculatePlatformFeeBps(breakdown: PricingBreakdown): number {
  if (!breakdown.listPriceCents) return 0;
  return Math.max(0, Math.round((breakdown.platformRemainderCents / breakdown.listPriceCents) * 10000));
}

export function calculateVenueFeeBps(breakdown: PricingBreakdown): number {
  if (!breakdown.listPriceCents) return 0;
  return Math.max(0, Math.round((breakdown.venueCents / breakdown.listPriceCents) * 10000));
}

/**
 * Format cents as USD string with dollar sign
 */
export function formatCentsAsDollars(cents: number): string {
  const dollars = (cents / 100).toFixed(2);
  return `$${dollars}`;
}

/**
 * Format a percentage as a string with % sign
 */
export function formatPercentage(pct: number, decimals: number = 1): string {
  return `${(pct * 100).toFixed(decimals)}%`;
}

/**
 * Get artist tier label and description
 */
export function getArtistTierLabel(tierKey: ArtistTierKey): { name: string; takeHomePercent: number } {
  const tiers: Record<ArtistTierKey, { name: string; takeHomePercent: number }> = {
    free: { name: 'Free', takeHomePercent: 0.6 },
    starter: { name: 'Starter', takeHomePercent: 0.8 },
    growth: { name: 'Growth', takeHomePercent: 0.83 },
    pro: { name: 'Pro', takeHomePercent: 0.85 },
  };
  return tiers[tierKey];
}

/**
 * Calculate estimated monthly venue earnings
 * @param avgPriceDollars - Average artwork price
 * @param salesPerMonth - Expected sales per month
 * @returns Monthly earnings in dollars
 */
export function estimateMonthlyEarnings(
  avgPriceDollars: number,
  salesPerMonth: number
): number {
  const venuePct = 0.15;
  return avgPriceDollars * venuePct * salesPerMonth;
}