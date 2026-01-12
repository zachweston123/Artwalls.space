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

  const listPriceCents = Math.round(listPriceDollars * 100);
  const buyerFeeCents = Math.round(listPriceCents * buyerFeePct);
  const customerPaysCents = listPriceCents + buyerFeeCents;
  const venueCents = Math.round(listPriceCents * venuePct);
  const artistTakeHomePercent = artistTakeHomePercentages[artistTierKey];
  const artistCents = Math.round(listPriceCents * artistTakeHomePercent);
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
 * Calculate estimated monthly venue earnings
 */
export function estimateMonthlyEarnings(
  avgPriceDollars: number,
  salesPerMonth: number
): number {
  const venuePct = 0.15;
  return avgPriceDollars * venuePct * salesPerMonth;
}
