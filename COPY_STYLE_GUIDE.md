# COPY STYLE GUIDE: NEW BUSINESS MODEL

**Purpose**: Ensure 100% consistency in how we talk about pricing across all user-facing copy

**Updated**: January 9, 2026

---

## CORE PRINCIPLES

### ✅ DO: Talk About What Users EARN
Frame messaging around artist take-home percentage, not platform fees

### ❌ DON'T: Talk About What We CHARGE
Avoid "platform fee %" language; this sounds negative

### ✅ DO: Be Transparent
Show complete breakdown at every step

### ❌ DON'T: Confuse Users
Don't use multiple names for same thing; use defined terms only

---

## APPROVED TERMS (USE ONLY THESE)

### Artist Economics
| Term | Use When | Example |
|------|----------|---------|
| **Artist Take-Home** | Describing what artist keeps per sale | "Artist Take-Home: 85% per sale" |
| **Take Home X%** | On plan cards | "Take home 85% per sale" |
| **You take home X%** | Artist-focused messaging | "You take home 85% on every sale" |
| **Artist earnings** | In calculators/dashboards | "Artist earnings: $119 per sale" |

### Commission & Fees
| Term | Use When | Example |
|------|----------|---------|
| **Venue Commission** | Describing venue share | "Venue Commission: 15%" |
| **Buyer Support Fee** | Describing buyer fee | "Buyer Support Fee: 4.5%" |
| **Platform + Processing** | Describing remainder | "Platform + Processing covers payment fees and support" |

### Pricing Components
| Term | Use When | Example |
|------|----------|---------|
| **List Price** | Original artwork price | "List Price: $140" |
| **Artist Take-Home** | Artist payout | "Artist Take-Home: $119" |
| **Venue Commission** | Venue payout | "Venue Commission: $21" |
| **Buyer Fee** | Fee added to checkout | "Buyer Support Fee: $6.30" |
| **Buyer Total** | What buyer pays | "You'll be charged: $146.30" |

### NEVER Use These Terms
❌ "Platform fee" (sounds like we're taking money)  
❌ "We charge you X%" (puts platform in negative light)  
❌ "You keep X%" (sounds like we're being generous)  
❌ "Service fee" (generic, confusing)  
❌ "Transaction fee" (sounds punitive)  
❌ "Commission take" (sounds greedy)  
❌ "Processing costs" (too technical)  
❌ "Basis points", "bps" (too technical for users)  

---

## COPY BY LOCATION

### 1. PRICING PAGE

#### Plan Card Headline
**Pattern**: `Take home X%`

```jsx
// ✅ CORRECT
<h2>Take home 85% per sale</h2>

// ❌ WRONG
<h2>85% artist commission</h2>
<h2>Only 15% platform fee</h2>
<h2>You keep 85%</h2>
```

#### Plan Card Subtext
**Pattern**: Explain what comes with plan

```jsx
// ✅ CORRECT
{plan.id === 'free' && (
  "Perfect for trying Artwalls. Upload and test with your first audience."
)}
{plan.id === 'starter' && (
  "Growing artist ready to scale. More inventory, better support."
)}
{plan.id === 'growth' && (
  "Most popular for active artists. Priority visibility and support."
)}
{plan.id === 'pro' && (
  "Best for high-volume artists. Full featured, maximum earnings."
)}

// ❌ WRONG
"Lowest platform fee (25%)" // Confusing
"Higher artist commission" // Vague
```

#### Breakdown Callout (on plan card or calculator)
**Pattern**: Show complete split

```jsx
// ✅ CORRECT
<section className="breakdown">
  <p><strong>List Price:</strong> $140</p>
  <p><strong>Venue Commission (15%):</strong> $21</p>
  <p><strong>Buyer Support Fee (4.5%):</strong> $6.30</p>
  <h3>You take home: $119</h3>
  <p className="text-muted">Platform + Processing handles payment fees and support</p>
</section>

// ❌ WRONG
<p>Artist: 85%, Platform: 15%</p> // Ignores venue + buyer fee
<p>You earn: $119</p> // Doesn't show breakdown
<p>Platform fee: 15%</p> // Wrong percentage
```

#### Feature Descriptions
**Pattern**: Focus on artist benefits, not fees

```jsx
// ✅ CORRECT
features: [
  "1 active display included",
  "1 artwork listing",
  "Basic QR generation",
  "Weekly payouts",
]

// ❌ WRONG
features: [
  "25% platform fee",
  "Low commission on sales",
  "Basic payment processing",
]
```

#### CTA Buttons
**Pattern**: Action-focused, not price-focused

```jsx
// ✅ CORRECT
button text: {
  free: "Start Free",
  starter: "Get Started",
  growth: "Upgrade to Growth",
  pro: "Upgrade to Pro",
}

// ❌ WRONG
"Lowest fee",
"Save 5%",
"Buy with 20% off",
```

---

### 2. CHECKOUT PAGE

#### Line Item Display
**Pattern**: Show what buyer pays

```jsx
// ✅ CORRECT
<div className="line-items">
  <div>
    <span>Artwork: {artwork.title}</span>
    <span className="price">$140.00</span>
  </div>
  <div>
    <span>Buyer Support Fee (4.5%)</span>
    <span className="price">$6.30</span>
  </div>
  <hr />
  <div className="total">
    <strong>Total</strong>
    <strong>$146.30</strong>
  </div>
</div>

// ❌ WRONG
<div>Artwork $140 + 15% fee = $161</div>
<div>Artist commission: $119</div>
```

#### Breakdown Section (Expandable)
**Pattern**: Show how sale is split

```jsx
// ✅ CORRECT
<details>
  <summary>How your purchase is split</summary>
  <div className="breakdown">
    <p>
      <strong>The artist</strong> (85% of the artwork price): $119.00
    </p>
    <p>
      <strong>The venue</strong> (15% of the artwork price): $21.00
    </p>
    <p>
      <strong>Buyer support</strong> (4.5% - covers payment processing): $6.30
    </p>
    <p className="text-muted">
      Payment processing is handled securely by Stripe.
    </p>
  </div>
</details>

// ❌ WRONG
<details>
  <summary>Fee breakdown</summary>
  <p>Artist: 85%</p>
  <p>Platform: 15%</p>
</details>
```

---

### 3. RECEIPTS & EMAILS

#### Subject Line
**Pattern**: Neutral, action-focused

```
// ✅ CORRECT
Subject: Your Artwalls purchase is complete
Subject: Receipt for [Artwork Title]
Subject: Your order from Artwalls

// ❌ WRONG
Subject: Save with Artwalls - Your fee breakdown
Subject: Artist earned $119 on your purchase
```

#### Email Body - Header
**Pattern**: Confirm action taken

```
// ✅ CORRECT
"Thank you for your purchase! Your order is complete."

// ❌ WRONG
"Great deal! You saved on platform fees."
```

#### Email Body - Breakdown
**Pattern**: Clear itemization

```html
<!-- ✅ CORRECT -->
<table>
  <tr>
    <td>Artwork Title:</td>
    <td>[Title]</td>
  </tr>
  <tr>
    <td>List Price:</td>
    <td>$140.00</td>
  </tr>
  <tr>
    <td>Buyer Support Fee (4.5%):</td>
    <td>$6.30</td>
  </tr>
  <tr className="total">
    <td>Total:</td>
    <td>$146.30</td>
  </tr>
</table>

<p><strong>This is how your purchase is distributed:</strong></p>
<ul>
  <li>The Artist (85%): $119.00</li>
  <li>The Venue (15%): $21.00</li>
  <li>Buyer Support: $6.30</li>
</ul>

<!-- ❌ WRONG -->
<p>You saved 15% with Artwalls commission structure!</p>
<table>
  <tr><td>Amount:</td><td>$140</td></tr>
  <tr><td>Platform fee (15%):</td><td>-$21</td></tr>
</table>
```

---

### 4. ARTIST DASHBOARDS

#### Sales List
**Pattern**: Show earnings clearly

```jsx
// ✅ CORRECT
<div className="sale-item">
  <p>Artwork sold at {venue.name}</p>
  <p className="amount">
    <strong>You earned: $119.00</strong>
    <span className="text-muted"> (85% of $140)</span>
  </p>
  <p className="text-muted">Venue commission: $21 • Buyer support fee: $6.30</p>
  <p className="text-muted">Status: Payout scheduled</p>
</div>

// ❌ WRONG
<div>Sale $140 - 15% fee = $119 earned</div>
<div>Your commission: 85%</div>
```

#### Earnings Summary
**Pattern**: Total earnings focus

```jsx
// ✅ CORRECT
<section className="summary">
  <h3>Total Earnings This Month</h3>
  <p className="big-number">$2,380.00</p>
  <p className="text-muted">
    From 20 sales at 80% take-home (Starter plan)
  </p>
  <p>Payouts: $2,325 owed (after Stripe fees)</p>
</section>

// ❌ WRONG
<p>Gross sales: $2,975</p>
<p>Platform fees (20%): $595</p>
<p>You get: $2,380</p>
```

#### Upgrade Prompt
**Pattern**: Emphasize earning more

```jsx
// ✅ CORRECT
<div className="upgrade-prompt">
  <h4>Upgrade to Pro</h4>
  <p>
    Move from 80% to 85% take-home.
    On your current sales pace, that's <strong>+$950/year</strong>.
  </p>
  <button>See all plans</button>
</div>

// ❌ WRONG
<p>Reduce your platform fee from 20% to 15%</p>
<button>Pay $39/month</button>
```

---

### 5. ADMIN & INTERNAL TOOLS

#### Admin Dashboard (Reports, Analytics)
**Pattern**: Technical accuracy, use both terms

```
// ✅ CORRECT (internal use okay here)
Report Header: "Order Breakdown Analysis"
Columns: List Price | Venue Commission (15%) | Buyer Fee (4.5%) | 
         Artist Take-Home % | Artist Amount | Platform Net

Row: $140 | $21 | $6.30 | 85% | $119 | -$6.30 (after Stripe)

// ✅ ALSO CORRECT
"Annual Platform Revenue" (if tracking this internally)
"Artist Take-Home Percentage Distribution"
"Venue Commission Analysis"

// ❌ WRONG
"Fee breakdown report"
"Commission tiers"
```

#### Admin Internal Notes
**Pattern**: Use defined percentages consistently

```
// ✅ CORRECT
"New artist on Free plan (60% take-home)"
"Venue commission policy: 15% of list price"
"Buyer fee: 4.5%, collected with artist payment"

// ❌ WRONG
"Artist gets 60% commission"
"We take 40% on free tier"
"3% buyer fee" (old)
```

---

### 6. HELP CENTER & FAQS

#### FAQ: "How does pricing work?"

```markdown
# How Pricing Works on Artwalls

## For Artists

Your earnings depend on your plan:

- **Free**: You take home **60%** of each sale
- **Starter** ($9/month): You take home **80%** of each sale
- **Growth** ($19/month): You take home **83%** of each sale
- **Pro** ($39/month): You take home **85%** of each sale

The rest is split between:
- **Venue Commission** (15% of artwork price): Goes to the venue
- **Buyer Support Fee** (4.5%, added to purchase): Covers payment processing and customer support
- **Platform** (remainder): Covers operations, maintenance, and Stripe processing fees

### Example: $140 artwork sale on Starter plan

- Artwork price: $140
- Buyer support fee (4.5%): $6.30
- Buyer pays: **$146.30**

Distribution:
- You (80%): **$112**
- Venue (15%): **$21**
- Buyer support / Platform: **$13.30**

## For Venues

You earn 15% commission on every artwork sold through your venue. 
This is paid directly to your connected Stripe account.

## For Buyers

You pay the artwork price + a 4.5% buyer support fee.
This supports our payment processing and customer service.

---

### FAQ: "Why is there a buyer fee?"

The 4.5% buyer support fee covers:
- Secure payment processing (Stripe handles your credit card safely)
- 24/7 customer support
- Platform maintenance and updates
- Fraud prevention

This fee is disclosed clearly at checkout.

---

### FAQ: "How does the venue commission work?"

Each venue sets its own commission percentage (we recommend 15%).
This is a fair share for:
- Wall space
- Foot traffic and promotion
- Artwork handling and insurance
- Customer interactions

The venue commission is paid automatically every week.
```

#### FAQ: "What's the difference between plans?"

```markdown
# Choose Your Plan

All plans help you reach buyers. Pick based on your needs:

| Feature | Free | Starter | Growth | Pro |
|---------|------|---------|--------|-----|
| **You take home** | **60%** per sale | **80%** per sale | **83%** per sale | **85%** per sale |
| Active displays | 1 | 4 | 10 | Unlimited |
| Artwork listings | 1 | 10 | 30 | Unlimited |
| Monthly cost | Free | $9 | $19 | $39 |
| Protection | Optional | Optional | Optional | Included |

**On a $100 sale:**
- Free: You earn $60
- Starter: You earn $80
- Growth: You earn $83
- Pro: You earn $85

**On a $1,000 sale:**
- Free: You earn $600 / month
- Starter: You earn $800 - $9 = $791
- Growth: You earn $830 - $19 = $811
- Pro: You earn $850 - $39 = $811
```

---

## FORBIDDEN PHRASES & CORRECTIONS

| ❌ Don't Say | ✅ Say Instead | Why |
|-------------|----------------|-----|
| "15% platform fee" | "Venue commission 15%" | Platform doesn't take venue commission |
| "We charge X%" | "You take home X%" | Focus on artist benefit |
| "Artist keeps 85%" | "Artist take-home: 85%" | More professional |
| "Only 15% commission" | "Venue commission: 15%" | Clearer naming |
| "3% buyer fee" | "4.5% buyer support fee" | Outdated percentage |
| "Processing costs" | "Buyer support fee" | More user-friendly |
| "Commission take-home" | "Artist take-home" | Clearer |
| "You save with us" | "You take home 85%" | Let numbers speak |
| "Low fees compared to" | "You take home 85%" | Don't mention competitors |
| "Platform gets 15%" | "Platform + Processing..." | Too specific, confusing |

---

## APPROVAL CHECKLIST

Before publishing any pricing-related copy:

- [ ] Does it use "Artist Take-Home %" or "Take home X%"?
- [ ] Does it call it "Venue Commission (15%)"?
- [ ] Does it call it "Buyer Support Fee (4.5%)"?
- [ ] Does it avoid "platform fee" language?
- [ ] Does it avoid "you save" or comparative language?
- [ ] Does it show complete breakdown where needed?
- [ ] Does it use consistent terminology throughout?
- [ ] Have all percentages been verified as current?
- [ ] Is it appropriate for the audience (artist vs. buyer vs. admin)?
- [ ] Does it match this style guide exactly?

---

## EDITING WORKFLOW

1. **Identify** any pricing language in your content
2. **Check** this guide for the approved term
3. **Replace** with approved version
4. **Verify** no contradictions with other copy
5. **Cross-reference** DEPLOYMENT_GUIDE.sh for examples

---

## QUESTIONS?

When in doubt, ask:
- "Would I say this to an artist in a call?"
- "Does this emphasize what they earn or what we charge?"
- "Could this create contradictions elsewhere on the site?"

When all else fails: Use "Take home X%" - it's always right.

---

**Last Reviewed**: January 9, 2026  
**Next Review**: Before any pricing page update  
**Maintained By**: Product Team
