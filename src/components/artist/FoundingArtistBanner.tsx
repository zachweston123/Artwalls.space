/**
 * FoundingArtistBanner — pricing page banner + dashboard card.
 *
 * Calls `GET /api/founding-artist/status` and renders:
 *  • "50 % off" CTA when eligible
 *  • "Active — ends {date}" when redeemed
 *  • Nothing (or "slots filled") when ineligible
 */

import { useEffect, useState } from 'react';
import { Award, Sparkles, Clock, CheckCircle } from 'lucide-react';
import { apiGet } from '../../lib/api';

interface FoundingStatus {
  eligible: boolean;
  redeemed: boolean;
  discountEndsAt: string | null;
  slotsRemaining: number;
  cutoff: string;
  reason: string | null;
}

interface FoundingArtistBannerProps {
  /** 'pricing' = tall banner on plans page, 'dashboard' = compact card */
  variant?: 'pricing' | 'dashboard';
  className?: string;
}

export function FoundingArtistBanner({ variant = 'pricing', className = '' }: FoundingArtistBannerProps) {
  const [status, setStatus] = useState<FoundingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet<FoundingStatus>('/api/founding-artist/status');
        if (!cancelled) setStatus(data);
      } catch {
        // silently hide if API fails
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading || !status) return null;

  // ── Redeemed state ──────────────────────────────────────────
  if (status.redeemed) {
    const endsAt = status.discountEndsAt
      ? new Date(status.discountEndsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : null;

    return (
      <div className={`bg-violet-500/10 border border-violet-500/25 rounded-xl p-4 sm:p-5 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-500/20 rounded-lg">
            <Award className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" /> Founding Artist — 50 % off active
            </p>
            {endsAt && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Discount ends {endsAt}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Eligible state ──────────────────────────────────────────
  if (status.eligible) {
    const cutoffDate = new Date(status.cutoff).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    if (variant === 'dashboard') {
      return (
        <div className={`bg-violet-500/10 border border-violet-500/25 rounded-xl p-4 sm:p-5 ${className}`}>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-violet-500/20 rounded-lg flex-shrink-0">
              <Sparkles className="w-5 h-5 text-violet-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-violet-600 dark:text-violet-400">
                Founding Artist: 50 % off for 12 months
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {status.slotsRemaining} spot{status.slotsRemaining !== 1 ? 's' : ''} left · Offer ends {cutoffDate}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Subscribe to any paid plan to activate.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Pricing-page banner
    return (
      <div className={`bg-violet-500/10 border border-violet-500/25 rounded-xl p-5 sm:p-6 mb-8 ${className}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="p-3 bg-violet-500/20 rounded-xl">
            <Sparkles className="w-6 h-6 text-violet-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-violet-600 dark:text-violet-400">
              Founding Artist — 50 % off for your first 12 months
            </h3>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Limited to {status.slotsRemaining} remaining spot{status.slotsRemaining !== 1 ? 's' : ''}.
              Offer ends {cutoffDate}. One per artist, new paid subscribers only.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-violet-500/70 whitespace-nowrap">
            <Clock className="w-4 h-4" />
            <span>Limited time</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Ineligible — optionally show "spots filled" ─────────────
  if (status.reason === 'slots_full' || status.reason === 'expired') {
    if (variant === 'pricing') {
      return (
        <div className={`bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4 mb-8 text-center ${className}`}>
          <p className="text-sm text-[var(--text-muted)]">
            The Founding Artist promotion has ended. Subscribe at regular pricing below.
          </p>
        </div>
      );
    }
  }

  return null;
}
