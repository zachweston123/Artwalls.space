type TransferRecord = Record<string, string>;

export function calculateOrderFinancials(amountCents: number, platformFeeBps: number, venueFeeBps: number) {
  const safeAmount = Number.isFinite(amountCents) ? Math.max(0, Math.round(amountCents)) : 0;
  const safePlatformBps = Number.isFinite(platformFeeBps) ? Math.max(0, Math.round(platformFeeBps)) : 0;
  const safeVenueBps = Number.isFinite(venueFeeBps) ? Math.max(0, Math.round(venueFeeBps)) : 0;
  const platformFeeCents = Math.floor((safeAmount * safePlatformBps) / 10000);
  const venuePayoutCents = Math.floor((safeAmount * safeVenueBps) / 10000);
  const artistPayoutCents = Math.max(0, safeAmount - platformFeeCents - venuePayoutCents);
  return { platformFeeCents, venuePayoutCents, artistPayoutCents };
}

export function mergeTransferRecords(existing: unknown, updates: TransferRecord[]) {
  const merged = new Map<string, string>();
  if (Array.isArray(existing)) {
    for (const record of existing) {
      if (record && typeof record === 'object') {
        for (const [key, value] of Object.entries(record)) {
          if (typeof value === 'string' && value.trim()) {
            merged.set(key, value);
          }
        }
      }
    }
  }

  for (const update of updates) {
    for (const [key, value] of Object.entries(update)) {
      if (typeof value === 'string' && value.trim()) {
        merged.set(key, value);
      }
    }
  }

  if (merged.size === 0) return [];
  return [Object.fromEntries(merged)];
}

export function coerceBps(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.round(parsed);
  return rounded >= 0 ? rounded : fallback;
}
