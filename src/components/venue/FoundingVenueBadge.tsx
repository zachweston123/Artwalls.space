/**
 * FoundingVenueBadge — displays a "Founding Venue" badge with optional size variants.
 * Used on public venue pages, venue cards in discovery lists, and the venue dashboard.
 */

import { Award } from 'lucide-react';

interface FoundingVenueBadgeProps {
  /** Compact = inline chip; full = larger banner-style badge */
  variant?: 'compact' | 'full';
  /** Date the founding/featured window ends */
  featuredUntil?: string | null;
  className?: string;
}

export function FoundingVenueBadge({ variant = 'compact', featuredUntil, className = '' }: FoundingVenueBadgeProps) {
  // Only render if still within the founding window
  if (featuredUntil && new Date(featuredUntil) < new Date()) return null;

  if (variant === 'full') {
    const daysLeft = featuredUntil
      ? Math.max(0, Math.ceil((new Date(featuredUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;

    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/15 border border-amber-500/30 rounded-lg ${className}`}>
        <Award className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">Founding Venue</span>
        {daysLeft !== null && (
          <span className="text-xs text-amber-500/70 ml-1">
            · {daysLeft}d left
          </span>
        )}
      </div>
    );
  }

  // Compact chip (for cards in lists)
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/15 rounded-full ${className}`}>
      <Award className="w-3 h-3 text-amber-500" />
      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Founding</span>
    </div>
  );
}
