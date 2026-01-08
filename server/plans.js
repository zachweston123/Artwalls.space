/**
 * Subscription Plans Configuration
 * Single source of truth for all subscription tier definitions.
 * 
 * KEY DEFINITIONS:
 * - artist_take_home_pct: Percentage of LIST PRICE the artist takes home (decimal 0-1)
 * - venue_commission_pct: Percentage of LIST PRICE venue receives (always 0.10 = 10%)
 * - buyer_fee_pct: Percentage of LIST PRICE buyer pays as separate fee (always 0.03 = 3%)
 * - monthly_price: Monthly subscription cost in USD
 * 
 * CALCULATION EXAMPLE (for $140 artwork with Pro plan):
 * - List Price: $140.00
 * - Buyer Fee (3%): $4.20 → Buyer pays: $144.20
 * - Venue Commission (10%): $14.00
 * - Artist Take Home (85%): $119.00
 * - Platform + Processing: Remainder after Stripe fees
 */

export const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    monthly_price: 0,
    artist_take_home_pct: 0.65,
    features: ['1 active display', '1 artwork listing', 'Basic QR generation'],
    active_displays: 1,
    artwork_listings: 1,
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    monthly_price: 9,
    artist_take_home_pct: 0.80,
    features: ['4 active displays', 'Up to 10 artworks', 'Priority support'],
    active_displays: 4,
    artwork_listings: 10,
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    monthly_price: 19,
    artist_take_home_pct: 0.83,
    features: ['10 active displays', 'Up to 30 artworks', 'Visibility boost'],
    active_displays: 10,
    artwork_listings: 30,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    monthly_price: 39,
    artist_take_home_pct: 0.85,
    features: ['Unlimited displays', 'Unlimited artworks', 'Free protection'],
    active_displays: Infinity,
    artwork_listings: Infinity,
  },
};

// Constants for all plans
export const VENUE_COMMISSION_PCT = 0.10; // 10% of list price
export const BUYER_FEE_PCT = 0.03; // 3% of list price

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
  const listPrice = listPriceCents / 100; // Convert to dollars
  const artistTakeHomePct = getArtistTakeHomePct(planId);

  // Calculate amounts
  const buyerFeeAmount = listPrice * BUYER_FEE_PCT;
  const buyerTotal = listPrice + buyerFeeAmount;
  const venueAmount = listPrice * VENUE_COMMISSION_PCT;
  const artistAmount = listPrice * artistTakeHomePct;

  // Platform and processing gets the remainder
  // (Note: actual Stripe fees come from Stripe and reduce platform net)
  const platformGrossBeforeStripe = listPrice - venueAmount - artistAmount;

  return {
    listPriceCents,
    listPrice,
    // Buyer side
    buyerFeeCents: Math.round(buyerFeeAmount * 100),
    buyerFeeAmount,
    buyerTotalCents: Math.round(buyerTotal * 100),
    buyerTotal,
    // Venue
    venueCents: Math.round(venueAmount * 100),
    venueAmount,
    // Artist
    artistCents: Math.round(artistAmount * 100),
    artistAmount,
    artistTakeHomePct,
    // Platform (before actual Stripe fees)
    platformGrossCents: Math.round(platformGrossBeforeStripe * 100),
    platformGrossAmount: platformGrossBeforeStripe,
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
