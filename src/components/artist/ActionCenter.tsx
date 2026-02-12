import { useState } from 'react';
import { UserCircle, Image, CreditCard, MapPin, X, CheckCircle2, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * ActionCenter — compact tile-grid of prioritised next steps.
 *
 * Shows up to 4 actions as a 2×2 tile grid on desktop so the dashboard
 * stays above-the-fold without scrolling. Additional actions are
 * accessible via a "View all" link.
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

/* ── Reusable tile component — guarantees identical layout ────────── */

interface ActionTileProps {
  item: ActionItem;
  onDismiss: (id: string) => void;
}

function ActionTile({ item, onDismiss }: ActionTileProps) {
  return (
    <div
      className="relative bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-5 group flex flex-col min-h-[148px] transition-all duration-200 hover:border-[var(--blue)]/55 hover:ring-1 hover:ring-[var(--blue)]/20 hover:bg-[var(--surface-3)]/40"
    >
      {/* Dismiss — top-right, appears on hover */}
      <button
        onClick={() => onDismiss(item.id)}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-3)]"
        aria-label={`Dismiss ${item.title}`}
      >
        <X className="w-3 h-3" />
      </button>

      {/* Header row: icon + title/meta */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 shrink-0 rounded-lg bg-[var(--surface-3)] flex items-center justify-center text-[var(--text-muted)]">
          {item.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--text)] leading-snug truncate">
              {item.title}
            </p>
            {item.progress && (
              <span className="text-xs text-[var(--text-muted)] tabular-nums whitespace-nowrap">
                {item.progress}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed mt-1 line-clamp-2">
            {item.description}
          </p>
        </div>
      </div>

      {/* Footer: CTA pinned to bottom */}
      <div className="mt-auto pt-3">
        <button
          onClick={item.onAction}
          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--blue)] hover:underline"
        >
          {item.cta}
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
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
      icon: <UserCircle className="w-4 h-4" />,
      title: 'Complete your profile',
      description: 'Venues prefer artists with full profiles.',
      cta: 'Complete profile',
      onAction: () => onNavigate('artist-profile'),
      progress:
        profilePercentage != null ? `${profilePercentage}%` : undefined,
    });
  }

  // 2. Low artwork count (threshold: <3)
  if (artworksCount < 3) {
    items.push({
      id: 'add-artworks',
      icon: <Image className="w-4 h-4" />,
      title: artworksCount === 0 ? 'Upload artwork' : 'Add more artworks',
      description:
        artworksCount === 0
          ? 'Upload your first piece to get started.'
          : 'At least 3 pieces helps venues find you.',
      cta: 'Manage artworks',
      onAction: () => onNavigate('artist-artworks'),
      progress: `${artworksCount}/3`,
    });
  }

  // 3. Payouts not connected (skip while still loading)
  if (payoutsConnected === false) {
    items.push({
      id: 'connect-payouts',
      icon: <CreditCard className="w-4 h-4" />,
      title: 'Connect payouts',
      description: 'Set up Stripe to receive payments.',
      cta: 'Set up payouts',
      onAction: () => {
        if (onPayoutSetup) {
          onPayoutSetup();
        } else {
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
      icon: <MapPin className="w-4 h-4" />,
      title: 'Find venues',
      description: 'Discover venues or invite one directly.',
      cta: 'Discover venues',
      onAction: () => onNavigate('artist-venues'),
    });
  }

  const allVisible = items.filter((item) => !dismissed.has(item.id));
  const visibleItems = allVisible.slice(0, 4);
  const hasMore = allVisible.length > 4;

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl">
      <div className="p-6">
        {/* Header — matches Plan & Limits */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-[var(--text)]">Action Center</h2>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">
              Next steps to grow your presence
            </p>
          </div>
        </div>
        {visibleItems.length === 0 ? (
          /* ── All-set state ── */
          <div className="py-6 text-center">
            <div className="w-10 h-10 rounded-full bg-[var(--surface-3)] flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-5 h-5 text-[var(--text-muted)]" />
            </div>
            <p className="text-sm font-semibold text-[var(--text)]">You're all set!</p>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mt-1 max-w-[240px] mx-auto">
              Keep creating and connecting with venues.
            </p>
            <button
              onClick={() => onNavigate('artist-venues')}
              className="mt-3 text-sm font-medium text-[var(--blue)] hover:underline"
            >
              Find venues →
            </button>
          </div>
        ) : (
          /* ── Tile grid ── */
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {visibleItems.map((item) => (
                <ActionTile key={item.id} item={item} onDismiss={dismiss} />
              ))}
            </div>

            {/* View all link */}
            {hasMore && (
              <div className="mt-3 text-center">
                <button
                  onClick={() => onNavigate('artist-profile')}
                  className="text-sm font-medium text-[var(--blue)] hover:underline"
                >
                  View all actions →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
