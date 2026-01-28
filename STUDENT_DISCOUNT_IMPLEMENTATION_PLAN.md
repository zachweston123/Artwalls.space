# 🎓 Student Discount Implementation - Action Items

**Status:** Ready for Implementation
**Priority:** HIGH - Standardization & Marketing Visibility
**Estimated Time:** 2-4 hours

---

## 📊 Current State

✅ **What's Already Working:**
- Student verification system (email domain + manual review)
- Database schema with student tracking
- API endpoints for verification and discount application
- ArtistProfile component with student section
- StudentDiscount component showing benefits page
- School search with 100+ schools pre-populated

⚠️ **What Needs Attention:**
- StudentDiscount component shows old pricing ($19, $39 as base prices)
- Discount percentages not standardized (some show 30%, some 25%)
- Student discount badge not visible on profile cards site-wide
- Signup flow doesn't detect/encourage .edu email verification
- Pricing page doesn't show student pricing toggle
- Dashboard onboarding doesn't mention student benefits
- No badge/indicator visible to other users

---

## 🎯 Implementation Tasks

### PHASE 1: Pricing Standardization (1 hour)

#### Task 1.1: Update StudentDiscount Component Pricing
**File:** `src/components/artist/StudentDiscount.tsx`

Current pricing in StudentDiscount shows:
- Base: $19 → Student: $14.25 (25% off)
- Base: $39 → Student: $29.25 (25% off)

Should show current actual prices:
- Starter: $79 → Student: $59.25 (25% off)
- Growth: $149 → Student: $111.75 (25% off)
- Pro: $599 → Student: $449.25 (25% off)

**Action:** Find and replace all pricing in StudentDiscount.tsx to match:
```typescript
// BEFORE (old pricing)
const PLAN_PRICING = {
  starter: { normal: 19, student: 14.25, annual: 228 },
  growth: { normal: 39, student: 29.25, annual: 468 },
}

// AFTER (correct pricing with 25% off)
const STUDENT_DISCOUNT = 0.25; // 25% off

const PLAN_PRICING = {
  starter: { normal: 79, discount: 79 * (1 - 0.25), annual: 79 * 12 * 0.75 },
  growth: { normal: 149, discount: 149 * (1 - 0.25), annual: 149 * 12 * 0.75 },
  pro: { normal: 599, discount: 599 * (1 - 0.25), annual: 599 * 12 * 0.75 },
};
```

---

### PHASE 2: Student Badge Visibility (1.5 hours)

#### Task 2.1: Create StudentBadge Component
**New File:** `src/components/shared/StudentBadge.tsx`

```typescript
interface StudentBadgeProps {
  isVerified: boolean;
  discountActive: boolean;
  expiresAt?: string;
  size?: 'sm' | 'md' | 'lg';
  showDiscountAmount?: boolean;
}

export function StudentBadge({
  isVerified,
  discountActive,
  expiresAt,
  size = 'md',
  showDiscountAmount = false
}: StudentBadgeProps) {
  if (!isVerified) return null;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  const isExpiring = expiresAt && new Date(expiresAt) < new Date();

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-[var(--green)]/10 border border-[var(--green)]/30 text-[var(--green)] font-medium flex items-center gap-2 whitespace-nowrap`}>
      <span>✓</span>
      <span>Verified Student</span>
      {discountActive && <span className="text-[var(--green)]/80">• 25% Off</span>}
      {isExpiring && <span className="text-[var(--yellow)]/80">• Expiring Soon</span>}
    </div>
  );
}
```

#### Task 2.2: Add Badge to ArtistCard Component
**File:** `src/components/artist/ArtistCard.tsx` (or similar)

Add near the artist name/title:
```typescript
{artistData?.is_student_verified && (
  <StudentBadge 
    isVerified={artistData.is_student_verified}
    discountActive={artistData.student_discount_active}
    expiresAt={artistData.student_discount_applied_at}
    size="sm"
  />
)}
```

#### Task 2.3: Add Badge to Artist Profile Header
**File:** `src/components/artist/ArtistProfile.tsx`

Near artist name/bio section:
```typescript
{isStudentVerified && (
  <StudentBadge
    isVerified={isStudentVerified}
    discountActive={studentDiscountActive}
    expiresAt={studentDiscountAppliedAt}
    size="lg"
    showDiscountAmount={true}
  />
)}
```

#### Task 2.4: Add Badge to Venue Browse View
**File:** `src/components/venue/ArtistBrowse.tsx` (or similar)

When displaying list of artists:
```typescript
{artist.is_student_verified && (
  <StudentBadge
    isVerified={true}
    discountActive={artist.student_discount_active}
    size="sm"
  />
)}
```

---

### PHASE 3: Signup Flow Enhancement (1 hour)

#### Task 3.1: Detect .edu Email in Signup
**File:** `src/pages/Signup.tsx` (or auth flow)

```typescript
const handleEmailChange = (email: string) => {
  setEmail(email);
  
  // Detect .edu email
  const isEduEmail = email.toLowerCase().endsWith('.edu');
  setShowStudentPrompt(isEduEmail);
};

// Show prompt if .edu detected
{showStudentPrompt && (
  <div className="p-4 bg-[var(--green)]/10 border border-[var(--green)]/30 rounded-lg">
    <p className="font-medium text-[var(--green)]">🎓 Student? Verify to Get 25% Off</p>
    <p className="text-sm text-[var(--green)]/80 mt-1">
      We detected a .edu email. Verify your student status to unlock exclusive discounts.
    </p>
    <button onClick={() => setSkipStudentVerification(false)}>
      Yes, I'm a Student
    </button>
    <button onClick={() => setSkipStudentVerification(true)}>
      Not Right Now
    </button>
  </div>
)}
```

#### Task 3.2: Post-Signup Student Verification Flow
**File:** `src/pages/Onboarding.tsx` (or post-auth redirect)

Add student verification step early in onboarding:
```typescript
const onboardingSteps = [
  { id: 'email', label: 'Email Verified', completed: emailVerified },
  { id: 'profile', label: 'Basic Profile', completed: profileCompleted },
  { id: 'student', label: 'Student Status (Optional)', completed: studentCompleted },
  // ... other steps
];

// If .edu email detected, show student verification early
if (userEmail?.endsWith('.edu') && !studentCompleted) {
  return <StudentVerificationStep onComplete={() => setStudentCompleted(true)} />;
}
```

---

### PHASE 4: Pricing Page Enhancement (0.5 hours)

#### Task 4.1: Add Student Pricing Toggle
**File:** `src/pages/Pricing.tsx` (or PricingPage.tsx)

```typescript
const [showStudentPricing, setShowStudentPricing] = useState(false);

// Add toggle button
<div className="flex justify-center gap-4 mb-8">
  <button
    onClick={() => setShowStudentPricing(false)}
    className={`px-6 py-2 rounded-lg font-medium transition ${
      !showStudentPricing 
        ? 'bg-[var(--primary)] text-white' 
        : 'bg-[var(--surface-1)] text-[var(--text)]'
    }`}
  >
    Regular Pricing
  </button>
  <button
    onClick={() => setShowStudentPricing(true)}
    className={`px-6 py-2 rounded-lg font-medium transition ${
      showStudentPricing 
        ? 'bg-[var(--green)] text-white' 
        : 'bg-[var(--surface-1)] text-[var(--text)]'
    }`}
  >
    🎓 Student Pricing (25% Off)
  </button>
</div>

// Display prices based on toggle
<div className="text-3xl font-bold text-[var(--text)]">
  {showStudentPricing ? (
    <>
      <span className="line-through text-[var(--text-muted)]">${plan.price}</span>
      <span className="ml-3 text-[var(--green)]">${plan.price * 0.75}</span>
      <span className="text-sm text-[var(--text-muted)] ml-2">/month</span>
    </>
  ) : (
    <>${plan.price}</> 
  )}
</div>

// Add note
{showStudentPricing && (
  <div className="text-xs text-[var(--green)] font-medium mt-2">
    Save ${(plan.price * 0.25).toFixed(2)}/month
  </div>
)}
```

---

### PHASE 5: Dashboard Onboarding (1 hour)

#### Task 5.1: Add Student Benefits to Welcome Screen
**File:** `src/components/artist/Welcome.tsx` or `Onboarding.tsx`

```typescript
// Add to onboarding cards/sections
<div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--surface-1)]">
  <div className="flex items-start justify-between">
    <div>
      <h3 className="font-medium text-[var(--text)]">🎓 Student Benefits</h3>
      <p className="text-sm text-[var(--text-muted)] mt-1">
        Verify your .edu email to unlock 25% off all plans, forever.
      </p>
    </div>
    <button onClick={() => onNavigate('student-benefits')} className="px-3 py-1.5 rounded-lg bg-[var(--green)] text-white text-sm font-medium">
      Verify Now
    </button>
  </div>
  {userEmail?.endsWith('.edu') && !studentVerified && (
    <div className="mt-3 p-2 rounded bg-[var(--green)]/10 text-[var(--green)] text-xs font-medium">
      ✓ Your email looks like a student email - you can verify in 60 seconds!
    </div>
  )}
</div>
```

#### Task 5.2: Add Student Progress Indicator
**File:** `src/components/artist/Profile.tsx`

```typescript
// Show in profile completion widget
{!studentVerified && userEmail?.endsWith('.edu') && (
  <div className="p-3 rounded-lg bg-[var(--green)]/10 border border-[var(--green)]/30">
    <p className="text-sm font-medium text-[var(--green)]">
      25% Discount Available - Complete Your Student Verification
    </p>
    <div className="w-full bg-[var(--green)]/20 rounded-full h-2 mt-2">
      <div className="bg-[var(--green)] h-2 rounded-full" style={{width: '0%'}}></div>
    </div>
  </div>
)}
```

---

### PHASE 6: Marketing & Landing Page (Optional - Higher Impact)

#### Task 6.1: Create Student Landing Page
**New File:** `src/pages/ForStudents.tsx`

```typescript
export default function ForStudents() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Hero */}
      <section className="py-20 text-center">
        <h1 className="text-5xl font-bold text-[var(--text)] mb-4">
          🎓 Artists & Students Get 25% Off
        </h1>
        <p className="text-xl text-[var(--text-muted)] mb-8">
          Verify your university email in 60 seconds and unlock exclusive discounts on all plans
        </p>
        <button className="px-8 py-3 rounded-lg bg-[var(--green)] text-white font-medium">
          Verify Your Student Status
        </button>
      </section>

      {/* Benefits Grid */}
      <section className="py-20 grid md:grid-cols-3 gap-8">
        {[
          { icon: '⚡', title: 'Instant', desc: 'Verify in 60 seconds with your .edu email' },
          { icon: '💰', title: '25% Off', desc: 'Save on Starter, Growth, and Pro plans' },
          { icon: '🔄', title: '1 Year', desc: 'Discount valid for 12 months from verification' },
          { icon: '🏫', title: '200+ Schools', desc: 'Most major universities supported' },
          { icon: '📱', title: 'Anytime', desc: 'Verify now or claim your discount later' },
          { icon: '🛡️', title: 'Secure', desc: 'We only verify your email domain' },
        ].map(benefit => (
          <div key={benefit.title} className="p-6 rounded-lg bg-[var(--surface-1)] border border-[var(--border)]">
            <div className="text-4xl mb-3">{benefit.icon}</div>
            <h3 className="font-bold text-[var(--text)] mb-2">{benefit.title}</h3>
            <p className="text-sm text-[var(--text-muted)]">{benefit.desc}</p>
          </div>
        ))}
      </section>

      {/* Pricing Table */}
      <section className="py-20">
        <h2 className="text-3xl font-bold text-[var(--text)] mb-8 text-center">Student Pricing</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left p-4 font-medium text-[var(--text)]">Plan</th>
                <th className="text-center p-4 font-medium text-[var(--text)]">Regular</th>
                <th className="text-center p-4 font-medium text-[var(--green)]">Student Price</th>
                <th className="text-center p-4 font-medium text-[var(--green)]">Annual Savings</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Starter', regular: 79, student: 59.25, annual: 237 },
                { name: 'Growth', regular: 149, student: 111.75, annual: 444 },
                { name: 'Pro', regular: 599, student: 449.25, annual: 1791 },
              ].map(plan => (
                <tr key={plan.name} className="border-b border-[var(--border)]">
                  <td className="p-4 font-medium text-[var(--text)]">{plan.name}</td>
                  <td className="p-4 text-center text-[var(--text)]">${plan.regular}/mo</td>
                  <td className="p-4 text-center text-[var(--green)] font-bold">${plan.student}/mo</td>
                  <td className="p-4 text-center text-[var(--green)]">${plan.annual}/yr</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <h2 className="text-3xl font-bold text-[var(--text)] mb-8">Common Questions</h2>
        <div className="space-y-4 max-w-2xl">
          {[
            { q: 'How do I verify my student status?', a: 'Enter your school and .edu email in your profile. We verify automatically - no documents needed!' },
            { q: 'What if my school isn\'t listed?', a: 'We support 200+ schools. If yours isn\'t listed, let us know and we\'ll add it within 24 hours.' },
            { q: 'When does my discount expire?', a: 'Discounts are valid for 1 year from verification. We\'ll send a reminder before expiration so you can renew.' },
            { q: 'Can I stack discounts?', a: 'Student discounts are 25% off - no additional discounts can be combined.' },
            { q: 'Is my data secure?', a: 'We only verify your email domain. We never store enrollment documents or personal information.' },
          ].map(faq => (
            <details key={faq.q} className="p-4 rounded-lg bg-[var(--surface-1)] border border-[var(--border)]">
              <summary className="font-medium text-[var(--text)] cursor-pointer">{faq.q}</summary>
              <p className="mt-3 text-[var(--text-muted)]">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center bg-[var(--surface-1)] rounded-lg">
        <h2 className="text-3xl font-bold text-[var(--text)] mb-4">Ready to Get Started?</h2>
        <p className="text-lg text-[var(--text-muted)] mb-8 max-w-2xl mx-auto">
          Join 100+ verified student artists earning more and paying less.
        </p>
        <button className="px-8 py-3 rounded-lg bg-[var(--green)] text-white font-medium text-lg">
          Verify My Student Status - 25% Off
        </button>
      </section>
    </div>
  );
}
```

#### Task 6.2: Link to Student Page from Navbar
**File:** `src/components/nav/Navbar.tsx`

```typescript
// Add to navigation
<a href="/for-students" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[var(--surface-1)] transition">
  <span>🎓</span>
  <span>Students</span>
</a>
```

---

### PHASE 7: Email Campaign (For Later)

#### Email 1: Welcome to .edu Signups
**Subject:** "🎓 Verified Students Get 25% Off at Artwalls"

**Content:**
- We noticed you signed up with a .edu email!
- Quick 60-second verification gets you 25% off forever
- Link to verification page
- "Not a student? No problem, just ignore this."

#### Email 2: 30-Day Expiration Reminder
**Trigger:** 30 days before discount expires
**Subject:** "Your 25% Student Discount Expires in 30 Days"

**Content:**
- Your student discount is expiring soon (date)
- One click to renew for another year
- Breakdown of how much you're saving

---

## 🔍 Testing Checklist

### Phase 1: Pricing
- [ ] StudentDiscount component shows correct prices ($79, $149, $599 base)
- [ ] 25% discount math is correct for all tiers
- [ ] Student prices display properly ($59.25, $111.75, $449.25)

### Phase 2: Student Badge
- [ ] Badge appears on verified student profiles
- [ ] Badge shows on artist cards in browse view
- [ ] Badge shows in venues when viewing student artists
- [ ] Badge styling is consistent with design system
- [ ] Verified/unverified states display correctly

### Phase 3: Signup Flow
- [ ] .edu email detected on signup
- [ ] Prompt appears asking to verify as student
- [ ] User can skip and verify later
- [ ] Verification flow works post-signup

### Phase 4: Pricing Page
- [ ] Toggle button works (regular ↔ student pricing)
- [ ] Correct prices display for each toggle state
- [ ] Savings amount shown for student pricing
- [ ] Mobile responsive

### Phase 5: Dashboard
- [ ] Onboarding shows student benefits card
- [ ] .edu detection shows verification opportunity
- [ ] Progress bar or completion status visible
- [ ] CTA button navigates to verification

### Phase 6: Landing Page
- [ ] Page loads without errors
- [ ] All sections visible and styled correctly
- [ ] CTA buttons work
- [ ] Pricing table displays correctly
- [ ] Mobile responsive

---

## 📈 Success Metrics Post-Implementation

**Track These in Analytics:**
```sql
-- Visitors to /for-students page
-- Signup-to-verification rate for .edu emails
-- Student discount claim rate
-- Starter → Growth upgrades (comparing students vs non-students)
-- Cost per student acquisition
-- Student lifetime value vs non-student
```

---

## 🚀 Deployment Order

**Recommended deployment sequence:**
1. Phase 1: Pricing (low risk, critical for accuracy)
2. Phase 2: Student Badge (visual, high impact)
3. Phase 3: Signup Flow (improves conversion)
4. Phase 4: Pricing Page Toggle (marketing)
5. Phase 5: Dashboard Onboarding (increases adoption)
6. Phase 6: Landing Page (external marketing)
7. Phase 7: Email Campaign (ongoing)

---

## 📋 Summary

This implementation ensures:
✅ **Standardized 25% discount** across all plans
✅ **Visible student identification** site-wide
✅ **Easy signup detection** and verification
✅ **Clear pricing transparency** 
✅ **Strong marketing positioning** for students
✅ **Complete user journey** from discovery to claim

**Total Estimated Time:** 2-4 hours coding + testing
**Impact:** 30-50% increase in student conversion (estimated)

