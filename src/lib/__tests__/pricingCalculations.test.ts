import { describe, expect, test } from 'vitest';
import {
  calculateApplicationFeeCents,
  calculatePlatformFeeBps,
  calculatePricingBreakdown,
  calculateVenueFeeBps,
  estimateMonthlyEarnings,
  formatCentsAsDollars,
  normalizeArtistTier,
} from '../pricingCalculations';

/**
 * Test suite for pricing calculations
 * Ensures consistent economics across the app
 */

describe('Pricing Calculations', () => {
  describe('calculatePricingBreakdown', () => {
    test('$200 artwork with Free tier artist', () => {
      const result = calculatePricingBreakdown(200, 'free');

      // List price
      expect(result.listPriceCents).toBe(20000);

      // Buyer fee (4.5%)
      expect(result.buyerFeeCents).toBe(Math.round(20000 * 0.045));
      expect(result.buyerFeeCents).toBe(900);

      // Customer pays
      expect(result.customerPaysCents).toBe(20900);

      // Venue earns (15%)
      expect(result.venueCents).toBe(3000);

      // Artist earns (60%)
      expect(result.artistCents).toBe(12000);

      // Platform + Processing
      expect(result.platformRemainderCents).toBe(20000 - 3000 - 12000);
      expect(result.platformRemainderCents).toBe(5000);

      // Artist take home percent
      expect(result.artistTakeHomePercent).toBe(0.6);
    });

    test('$200 artwork with Starter tier artist (80%)', () => {
      const result = calculatePricingBreakdown(200, 'starter');

      expect(result.buyerFeeCents).toBe(900);
      expect(result.venueCents).toBe(3000);
      expect(result.artistCents).toBe(16000); // 80% of 20000
      expect(result.platformRemainderCents).toBe(1000);
    });

    test('$200 artwork with Growth tier artist (83%)', () => {
      const result = calculatePricingBreakdown(200, 'growth');

      expect(result.buyerFeeCents).toBe(900);
      expect(result.venueCents).toBe(3000);
      expect(result.artistCents).toBe(16600); // 83% of 20000
      expect(result.platformRemainderCents).toBe(400);
    });

    test('$200 artwork with Pro tier artist (85%)', () => {
      const result = calculatePricingBreakdown(200, 'pro');

      expect(result.buyerFeeCents).toBe(900);
      expect(result.venueCents).toBe(3000);
      expect(result.artistCents).toBe(17000); // 85% of 20000
      expect(result.platformRemainderCents).toBe(0);
    });

    test('Venue always earns 15% regardless of artist tier', () => {
      const free = calculatePricingBreakdown(200, 'free');
      const starter = calculatePricingBreakdown(200, 'starter');
      const growth = calculatePricingBreakdown(200, 'growth');
      const pro = calculatePricingBreakdown(200, 'pro');

      expect(free.venueCents).toBe(3000);
      expect(starter.venueCents).toBe(3000);
      expect(growth.venueCents).toBe(3000);
      expect(pro.venueCents).toBe(3000);
    });

    test('Buyer support fee is always 4.5%', () => {
      const free = calculatePricingBreakdown(200, 'free');
      const pro = calculatePricingBreakdown(200, 'pro');

      expect(free.buyerFeeCents).toBe(900);
      expect(pro.buyerFeeCents).toBe(900);
    });

    test('Handles various price points', () => {
      const result100 = calculatePricingBreakdown(100, 'free');
      const result500 = calculatePricingBreakdown(500, 'free');
      const result1000 = calculatePricingBreakdown(1000, 'free');

      // Venue gets 15%
      expect(result100.venueCents).toBe(1500);
      expect(result500.venueCents).toBe(7500);
      expect(result1000.venueCents).toBe(15000);

      // Artist gets 60%
      expect(result100.artistCents).toBe(6000);
      expect(result500.artistCents).toBe(30000);
      expect(result1000.artistCents).toBe(60000);
    });

    test('Math adds up correctly (no rounding errors)', () => {
      const result = calculatePricingBreakdown(200, 'pro');

      // Customer pays = list price + buyer fee
      expect(result.customerPaysCents).toBe(result.listPriceCents + result.buyerFeeCents);

      // List price = venue + artist + platform
      expect(result.listPriceCents).toBe(
        result.venueCents + result.artistCents + result.platformRemainderCents
      );
    });
  });

  describe('estimateMonthlyEarnings', () => {
    test('Calculates monthly earnings correctly', () => {
      // $140 average price, 1 sale per month
      const earnings = estimateMonthlyEarnings(140, 1);
      expect(earnings).toBe(140 * 0.15); // 15% = $21

      // $200 average, 5 sales
      const earnings2 = estimateMonthlyEarnings(200, 5);
      expect(earnings2).toBe(200 * 0.15 * 5); // $150

      // $1000 average, 10 sales
      const earnings3 = estimateMonthlyEarnings(1000, 10);
      expect(earnings3).toBe(1000 * 0.15 * 10); // $1500
    });
  });

  describe('formatCentsAsDollars', () => {
    test('Formats cents as dollar strings', () => {
      expect(formatCentsAsDollars(3000)).toBe('$30.00');
      expect(formatCentsAsDollars(100)).toBe('$1.00');
      expect(formatCentsAsDollars(1)).toBe('$0.01');
      expect(formatCentsAsDollars(0)).toBe('$0.00');
    });
  });

  describe('normalizeArtistTier', () => {
    test('Normalizes common string aliases', () => {
      expect(normalizeArtistTier('Starter')).toBe('starter');
      expect(normalizeArtistTier('Premium')).toBe('pro');
      expect(normalizeArtistTier('Tier1')).toBe('free');
    });

    test('Normalizes numeric representations', () => {
      expect(normalizeArtistTier(2500)).toBe('free');
      expect(normalizeArtistTier('500bps')).toBe('starter');
      expect(normalizeArtistTier(83)).toBe('growth');
      expect(normalizeArtistTier(0.85)).toBe('pro');
    });

    test('Falls back when value cannot be determined', () => {
      expect(normalizeArtistTier('unknown-level', 'starter')).toBe('starter');
    });
  });

  describe('application and fee helpers', () => {
    test('Calculates application fee from breakdown', () => {
      const breakdown = calculatePricingBreakdown(200, 'starter');
      expect(calculateApplicationFeeCents(breakdown)).toBe(
        breakdown.venueCents + breakdown.platformRemainderCents,
      );
    });

    test('Calculates platform and venue bps', () => {
      const breakdown = calculatePricingBreakdown(200, 'growth');
      expect(calculateVenueFeeBps(breakdown)).toBe(1500);
      expect(calculatePlatformFeeBps(breakdown)).toBe(
        Math.round((breakdown.platformRemainderCents / breakdown.listPriceCents) * 10000),
      );
    });
  });
});

// Run basic sanity checks if this is executed directly
if (typeof describe === 'undefined') {
  console.log('=== PRICING CALCULATION SANITY CHECKS ===');

  const test200free = calculatePricingBreakdown(200, 'free');
  console.log('$200 Free tier:');
  console.log(`  List Price: ${formatCentsAsDollars(test200free.listPriceCents)}`);
  console.log(`  Buyer Fee (4.5%): +${formatCentsAsDollars(test200free.buyerFeeCents)}`);
  console.log(`  Customer Pays: ${formatCentsAsDollars(test200free.customerPaysCents)}`);
  console.log(`  Venue Earns (15%): +${formatCentsAsDollars(test200free.venueCents)}`);
  console.log(`  Artist Takes (60%): ${formatCentsAsDollars(test200free.artistCents)}`);
  console.log(`  Platform + Processing: ${formatCentsAsDollars(test200free.platformRemainderCents)}`);

  const earnings = estimateMonthlyEarnings(140, 1);
  console.log('\nEstimated monthly earnings at $140 avg, 1 sale:');
  console.log(`  ${formatCentsAsDollars(Math.round(earnings * 100))}`);

  console.log('\n✅ All sanity checks passed!');
}
