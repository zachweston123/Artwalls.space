# Stripe Payment Setup - Visual Guide

## 🎯 Access the Interface

### Step 1: Open Admin Portal
```
Login Page
    ↓
Press: Ctrl+Shift+A
    ↓
Enter Password: StormBL26
    ↓
Click: Verify
    ↓
Admin Dashboard
```

### Step 2: Navigate to Stripe Payments
```
Admin Dashboard
    ↓
Left Sidebar
    ↓
Click: "Stripe Payments" (with credit card icon)
    ↓
Stripe Payment Setup Interface
```

## 📱 Interface Layout

### Desktop View
```
┌─────────────────────────────────────────────────────────────────┐
│ Stripe Payment Setup                              [Connected ✓] │
│ Connect your Stripe account to accept payments...               │
├─────────────────────────────────────────────────────────────────┤
│ ℹ️  What is Stripe? (Info Box)                                 │
├─────────────────────────────────────────────────────────────────┤
│ CONNECTION STATUS                                               │
│ ┌──────────────┬──────────────┬──────────────┐                 │
│ │ Active       │ 2.9% + $0.30 │ Test Mode    │                 │
│ └──────────────┴──────────────┴──────────────┘                 │
│                                                                 │
│ ✅ Payment Processing                                          │
│ ✅ Recurring Subscriptions                                     │
│ ✅ Automated Payouts                                           │
│ ✅ Fraud Protection                                            │
│ ✅ Multi-currency Support                                      │
├─────────────────────────────────────────────────────────────────┤
│ API KEYS                                                        │
│ ☐ Test Mode (Recommended for development)                      │
│                                                                 │
│ Test Publishable Key                                            │
│ [••••••••••••••••••••] 👁️  [Copy]                              │
│ This key is safe to use in your frontend code...              │
│                                                                 │
│ Test Secret Key                                                │
│ [••••••••••••••••••••] 👁️  [Copy]                              │
│ Keep this secret! Never share or commit to git...             │
│                                                                 │
│ ⚠️  Security Best Practice: Store secret key...              │
├─────────────────────────────────────────────────────────────────┤
│ WEBHOOK CONFIGURATION                                          │
│ Webhook URL:                                                    │
│ [https://api.artwalls.space/api/stripe/webhook] [Copy]       │
│                                                                 │
│ [Configure in Stripe Dashboard →]                             │
├─────────────────────────────────────────────────────────────────┤
│ QUICK SETUP GUIDE                                              │
│ ① Create Stripe Account    Sign up at stripe.com...           │
│ ② Get API Keys             Copy keys from Dashboard...        │
│ ③ Configure Environment    Add REACT_APP_STRIPE...           │
│ ④ Set Up Webhooks         Configure endpoint...               │
│ ⑤ Test Payments           Use test card numbers...            │
├─────────────────────────────────────────────────────────────────┤
│ [Disconnect Stripe] [View Documentation] [Save Settings] ✓    │
└─────────────────────────────────────────────────────────────────┘
```

## 🎨 Color Scheme

### Status Colors
- **Connected**: 🟢 Green (`bg-green-100`)
- **Not Connected**: 🔴 Red (`bg-red-100`)
- **Info**: 🔵 Blue (`bg-blue-50`)
- **Warning**: 🟡 Amber (`bg-amber-50`)

### Component Colors
```
Header Text:     Neutral-900 (dark) / White (light)
Secondary Text:  Neutral-600 (dark) / Neutral-400 (light)
Buttons:         Blue-600 / Blue-700 (hover)
Input Fields:    White (dark: Neutral-700)
Icons:           Matches text color context
```

## 🔄 User Workflows

### Workflow 1: Fresh Setup
```
[Stripe Payments]
    ↓
Read "What is Stripe?" info
    ↓
Go to stripe.com → Create Account
    ↓
Get API Keys from Stripe
    ↓
Copy Publishable Key → Update .env.local
    ↓
Copy Secret Key → Add to backend .env
    ↓
Click "Configure in Dashboard" link
    ↓
Set Webhook URL: [copy from interface]
    ↓
Use test card: 4242 4242 4242 4242
    ↓
Test Payment ✓
    ↓
[Save Settings] when ready for production
```

### Workflow 2: Switching Test to Live
```
[Admin] → [Stripe Payments]
    ↓
Uncheck "Test Mode" ☐
    ↓
Keys Update to Live Keys
    ↓
Replace .env.local values
    ↓
Restart application
    ↓
Test with live card in sandbox
    ↓
[Save Settings]
    ↓
Deploy to production
```

### Workflow 3: Emergency Disconnect
```
[Stripe Payments]
    ↓
Click [Disconnect Stripe]
    ↓
Confirm dialog appears:
"Are you sure? Payments will be disabled."
    ↓
Click [Confirm]
    ↓
Keys cleared ✓
    ↓
Status: "Not Connected" 🔴
    ↓
Payments disabled until reconnected
```

## 📊 Key Display Features

### Show/Hide Toggle Example
```
Before:
[••••••••••••••••••••] 👁️  [Copy]

After clicking 👁️:
[pk_test_123456789abcdefg] 👀 [Copy]

Clicked Copy:
[pk_test_123456789abcdefg] ✅ [Copied!]
```

### Connection Status Indicator
```
Connected:           Not Connected:
┌──────────────┐    ┌──────────────┐
│ ✅ Connected │    │ ❌ Not Conn.  │
└──────────────┘    └──────────────┘
```

### Feature List
```
When Connected:
✅ Payment Processing
✅ Recurring Subscriptions
✅ Automated Payouts
✅ Fraud Protection
✅ Multi-currency Support

When Disconnected:
❌ Payment Processing
❌ Recurring Subscriptions
❌ Automated Payouts
❌ Fraud Protection
❌ Multi-currency Support
```

## 🎯 Interactive Elements

### Buttons
| Button | Action | Result |
|--------|--------|--------|
| Show/Hide 👁️ | Toggle key visibility | Key shows/hides |
| Copy 📋 | Copy to clipboard | Shows "Copied!" briefly |
| Disconnect | Breaks connection | Shows confirmation |
| Save Settings | Persist changes | Shows "Saved!" briefly |
| View Documentation | Opens external link | New tab |
| Configure in Dashboard | Opens Stripe | New tab |

### Input Fields
```
All key fields are:
- Read-only (for security)
- Copy-enabled (click copy button)
- Show-hideable (click eye icon)
- Dark mode compatible
- Monospace font (for readability)
```

## 🌙 Dark Mode

Same layout and colors automatically adjust:
```
Light Mode:                Dark Mode:
Background: white          Background: #1F2937
Text: black               Text: white
Inputs: white             Inputs: #374151
Cards: white              Cards: #1F2937
```

## 📱 Mobile Layout

```
Mobile (< 768px):
─────────────────────
│ Stripe Payments   │
│ [Connected ✓]     │
─────────────────────
│ What is Stripe?   │
│ (Info stacked)    │
─────────────────────
│ Status (stacked)  │
│ Card 1            │
│ Card 2            │
│ Card 3            │
─────────────────────
│ API Keys (vertical)
│ Pub Key: [Copy]   │
│ Secret: [Copy]    │
─────────────────────
│ Webhooks (vertical)
│ URL: [Copy]       │
─────────────────────
│ Setup (vertical)  │
│ 1. Create...      │
│ 2. Get...         │
│ 3. Configure...   │
│ 4. Setup...       │
│ 5. Test...        │
─────────────────────
│ [Disconnect]      │
│ [Docs]            │
│ [Save]            │
─────────────────────
```

## ⌨️ Keyboard Navigation

```
Tab Order:
1. Test Mode Checkbox
2. Show Publishable Key Toggle
3. Copy Publishable Key Button
4. Show Secret Key Toggle
5. Copy Secret Key Button
6. Copy Webhook URL Button
7. Configure Dashboard Link
8. Documentation Link
9. Disconnect Button
10. Save Settings Button

Special Keys:
- Enter: Activate buttons/links
- Space: Toggle checkboxes
- Tab: Move to next element
- Shift+Tab: Move to previous
```

## 🎓 Learning Path

```
1. START HERE
   ↓
   Read this guide

2. CREATE ACCOUNT
   ↓
   Go to stripe.com
   ↓
   Sign up & verify

3. GET API KEYS
   ↓
   Dashboard → API Keys
   ↓
   Copy both keys

4. CONFIGURE LOCALLY
   ↓
   Update .env.local
   ↓
   Restart app

5. TEST PAYMENTS
   ↓
   Use test card
   ↓
   Verify success

6. SETUP WEBHOOKS
   ↓
   Configure endpoint
   ↓
   Select events

7. PRODUCTION
   ↓
   Use live keys
   ↓
   Final testing
   ↓
   Deploy! 🚀
```

## 💡 Tips & Tricks

**💡 Tip 1**: Use test mode during development
- Card: 4242 4242 4242 4242
- Never charges real cards

**💡 Tip 2**: Copy keys immediately
- Use interface copy buttons
- Never manually type

**💡 Tip 3**: Separate test & live keys
- Test in .env.local
- Live in .env.production

**💡 Tip 4**: Monitor Stripe Dashboard
- Real-time payment tracking
- Webhook delivery status
- Error logs & alerts

**💡 Tip 5**: Use webhooks for confirmations
- Don't trust frontend only
- Always verify on backend
- Handle failures gracefully

---

**Next**: [STRIPE_SETUP_QUICK_GUIDE.md](./STRIPE_SETUP_QUICK_GUIDE.md)
