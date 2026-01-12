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
  buyerFeePct: number = 0.045,
  venuePct: number = 0.15
): PricingBreakdown {
  const artistTakeHomePercentages: Record<ArtistTierKey, number> = {
    free: 0.6,
    starter: 0.8,
    growth: 0.83,
    pro: 0.85,
  };

  // Convert to cents for precise integer math
  const listPriceCents = Math.round(listPriceDollars * 100);

  // Calculate each component
  const buyerFeeCents = Math.round(listPriceCents * buyerFeePct);
  const customerPaysCents = listPriceCents + buyerFeeCents;
  const venueCents = Math.round(listPriceCents * venuePct);
  const artistTakeHomePercent = artistTakeHomePercentages[artistTierKey];
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