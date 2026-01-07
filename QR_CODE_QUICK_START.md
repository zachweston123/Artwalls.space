# QR Code Implementation - Quick Reference Guide

**Date:** January 7, 2026  
**Version:** 1.0

---

## 🎯 Three New Documents Created

### 1. **VENUE_INSTALL_GUIDE.md** - For Artists
> Path: `src/VENUE_INSTALL_GUIDE.md`  
> Purpose: Step-by-step guide for installing artwork and testing QR codes  
> Audience: Artists who have been approved by venues

**Read this if you:**
- Are an artist approved for a venue
- Need to install your artwork
- Want to test the QR code works
- Have questions about payment splits
- Need help troubleshooting

**Key Sections:**
1. Overview & what you'll need
2. Choose your install time (3 options)
3. Prepare your artwork
4. Install at venue
5. **Place & test QR code** ← Most important!
6. After installation
7. Payment & payouts
8. Pickup instructions
9. FAQs

---

### 2. **QR_CODE_WORKFLOW_TECHNICAL.md** - For Developers & Project Managers
> Path: `src/QR_CODE_WORKFLOW_TECHNICAL.md`  
> Purpose: Complete technical implementation details  
> Audience: Developers, architects, project managers

**Read this if you:**
- Need to understand the complete workflow
- Are implementing backend validation
- Want to know when QR codes are created
- Need to debug payment splits
- Are testing the system
- Want to see state transitions

**Key Sections:**
1. Overview diagram
2. Core principle (QR only after approval!)
3. Complete workflow with all steps
4. Backend validation code
5. Frontend components
6. Payment flow details
7. Implementation checklist

---

### 3. **IMPLEMENTATION_QR_WORKFLOW.md** - Implementation Summary
> Path: `IMPLEMENTATION_QR_WORKFLOW.md` (root folder)  
> Purpose: Summary of what was implemented and testing checklist  
> Audience: DevOps, QA, project leads

**Read this if you:**
- Want a high-level overview
- Need to test the implementation
- Are deploying to production
- Want to verify design system compliance
- Need the complete testing checklist

**Key Sections:**
1. What was implemented
2. Files created
3. Code changes made
4. Design system compliance
5. Testing checklist
6. Deployment checklist

---

## 📂 Related Existing Documents

| Document | Path | When to Read |
|----------|------|--------------|
| Stripe Integration Guide | `src/STRIPE_INTEGRATION.md` | Understanding payment processing |
| Display Duration System | `src/DISPLAY_DURATION_DOCS.md` | How durations work (separate from install time) |
| Legal Agreements | `src/LEGAL_AGREEMENTS_SUMMARY.md` | Payment splits, liability, responsibilities |
| Design System | `src/design-system/0-FOUNDATIONS.md` | Colors, typography, accessibility |
| Artist Approval Flow | `src/design-system/4-FLOWS.md` | Complete user flow diagrams |

---

## 🔄 The Workflow at a Glance

```
ARTIST                          VENUE                           CUSTOMER
├─ Submits Artwork             
│  (Status: PENDING)           
│                              │
│                              ├─ Reviews Application
│                              ├─ Selects Wall Space
│                              ├─ Offers 3 Install Times:
│                              │  ✓ Quick (24-48 hrs)
│                              │  ✓ Standard (1 week)
│                              │  ✓ Flexible (2 weeks)
│                              ├─ Sets Duration (30/90/180 days)
│                              ├─ Clicks "Approve & Schedule"
│                              │  ✓ QR CODE GENERATED
│
├─ Gets Approval Email
├─ Selects Install Time
├─ Downloads Install Guide
│  (includes QR code PNG)
├─ Prints QR Code Label
├─ Installs at Venue
├─ Places QR Near Artwork
├─ TESTS QR CODE ← CRITICAL!
│  (Scans → Purchase page → Buy Now)
│  (Should show correct artwork)
│
│                              ├─ Gets notified installation complete
│                              │  (Can now see "Active Listing")
│                              │
│                              │                      ├─ At venue
│                              │                      ├─ Sees artwork
│                              │                      ├─ Scans QR code
│                              │                      ├─ Opens purchase page
│                              │                      ├─ Clicks "Buy Now"
│                              │                      ├─ Stripe Checkout appears
│                              │                      ├─ Enters payment
│                              │                      ├─ Payment processed
│                              │                      │
├─ Payment received notice     ├─ Commission notice   │
├─ Payout within 2-3 days      ├─ Payout within 2-3 days
└─ Sees sale in dashboard      └─ Sees sale in dashboard
```

---

## ✅ What Was Implemented

1. **VenueApplications.tsx Updated**
   - Added 3 install time selection options
   - Options are clearly labeled and described
   - Recommended option is highlighted
   - Only shown during venue approval

2. **Server-Side QR Validation**
   - All QR endpoints now check `approval_status`
   - QR codes only generated if status = 'approved'
   - Returns 403 Forbidden if not approved
   - Server-side validation (cannot be bypassed)

3. **Complete Documentation**
   - Artist install guide (customer-facing)
   - Technical workflow documentation
   - Implementation summary with checklists
   - Cross-linked with existing docs

---

## 🚀 To Get Started

### For Testing the Workflow
1. Read: `IMPLEMENTATION_QR_WORKFLOW.md` (this folder)
2. Follow: Testing Checklist section
3. Verify: All 6 categories pass
4. Deploy: Use Deployment Checklist

### For Understanding How It Works
1. Read: `QR_CODE_WORKFLOW_TECHNICAL.md`
2. See: Workflow diagram (step-by-step)
3. Check: Backend validation code
4. Review: State transitions

### For Artist Support
1. Share: `VENUE_INSTALL_GUIDE.md`
2. Point to: Step 4 (Place & Test QR Code)
3. Reference: FAQs section for common issues
4. Escalate: If QR won't scan (check connectivity)

### For Venue Staff
1. Send: Installation workflow overview
2. Explain: 3 install time options in approval modal
3. Ensure: They understand QR is only after approval
4. Clarify: Installation time is separate from display duration

---

## 💡 Key Points to Remember

### For Everyone
- 🔒 **QR codes ONLY exist after venue approval** (not before)
- 📱 **Installation time is when artist physically installs** (separate from display duration)
- 💰 **Payment splits:** 80% artist, 10% venue, 10% platform
- ✅ **Testing is crucial:** Artist must verify QR scans and loads purchase page

### For Developers
- 🔐 Validation happens on **server** (backend checks `approval_status`)
- 🎨 UI follows **design system tokens** (colors, spacing, typography)
- ♿ **WCAG AA accessibility** standards met
- 📱 **Mobile responsive** (390px breakpoint tested)

### For Project Managers
- 📋 **3 documents created** (user guide, technical doc, implementation guide)
- ✅ **Design system compliant** (verified against all standards)
- 🔗 **No conflicts** with existing workflows
- ✅ **Cross-linked** with related documentation

---

## 🧪 Quick Testing Script

```
1. APPROVAL
   ├─ Venue: Log in
   ├─ Click "Approve Application"
   ├─ Modal appears with 3 install time options ✓
   ├─ Select wall space ✓
   ├─ Select duration ✓
   ├─ Click "Approve & Schedule" ✓
   └─ QR generated ✓

2. ARTIST NOTIFICATION
   ├─ Artist receives email ✓
   ├─ Email includes 3 install options ✓
   ├─ Artist can download install guide ✓
   └─ Guide includes QR code PNG ✓

3. QR CODE
   ├─ QR code image is high resolution ✓
   ├─ Can scan from 6-10 feet away ✓
   ├─ Scans to correct artwork page ✓
   ├─ Shows artist name & price ✓
   ├─ Shows payment breakdown ✓
   └─ "Buy Now" button works ✓

4. PAYMENT
   ├─ Test card payment processes ✓
   ├─ Artwork marked as sold ✓
   ├─ Artist notified of sale ✓
   ├─ Venue notified of commission ✓
   └─ Payment split correct (80/10/10) ✓
```

---

## 📞 Quick Answers

**Q: "When are QR codes created?"**  
A: After venue approval ONLY. See `QR_CODE_WORKFLOW_TECHNICAL.md` section "When QR Codes are Generated"

**Q: "What are the 3 install time options?"**  
A: Quick (24-48 hrs), Standard (1 week - recommended), Flexible (2 weeks). See `VENUE_INSTALL_GUIDE.md` Step 1

**Q: "How do I test the QR code?"**  
A: Step back 6-10 feet, scan with camera app, verify purchase page loads. See `VENUE_INSTALL_GUIDE.md` Step 4

**Q: "How much does the artist make?"**  
A: 80% of the sale price. Example: $850 sale = $680 to artist. See `VENUE_INSTALL_GUIDE.md` Step 6

**Q: "Can I generate a QR before approval?"**  
A: No. API returns 403 Forbidden. See `QR_CODE_WORKFLOW_TECHNICAL.md` section "Backend Validation"

**Q: "Is this mobile-responsive?"**  
A: Yes, tested at 390px breakpoint. All touch targets are ≥44px. See `IMPLEMENTATION_QR_WORKFLOW.md` section "Mobile Responsive"

**Q: "Does it follow the design system?"**  
A: Yes. Colors, typography, spacing, accessibility all verified. See `IMPLEMENTATION_QR_WORKFLOW.md` section "Design System Compliance"

---

## 📚 Document Map

```
START HERE
    ↓
Choose Your Role:
    ├─ ARTIST → Read src/VENUE_INSTALL_GUIDE.md
    ├─ DEVELOPER → Read src/QR_CODE_WORKFLOW_TECHNICAL.md
    ├─ QA/TESTER → Read IMPLEMENTATION_QR_WORKFLOW.md
    └─ PROJECT LEAD → Read IMPLEMENTATION_QR_WORKFLOW.md
    
Then cross-reference:
    ├─ For payment details → src/STRIPE_INTEGRATION.md
    ├─ For design → src/design-system/0-FOUNDATIONS.md
    ├─ For legal → src/LEGAL_AGREEMENTS_SUMMARY.md
    └─ For durations → src/DISPLAY_DURATION_DOCS.md
```

---

## ✨ Implementation Highlights

### What's New
✅ 3 installation time options (Quick/Standard/Flexible)  
✅ QR code approval validation (server-side)  
✅ Comprehensive install guide (with QR code PNG)  
✅ Payment split tracking (80/10/10)  
✅ Design system compliance (verified)  
✅ Mobile responsive (390px+)  
✅ WCAG AA accessibility  
✅ Complete documentation (3 docs)  

### What's the Same
✅ Artist approval workflow (unchanged)  
✅ Display duration system (still 30/90/180 days)  
✅ Payment processing (Stripe integration)  
✅ Legal agreements (same terms)  
✅ Design system (same tokens & components)  

---

**Status:** ✅ Ready for Testing & Deployment  
**Last Updated:** January 7, 2026  
**Questions?** Check the documentation or see "Quick Answers" above
