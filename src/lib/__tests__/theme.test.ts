import { describe, expect, test } from 'vitest';
import { coerceThemePreference, isThemePreference, resolveTheme } from '../theme';

describe('Theme utilities', () => {
  describe('isThemePreference', () => {
    test('accepts valid preferences', () => {
      expect(isThemePreference('system')).toBe(true);
      expect(isThemePreference('light')).toBe(true);
      expect(isThemePreference('dark')).toBe(true);
    });

    test('rejects invalid values', () => {
      expect(isThemePreference('auto')).toBe(false);
      expect(isThemePreference('')).toBe(false);
      expect(isThemePreference(null)).toBe(false);
      expect(isThemePreference(undefined)).toBe(false);
      expect(isThemePreference(42)).toBe(false);
    });
  });

  describe('coerceThemePreference', () => {
    test('passes through valid preferences', () => {
      expect(coerceThemePreference('light')).toBe('light');
      expect(coerceThemePreference('dark')).toBe('dark');
      expect(coerceThemePreference('system')).toBe('system');
    });

    test('falls back for invalid values', () => {
      expect(coerceThemePreference('invalid')).toBe('system');
      expect(coerceThemePreference(null)).toBe('system');
      expect(coerceThemePreference(undefined)).toBe('system');
    });

    test('uses custom fallback', () => {
      expect(coerceThemePreference('invalid', 'dark')).toBe('dark');
      expect(coerceThemePreference(null, 'light')).toBe('light');
    });
  });

  describe('resolveTheme', () => {
    test('returns light/dark directly', () => {
      expect(resolveTheme('light')).toBe('light');
      expect(resolveTheme('dark')).toBe('dark');
    });

    test('resolves system to light or dark', () => {
      const result = resolveTheme('system');
      expect(['light', 'dark']).toContain(result);
    });
  });
});
