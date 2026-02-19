/**
 * FoundingArtistBadge — displays a "Founding Artist" badge.
 * Mirrors FoundingVenueBadge's API for consistency.
 *
 * `compact` — small inline chip (cards / lists)
 * `full`    — banner-style badge with discount-end countdown
 */

import { Award } from 'lucide-react';

interface FoundingArtistBadgeProps {
  variant?: 'compact' | 'full';
  /** ISO date when the founding discount expires */
  discountEndsAt?: string | null;
  className?: string;
}

export function FoundingArtistBadge({
  variant = 'compact',
  discountEndsAt,
  className = '',
}: FoundingArtistBadgeProps) {
  if (variant === 'full') {
    const daysLeft = discountEndsAt
      ? Math.max(0, Math.ceil((new Date(discountEndsAt).getTime() - Date.now()) / 86_400_000))
      : null;

    const discountActive = daysLeft === null || daysLeft > 0;

    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 bg-violet-500/15 border border-violet-500/30 rounded-lg ${className}`}
      >
        <Award className="w-4 h-4 text-violet-500" />
        <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">
          Founding Artist
        </span>
        {daysLeft !== null && discountActive && (
          <span className="text-xs text-violet-500/70 ml-1">
            · 50 % off — {daysLeft}d left
          </span>
        )}
        {daysLeft !== null && !discountActive && (
          <span className="text-xs text-violet-500/70 ml-1">· discount ended</span>
        )}
      </div>
    );
  }

  // ── Compact chip ────────────────────────────────────────────
  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 bg-violet-500/15 rounded-full ${className}`}
    >
      <Award className="w-3 h-3 text-violet-500" />
      <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">
        Founding Artist
      </span>
    </div>
  );
}
