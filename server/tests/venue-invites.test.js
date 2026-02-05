import { describe, expect, it } from 'vitest';
import {
  generateInviteToken,
  isValidInviteToken,
  isStatusTransitionAllowed,
  statusAfterOpen,
  shouldBlockDuplicateInvite,
} from '../venueInviteUtils.js';

describe('Venue Invites', () => {
  it('generates and validates tokens', () => {
    const token = generateInviteToken();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThanOrEqual(16);
    expect(isValidInviteToken(token)).toBe(true);
    expect(isValidInviteToken('')).toBe(false);
    expect(isValidInviteToken('not-a-token')).toBe(false);
  });

  it('enforces status transitions', () => {
    expect(isStatusTransitionAllowed('DRAFT', 'SENT')).toBe(true);
    expect(isStatusTransitionAllowed('DRAFT', 'CLICKED')).toBe(true);
    expect(isStatusTransitionAllowed('ACCEPTED', 'SENT')).toBe(false);
    expect(isStatusTransitionAllowed('DECLINED', 'ACCEPTED')).toBe(false);
    expect(isStatusTransitionAllowed('SENT', 'CLICKED')).toBe(true);
    expect(isStatusTransitionAllowed('CLICKED', 'ACCEPTED')).toBe(true);
  });

  it('maps opened status correctly', () => {
    expect(statusAfterOpen('DRAFT')).toBe('CLICKED');
    expect(statusAfterOpen('SENT')).toBe('CLICKED');
    expect(statusAfterOpen('ACCEPTED')).toBe('ACCEPTED');
  });

  it('blocks duplicate invites within window', () => {
    const now = new Date('2026-01-24T12:00:00.000Z').toISOString();
    const recent = new Date('2026-01-20T12:00:00.000Z').toISOString();
    const old = new Date('2025-12-10T12:00:00.000Z').toISOString();
    expect(shouldBlockDuplicateInvite(recent, now, 30)).toBe(true);
    expect(shouldBlockDuplicateInvite(old, now, 30)).toBe(false);
  });
});
