import { describe, expect, test } from 'vitest';
import { formatCurrency, safeDivide, formatRatioOrCount } from '../../utils/format';

describe('formatCurrency', () => {
  test('formats a positive number as USD', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
  });

  test('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  test('handles null / undefined as $0.00', () => {
    expect(formatCurrency(null)).toBe('$0.00');
    expect(formatCurrency(undefined)).toBe('$0.00');
  });

  test('handles NaN as $0.00', () => {
    expect(formatCurrency(NaN)).toBe('$0.00');
  });
});

describe('safeDivide', () => {
  test('divides valid numbers', () => {
    expect(safeDivide(10, 2)).toBe(5);
  });

  test('returns null for zero denominator', () => {
    expect(safeDivide(10, 0)).toBeNull();
  });

  test('returns null for null/undefined input', () => {
    expect(safeDivide(null, 5)).toBeNull();
    expect(safeDivide(10, undefined)).toBeNull();
  });
});

describe('formatRatioOrCount', () => {
  test('formats occupied / total', () => {
    expect(formatRatioOrCount(3, 5)).toBe('3/5');
  });

  test('clamps occupied to total', () => {
    expect(formatRatioOrCount(10, 5)).toBe('5/5');
  });

  test('uses zeroLabel when total is 0', () => {
    expect(formatRatioOrCount(0, 0, { zeroLabel: 'No walls' })).toBe('No walls');
  });

  test('falls back to "0" when total is 0 and no zeroLabel', () => {
    expect(formatRatioOrCount(0, 0)).toBe('0');
  });

  test('appends unit', () => {
    expect(formatRatioOrCount(2, 4, { unit: 'walls' })).toBe('2/4 walls');
  });
});
