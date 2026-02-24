import { describe, expect, test } from 'vitest';
import {
  isValidInviteToken,
  statusAfterOpen,
  isStatusTransitionAllowed,
  mapVenueInviteRow,
} from '../helpers';

describe('isValidInviteToken', () => {
  test('accepts valid hex tokens (16-64 chars)', () => {
    expect(isValidInviteToken('abcdef1234567890')).toBe(true); // 16 chars
    expect(isValidInviteToken('a'.repeat(32))).toBe(true); // 32 chars
    expect(isValidInviteToken('0123456789abcdef0123456789abcdef')).toBe(true);
  });

  test('accepts upper-case hex tokens', () => {
    expect(isValidInviteToken('ABCDEF1234567890')).toBe(true);
  });

  test('rejects tokens shorter than 16 chars', () => {
    expect(isValidInviteToken('abc123')).toBe(false);
    expect(isValidInviteToken('a'.repeat(15))).toBe(false);
  });

  test('rejects tokens longer than 64 chars', () => {
    expect(isValidInviteToken('a'.repeat(65))).toBe(false);
  });

  test('rejects non-hex characters', () => {
    expect(isValidInviteToken('zzzzzzzzzzzzzzzz')).toBe(false);
    expect(isValidInviteToken('abcdef12345678g0')).toBe(false);
  });

  test('rejects empty / falsy input', () => {
    expect(isValidInviteToken('')).toBe(false);
    expect(isValidInviteToken(null as any)).toBe(false);
    expect(isValidInviteToken(undefined as any)).toBe(false);
  });
});

describe('statusAfterOpen', () => {
  test('DRAFT → CLICKED', () => {
    expect(statusAfterOpen('DRAFT')).toBe('CLICKED');
  });

  test('SENT → CLICKED', () => {
    expect(statusAfterOpen('SENT')).toBe('CLICKED');
  });

  test('CLICKED stays CLICKED', () => {
    expect(statusAfterOpen('CLICKED')).toBe('CLICKED');
  });

  test('terminal states pass through unchanged', () => {
    expect(statusAfterOpen('ACCEPTED')).toBe('ACCEPTED');
    expect(statusAfterOpen('DECLINED')).toBe('DECLINED');
    expect(statusAfterOpen('EXPIRED')).toBe('EXPIRED');
  });
});

describe('isStatusTransitionAllowed', () => {
  test('same status is always allowed (no-op)', () => {
    for (const s of ['DRAFT', 'SENT', 'CLICKED', 'ACCEPTED', 'DECLINED', 'EXPIRED']) {
      expect(isStatusTransitionAllowed(s, s)).toBe(true);
    }
  });

  test('DRAFT → SENT is allowed', () => {
    expect(isStatusTransitionAllowed('DRAFT', 'SENT')).toBe(true);
  });

  test('SENT → ACCEPTED is allowed', () => {
    expect(isStatusTransitionAllowed('SENT', 'ACCEPTED')).toBe(true);
  });

  test('SENT → DECLINED is allowed', () => {
    expect(isStatusTransitionAllowed('SENT', 'DECLINED')).toBe(true);
  });

  test('CLICKED → ACCEPTED is allowed', () => {
    expect(isStatusTransitionAllowed('CLICKED', 'ACCEPTED')).toBe(true);
  });

  test('terminal states block further transitions', () => {
    expect(isStatusTransitionAllowed('ACCEPTED', 'DECLINED')).toBe(false);
    expect(isStatusTransitionAllowed('ACCEPTED', 'SENT')).toBe(false);
    expect(isStatusTransitionAllowed('DECLINED', 'ACCEPTED')).toBe(false);
    expect(isStatusTransitionAllowed('EXPIRED', 'SENT')).toBe(false);
  });

  test('backward transitions are blocked', () => {
    expect(isStatusTransitionAllowed('CLICKED', 'DRAFT')).toBe(false);
    expect(isStatusTransitionAllowed('SENT', 'DRAFT')).toBe(false);
  });

  test('unknown status returns false', () => {
    expect(isStatusTransitionAllowed('UNKNOWN', 'SENT')).toBe(false);
  });
});

describe('mapVenueInviteRow', () => {
  test('maps snake_case DB row to camelCase', () => {
    const row = {
      id: '123',
      token: 'abc',
      artist_id: 'a1',
      place_id: 'p1',
      venue_name: 'Gallery',
      venue_address: '123 Main St',
      google_maps_url: 'https://maps.google.com',
      website_url: 'https://gallery.com',
      phone: '555-0100',
      venue_email: 'info@gallery.com',
      personal_line: 'Love your work',
      subject: 'Invitation',
      body_template_version: 'v1',
      status: 'SENT',
      sent_at: '2025-01-01T00:00:00Z',
      first_clicked_at: null,
      click_count: 0,
      accepted_at: null,
      declined_at: null,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    };
    const mapped = mapVenueInviteRow(row);
    expect(mapped).toEqual({
      id: '123',
      token: 'abc',
      artistId: 'a1',
      placeId: 'p1',
      venueName: 'Gallery',
      venueAddress: '123 Main St',
      googleMapsUrl: 'https://maps.google.com',
      websiteUrl: 'https://gallery.com',
      phone: '555-0100',
      venueEmail: 'info@gallery.com',
      personalLine: 'Love your work',
      subject: 'Invitation',
      bodyTemplateVersion: 'v1',
      status: 'SENT',
      sentAt: '2025-01-01T00:00:00Z',
      firstClickedAt: null,
      clickCount: 0,
      acceptedAt: null,
      declinedAt: null,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    });
  });

  test('returns null for null / undefined input', () => {
    expect(mapVenueInviteRow(null)).toBeNull();
    expect(mapVenueInviteRow(undefined)).toBeNull();
  });
});
