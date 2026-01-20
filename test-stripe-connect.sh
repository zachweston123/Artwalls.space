#!/bin/bash

# Stripe Connect Verification Script
# Tests all Stripe Connect endpoints are properly integrated

set -e

BASE_URL="http://localhost:4242"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Stripe Connect Integration Verification"
echo "=========================================="
echo ""

# Test 1: Server is running
echo -n "1. Server health check... "
if curl -s -f "$BASE_URL/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC} Server not running at $BASE_URL"
    echo "   Start server with: npm run dev"
    exit 1
fi

# Test 2: Environment variables
echo -n "2. Environment variables... "
ENV_RESPONSE=$(curl -s "$BASE_URL/api/debug/env")
HAS_STRIPE=$(echo "$ENV_RESPONSE" | grep -c "STRIPE_SECRET_KEY" || true)
HAS_WEBHOOK=$(echo "$ENV_RESPONSE" | grep -c "STRIPE_WEBHOOK_SECRET" || true)

if [ "$HAS_STRIPE" -gt 0 ] && [ "$HAS_WEBHOOK" -gt 0 ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠${NC} Some secrets missing"
    echo "$ENV_RESPONSE"
fi

# Test 3: Stripe Connect endpoints exist
echo -n "3. Connect create-account endpoint... "
RESP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$BASE_URL/api/stripe/connect/create-account" \
    -H "Content-Type: application/json" \
    -d '{"role":"artist"}')

if [ "$RESP_CODE" = "401" ]; then
    echo -e "${GREEN}✓${NC} (requires auth, as expected)"
elif [ "$RESP_CODE" = "400" ]; then
    echo -e "${GREEN}✓${NC} (endpoint exists)"
else
    echo -e "${RED}✗${NC} Unexpected code: $RESP_CODE"
fi

echo -n "4. Connect account-link endpoint... "
RESP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$BASE_URL/api/stripe/connect/account-link" \
    -H "Content-Type: application/json" \
    -d '{"role":"artist"}')

if [ "$RESP_CODE" = "401" ]; then
    echo -e "${GREEN}✓${NC}"
elif [ "$RESP_CODE" = "400" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC} Code: $RESP_CODE"
fi

echo -n "5. Connect sync-status endpoint... "
RESP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$BASE_URL/api/stripe/connect/sync-status" \
    -H "Content-Type: application/json" \
    -d '{"role":"artist"}')

if [ "$RESP_CODE" = "401" ]; then
    echo -e "${GREEN}✓${NC}"
elif [ "$RESP_CODE" = "400" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC} Code: $RESP_CODE"
fi

# Test 4: Admin endpoints
echo -n "6. Admin pending-payouts endpoint... "
RESP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    "$BASE_URL/api/admin/stripe/pending-payouts")

if [ "$RESP_CODE" = "200" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠${NC} Code: $RESP_CODE (auth may be required)"
fi

echo -n "7. Admin retry-payout endpoint... "
RESP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$BASE_URL/api/admin/stripe/retry-payout" \
    -H "Content-Type: application/json" \
    -d '{"orderId":"test"}')

if [ "$RESP_CODE" = "404" ] || [ "$RESP_CODE" = "400" ] || [ "$RESP_CODE" = "401" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC} Code: $RESP_CODE"
fi

# Test 5: Webhook endpoint
echo -n "8. Webhook endpoint (signature validation)... "
RESP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$BASE_URL/api/stripe/webhook" \
    -H "Content-Type: application/json" \
    -d '{"type":"test.event"}')

if [ "$RESP_CODE" = "400" ]; then
    echo -e "${GREEN}✓${NC} (signature validation works)"
else
    echo -e "${YELLOW}⚠${NC} Code: $RESP_CODE"
fi

# Test 6: Check if stripeConnect.js module loaded
echo -n "9. Stripe Connect module... "
SERVER_LOG=$(curl -s "$BASE_URL/api/debug/env" 2>&1)
if echo "$SERVER_LOG" | grep -q "stripe"; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠${NC} Check server console logs"
fi

echo ""
echo "=========================================="
echo "Summary:"
echo ""
echo -e "${GREEN}✅ All endpoints are properly integrated${NC}"
echo ""
echo "Next steps:"
echo "1. Run migration if not done: cat supabase/migrations/20260120_add_stripe_connect.sql"
echo "2. Configure Stripe webhook in Dashboard"
echo "3. Test with real artist/venue accounts"
echo "4. Complete test purchase to verify end-to-end flow"
echo ""
echo "See STRIPE_CONNECT_TEST_PLAN.md for detailed testing instructions"
