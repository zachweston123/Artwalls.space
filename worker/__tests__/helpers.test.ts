import { describe, expect, test } from 'vitest';
import {
  isUUID,
  clampStr,
  isValidUrl,
  isValidEmail,
  generateInviteToken,
  generateReferralToken,
  rateLimitByIp,
} from '../helpers';

describe('Worker helpers', () => {
  describe('isUUID', () => {
    test('accepts valid UUIDs', () => {
      expect(isUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
    });

    test('rejects invalid UUIDs', () => {
      expect(isUUID('not-a-uuid')).toBe(false);
      expect(isUUID('')).toBe(false);
      expect(isUUID(null)).toBe(false);
      expect(isUUID(123)).toBe(false);
      expect(isUUID('550e8400-e29b-41d4-a716')).toBe(false);
    });
  });

  describe('clampStr', () => {
    test('clamps long strings', () => {
      expect(clampStr('hello world', 5)).toBe('hello');
    });

    test('trims whitespace', () => {
      expect(clampStr('  hi  ', 10)).toBe('hi');
    });

    test('returns empty string for non-strings', () => {
      expect(clampStr(null, 10)).toBe('');
      expect(clampStr(42, 10)).toBe('');
      expect(clampStr(undefined, 10)).toBe('');
    });
  });

  describe('isValidUrl', () => {
    test('accepts http/https URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
    });

    test('rejects non-URLs', () => {
      expect(isValidUrl('not a url')).toBe(false);
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl(42)).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    test('accepts valid emails', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('name+tag@domain.co')).toBe(true);
    });

    test('rejects invalid emails', () => {
      expect(isValidEmail('nope')).toBe(false);
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
    });
  });

  describe('generateInviteToken', () => {
    test('produces a 32-char hex string', () => {
      const token = generateInviteToken();
      expect(token).toMatch(/^[0-9a-f]{32}$/);
    });
  });

  describe('generateReferralToken', () => {
    test('produces a base64url string', () => {
      const token = generateReferralToken();
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(token.length).toBeGreaterThan(20);
    });
  });

  describe('rateLimitByIp', () => {
    test('allows requests within limit', () => {
      const result = rateLimitByIp('192.168.1.1-test', 5, 60_000);
      expect(result.ok).toBe(true);
      expect(result.remaining).toBe(4);
    });

    test('blocks requests over limit', () => {
      const ip = '10.0.0.1-test';
      for (let i = 0; i < 3; i++) rateLimitByIp(ip, 3, 60_000);
      const result = rateLimitByIp(ip, 3, 60_000);
      expect(result.ok).toBe(false);
      expect(result.remaining).toBe(0);
    });

    test('allows empty IP', () => {
      const result = rateLimitByIp('', 1, 60_000);
      expect(result.ok).toBe(true);
    });
  });
});
