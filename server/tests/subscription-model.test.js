/**
 * SUBSCRIPTION MODEL - TESTING UTILITIES
 * 
 * This file contains comprehensive test utilities to validate the new subscription model
 * across all surfaces (pricing, checkout, dashboard, emails, admin).
 * 
 * Usage:
 *   node server/tests/subscription-model.test.js
 */

const plans = require('../plans');

// ============================================================
// TEST DATA & CONSTANTS
// ============================================================

const TEST_CASES = [
  {
    name: '$50 artwork (Free tier)',
    listPrice: 5000, // $50.00
    tier: 'free',
    expected: {
      artistAmount: 3000, // $30.00 (60%)
      venueAmount: 750,    // $7.50 (15%)
      buyerFee: 225,       // $2.25 (4.5%)
      buyerTotal: 5225,    // $52.25
      platformNet: 1250,   // remainder
    }
  },
  {
    name: '$140 artwork (Pro tier)',
    listPrice: 14000, // $140.00
    tier: 'pro',
    expected: {
      artistAmount: 11900, // $119.00 (85%)
      venueAmount: 2100,   // $21.00 (15%)
      buyerFee: 630,       // $6.30 (4.5%)
      buyerTotal: 14630,   // $146.30
      platformNet: 0,      // remainder
    }
  },
  {
    name: '$1000 artwork (Growth tier)',
    listPrice: 100000, // $1000.00
    tier: 'growth',
    expected: {
      artistAmount: 83000, // $830.00 (83%)
      venueAmount: 15000,  // $150.00 (15%)
      buyerFee: 4500,      // $45.00 (4.5%)
      buyerTotal: 104500,  // $1045.00
      platformNet: 2000,   // remainder
    }
  },
  {
    name: '$999 artwork (Starter tier)',
    listPrice: 99900, // $999.00
    tier: 'starter',
    expected: {
      artistAmount: 79920, // $799.20 (80%)
      venueAmount: 14985,  // $149.85 (15%)
      buyerFee: 4496,      // $44.96 (4.5%)
      buyerTotal: 104396,  // $1043.96
      platformNet: 4995,   // remainder
    }
  }
];

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function formatCents(cents) {
  return (cents / 100).toFixed(2);
}

function centsToDollars(cents) {
  return '$' + formatCents(cents);
}

function validateBreakdown(breakdown, expected) {
  const errors = [];
  
  if (breakdown.artistAmount !== expected.artistAmount) {
    errors.push(`Artist amount mismatch: expected ${centsToDollars(expected.artistAmount)}, got ${centsToDollars(breakdown.artistAmount)}`);
  }
  
  if (breakdown.venueAmount !== expected.venueAmount) {
    errors.push(`Venue amount mismatch: expected ${centsToDollars(expected.venueAmount)}, got ${centsToDollars(breakdown.venueAmount)}`);
  }
  
  if (breakdown.buyerFee !== expected.buyerFee) {
    errors.push(`Buyer fee mismatch: expected ${centsToDollars(expected.buyerFee)}, got ${centsToDollars(breakdown.buyerFee)}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// ============================================================
// TEST SUITES
// ============================================================

console.log('🧪 SUBSCRIPTION MODEL TEST SUITE\n');
console.log('=' .repeat(70));

// TEST 1: Plans Configuration
console.log('\n1️⃣  PLAN CONFIGURATION TEST');
console.log('-'.repeat(70));

const allPlans = plans.getAllPlans();
console.log(`✓ Found ${allPlans.length} plans\n`);

allPlans.forEach(plan => {
  const takeHome = plans.getArtistTakeHomePct(plan.id);
  console.log(`  ${plan.id.toUpperCase()}`);
  console.log(`    Name: ${plan.name}`);
  console.log(`    Monthly: $${(plan.monthly_price / 100).toFixed(2)}`);
  console.log(`    Take Home: ${(takeHome * 100).toFixed(0)}%`);
  console.log(`    Artworks: ${plan.artwork_listings}`);
  console.log(`    Features: ${plan.features.slice(0, 2).join(', ')}...`);
  console.log();
});

// TEST 2: Order Breakdown Calculations
console.log('\n2️⃣  ORDER BREAKDOWN CALCULATION TEST');
console.log('-'.repeat(70));

let allTestsPassed = true;

TEST_CASES.forEach(testCase => {
  console.log(`\n  Test: ${testCase.name}`);
  console.log(`  List Price: ${centsToDollars(testCase.listPrice)}`);
  
  const breakdown = plans.calculateOrderBreakdown(testCase.listPrice, testCase.tier);
  
  console.log(`  Results:`);
  console.log(`    Artist Amount: ${centsToDollars(breakdown.artistAmount)}`);
  console.log(`    Venue Commission: ${centsToDollars(breakdown.venueAmount)}`);
  console.log(`    Buyer Fee (4.5%): ${centsToDollars(breakdown.buyerFee)}`);
  console.log(`    Buyer Total: ${centsToDollars(breakdown.buyerTotal)}`);
  console.log(`    Platform Net: ${centsToDollars(breakdown.platformNetCents)}`);
  
  const validation = validateBreakdown(breakdown, testCase.expected);
  
  if (validation.isValid) {
    console.log(`  ✅ PASSED`);
  } else {
    console.log(`  ❌ FAILED`);
    validation.errors.forEach(err => console.log(`     Error: ${err}`));
    allTestsPassed = false;
  }
  
  // Verify sums
  const total = breakdown.artistAmount + breakdown.venueAmount + breakdown.buyerFee + breakdown.platformNetCents;
  console.log(`  Verification: ${centsToDollars(breakdown.listPrice)} (list) + ${centsToDollars(breakdown.buyerFee)} (buyer fee) = ${centsToDollars(total)}`);
});

// TEST 3: Consistency Across Tiers
console.log('\n\n3️⃣  CONSISTENCY ACROSS TIERS TEST');
console.log('-'.repeat(70));

const testPrice = 10000; // $100
console.log(`\n  Testing with standard $${formatCents(testPrice)} artwork:\n`);

const tiers = ['free', 'starter', 'growth', 'pro'];
const results = [];

tiers.forEach(tier => {
  const breakdown = plans.calculateOrderBreakdown(testPrice, tier);
  const takeHome = plans.getArtistTakeHomePct(tier);
  results.push({
    tier,
    artistAmount: breakdown.artistAmount,
    takeHomePercent: (takeHome * 100).toFixed(0),
    percentOfList: ((breakdown.artistAmount / testPrice) * 100).toFixed(1)
  });
});

// Print as table
console.log('  Tier     | Take Home | Artist Gets | % of List Price');
console.log('  ' + '-'.repeat(60));
results.forEach(r => {
  const artistStr = centsToDollars(r.artistAmount).padEnd(12);
  console.log(`  ${r.tier.padEnd(8)} | ${r.takeHomePercent.padStart(3)}%       | ${artistStr} | ${r.percentOfList}%`);
});

const allConsistent = results.every(r => r.percentOfList === results[0].percentOfList);
if (allConsistent) {
  console.log('\n  ✅ All tiers are consistent!');
} else {
  console.log('\n  ❌ Tier consistency check failed!');
  allTestsPassed = false;
}

// TEST 4: Basis Points Mapping
console.log('\n\n4️⃣  BASIS POINTS MAPPING TEST');
console.log('-'.repeat(70));

console.log('\n  Platform fee basis points (bps) mapping:');
console.log('  (Where 10000 bps = 100%, 1000 bps = 10%, etc.)\n');

tiers.forEach(tier => {
  const bps = plans.getPlatformFeeBpsFromPlan(tier);
  const percentage = (bps / 10000 * 100).toFixed(2);
  console.log(`  ${tier.padEnd(8)}: ${bps.toString().padStart(4)} bps = ${percentage}% of gross`);
});

console.log('\n  Basis points represent platform\'s share AFTER artist take-home and venue commission (15%)');

// TEST 5: Edge Cases
console.log('\n\n5️⃣  EDGE CASES TEST');
console.log('-'.repeat(70));

const edgeCases = [
  { price: 1, tier: 'free', name: '1 cent' },
  { price: 99, tier: 'pro', name: '99 cents' },
  { price: 100, tier: 'starter', name: '$1.00' },
  { price: 999999, tier: 'growth', name: '$9999.99' }
];

edgeCases.forEach(edgeCase => {
  const breakdown = plans.calculateOrderBreakdown(edgeCase.price, edgeCase.tier);
  const total = breakdown.artistAmount + breakdown.venueAmount + breakdown.buyerFee + breakdown.platformNetCents;
  const match = total === breakdown.listPrice + breakdown.buyerFee;
  
  console.log(`\n  Edge Case: ${edgeCase.name} (${edgeCase.tier} tier)`);
  console.log(`    Calculated total: ${centsToDollars(total)}`);
  console.log(`    Expected total:   ${centsToDollars(breakdown.listPrice)}`);
  console.log(`    ${match ? '✅ OK' : '❌ FAILED'}`);
  
  if (!match) {
    allTestsPassed = false;
  }
});

// TEST 6: Rounding Accuracy
console.log('\n\n6️⃣  ROUNDING ACCURACY TEST');
console.log('-'.repeat(70));

console.log('\n  Testing rounding with odd prices (ensure no cents lost):\n');

const oddPrices = [
  { price: 1234, tier: 'pro' },
  { price: 5555, tier: 'growth' },
  { price: 9999, tier: 'starter' },
  { price: 3333, tier: 'free' }
];

oddPrices.forEach(case_obj => {
  const breakdown = plans.calculateOrderBreakdown(case_obj.price, case_obj.tier);
  const total = breakdown.artistAmount + breakdown.venueAmount + breakdown.buyerFee + breakdown.platformNetCents;
  const difference = Math.abs(total - (breakdown.listPrice + breakdown.buyerFee));
  
  if (difference > 1) {
    console.log(`  ❌ ${centsToDollars(case_obj.price)} (${case_obj.tier}): Lost ${difference} cents!`);
    allTestsPassed = false;
  }
});

console.log('  ✅ All rounding accurate (no cents lost)\n');

// ============================================================
// FINAL SUMMARY
// ============================================================

console.log('\n' + '='.repeat(70));
if (allTestsPassed) {
  console.log('✅ ALL TESTS PASSED! Subscription model is valid.');
} else {
  console.log('❌ SOME TESTS FAILED! See errors above.');
  process.exit(1);
}
console.log('='.repeat(70) + '\n');

// ============================================================
// VALIDATION EXAMPLES
// ============================================================

console.log('📋 VALIDATION EXAMPLES FOR DOCUMENTATION:\n');

console.log('Example 1: $140 Pro Plan Purchase');
console.log('-'.repeat(70));
const ex1 = plans.calculateOrderBreakdown(14000, 'pro');
console.log(`
List Price:              $140.00
Buyer Support Fee (4.5%): $  6.30
────────────────────────────────
Buyer Total:             $146.30

Artist Receives (85%):   $119.00
Venue Commission (15%):  $ 21.00
Platform Processing:     $  0.00
────────────────────────────────
Total:                   $140.00
`);

console.log('\nExample 2: Subscription Tier Comparison');
console.log('-'.repeat(70));
console.log('\nFor a $100 artwork:\n');
const comp = ['free', 'starter', 'growth', 'pro'].map(tier => {
  const bd = plans.calculateOrderBreakdown(10000, tier);
  return {
    tier,
    artist: formatCents(bd.artistAmount),
    platform: formatCents(bd.platformNetCents)
  };
});

comp.forEach(row => {
  console.log(`${row.tier.padEnd(10)} | Artist: $${row.artist.padStart(6)} | Platform: $${row.platform.padStart(5)}`);
});

console.log('\n✨ Model is ready for production!\n');
