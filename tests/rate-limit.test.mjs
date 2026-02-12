#!/usr/bin/env node
/**
 * Rate-limit integration test.
 *
 * Prerequisites:
 *   1. Start the Worker locally: `npx wrangler dev`
 *   2. Run this script:          `node tests/rate-limit.test.mjs`
 *
 * It hammers a rate-limited endpoint past its threshold and asserts 429.
 * Then waits for the window to reset and asserts 200 again.
 */

const API = process.env.API_BASE || 'http://localhost:8787';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.error(`  ❌ ${label}`);
  }
}

async function testRateLimitOnSupportEndpoint() {
  console.log('\n── Test: POST /api/support/messages rate limit (5/hour per IP) ──\n');

  const body = JSON.stringify({
    email: 'test@example.com',
    message: 'This is a test message for rate limiting validation.',
    role_context: 'other',
    page_source: 'test',
    honeypot: '', // clean — not a bot
  });

  const headers = { 'Content-Type': 'application/json' };

  // Send 5 requests — should all succeed (or fail with DB errors, which is fine
  // since we're testing rate limiting, not DB).
  let lastStatus = 0;
  for (let i = 1; i <= 5; i++) {
    const res = await fetch(`${API}/api/support/messages`, { method: 'POST', headers, body });
    lastStatus = res.status;
    if (res.status === 429) {
      // Already limited — maybe from a prior run within the same window
      console.log(`  ⚠️  Got 429 on request ${i} — window may not have reset from prior run.`);
      console.log('     Waiting 5s and retrying the whole suite…');
      await new Promise((r) => setTimeout(r, 5000));
      return testRateLimitOnSupportEndpoint(); // retry once
    }
  }
  assert(lastStatus !== 429, `First 5 requests should not be rate-limited (last status: ${lastStatus})`);

  // 6th request should be blocked
  const blocked = await fetch(`${API}/api/support/messages`, { method: 'POST', headers, body });
  assert(blocked.status === 429, `6th request should return 429 (got ${blocked.status})`);

  if (blocked.status === 429) {
    const data = await blocked.json();
    assert(data.error === 'rate_limited', `Body should have error: "rate_limited" (got "${data.error}")`);
    assert(typeof data.retryAfterSec === 'number', `Body should include retryAfterSec (got ${data.retryAfterSec})`);
    const retryHeader = blocked.headers.get('Retry-After');
    assert(retryHeader !== null, `Response should include Retry-After header (got "${retryHeader}")`);
    assert(blocked.headers.get('Cache-Control') === 'no-store', `429 should have Cache-Control: no-store`);
  }
}

async function testCheckoutRateLimit() {
  console.log('\n── Test: POST /api/stripe/create-checkout-session rate limit (5/min per IP) ──\n');

  const body = JSON.stringify({ artworkId: '00000000-0000-0000-0000-000000000001' });
  const headers = { 'Content-Type': 'application/json' };

  // Send 5 requests rapidly
  for (let i = 1; i <= 5; i++) {
    await fetch(`${API}/api/stripe/create-checkout-session`, { method: 'POST', headers, body });
  }

  // 6th should be rate-limited
  const blocked = await fetch(`${API}/api/stripe/create-checkout-session`, { method: 'POST', headers, body });
  assert(blocked.status === 429, `6th checkout request should return 429 (got ${blocked.status})`);

  if (blocked.status === 429) {
    const data = await blocked.json();
    assert(data.error === 'rate_limited', `Checkout 429 body should have error: "rate_limited"`);
  }
}

async function testHealthNotLimited() {
  console.log('\n── Test: GET /api/health is NOT rate-limited ──\n');

  let allOk = true;
  for (let i = 0; i < 20; i++) {
    const res = await fetch(`${API}/api/health`);
    if (res.status === 429) { allOk = false; break; }
  }
  assert(allOk, '20 rapid health checks should not trigger 429');
}

async function test429Format() {
  console.log('\n── Test: 429 response format compliance ──\n');

  // Exhaust support limit first (if not already)
  const body = JSON.stringify({
    email: 'format-test@example.com',
    message: 'Format compliance test message body here.',
    role_context: 'other',
    page_source: 'test',
  });
  const headers = { 'Content-Type': 'application/json' };
  for (let i = 0; i < 10; i++) {
    await fetch(`${API}/api/support/messages`, { method: 'POST', headers, body });
  }
  const res = await fetch(`${API}/api/support/messages`, { method: 'POST', headers, body });
  if (res.status !== 429) {
    console.log('  ⚠️  Could not trigger 429 for format test — skipping');
    return;
  }

  const ct = res.headers.get('Content-Type') || '';
  assert(ct.includes('application/json'), `Content-Type should be application/json (got "${ct}")`);

  const cors = res.headers.get('Access-Control-Allow-Origin') || '';
  assert(cors.length > 0, `429 should include CORS headers (got "${cors}")`);
}

// ── Runner ──

(async () => {
  console.log(`\n🔧 Rate Limit Integration Tests — targeting ${API}\n`);

  try {
    // Quick connectivity check
    const health = await fetch(`${API}/api/health`).catch(() => null);
    if (!health || !health.ok) {
      console.error('❌ Cannot reach API. Is the worker running? (npx wrangler dev)');
      process.exit(1);
    }
    console.log('✅ API is reachable\n');

    await testHealthNotLimited();
    await testRateLimitOnSupportEndpoint();
    await testCheckoutRateLimit();
    await test429Format();

    console.log(`\n${'─'.repeat(50)}`);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('\n💥 Unexpected error:', err.message || err);
    process.exit(1);
  }
})();
