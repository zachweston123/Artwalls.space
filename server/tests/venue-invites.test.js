/**
 * VENUE INVITES - TEST SUITE
 *
 * Usage:
 *   node server/tests/venue-invites.test.js
 */

import {
  generateInviteToken,
  isValidInviteToken,
  isStatusTransitionAllowed,
  statusAfterOpen,
  shouldBlockDuplicateInvite,
} from '../venueInviteUtils.js';

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

console.log('🧪 VENUE INVITES TEST SUITE\n');

// Test 1: Token generation + validation
const token = generateInviteToken();
assert(typeof token === 'string' && token.length >= 16, 'Token should be a non-empty string');
assert(isValidInviteToken(token), 'Token should validate');
assert(!isValidInviteToken(''), 'Empty token should be invalid');
assert(!isValidInviteToken('not-a-token'), 'Invalid token should fail');
console.log('✅ Token generation + validation passed');

// Test 2: Status transitions
assert(isStatusTransitionAllowed('DRAFT', 'SENT'), 'DRAFT -> SENT should be allowed');
assert(isStatusTransitionAllowed('DRAFT', 'CLICKED'), 'DRAFT -> CLICKED should be allowed');
assert(!isStatusTransitionAllowed('ACCEPTED', 'SENT'), 'ACCEPTED -> SENT should be blocked');
assert(!isStatusTransitionAllowed('DECLINED', 'ACCEPTED'), 'DECLINED -> ACCEPTED should be blocked');
assert(isStatusTransitionAllowed('SENT', 'CLICKED'), 'SENT -> CLICKED should be allowed');
assert(isStatusTransitionAllowed('CLICKED', 'ACCEPTED'), 'CLICKED -> ACCEPTED should be allowed');
console.log('✅ Status transition rules passed');

// Test 3: Click status updates
assert(statusAfterOpen('DRAFT') === 'CLICKED', 'Open from DRAFT should become CLICKED');
assert(statusAfterOpen('SENT') === 'CLICKED', 'Open from SENT should become CLICKED');
assert(statusAfterOpen('ACCEPTED') === 'ACCEPTED', 'Open from ACCEPTED should stay ACCEPTED');
console.log('✅ Click status updates passed');

// Test 4: Duplicate prevention window
const now = new Date('2026-01-24T12:00:00.000Z').toISOString();
const recent = new Date('2026-01-20T12:00:00.000Z').toISOString();
const old = new Date('2025-12-10T12:00:00.000Z').toISOString();
assert(shouldBlockDuplicateInvite(recent, now, 30), 'Recent invite should be blocked');
assert(!shouldBlockDuplicateInvite(old, now, 30), 'Old invite should not be blocked');
console.log('✅ Duplicate prevention window passed');

console.log('\n🎉 All venue invite tests passed!');
