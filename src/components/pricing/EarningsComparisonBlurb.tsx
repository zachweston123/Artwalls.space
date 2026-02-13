import { useMemo } from 'react';
import { getAllTierTakeHomePercents } from '../../lib/pricingCalculations';

interface EarningsComparisonBlurbProps {
  variant: 'pricing' | 'subscribe';
  /** Required for variant="subscribe" — the selected plan's whole-number take-home % */
  takeHomePercent?: number;
  /** Override for variant="pricing" — Free-tier take-home % (derived automatically if omitted) */
  freeTakeHomePercent?: number;
  /** Override for variant="pricing" — max paid-tier take-home % (derived automatically if omitted) */
  maxTakeHomePercent?: number;
}

/**
 * A short gallery-split comparison blurb.
 *
 * - `variant="pricing"` → full paragraph for the Plans & Pricing page
 * - `variant="subscribe"` → compact micro-blurb for a plan card / checkout summary
 *
 * All percentages are derived from the single source of truth
 * in `pricingCalculations.ts` unless explicitly overridden.
 */
export function EarningsComparisonBlurb({
  variant,
  takeHomePercent,
  freeTakeHomePercent,
  maxTakeHomePercent,
}: EarningsComparisonBlurbProps) {
  const tierPcts = useMemo(() => getAllTierTakeHomePercents(), []);

  if (variant === 'pricing') {
    const free = freeTakeHomePercent ?? tierPcts.free;
    const max =
      maxTakeHomePercent ??
      Math.max(...Object.values(tierPcts));

    return (
      <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-2xl mx-auto text-center mb-8">
        Most traditional galleries run on a 50/50 split (sometimes 40–50%&nbsp;commission).
        With Artwalls, you keep {free}% on Free and up to {max}% on paid plans, while
        we handle the QR checkout, payouts, and the venue's commission. Upgrade for more
        visibility, more opportunities, and better earnings when a piece moves.
      </p>
    );
  }

  // variant === 'subscribe'
  const pct = takeHomePercent ?? tierPcts.free;

  return (
    <p className="text-xs text-[var(--text-muted)] leading-relaxed mt-1.5">
      Gallery math is often 50/50. On Artwalls, this plan means you take
      home {pct}% of the list price&nbsp;— so more of each sale stays with you.
    </p>
  );
}
