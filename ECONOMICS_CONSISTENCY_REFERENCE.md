# Economics Consistency Reference

## Official Artwalls Economics

All communications about pricing and earnings must use these exact figures:

### Fee Breakdown
| Component | Percentage | Amount (on $200 sale) | Purpose |
|-----------|-----------|----------------------|---------|
| **Artwork Price** | 100% | $200 | Base price set by artist |
| **Platform Fee** | -4.5% | -$9 | Payment processing, hosting, support |
| **Venue Commission** | +15% | +$30 | Revenue share for venue partner |
| **Artist Earnings** | 60-85% | $120-$162 | Depends on artist tier |

### How to Calculate

For any artwork price (P):
- Platform Fee = P × 0.045
- Venue Commission = P × 0.15
- Artist Earnings = P × 0.60 to P × 0.85

### Example Breakdown ($200 artwork)
```
Price:              $200.00 (100%)
Platform Fee:       -$9.00  (-4.5%)
Venue Commission:   +$30.00 (+15%)
Artist Earnings:    $120.00-$162.00 (60-85% depending on tier)

Artist Tier Breakdown:
  Free Tier:        $120.00 (60%)
  Starter Tier:     $144.00 (72%)
  Pro Tier:         $170.00 (85%)
```

## Artist Commission Tiers

Artists choose their earnings tier when they upgrade:

| Tier | Cost | Commission | Use Case |
|------|------|-----------|----------|
| **Free** | $0/month | 60% | New/emerging artists, testing |
| **Starter** | $5/month | 72% | Active artists, 5+ pieces |
| **Pro** | $15/month | 85% | Professional artists, portfolio |

## Where These Appear in Code

### 1. VenueSetupWizard.tsx
```tsx
// Economics note on step overview
"Why recommended: Venues earn 15% per sale. Choose artists at any tier."
```

### 2. VenuePartnerKitEmbedded.tsx
```tsx
// Economics section shows:
{
  item: 'Platform Fee (4.5%)',
  amount: '-$9',
  color: 'text-red-600'
},
{
  item: 'Your Commission (15%)',
  amount: '+$30',
  color: 'text-green-600',
  bold: true
},
{
  item: 'Artist Take-Home (60-85%)',
  amount: '$120-$162',
  color: 'text-blue-600'
}
```

### 3. VenuePartnerKit.tsx (existing)
Update section to match:
```tsx
const economicsExample = [
  { label: 'Artwork Price', value: '$200' },
  { label: 'Platform Fee (4.5%)', value: '-$9' },
  { label: 'Venue Commission (15%)', value: '+$30' },
  { label: 'Artist Earnings (60%)', value: '$120' }, // Update artist tiers
];
```

### 4. Other Components to Update

Search codebase for any hardcoded economics:

```bash
grep -r "15%" src/components/ --include="*.tsx"
grep -r "4.5%" src/components/ --include="*.tsx"
grep -r "60%" src/components/ --include="*.tsx"
grep -r "85%" src/components/ --include="*.tsx"
grep -r "commission" src/components/ --include="*.tsx"
grep -r "earnings" src/components/ --include="*.tsx"
grep -r "platform fee" src/components/ --include="*.tsx"
```

Update any that don't match these exact figures.

## Language Guidelines

### What to Say ✅

**For Venues:**
- "You earn 15% of every sale"
- "15% venue commission"
- "Support independent artists while earning revenue"
- "Simple economics: You get 15%"

**For Artists:**
- "Keep 60-85% of each sale depending on your tier"
- "Higher-tier artists earn up to 85%"
- "Competitive artist earnings (60-85%)"

**For Customers/Collectors:**
- "Support artists directly" (don't emphasize fees)
- "Artists earn the majority of proceeds"
- "[Price] buys this original artwork"

### What NOT to Say ❌

- "We only take 4.5%" (confusing, de-emphasizes artist support)
- "Venues get their cut" (sounds transactional)
- "Artists get 60%" (ignores tier variation)
- "Sellers get 80%" (inconsistent)
- "The artist receives X" (be clear what's yours vs theirs)

## Cross-Component Consistency Checklist

When adding any economics information:

- [ ] Venue commission is 15%
- [ ] Platform fee is 4.5%
- [ ] Artist earnings range from 60-85%
- [ ] Example uses $200 artwork (or clearly labeled different price)
- [ ] All percentages add up correctly
- [ ] Language is consistent across all pages
- [ ] Mobile and desktop views match
- [ ] Dark and light modes both show correctly
- [ ] Terminology is consistent (e.g., "commission" vs "earnings")

## Files That Reference Economics

Run this to find all files mentioning economics:

```bash
# Search for commission mentions
grep -l "commission\|earnings\|fee\|15%\|4.5%\|60%\|85%" \
  src/components/**/*.tsx \
  src/**/*.tsx

# Current files (as of implementation):
# - src/components/venue/VenueSetupWizard.tsx (NEW)
# - src/components/venue/VenuePartnerKitEmbedded.tsx (NEW)
# - src/components/venue/VenuePartnerKit.tsx (EXISTING - needs update)
# - src/components/pricing/PricingPage.tsx (if exists)
# - src/components/legal/VenueAgreement.tsx (if exists)
# - Any other agreement or policy documents
```

## Update Examples

### Example 1: Updating VenuePartnerKit.tsx

**Before:**
```tsx
const artistTiers = [
  {
    name: 'Free',
    commission: '60%',
    description: 'Starting artists',
  },
  // ...
];
```

**After:**
```tsx
const artistTiers = [
  {
    name: 'Free',
    commission: '60%',
    cost: '$0/month',
    description: 'Emerging artists, testing',
  },
  {
    name: 'Starter',
    commission: '72%',
    cost: '$5/month',
    description: 'Active artists, 5+ pieces',
  },
  {
    name: 'Pro',
    commission: '85%',
    cost: '$15/month',
    description: 'Professional artists, premium features',
  },
];
```

### Example 2: Partner Kit Staff Talking Points

**Update to include:**
```tsx
{
  scenario: 'Customer asks: "How much does the artist make?"',
  response: 'The artist keeps 60-85% depending on their plan. We take a small platform fee to cover payments and support, and [venue] takes 15% for supporting local art.',
}
```

## Testing Economics Accuracy

Create a test document that validates:

```typescript
// Test all economics calculations
function testEconomics() {
  const artworkPrice = 200;
  const platformFee = artworkPrice * 0.045; // Should be 9
  const venueCommission = artworkPrice * 0.15; // Should be 30
  const artistMinEarnings = artworkPrice * 0.60; // Should be 120
  const artistMaxEarnings = artworkPrice * 0.85; // Should be 170
  
  // Verify math
  console.assert(platformFee === 9, 'Platform fee incorrect');
  console.assert(venueCommission === 30, 'Venue commission incorrect');
  console.assert(artistMinEarnings === 120, 'Min artist earnings incorrect');
  console.assert(artistMaxEarnings === 170, 'Max artist earnings incorrect');
  
  // Verify total distribution
  const total = platformFee + venueCommission + artistMinEarnings;
  console.assert(total === 159, 'Economics distribution error (min tier)');
  
  const totalMax = platformFee + venueCommission + artistMaxEarnings;
  console.assert(totalMax === 209, 'Economics distribution error (max tier)');
}
```

## Compliance Notes

- All economics figures are transparent and consistent
- No hidden fees or surprise charges
- Customer-facing language emphasizes artist support
- Venue-facing language emphasizes their revenue opportunity
- Artist-facing language emphasizes competitive rates and tier flexibility

## FAQ - Economics Questions

**Q: Why 15% for venues?**
A: Fair revenue share that incentivizes venues to actively promote and rotate art while keeping majority (60-85%) with artists.

**Q: Why 4.5% platform fee?**
A: Covers Stripe payments (~2.9%), server hosting (~0.8%), support (~0.6%), and product development.

**Q: Can artists negotiate rates?**
A: Artists choose their tier (Free/Starter/Pro) which sets their commission. Venues always get 15% regardless.

**Q: What if art doesn't sell?**
A: No transaction, no fees. Win-win: venue displays free art, artist gets exposure.

**Q: Do venues pay upfront?**
A: No. Venues only pay when art sells. Zero upfront costs.

**Q: How are payouts handled?**
A: Monthly payouts via bank transfer (ACH for US venues, SEPA for EU, etc.)

## Future Considerations

If economics change in the future:

1. Update all hardcoded percentages in code
2. Update documentation
3. Communicate to all active venues via email
4. Update artist agreements
5. Update this reference document
6. Audit all customer-facing materials
7. Test all economics calculations
8. Update test suite

Remember: **Transparency builds trust**. Always be clear about how money flows.
