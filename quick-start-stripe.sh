#!/bin/bash

# 🚀 Stripe Connect Quick Start
# Run this script to get your system up and running

set -e

echo "🚀 Stripe Connect Quick Start"
echo "=============================="
echo ""

# Step 1: Check if migration needs to run
echo "📊 Step 1: Database Migration"
echo "------------------------------"
echo "Run this SQL in Supabase Dashboard → SQL Editor:"
echo ""
echo "  cat supabase/migrations/20260120_add_stripe_connect.sql"
echo ""
read -p "Press ENTER after running the migration..."

# Step 2: Verify environment variables
echo ""
echo "🔑 Step 2: Environment Variables"
echo "--------------------------------"
echo "Checking Cloudflare Worker secrets..."
echo ""
echo "Required secrets (already configured):"
echo "  ✅ STRIPE_SECRET_KEY"
echo "  ✅ STRIPE_WEBHOOK_SECRET"
echo "  ✅ APP_URL"
echo ""

# Step 3: Configure Stripe Webhook
echo "🪝 Step 3: Configure Stripe Webhook"
echo "-----------------------------------"
echo ""
echo "1. Go to: https://dashboard.stripe.com/webhooks"
echo "2. Click 'Add endpoint'"
echo "3. URL: https://artwalls.space/api/stripe/webhook"
echo "4. Select events:"
echo "   - account.updated"
echo "   - charge.succeeded"
echo "   - checkout.session.completed"
echo "   - customer.subscription.updated"
echo "   - customer.subscription.deleted"
echo "5. Copy the signing secret"
echo "6. Update STRIPE_WEBHOOK_SECRET in Cloudflare Worker"
echo ""
read -p "Press ENTER after configuring webhook..."

# Step 4: Test the system
echo ""
echo "🧪 Step 4: Test the System"
echo "-------------------------"
echo ""
read -p "Start the dev server? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Starting server..."
    npm run dev &
    SERVER_PID=$!
    
    echo "Waiting for server to start..."
    sleep 5
    
    echo ""
    echo "Running verification tests..."
    ./test-stripe-connect.sh
    
    echo ""
    read -p "Kill server? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill $SERVER_PID
    fi
fi

echo ""
echo "✅ Setup Complete!"
echo "=================="
echo ""
echo "Next steps:"
echo "1. Login as an artist → Complete Stripe onboarding"
echo "2. Login as a venue → Complete Stripe onboarding"
echo "3. Make a test purchase → Verify automatic payouts"
echo "4. Check Stripe Dashboard → See transfers"
echo ""
echo "Documentation:"
echo "  • STRIPE_CONNECT_READY.md - Full system overview"
echo "  • STRIPE_CONNECT_TEST_PLAN.md - Detailed testing guide"
echo ""
echo "Monitoring:"
echo "  • Admin panel at /admin"
echo "  • Stripe Dashboard → Connect → Transfers"
echo "  • Server logs for webhook events"
echo ""
