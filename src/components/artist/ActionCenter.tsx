import { useState } from 'react';
import { UserCircle, Image, CreditCard, MapPin, X, CheckCircle2 } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * ActionCenter — prioritised next-step checklist for the artist dashboard.
 *
 * Each item is derived from data already available at the dashboard level:
 *   • profileComplete / profilePercentage → from calculateProfileCompleteness()
 *   • artworksCount                       → stats.artworks.total
 *   • payoutsConnected                    → stripe connect status (hasAccount + payoutsEnabled)
 *   • pendingApplications                 → stats.applications.pending
 *
 * Items are dismissible per-session (local state).
 */

interface ActionItem {
  id: string;
  icon: ReactNode;
  title: string;
  description: string;
  cta: string;
  onAction: () => void;
  progress?: string;
}

interface ActionCenterProps {
  profilePercentage: number | null;
  profileComplete: boolean | null;
  artworksCount: number;
  /** null = still loading payout status; true = payouts ready; false = not connected */
  payoutsConnected: boolean | null;
  pendingApplications: number;
  onNavigate: (page: string) => void;
  /** If provided, clicking "Connect payouts" calls this instead of navigating */
  onPayoutSetup?: () => void;
}

export function ActionCenter({
  profilePercentage,
  profileComplete,
  artworksCount,
  payoutsConnected,
  pendingApplications,
  onNavigate,
  onPayoutSetup,
}: ActionCenterProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const dismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  };

  /* ── Build action items based on current data ──────────────────────── */
  const items: ActionItem[] = [];

  // 1. Profile incomplete
  if (profileComplete === false) {
    items.push({
      id: 'complete-profile',
      icon: <UserCircle className="w-5 h-5" />,
      title: 'Complete your profile',
      description: 'Venues are more likely to invite artists with complete profiles.',
      cta: 'Complete profile',
      onAction: () => onNavigate('artist-profile'),
      progress:
        profilePercentage != null ? `${profilePercentage}% complete` : undefined,
    });
  }

  // 2. Low artwork count (threshold: <3)
  if (artworksCount < 3) {
    items.push({
      id: 'add-artworks',
      icon: <Image className="w-5 h-5" />,
      title: artworksCount === 0 ? 'Upload your first artwork' : 'Add more artworks',
      description:
        artworksCount === 0
          ? 'Get started by uploading artwork to your portfolio.'
          : 'Having at least 3 pieces helps venues discover your work.',
      cta: 'Manage artworks',
      onAction: () => onNavigate('artist-artworks'),
      progress: `${artworksCount}/3 artworks`,
    });
  }

  // 3. Payouts not connected (skip while still loading)
  if (payoutsConnected === false) {
    items.push({
      id: 'connect-payouts',
      icon: <CreditCard className="w-5 h-5" />,
      title: 'Connect payouts',
      description: 'Set up Stripe to receive payments when your art sells.',
      cta: 'Set up payouts',
      onAction: () => {
        if (onPayoutSetup) {
          onPayoutSetup();
        } else {
          // Fallback: scroll to payout section in AccountStatusPanel
          const el = document.getElementById('payout-status-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
      },
    });
  }

  // 4. No applications → suggest finding venues
  if (pendingApplications === 0 && artworksCount >= 1) {
    items.push({
      id: 'find-venues',
      icon: <MapPin className="w-5 h-5" />,
      title: 'Find venues for your art',
      description: 'Discover venues looking for artwork or invite one directly.',
      cta: 'Discover venues',
      onAction: () => onNavigate('artist-venues'),
    });
  }

  const visibleItems = items.filter((item) => !dismissed.has(item.id));

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border)]">
        <h2 className="text-base font-semibold text-[var(--text)]">Action Center</h2>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Next steps to grow your presence
        </p>
      </div>

      {visibleItems.length === 0 ? (
        /* ── All-set state ── */
        <div className="px-5 py-8 text-center">
          <div className="w-10 h-10 rounded-full bg-[var(--green-muted)] flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-5 h-5 text-[var(--green)]" />
          </div>
          <p className="text-sm font-medium text-[var(--text)]">You're all set!</p>
          <p className="text-xs text-[var(--text-muted)] mt-1 max-w-[220px] mx-auto">
            Your profile is looking great. Keep creating and connecting with venues.
          </p>
          <button
            onClick={() => onNavigate('artist-venues')}
            className="mt-3 text-sm text-[var(--blue)] hover:underline font-medium"
          >
            Find venues →
          </button>
        </div>
      ) : (
        /* ── Action rows ── */
        <div className="divide-y divide-[var(--border)]">
          {visibleItems.map((item) => (
            <div
              key={item.id}
              className="px-5 py-4 flex items-start gap-3 group"
            >
              {/* Icon */}
              <div className="w-9 h-9 rounded-lg bg-[var(--blue-muted)] flex items-center justify-center flex-shrink-0 text-[var(--blue)]">
                {item.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text)]">
                  {item.title}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {item.description}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={item.onAction}
                    className="text-xs font-semibold text-[var(--blue)] hover:underline"
                  >
                    {item.cta} →
                  </button>
                  {item.progress && (
                    <span className="text-xs text-[var(--text-muted)]">
                      {item.progress}
                    </span>
                  )}
                </div>
              </div>

              {/* Dismiss */}
              <button
                onClick={() => dismiss(item.id)}
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
                aria-label={`Dismiss ${item.title}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
