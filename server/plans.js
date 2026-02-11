// @deprecated — Plan config lives in worker/index.ts.
throw new Error('server/plans.js is deprecated');
 * NEW BUSINESS MODEL (SOURCE OF TRUTH)
 * ========================================================
 * 
 * KEY DEFINITIONS:
 * - artist_take_home_pct: Percentage of LIST PRICE the artist takes home (decimal 0-1)
 * - venue_commission_pct: Percentage of LIST PRICE venue receives (always 0.15 = 15%)
 * - buyer_fee_pct: Percentage of LIST PRICE buyer pays as separate fee (always 0.045 = 4.5%)
 * - monthly_price: Monthly subscription cost in USD
 * 
 * ARTIST TAKE-HOME BY SUBSCRIPTION (OF LIST PRICE):
 * - Free: 60%
 * - Starter: 80% ($9/month)
 * - Growth: 83% ($19/month)
 * - Pro: 85% ($39/month)
 * 
 * CALCULATION EXAMPLE (for $140 artwork with Pro plan):
 * - List Price: $140.00
 * - Buyer Fee (4.5%): $6.30 → Buyer pays: $146.30
 * - Venue Commission (15%): $21.00
 * - Artist Take Home (85%): $119.00
 * - Platform + Processing: Remainder after payment processing
 */

export const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    monthly_price: 0,
    monthly_price_cents: 0,
    artist_take_home_pct: 0.60,
    features: ['1 active display', '1 artwork listing', 'Basic QR generation'],
    active_displays: 1,
    artwork_listings: 1,
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    monthly_price: 9,
    monthly_price_cents: 900,
    artist_take_home_pct: 0.80,
    features: ['4 active displays', 'Up to 10 artworks', 'Priority support'],
    active_displays: 4,
    artwork_listings: 10,
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    monthly_price: 19,
    monthly_price_cents: 1900,
    artist_take_home_pct: 0.83,
    features: ['10 active displays', 'Up to 30 artworks', 'Visibility boost'],
    active_displays: 10,
    artwork_listings: 30,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    monthly_price: 39,
    monthly_price_cents: 3900,
    artist_take_home_pct: 0.85,
    features: ['Unlimited displays', 'Unlimited artworks', 'Free protection'],
    active_displays: Infinity,
    artwork_listings: Infinity,
  },
};

// Constants for all plans (SOURCE OF TRUTH)
export const VENUE_COMMISSION_PCT = 0.15; // 15% of list price (UPDATED)
export const BUYER_FEE_PCT = 0.045; // 4.5% of list price (UPDATED)

/**
 * Get artist take-home percentage for a given plan
 * @param {string} planId - 'free', 'starter', 'growth', 'pro'
 * @returns {number} Take-home percentage as decimal (0.65-0.85)
 */
export function getArtistTakeHomePct(planId) {
  const plan = SUBSCRIPTION_PLANS[String(planId || 'free').toLowerCase()];
  return plan?.artist_take_home_pct ?? SUBSCRIPTION_PLANS.free.artist_take_home_pct;
}

/**
 * Convert plan to basis points representation (for legacy systems)
 * Legacy: Returns "platform fee bps" which = (1 - artist_take_home_pct - venue_commission_pct) * 10000
 * This is useful for backward compatibility but should not be displayed to users.
 * 
 * @param {string} planId
 * @returns {number} Basis points (100 = 1%)
 */
export function getPlatformFeeBpsFromPlan(planId) {
  const artistTakeHome = getArtistTakeHomePct(planId);
  // Platform fee = 1 - artist take home - venue commission
  // (remaining is split between platform and Stripe fees)
  const platformShare = 1 - artistTakeHome - VENUE_COMMISSION_PCT;
  return Math.round(platformShare * 10000);
}

/**
 * Calculate order breakdown for a given artwork list price and plan
 * 
 * @param {number} listPriceCents - Artwork price in cents
 * @param {string} planId - Subscription tier
 * @returns {Object} Breakdown with all monetary amounts
 */
export function calculateOrderBreakdown(listPriceCents, planId) {
  const artistTakeHomePct = getArtistTakeHomePct(planId);

  // Work in cents throughout to avoid floating-point errors
  const buyerFeeCents = Math.round(listPriceCents * BUYER_FEE_PCT);
  const buyerTotalCents = listPriceCents + buyerFeeCents;
  const venueAmountCents = Math.round(listPriceCents * VENUE_COMMISSION_PCT);
  const artistAmountCents = Math.round(listPriceCents * artistTakeHomePct);
  const platformNetCents = listPriceCents - venueAmountCents - artistAmountCents;

  return {
    listPrice: listPriceCents,
    listPriceCents,
    // Buyer side
    buyerFee: buyerFeeCents,
    buyerFeeCents,
    buyerTotal: buyerTotalCents,
    buyerTotalCents,
    // Venue
    venueAmount: venueAmountCents,
    venueAmountCents,
    // Artist
    artistAmount: artistAmountCents,
    artistAmountCents,
    artistTakeHomePct,
    // Platform (before payment processor fees)
    platformNetCents,
  };
}

/**
 * Get all subscription plans as array (for UI iteration)
 * @returns {Array} Array of plan objects
 */
export function getAllPlans() {
  return Object.values(SUBSCRIPTION_PLANS);
}

/**
 * Get plan details by ID
 * @param {string} planId
 * @returns {Object|null} Plan object or null if not found
 */
export function getPlanById(planId) {
  return SUBSCRIPTION_PLANS[String(planId || 'free').toLowerCase()] || null;
}
