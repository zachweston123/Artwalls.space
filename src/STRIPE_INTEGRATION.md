# Stripe Payment Integration - Admin Portal

## Overview

The admin portal now includes a complete Stripe payment setup interface that allows administrators to:
- Connect and manage Stripe API credentials
- View payment connection status
- Switch between test and live modes
- Configure webhook endpoints
- Monitor payment processing features
- Manage secure credential storage

## Accessing Stripe Payment Setup

### Navigation Path:
1. Login to admin portal (Ctrl+Shift+A + password: `StormBL26`)
2. Click **"Stripe Payments"** in the left sidebar
3. Access the Stripe configuration interface

### Sidebar Location:
The "Stripe Payments" option appears in the admin sidebar between "Orders & Payments" and "Announcements"

## Features

### 1. Connection Status
- Visual indicator showing connection state (Connected/Not Connected)
- Account status information
- Processing fee rates
- Current mode (Test/Live)

### 2. API Keys Management
- **Publishable Key**: Safe to use in frontend code
- **Secret Key**: Keep secret, never expose in client code
- Show/hide password toggle for security
- Copy-to-clipboard functionality for easy transfer

### 3. Mode Selection
- **Test Mode**: For development and testing (recommended)
- **Live Mode**: For production payments
- Toggle between modes easily

### 4. Webhook Configuration
- Webhook URL: `https://api.artwalls.space/webhooks/stripe`
- One-click copy to clipboard
- Direct link to Stripe Dashboard for configuration

### 5. Quick Setup Guide
Step-by-step instructions for:
1. Creating Stripe account
2. Getting API keys
3. Configuring environment variables
4. Setting up webhooks
5. Testing payments

### 6. Feature Overview
Shows enabled payment features when connected:
- ✅ Payment Processing
- ✅ Recurring Subscriptions
- ✅ Automated Payouts
- ✅ Fraud Protection
- ✅ Multi-currency Support

## Getting Started

### Prerequisites
- Stripe account (sign up at stripe.com)
- Admin access to Artwalls platform
- API keys from Stripe Dashboard

### Step 1: Create Stripe Account
1. Go to [stripe.com](https://stripe.com)
2. Sign up for a new account
3. Complete verification process

### Step 2: Get API Keys
1. Log into Stripe Dashboard
2. Go to Developers → API Keys
3. Copy **Publishable Key** and **Secret Key**

### Step 3: Update Environment Variables

**For Development (.env.local):**
```
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
```

**For Production (.env.production):**
```
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
```

### Step 4: Configure Webhooks
1. In Stripe Dashboard, go to Developers → Webhooks
2. Add Webhook Endpoint
3. URL: `https://api.artwalls.space/webhooks/stripe`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

### Step 5: Test Payments
Use Stripe test card numbers:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 2500 3010 4010`

Expiry: Any future date | CVC: Any 3 digits

## Component Structure

### File Location
`src/components/admin/StripePaymentSetup.tsx`

### Props
```tsx
interface StripeSetupProps {
  onNavigate?: (page: string) => void;
}
```

### Key States
- `publishableKey`: Stripe publishable API key
- `secretKey`: Stripe secret API key
- `testMode`: Toggle between test/live modes
- `isConnected`: Connection status
- `showPublishableKey`: Show/hide publishable key
- `showSecretKey`: Show/hide secret key
- `copiedField`: Track which field was copied
- `saveSuccess`: Show save confirmation

## Security Best Practices

### ✅ Do:
- Store secret keys in environment variables
- Use different keys for test and production
- Rotate keys regularly
- Monitor API key usage in Stripe Dashboard
- Use webhooks for payment confirmations
- Enable 2FA on Stripe account

### ❌ Don't:
- Commit API keys to version control
- Share secret keys via email or chat
- Use production keys in development
- Store keys in public code
- Expose secret keys in browser console
- Hardcode API keys in source code

## Backend Integration

### Webhook Endpoint
```typescript
// Server-side implementation
app.post('/webhooks/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const event = stripe.webhooks.constructEvent(
    req.body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET
  );

  switch (event.type) {
    case 'payment_intent.succeeded':
      // Handle successful payment
      break;
    case 'payment_intent.payment_failed':
      // Handle failed payment
      break;
    case 'customer.subscription.created':
      // Handle subscription creation
      break;
    // ... handle other events
  }
});
```

### Payment Processing Flow
```
User Payment → Frontend → Stripe API → Backend Webhook → Database → Confirmation
```

## Testing Checklist

- [ ] Can access Stripe Payments from admin sidebar
- [ ] Can toggle between test and live modes
- [ ] Can show/hide API keys
- [ ] Can copy API keys to clipboard
- [ ] Can view connection status
- [ ] Can see enabled features when connected
- [ ] Can disconnect Stripe account
- [ ] Webhook URL is correct
- [ ] Dark mode styling works
- [ ] Responsive on mobile devices

## Troubleshooting

### API Keys Not Working
1. Verify keys are from same environment (test/live)
2. Check for typos in environment variables
3. Confirm keys haven't been revoked
4. Try regenerating keys in Stripe Dashboard

### Webhooks Not Triggering
1. Verify webhook URL is correct
2. Check webhook events are selected
3. Monitor Stripe Dashboard for delivery status
4. Check backend logs for errors

### Payment Processing Errors
1. Verify correct key is being used (test vs live)
2. Check card details in test payments
3. Review Stripe Dashboard for error logs
4. Check rate limiting on API calls

## Environment Variables Reference

| Variable | Environment | Purpose |
|----------|-------------|---------|
| `REACT_APP_STRIPE_PUBLISHABLE_KEY` | Frontend | Public key for payment forms |
| `STRIPE_SECRET_KEY` | Backend | Confidential key for API calls |
| `STRIPE_WEBHOOK_SECRET` | Backend | Verify webhook authenticity |

## Monitoring & Analytics

Stripe Dashboard provides:
- Real-time payment metrics
- Revenue tracking
- Customer information
- Payout history
- Dispute management
- API usage statistics

## Support Resources

- **Stripe Documentation**: https://stripe.com/docs
- **API Reference**: https://stripe.com/docs/api
- **Testing Guide**: https://stripe.com/docs/testing
- **Integration Examples**: https://github.com/stripe/stripe-node

## Next Steps

1. ✅ Integrate payment forms in checkout pages
2. ✅ Implement subscription management
3. ✅ Set up automated payouts to artists/venues
4. ✅ Add payment history and invoicing
5. ✅ Implement dispute resolution flow
6. ✅ Add payment analytics dashboard

## Production Deployment Checklist

- [ ] All API keys moved to secure environment variables
- [ ] Switched from test to live mode
- [ ] Webhook endpoint configured in Stripe
- [ ] SSL/HTTPS enabled on domain
- [ ] Backup and recovery plan implemented
- [ ] Payment monitoring alerts set up
- [ ] Compliance review completed
- [ ] User communication plan ready
