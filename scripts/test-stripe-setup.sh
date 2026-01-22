#!/bin/bash

# Stripe Subscription Integration - Quick Test Script
# This script helps you verify your Stripe subscription setup

set -e

echo "🎨 Artwalls Stripe Subscription Setup Tester"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .dev.vars exists
if [ ! -f ".dev.vars" ]; then
    echo -e "${RED}❌ Error: .dev.vars file not found${NC}"
    echo "Please create .dev.vars with your Stripe keys"
    exit 1
fi

echo "✅ Found .dev.vars file"
echo ""

# Parse environment variables
source .dev.vars 2>/dev/null || true

# Test 1: Check Stripe Secret Key
echo "📋 Test 1: Checking Stripe Secret Key..."
if [ -z "$STRIPE_SECRET_KEY" ]; then
    echo -e "${RED}❌ STRIPE_SECRET_KEY not set${NC}"
    exit 1
else
    echo -e "${GREEN}✅ STRIPE_SECRET_KEY is set${NC}"
    # Check if it's test or live key
    if [[ $STRIPE_SECRET_KEY == sk_test_* ]]; then
        echo -e "${YELLOW}   ⚠️  Using TEST key (recommended for development)${NC}"
    elif [[ $STRIPE_SECRET_KEY == sk_live_* ]]; then
        echo -e "${GREEN}   ✓ Using LIVE key (production)${NC}"
    else
        echo -e "${YELLOW}   ⚠️  Key format unrecognized${NC}"
    fi
fi
echo ""

# Test 2: Check Webhook Secret
echo "📋 Test 2: Checking Webhook Secret..."
if [ -z "$STRIPE_WEBHOOK_SECRET" ]; then
    echo -e "${YELLOW}⚠️  STRIPE_WEBHOOK_SECRET not set${NC}"
    echo "   This is required for webhook signature verification"
else
    echo -e "${GREEN}✅ STRIPE_WEBHOOK_SECRET is set${NC}"
    if [[ $STRIPE_WEBHOOK_SECRET == whsec_* ]]; then
        echo -e "${GREEN}   ✓ Secret format looks correct${NC}"
    else
        echo -e "${YELLOW}   ⚠️  Secret should start with 'whsec_'${NC}"
    fi
fi
echo ""

# Test 3: Check Subscription Price IDs
echo "📋 Test 3: Checking Subscription Price IDs..."

MISSING_PRICES=0

if [ -z "$STRIPE_SUB_PRICE_STARTER" ]; then
    echo -e "${RED}❌ STRIPE_SUB_PRICE_STARTER not set${NC}"
    MISSING_PRICES=1
else
    echo -e "${GREEN}✅ Starter: $STRIPE_SUB_PRICE_STARTER${NC}"
fi

if [ -z "$STRIPE_SUB_PRICE_GROWTH" ]; then
    echo -e "${RED}❌ STRIPE_SUB_PRICE_GROWTH not set${NC}"
    MISSING_PRICES=1
else
    echo -e "${GREEN}✅ Growth: $STRIPE_SUB_PRICE_GROWTH${NC}"
fi

if [ -z "$STRIPE_SUB_PRICE_PRO" ]; then
    echo -e "${RED}❌ STRIPE_SUB_PRICE_PRO not set${NC}"
    MISSING_PRICES=1
else
    echo -e "${GREEN}✅ Pro: $STRIPE_SUB_PRICE_PRO${NC}"
fi

if [ $MISSING_PRICES -eq 1 ]; then
    echo -e "${YELLOW}⚠️  Some price IDs are missing. Get them from Stripe Dashboard.${NC}"
fi
echo ""

# Test 4: Check Supabase Configuration
echo "📋 Test 4: Checking Supabase Configuration..."

if [ -z "$SUPABASE_URL" ]; then
    echo -e "${RED}❌ SUPABASE_URL not set${NC}"
else
    echo -e "${GREEN}✅ SUPABASE_URL is set${NC}"
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ SUPABASE_SERVICE_ROLE_KEY not set${NC}"
else
    echo -e "${GREEN}✅ SUPABASE_SERVICE_ROLE_KEY is set${NC}"
fi
echo ""

# Test 5: Verify Stripe API connectivity
echo "📋 Test 5: Testing Stripe API connectivity..."

if [ ! -z "$STRIPE_SECRET_KEY" ]; then
    STRIPE_TEST=$(curl -s -X GET "https://api.stripe.com/v1/products?limit=1" \
        -u "$STRIPE_SECRET_KEY:" \
        -H "Content-Type: application/x-www-form-urlencoded")
    
    if echo "$STRIPE_TEST" | grep -q '"object": "list"'; then
        echo -e "${GREEN}✅ Stripe API connection successful${NC}"
        
        # Count products
        PRODUCT_COUNT=$(echo "$STRIPE_TEST" | grep -o '"data": \[' | wc -l)
        if [ $PRODUCT_COUNT -gt 0 ]; then
            echo -e "${GREEN}   ✓ Found Stripe products${NC}"
        fi
    else
        echo -e "${RED}❌ Stripe API connection failed${NC}"
        echo "   Check your STRIPE_SECRET_KEY"
    fi
fi
echo ""

# Test 6: Verify Price IDs exist in Stripe
echo "📋 Test 6: Verifying Price IDs in Stripe..."

if [ ! -z "$STRIPE_SECRET_KEY" ]; then
    for TIER in "STARTER" "GROWTH" "PRO"; do
        PRICE_VAR="STRIPE_SUB_PRICE_${TIER}"
        PRICE_ID="${!PRICE_VAR}"
        
        if [ ! -z "$PRICE_ID" ]; then
            PRICE_CHECK=$(curl -s -X GET "https://api.stripe.com/v1/prices/$PRICE_ID" \
                -u "$STRIPE_SECRET_KEY:" 2>&1)
            
            if echo "$PRICE_CHECK" | grep -q '"object": "price"'; then
                PRICE_AMOUNT=$(echo "$PRICE_CHECK" | grep -o '"unit_amount": [0-9]*' | grep -o '[0-9]*')
                if [ ! -z "$PRICE_AMOUNT" ]; then
                    DOLLAR_AMOUNT=$((PRICE_AMOUNT / 100))
                    echo -e "${GREEN}✅ $TIER tier: \$$DOLLAR_AMOUNT/month${NC}"
                else
                    echo -e "${GREEN}✅ $TIER tier: Price found${NC}"
                fi
            else
                echo -e "${RED}❌ $TIER tier: Price ID not found in Stripe${NC}"
                echo "   Price ID: $PRICE_ID"
            fi
        fi
    done
fi
echo ""

# Test 7: Check Server Status
echo "📋 Test 7: Checking Backend Server..."

# Try to connect to backend
if command -v curl &> /dev/null; then
    API_URL="${API_BASE_URL:-http://localhost:4242}"
    HEALTH_CHECK=$(curl -s "$API_URL/api/health" 2>&1 || echo "failed")
    
    if echo "$HEALTH_CHECK" | grep -q "ok"; then
        echo -e "${GREEN}✅ Backend server is running at $API_URL${NC}"
        
        # Check debug endpoint
        DEBUG_CHECK=$(curl -s "$API_URL/api/debug/env" 2>&1 || echo "failed")
        if echo "$DEBUG_CHECK" | grep -q "stripe"; then
            echo -e "${GREEN}   ✓ Stripe configuration loaded${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Backend server not running${NC}"
        echo "   Start with: npm start or node server/index.js"
    fi
else
    echo -e "${YELLOW}⚠️  curl not found, skipping server check${NC}"
fi
echo ""

# Summary
echo "=============================================="
echo "📊 Summary"
echo "=============================================="
echo ""

# Count checks
PASSED=0
WARNINGS=0
FAILED=0

# Determine status
if [ ! -z "$STRIPE_SECRET_KEY" ]; then
    PASSED=$((PASSED + 1))
else
    FAILED=$((FAILED + 1))
fi

if [ ! -z "$STRIPE_WEBHOOK_SECRET" ]; then
    PASSED=$((PASSED + 1))
else
    WARNINGS=$((WARNINGS + 1))
fi

if [ ! -z "$STRIPE_SUB_PRICE_STARTER" ] && [ ! -z "$STRIPE_SUB_PRICE_GROWTH" ] && [ ! -z "$STRIPE_SUB_PRICE_PRO" ]; then
    PASSED=$((PASSED + 1))
else
    FAILED=$((FAILED + 1))
fi

echo "✅ Passed: $PASSED"
echo "⚠️  Warnings: $WARNINGS"
echo "❌ Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 Your setup looks good!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Configure webhook in Stripe Dashboard"
    echo "   URL: https://api.artwalls.space/api/stripe/webhook"
    echo "   Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted"
    echo ""
    echo "2. Test subscription purchase"
    echo "   - Go to /plans-pricing"
    echo "   - Click 'Select Plan'"
    echo "   - Use test card: 4242 4242 4242 4242"
    echo ""
    echo "3. Verify tier upgrade in database"
    echo ""
else
    echo -e "${RED}⚠️  Some issues need to be fixed${NC}"
    echo ""
    echo "Please review the errors above and:"
    echo "1. Add missing environment variables to .dev.vars"
    echo "2. Get price IDs from Stripe Dashboard → Products"
    echo "3. Run this script again to verify"
fi
echo ""

echo "📖 For detailed instructions, see:"
echo "   STRIPE_SUBSCRIPTION_COMPLETE_GUIDE.md"
echo ""
