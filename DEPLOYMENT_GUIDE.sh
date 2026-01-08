#!/bin/bash
# SUBSCRIPTION MODEL REFACTOR - IMPLEMENTATION & TESTING GUIDE
# Run this after deploying code changes

set -e

echo "🎨 Artwalls Subscription Model Refactor - Deployment Guide"
echo "========================================================"
echo ""
echo "STEP 1: Deploy Code Changes"
echo "  - Merge PR with updated plans.js, PricingPage.tsx, and server changes"
echo "  - Ensure all files are deployed to production"
echo ""

# TESTING CHECKLIST
echo "STEP 2: Validation Tests"
echo ""
echo "✓ PRICING PAGE TEST"
echo "  - Navigate to /plans-pricing"
echo "  - Verify each plan shows:"
echo "    • Free: 'Take home 65%'"
echo "    • Starter: 'Take home 80%'"  
echo "    • Growth: 'Take home 83%' (Most Popular)"
echo "    • Pro: 'Take home 85%'"
echo "  - Verify NO page shows old percentages (15%, 10%, 8%, 6%)"
echo ""

echo "✓ PRICING CALCULATOR TEST"
echo "  - On pricing page, set artwork price to $140"
echo "  - Verify each plan shows:"
echo "    • Free: Artist gets $91 per sale"
echo "    • Starter: Artist gets $112 per sale"
echo "    • Growth: Artist gets $116.20 per sale"
echo "    • Pro: Artist gets $119 per sale"
echo ""

echo "✓ BREAKDOWN DISPLAY TEST"
echo "  - Should show:"
echo "    • Artwork Price: \$140"
echo "    • Venue Commission (10%): \$14"
echo "    • Buyer Support Fee (3%): \$4.20"
echo "    • Artist Take Home (Pro 85%): \$119"
echo "    • Platform & Processing: Remainder"
echo ""

echo "STEP 3: Database Verification"
echo ""
echo "✓ Run SQL checks:"
echo "  SELECT * FROM artists LIMIT 5;"
echo "  -- Verify: subscription_tier values are: free, starter, growth, pro"
echo ""
echo "  SELECT * FROM orders LIMIT 5;"
echo "  -- Verify: artist_payout_cents reflects new take-home %"
echo ""

echo "STEP 4: Stripe Price Metadata Verification"
echo ""
echo "Run this in Node.js (or via Stripe Dashboard):"
echo ""
cat << 'EOF'
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function checkPrices() {
  const prices = await stripe.prices.list({ limit: 100 });
  
  prices.data.forEach(price => {
    if (price.metadata?.tier) {
      console.log(`\n${price.metadata.tier.toUpperCase()} Plan:`);
      console.log(`  ID: ${price.id}`);
      console.log(`  Amount: $${price.unit_amount / 100}`);
      console.log(`  Metadata:`, price.metadata);
    }
  });
}

checkPrices().catch(console.error);
EOF

echo ""
echo "EXPECTED OUTPUT:"
echo "  - Each price should have metadata: { tier: '...', artist_take_home_pct: '...' }"
echo "  - Example: { tier: 'pro', artist_take_home_pct: 0.85 }"
echo ""

echo "STEP 5: Test Subscription Checkout"
echo ""
echo "  1. Log in as test artist"
echo "  2. Go to Plans & Pricing"
echo "  3. Click 'Upgrade to Growth' (or any paid plan)"
echo "  4. Complete Stripe checkout"
echo "  5. Verify:"
echo "     - Artist's subscription_tier is set to 'growth'"
echo "     - Artist's subscription_status is 'active'"
echo ""

echo "STEP 6: Test Artwork Purchase & Order Breakdown"
echo ""
echo "  1. Create test artwork priced at \$140"
echo "  2. Share QR code or purchase link with test buyer"
echo "  3. Complete purchase as buyer"
echo "  4. Verify order shows:"
echo "     - List Price: \$140"
echo "     - Buyer Fee (3%): \$4.20"
echo "     - Buyer Total: \$144.20"
echo "     - Artist Payout: \$119 (85% for Pro tier)"
echo "     - Venue Commission: \$14 (10%)"
echo ""

echo "STEP 7: Database Migration (if adding buyer_fee_cents)"
echo ""
echo "If you need to persist buyer_fee_cents, run:"
cat << 'SQLEOF'
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS buyer_fee_cents INTEGER,
ADD COLUMN IF NOT EXISTS platform_gross_cents INTEGER;

-- Backfill existing orders with calculated values
UPDATE orders
SET 
  buyer_fee_cents = ROUND(amount_cents * 0.03),
  platform_gross_cents = amount_cents - artist_payout_cents - venue_payout_cents
WHERE buyer_fee_cents IS NULL;
SQLEOF

echo ""
echo "STEP 8: Email Template Updates"
echo ""
echo "Update order receipt templates to show:"
echo "  Subject: Your Artwalls Order Confirmation"
echo ""
echo "  Thank you for your purchase!"
echo "  Artwork: [title]"
echo "  Price: \$140.00"
echo "  Buyer Support Fee (3%): \$4.20"
echo "  Total Charged: \$144.20"
echo ""
echo "  The artist will receive \$119.00"
echo "  (85% of artwork price)"
echo ""

echo "STEP 9: Admin Revenue Reports"
echo ""
echo "Update admin dashboard to show:"
echo "  - Artist Take-Home %: 65% / 80% / 83% / 85%"
echo "  - Venue Commission: Always 10%"
echo "  - Buyer Fee: Always 3%"
echo "  - Platform Net: Calculated after Stripe fees"
echo ""

echo "STEP 10: Notify Artists"
echo ""
echo "Send email to all artists:"
cat << 'EMAILEOF'
Subject: Better Earnings on Artwalls! ✨

Hi [Artist Name],

Great news! We've updated our subscription model to give you MORE of every sale.

Starting today:
• Free Plan: You now take home 65% (was 85% after old fees)
• Starter: You now take home 80% (was 90% after old fees)
• Growth: You now take home 83% (was 92% after old fees)
• Pro: You now take home 85% (was 94% after old fees)

What changed:
✓ Clearer, simpler model: You take home a % of the artwork price
✓ Venues still earn 10% (supporting the gallery)
✓ Buyers pay a small 3% support fee at checkout
✓ Everything else goes to payment processing and platform operations

Your subscription tier stays the same. No action needed!

Questions? Check out our updated FAQ.

Best,
The Artwalls Team
EMAILEOF

echo ""
echo "============================================================"
echo "✅ DEPLOYMENT COMPLETE"
echo ""
echo "Final checklist:"
echo "  ☐ Code deployed and running"
echo "  ☐ Pricing page displays new take-home %"
echo "  ☐ No old percentages (15%, 10%, 8%, 6%) visible"
echo "  ☐ Calculator shows correct splits for $140 example"
echo "  ☐ Stripe prices have correct metadata"
echo "  ☐ Test subscription creates artist with correct tier"
echo "  ☐ Test order shows buyer fee breakdown"
echo "  ☐ Emails show new language"
echo "  ☐ Admin dashboard updated"
echo "  ☐ Artist notification sent"
echo ""
echo "If all checks pass, the refactor is complete! 🎉"
