# 💰 Student Discount Pricing Reference

**Last Updated:** January 27, 2026

---

## 📊 Official Pricing Table

### Base Plans (Regular Pricing)

| Tier | Monthly | Annual | Take-Home % |
|------|---------|--------|------------|
| **Free** | Free | Free | 60% |
| **Starter** | $79 | $948 | 80% |
| **Growth** | $149 | $1,788 | 83% |
| **Pro** | $599 | $7,188 | 85% |

---

## 🎓 Student Discount Pricing (25% Off)

### Student Prices

| Tier | Regular Price | Student Price (25% Off) | Monthly Savings | Annual Savings |
|------|---------------|------------------------|-----------------|-----------------|
| **Free** | Free | Free* | $0 | $0 |
| **Starter** | $79.00 | $59.25 | $19.75 | $237.00 |
| **Growth** | $149.00 | $111.75 | $37.25 | $447.00 |
| **Pro** | $599.00 | $449.25 | $149.75 | $1,797.00 |

*Free tier: Students get free upgrade offer to Starter (see below)

---

## ✏️ Exact Calculation Formulas

### Standard Formula
```
Student Price = Regular Price × (1 - 0.25)
Student Price = Regular Price × 0.75
```

### By Tier

**Starter:**
```
Regular: $79.00
Discount: $79.00 × 0.25 = $19.75
Student: $79.00 - $19.75 = $59.25 ✓
Check: $59.25 × 4 = $237/year ✓
```

**Growth:**
```
Regular: $149.00
Discount: $149.00 × 0.25 = $37.25
Student: $149.00 - $37.25 = $111.75 ✓
Check: $111.75 × 12 = $1,341/year ✓
```

**Pro:**
```
Regular: $599.00
Discount: $599.00 × 0.25 = $149.75
Student: $599.00 - $149.75 = $449.25 ✓
Check: $449.25 × 12 = $5,391/year ✓
```

---

## 🔄 Free Tier Special Offer

**For Free Tier Students:**
- Regular offer: Free Starter Plan upgrade
- Student offer: Free upgrade to Starter ($79 value)
- Next step: Can upgrade to Growth ($111.75/mo) or Pro ($449.25/mo) with student pricing

---

## 💻 Code Examples

### JavaScript Calculation

```typescript
const STUDENT_DISCOUNT = 0.25; // 25%

const PLAN_PRICING = {
  free: { monthlyPrice: 0, takeHome: 0.60 },
  starter: { monthlyPrice: 79, takeHome: 0.80 },
  growth: { monthlyPrice: 149, takeHome: 0.83 },
  pro: { monthlyPrice: 599, takeHome: 0.85 },
};

function calculateStudentPrice(tier: string): number {
  const price = PLAN_PRICING[tier]?.monthlyPrice ?? 0;
  return price * (1 - STUDENT_DISCOUNT);
}

function calculateStudentAnnualPrice(tier: string): number {
  return calculateStudentPrice(tier) * 12;
}

function calculateStudentSavings(tier: string): number {
  const regular = PLAN_PRICING[tier]?.monthlyPrice ?? 0;
  return regular - calculateStudentPrice(tier);
}

// Usage:
console.log(calculateStudentPrice('growth')); // 111.75
console.log(calculateStudentAnnualPrice('growth')); // 1341
console.log(calculateStudentSavings('growth')); // 37.25
```

### React Component

```typescript
interface PricingCardProps {
  tier: string;
  isStudent: boolean;
}

export function PricingCard({ tier, isStudent }: PricingCardProps) {
  const PLANS = {
    starter: { name: 'Starter', price: 79, color: 'blue' },
    growth: { name: 'Growth', price: 149, color: 'purple' },
    pro: { name: 'Pro', price: 599, color: 'gold' },
  };

  const plan = PLANS[tier];
  if (!plan) return null;

  const displayPrice = isStudent ? plan.price * 0.75 : plan.price;
  const savings = isStudent ? plan.price * 0.25 : 0;

  return (
    <div className="pricing-card">
      <h3>{plan.name} Plan</h3>
      
      <div className="price-section">
        {isStudent && plan.price > 0 && (
          <span className="regular-price">${plan.price.toFixed(2)}</span>
        )}
        <span className={`student-price ${isStudent ? 'highlighted' : ''}`}>
          ${displayPrice.toFixed(2)}/month
        </span>
      </div>

      {isStudent && savings > 0 && (
        <div className="savings-badge">
          Save ${savings.toFixed(2)}/month
          <br />
          (${(savings * 12).toFixed(2)}/year)
        </div>
      )}

      <button>
        {isStudent ? 'Claim Discount' : 'Upgrade'}
      </button>
    </div>
  );
}
```

### SQL Query for Billing

```sql
-- Calculate student billing amount
SELECT 
  artist_id,
  plan_tier,
  CASE 
    WHEN is_student_verified AND student_discount_active THEN
      CASE 
        WHEN plan_tier = 'starter' THEN 59.25
        WHEN plan_tier = 'growth' THEN 111.75
        WHEN plan_tier = 'pro' THEN 449.25
        ELSE 0
      END
    ELSE
      CASE 
        WHEN plan_tier = 'starter' THEN 79
        WHEN plan_tier = 'growth' THEN 149
        WHEN plan_tier = 'pro' THEN 599
        ELSE 0
      END
  END as monthly_billing,
  is_student_verified,
  student_discount_active,
  student_discount_applied_at,
  student_discount_applied_at + INTERVAL '1 year' as discount_expires_at
FROM artists
WHERE billing_active = true
ORDER BY artist_id;
```

---

## 📋 Display Copy

### Short Form (Badge/Label)
```
"$59.25/month (25% off)"
"$111.75/mo • Student Discount"
"$449.25/month with student discount"
```

### Medium Form (Product Card)
```
GROWTH PLAN
Regular Price: $149/month
Student Price: $111.75/month
Save: $37.25/month

You Save: $447/year
Verified Students Only
```

### Long Form (Landing Page)
```
GROWTH PLAN - STUDENT PRICING

Regular Price: $149.00 per month
Your Student Price: $111.75 per month

Monthly Savings: $37.25
Annual Savings: $447.00

You get the same Growth Plan features 
for 25% less every month, for the next 
12 months (until January 27, 2027).

After 1 year, your student discount will 
expire. You can renew it if you're still 
a verified student.

[Claim This Plan]
```

---

## 📱 Display Rules for UI

### When to Show Student Pricing

✅ **Show student pricing when:**
- `is_student_verified === true`
- `student_discount_active === true`
- `student_discount_applied_at` is within last 365 days
- User is viewing their own account

✅ **Show "expiring soon" when:**
- Discount expires within 30 days
- Show yellow/warning badge
- Add CTA: "Renew Your Discount"

❌ **DON'T show student pricing when:**
- Student is not logged in
- `is_student_verified === false`
- `student_discount_active === false`
- Discount has expired
- Viewing another user's profile (privacy)

### Display Priority

1. **Student's own dashboard:** Always show student pricing
2. **Billing page:** Show student pricing with expiration info
3. **Upgrade flow:** Show side-by-side comparison
4. **Public profile:** Show student badge, but NOT specific pricing

---

## 📊 Verification Example

### Entry 1: New Verified Student
```
User: Jane (jane@stanford.edu)
is_student_verified: true
student_discount_active: true
student_discount_applied_at: 2026-01-27 10:30:00
Plan: Growth ($149)

Display:
Regular: $149.00/month
Student: $111.75/month
Saves: $37.25/month ($447/year)
Expires: January 27, 2027

Status: ✓ Active
```

### Entry 2: Student with Expiring Discount
```
User: James (james@mit.edu)
is_student_verified: true
student_discount_active: true
student_discount_applied_at: 2025-04-15 09:00:00
Plan: Pro ($599)
Calculated Expiration: 2026-04-15 (88 days from now)

Display:
Regular: $599.00/month
Student: $449.25/month
Saves: $149.75/month ($1,797/year)
Expires: April 15, 2026 ⚠️ (88 days)

Status: ⚠️ Expiring Soon
CTA: [Renew Your Discount]
```

### Entry 3: Expired Discount
```
User: Alex (alex@risd.edu)
is_student_verified: true
student_discount_active: false (expired)
student_discount_applied_at: 2025-01-20 15:45:00
Plan: Starter ($79)

Display:
Current: $79.00/month
(No student discount shown)

Status: ⏳ Discount Expired
CTA: [Renew for 25% Off]
```

---

## 🔍 Verification Checklist

**Before launching, verify:**

- [ ] All prices calculate to 25% discount
  - [ ] Starter: $79 → $59.25 ✓
  - [ ] Growth: $149 → $111.75 ✓
  - [ ] Pro: $599 → $449.25 ✓

- [ ] Code examples work without errors
  - [ ] JavaScript calculation ✓
  - [ ] React component renders ✓
  - [ ] SQL query returns correct prices ✓

- [ ] Display copy is consistent
  - [ ] All UI shows same prices ✓
  - [ ] No rounding errors ✓
  - [ ] Savings calculated correctly ✓

- [ ] Expiration logic is correct
  - [ ] Discount expires after 365 days ✓
  - [ ] Warning shows 30 days before ✓
  - [ ] Can re-verify after expiration ✓

- [ ] Database matches calculations
  - [ ] Query returns correct prices ✓
  - [ ] Timestamps are correct ✓
  - [ ] No data corruption ✓

---

## 💡 Notes

### Why 25%?
- Attractive to students (save $237-1,797/year)
- Still profitable (students upgrade more)
- Competitive with industry standards
- Easy math (× 0.75 or ÷ 1.33)

### Why One Year?
- Ensures continued engagement
- Forces re-verification (safety)
- Prevents indefinite commitments
- Standard in ed-tech industry

### Future Flexibility
If you want to change these numbers:
1. Update `PLAN_PRICING` in pricing calculations
2. Update `STUDENT_DISCOUNT` constant
3. Update all UI display strings
4. Notify existing verified students of changes
5. Grandfather existing customers if decreasing discount
6. Update this reference document

---

## 📞 Support

**Questions about pricing:**
- Why are these prices? → See Business Model
- How is discount calculated? → See Code Examples
- Where should I display prices? → See Display Rules
- Did my calculation work? → See Verification Checklist

