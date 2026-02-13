import { ArrowUpRight, X } from 'lucide-react';
import type { PlanId } from '../../lib/entitlements';
import { TIER_LIMITS } from '../../lib/entitlements';
import { trackEvent } from '../../lib/trackEvent';

/* ---------- cooldown logic (7-day localStorage) ---------- */
const COOLDOWN_KEY = 'aw_upgrade_dismissed_at';
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function isUpgradeDismissed(): boolean {
  try {
    const ts = localStorage.getItem(COOLDOWN_KEY);
    if (!ts) return false;
    return Date.now() - Number(ts) < COOLDOWN_MS;
  } catch {
    return false;
  }
}

function setDismissed() {
  try {
    localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
  } catch {
    /* storage full — silently ignore */
  }
}

/* ---------- plan metadata ---------- */
const PLAN_META: Record<PlanId, { label: string; take: number; price: string }> = {
  free: { label: 'Free', take: 60, price: '$0' },
  starter: { label: 'Starter', take: 80, price: '$9/mo' },
  growth: { label: 'Growth', take: 83, price: '$19/mo' },
  pro: { label: 'Pro', take: 85, price: '$39/mo' },
};

const PLAN_ORDER: PlanId[] = ['free', 'starter', 'growth', 'pro'];

function nextPlan(current: PlanId): PlanId | null {
  const idx = PLAN_ORDER.indexOf(current);
  return idx < PLAN_ORDER.length - 1 ? PLAN_ORDER[idx + 1] : null;
}

/* ---------- component ---------- */
interface UpgradeLimitModalProps {
  open: boolean;
  onClose: () => void;
  currentPlan: PlanId;
  limitType: 'artworks' | 'displays' | 'applications';
  onNavigatePricing: () => void;
}

export function UpgradeLimitModal({
  open,
  onClose,
  currentPlan,
  limitType,
  onNavigatePricing,
}: UpgradeLimitModalProps) {
  if (!open) return null;

  const next = nextPlan(currentPlan);
  if (!next) return null; // Pro users shouldn't see this

  const currentMeta = PLAN_META[currentPlan];
  const nextMeta = PLAN_META[next];
  const nextLimits = TIER_LIMITS[next];

  const limitLabel: Record<string, string> = {
    artworks: 'artwork listings',
    displays: 'active displays',
    applications: 'venue applications',
  };

  const limitValue = (() => {
    switch (limitType) {
      case 'artworks':
        return nextLimits.artworks === Number.POSITIVE_INFINITY ? 'Unlimited' : String(nextLimits.artworks);
      case 'displays':
        return nextLimits.activeDisplays === 'unlimited' ? 'Unlimited' : String(nextLimits.activeDisplays);
      case 'applications':
        return next === 'growth' || next === 'pro' ? 'Unlimited' : '3/mo';
      default:
        return '';
    }
  })();

  function handleDismiss() {
    setDismissed();
    trackEvent({
      event_type: 'artwork_view',
      metadata: { action: 'upgrade_nudge_dismissed', current_plan: currentPlan, limit_type: limitType },
    });
    onClose();
  }

  function handleUpgrade() {
    trackEvent({
      event_type: 'checkout_start',
      metadata: { action: 'upgrade_clicked', from: currentPlan, to: next, trigger: 'limit_modal' },
    });
    onClose();
    onNavigatePricing();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={handleDismiss} />

      {/* Modal — slides up on mobile, centered on desktop */}
      <div className="relative z-10 w-full sm:max-w-md mx-auto bg-[var(--surface-1)] border border-[var(--border)] rounded-t-2xl sm:rounded-2xl p-6 shadow-xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:fade-in-0 sm:zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            You've reached your limit
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Your {currentMeta.label} plan allows limited {limitLabel[limitType]}.
            Upgrade to unlock more.
          </p>
        </div>

        {/* Next plan benefits */}
        <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-[var(--text)]">{nextMeta.label} plan</span>
            <span className="text-sm text-[var(--text-muted)]">{nextMeta.price}</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Take-home earnings</span>
              <span className="text-[var(--accent)] font-bold">{nextMeta.take}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">{limitLabel[limitType]}</span>
              <span className="text-[var(--text)] font-semibold">{limitValue}</span>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleUpgrade}
            className="w-full flex items-center justify-center gap-2 bg-[var(--accent)] text-[var(--accent-contrast)] font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity"
          >
            View plans
            <ArrowUpRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleDismiss}
            className="w-full text-sm text-[var(--text-muted)] py-2 hover:text-[var(--text)] transition-colors"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
