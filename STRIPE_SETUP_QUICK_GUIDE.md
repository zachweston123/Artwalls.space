# Stripe Payment Setup - Quick Reference

## 🚀 Quick Access

1. **Login to Admin**: Ctrl+Shift+A + enter password `StormBL26`
2. **Navigate to**: Stripe Payments (in left sidebar)
3. **You're in**: Stripe configuration interface

## 📋 Interface Overview

```
┌─────────────────────────────────────────┐
│ Stripe Payment Setup                    │
│ Status: Connected ✓                     │
├─────────────────────────────────────────┤
│ 1. Connection Status                    │
│    - Account Status: Active              │
│    - Processing Fee: 2.9% + $0.30        │
│    - Mode: Test/Live                     │
├─────────────────────────────────────────┤
│ 2. API Keys                             │
│    - Publishable Key (copyable)         │
│    - Secret Key (show/hide)             │
│    - Test/Live toggle                   │
├─────────────────────────────────────────┤
│ 3. Webhook Configuration                │
│    - Webhook URL (pre-filled)           │
│    - Copy & configure button            │
├─────────────────────────────────────────┤
│ 4. Setup Guide (5 steps)                │
├─────────────────────────────────────────┤
│ [Disconnect] [Docs] [Save Settings]    │
└─────────────────────────────────────────┘
```

## 🔑 API Keys

| Key | Use | Security |
|-----|-----|----------|
| **Publishable** | Frontend payment forms | Public - safe to share |
| **Secret** | Backend API calls | ⚠️ KEEP SECRET - never share |

## 📝 Setup Steps

### 1️⃣ Create Stripe Account
```
Go to: stripe.com
Action: Sign up → Verify account
```

### 2️⃣ Get API Keys
```
Stripe Dashboard → Developers → API Keys
Copy: Publishable Key (pk_...)
Copy: Secret Key (sk_...)
```

### 3️⃣ Set Environment Variables
```bash
# Server (Node/Express in `server/`)
# Development
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Production
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### 4️⃣ Configure Webhooks
```
Stripe Dashboard → Webhooks → Add Endpoint
URL: https://api.artwalls.space/api/stripe/webhook
Events: ✓ checkout.session.completed
        ✓ customer.subscription.updated
        ✓ customer.subscription.deleted
```

### 5️⃣ Test Payments
```
Use test card: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits
Result: ✅ Payment succeeds
```

## 🧪 Test Cards

| Card | Purpose | Result |
|------|---------|--------|
| 4242 4242 4242 4242 | Successful payment | ✅ Success |
| 4000 0000 0000 0002 | Failed payment | ❌ Decline |
| 4000 2500 3010 4010 | 3D Secure | 🔐 Auth required |

## 🔐 Security Checklist

- [ ] Never commit API keys to git
- [ ] Use environment variables
- [ ] Different keys for test/live
- [ ] Secret key only on backend
- [ ] Rotate keys regularly
- [ ] Enable 2FA on Stripe account
- [ ] Monitor API usage

## 📊 Feature Status

When **Connected**, you get:
```
✅ Payment Processing
✅ Recurring Subscriptions  
✅ Automated Payouts
✅ Fraud Protection
✅ Multi-currency Support
```

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| Keys not working | Verify test vs live mode match |
| Webhooks silent | Check URL in Stripe Dashboard |
| Payment fails | Check card details (use test card) |
| Connection lost | Disconnect/reconnect in interface |

## 📖 Documentation

- Full docs: [STRIPE_INTEGRATION.md](./STRIPE_INTEGRATION.md)
- Stripe API: https://stripe.com/docs
- Testing guide: https://stripe.com/docs/testing

## ⚙️ File Reference

| File | Purpose |
|------|---------|
| `src/components/admin/StripePaymentSetup.tsx` | UI component |
| `.env.local` | Dev credentials |
| `.env.production` | Prod credentials |
| Backend webhook handler | Payment events |

## 🎯 Next Actions

1. Create Stripe account at stripe.com
2. Navigate to Stripe Payments in admin
3. Copy your API keys
4. Update environment variables
5. Set up webhooks
6. Test with test cards
7. Deploy to production

---

**Need help?** See [STRIPE_INTEGRATION.md](./STRIPE_INTEGRATION.md) for complete documentation.
