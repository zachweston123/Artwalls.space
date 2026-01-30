export function formatCurrency(amount: number | null | undefined, currency: string = 'USD') {
  const value = Number(amount);
  const safeValue = Number.isFinite(value) ? value : 0;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeValue);
}

export function safeDivide(
  numerator: number | null | undefined,
  denominator: number | null | undefined
): number | null {
  const num = Number(numerator);
  const den = Number(denominator);

  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) {
    return null;
  }

  return num / den;
}

interface RatioOptions {
  zeroLabel?: string;
  unit?: string;
}

export function formatRatioOrCount(
  occupied: number | null | undefined,
  total: number | null | undefined,
  options: RatioOptions = {}
) {
  const occ = Math.max(0, Number(occupied) || 0);
  const tot = Math.max(0, Number(total) || 0);

  if (tot === 0) {
    if (options.zeroLabel) return options.zeroLabel;
    return options.unit ? `0 ${options.unit}` : '0';
  }

  const clamped = Math.min(occ, tot);
  const ratio = `${clamped}/${tot}`;

  return options.unit ? `${ratio} ${options.unit}` : ratio;
}
