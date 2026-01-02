# Subscription Integration Testing Guide

## Pre-Testing Checklist

Before testing, ensure:
- [ ] Stripe account created and verified
- [ ] 3 products created in Stripe Dashboard
- [ ] Price IDs copied from Stripe
- [ ] `server/.env` configured with all required variables
- [ ] Server running: `cd server && npm start`
- [ ] Frontend running: `npm run dev`

## Local Testing (Test Mode)

### Test Card Details

Stripe provides special test cards for different scenarios:

| Card Number | Scenario | Expiry | CVC |
|-------------|----------|--------|-----|
| 4242 4242 4242 4242 | Successful payment | Any future | Any 3 digits |
| 4000 0000 0000 0002 | Payment declined | Any future | Any 3 digits |
| 4000 0025 0000 3155 | Requires authentication | Any future | Any 3 digits |

### Step 1: Test Non-Authenticated User

**Objective**: Verify non-logged-in users get error message

1. Open http://localhost:5173
2. Click "Plans & Pricing" (if available in login page)
   - Or navigate to http://localhost:5173/#/plans-pricing (if you manually add the route)
3. Click "Get Started" or "Upgrade to Growth"
4. **Expected**: Error message: "Please log in to upgrade your plan"
5. **Pass**: ✅ If error appears and no Stripe redirect

### Step 2: Test Wrong User Role

**Objective**: Verify non-artist users get error message

1. Log in with any non-artist role (e.g., venue)
2. Navigate to Plans & Pricing
3. Click "Get Started" button
4. **Expected**: Error message: "Only artists can upgrade plans"
5. **Pass**: ✅ If error appears and no Stripe redirect

### Step 3: Test Successful Upgrade (Test Card)

**Objective**: Complete successful subscription checkout

1. Log in as artist user
   - Email: artist@example.com
   - Role: artist
2. Navigate to Plans & Pricing
3. Click "Get Started" on **Starter** plan ($9/month)
4. **Expected**: Page redirects to Stripe Checkout
5. On Stripe Checkout:
   - Email: (should be pre-filled)
   - Card: 4242 4242 4242 4242
   - Expiry: 12/25
   - CVC: 123
   - Name: Test Artist
6. Click "Pay"
7. **Expected**: Success page or redirect to dashboard with `?sub=success`
8. **Pass**: ✅ If payment succeeds and returns to app

### Step 4: Test Declined Card

**Objective**: Verify error handling for failed payments

1. Log in as artist user
2. Navigate to Plans & Pricing
3. Click "Get Started" on **Growth** plan ($19/month)
4. On Stripe Checkout:
   - Card: 4000 0000 0000 0002 (This card will decline)
   - Expiry: Any future date
   - CVC: Any 3 digits
5. Click "Pay"
6. **Expected**: Stripe shows error "Your card was declined"
7. **Pass**: ✅ If error message appears clearly

### Step 5: Test Pro Plan

**Objective**: Verify highest tier works correctly

1. Log in as artist
2. Navigate to Plans & Pricing
3. Click "Upgrade to Pro" on **Pro** plan ($39/month)
4. On Stripe Checkout, use success card (4242...)
5. Click "Pay"
6. **Expected**: Payment succeeds
7. **Pass**: ✅ If process completes successfully

### Step 6: Test All Tier Buttons

**Objective**: Verify all buttons work and map correctly

| Button | Expected Tier Sent | Status |
|--------|-------------------|--------|
| Starter "Get Started" | starter | ✅ |
| Growth "Upgrade to Growth" | elite | ✅ |
| Pro "Upgrade to Pro" | pro | ✅ |

## Webhook Testing

### Step 7: Verify Webhook Receipt

**Objective**: Confirm Stripe webhook events reach your server

1. Complete a test payment (Step 3)
2. Go to Stripe Dashboard → Developers → Webhooks
3. Click on your webhook endpoint
4. Scroll down to "Events"
5. **Expected**: See `checkout.session.completed` event
6. Click on the event to see details
7. **Expected**: See metadata with `artistId` and `tier`
8. **Pass**: ✅ If event appears within 10 seconds of payment

### Step 8: Check Server Logs

**Objective**: Verify backend processes webhook correctly

1. Complete a test payment
2. Look at server terminal output
3. **Expected**: See log messages:
   ```
   Webhook event received: checkout.session.completed
   Updating artist subscription...
   Subscription created for artist ID: xxx with tier: starter
   ```
4. **Pass**: ✅ If logs show successful processing

## Database Verification

### Step 9: Verify Subscription Stored (If Connected)

**Objective**: Confirm subscription data persists in database

1. After successful payment, check your database
2. Query `artists` table for the test artist
3. **Expected**: Fields like:
   - `stripe_customer_id`: cus_xxxxx (populated)
   - `subscription_tier`: starter (if your schema includes this)
   - `subscription_active`: true (if tracking active status)
4. **Pass**: ✅ If fields are populated correctly

## API Endpoint Testing (Using cURL)

### Step 10: Direct API Test

**Objective**: Test the subscription endpoint directly

```bash
# Requires artist authentication header (if implemented)
curl -X POST http://localhost:4242/api/stripe/billing/create-subscription-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"tier":"starter"}'

# Expected response:
# {
#   "url": "https://checkout.stripe.com/pay/cs_xxxxxxxx"
# }
```

**Pass**: ✅ If response contains valid Stripe checkout URL

## Error Scenarios Testing

### Step 11: Test Missing Environment Variables

**Objective**: Verify error handling when config is incomplete

1. Temporarily remove `STRIPE_SUB_PRICE_STARTER` from `.env`
2. Restart server
3. Try to upgrade to Starter plan
4. **Expected**: Error message: "Invalid tier or missing STRIPE_SUB_PRICE_* env for that tier"
5. **Pass**: ✅ If clear error appears instead of crash

### Step 12: Test Invalid Tier

**Objective**: Verify API rejects invalid tier names

1. (Advanced) Use browser console to call API directly:
```javascript
fetch('http://localhost:4242/api/stripe/billing/create-subscription-session', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({tier: 'invalid-tier'})
})
```
2. **Expected**: Error response with status 400 and message about invalid tier
3. **Pass**: ✅ If error returned and not processed

## Production Readiness Checklist

Before deploying to production:

- [ ] Tested with all 3 plan tiers
- [ ] Tested with multiple test cards (success, decline, auth required)
- [ ] Webhook endpoint accessible from internet (not localhost)
- [ ] Webhook events received successfully
- [ ] Database stores subscription data correctly
- [ ] Error messages are helpful (not exposing system details)
- [ ] Success redirect works and displays correct tier
- [ ] API keys switched to live keys (sk_live_, not sk_test_)
- [ ] Webhook secret switched to live secret (whsec_live_)
- [ ] Domain URLs updated for production
- [ ] CORS configured for production domain
- [ ] Rate limiting in place (if needed)
- [ ] Monitoring/logging configured for payment events

## Troubleshooting During Testing

### Issue: "Page does not redirect to Stripe"
**Checklist**:
- [ ] Server is running (`npm start` in `/server`)
- [ ] `STRIPE_SECRET_KEY` is set in `.env`
- [ ] User is logged in as artist
- [ ] Check browser console for error messages
- [ ] Check server logs for API errors

### Issue: "Webhook events not appearing in Stripe Dashboard"
**Checklist**:
- [ ] Webhook URL is correct: `http://localhost:4242/api/stripe/webhook`
- [ ] Using Stripe CLI for local testing (recommended for development)
- [ ] `STRIPE_WEBHOOK_SECRET` is correct
- [ ] Check server logs for webhook signature errors

### Issue: "Getting 'artist not found' or authentication errors"
**Checklist**:
- [ ] User is logged in before attempting upgrade
- [ ] Authentication tokens are being sent with requests
- [ ] Backend requires auth headers (check if `requireArtist()` is implemented)
- [ ] Artist record exists in database

### Issue: "Payment succeeds but subscription not created"
**Checklist**:
- [ ] Webhook is being received (check Stripe Dashboard)
- [ ] Server webhook handler is processing events (check logs)
- [ ] Database has correct schema for storing subscriptions
- [ ] No errors in server logs about database writes

## Success Criteria

✅ All tests pass when:

1. **Non-authenticated users** → See clear "log in" error
2. **Wrong role users** → See clear "artists only" error
3. **Test card success** → Redirected successfully with valid Stripe URL
4. **Test card decline** → Clear decline error from Stripe
5. **Webhook received** → Event appears in Stripe Dashboard
6. **Server processed** → Logs show successful processing
7. **Database updated** → Subscription data stored
8. **Multiple tiers** → All 3 plans work correctly
9. **Error handling** → No crashes, helpful error messages
10. **Edge cases** → Handles duplicate payments, retries gracefully

## Next Steps

After all tests pass:

1. Review [SUBSCRIPTION_FIX_SUMMARY.md](SUBSCRIPTION_FIX_SUMMARY.md)
2. Update any remaining user-facing subscription UI
3. Implement subscription status display in artist dashboard
4. Set up subscription management (downgrade, cancel)
5. Configure email notifications for successful upgrades
6. Deploy to production with live Stripe keys

---

**Testing Date**: ___________  
**Tested By**: ___________  
**All Tests Passed**: ☐ Yes ☐ No  
**Issues Found**: (List any issues here)

---

For more help, see:
- [STRIPE_QUICK_SETUP.md](STRIPE_QUICK_SETUP.md)
- [STRIPE_SUBSCRIPTION_SETUP.md](STRIPE_SUBSCRIPTION_SETUP.md)
- [SUBSCRIPTION_FIX_SUMMARY.md](SUBSCRIPTION_FIX_SUMMARY.md)
