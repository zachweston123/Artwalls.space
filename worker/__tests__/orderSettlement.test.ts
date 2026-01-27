// intentionally left blank
import { describe, it, expect } from 'vitest';
import { calculateOrderFinancials, mergeTransferRecords, coerceBps } from '../orderSettlement';

describe('calculateOrderFinancials', () => {
  it('distributes cents according to basis points', () => {
    const { platformFeeCents, venuePayoutCents, artistPayoutCents } = calculateOrderFinancials(10000, 1500, 1000);
    expect(platformFeeCents).toBe(1500);
    expect(venuePayoutCents).toBe(1000);
    expect(artistPayoutCents).toBe(7500);
  });

  it('rounds down fractional cents and never returns negatives', () => {
    const { platformFeeCents, venuePayoutCents, artistPayoutCents } = calculateOrderFinancials(1999, 3333, 3333);
    expect(platformFeeCents).toBe(Math.floor((1999 * 3333) / 10000));
    expect(venuePayoutCents).toBe(Math.floor((1999 * 3333) / 10000));
    expect(artistPayoutCents).toBeGreaterThanOrEqual(0);
    expect(platformFeeCents + venuePayoutCents + artistPayoutCents).toBe(1999);
  });
});

describe('mergeTransferRecords', () => {
  it('merges new transfer ids without dropping existing types', () => {
    const merged = mergeTransferRecords(
      [{ venue_transfer_id: 'tr_old' }],
      [{ venue_transfer_id: 'tr_new' }, { artist_transfer_id: 'tr_artist' }],
    );
    expect(merged).toEqual([{ venue_transfer_id: 'tr_new', artist_transfer_id: 'tr_artist' }]);
  });

  it('ignores falsey updates and returns empty array when nothing is provided', () => {
    const merged = mergeTransferRecords(null, [{ venue_transfer_id: '' }, {}]);
    expect(merged).toEqual([]);
  });
});

describe('coerceBps', () => {
  it('coerces valid numeric values', () => {
    expect(coerceBps('1250', 1000)).toBe(1250);
  });

  it('falls back for invalid inputs and clamps negatives', () => {
    expect(coerceBps('NaN', 900)).toBe(900);
    expect(coerceBps(-500, 900)).toBe(900);
  });
});
