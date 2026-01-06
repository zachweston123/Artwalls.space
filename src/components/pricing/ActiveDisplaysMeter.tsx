import { TrendingUp, AlertCircle } from 'lucide-react';

interface ActiveDisplaysMeterProps {
  currentDisplays: number;
  includedDisplays: number | 'unlimited';
  plan: 'free' | 'starter' | 'growth' | 'pro';
  overageCost?: number; // Cost per overage display
  onUpgrade?: () => void;
  onManage?: () => void;
}

export function ActiveDisplaysMeter({
  currentDisplays,
  includedDisplays,
  plan,
  overageCost,
  onUpgrade,
  onManage,
}: ActiveDisplaysMeterProps) {
  const isUnlimited = includedDisplays === 'unlimited';
  const isOverage = !isUnlimited && currentDisplays > includedDisplays;
  const overageCount = isOverage ? currentDisplays - (includedDisplays as number) : 0;
  const monthlySurcharge = overageCount * (overageCost || 0);
  
  const percentage = isUnlimited 
    ? 0 
    : Math.min((currentDisplays / (includedDisplays as number)) * 100, 100);

  const getProgressColor = () => {
    return 'bg-[var(--accent)]';
  };

  return (
    <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--surface-3)]">
            <TrendingUp className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <div>
            <h3 className="text-base mb-1 text-[var(--text)]">Active Displays</h3>
            <p className="text-xs text-[var(--text-muted)]">
              {isUnlimited ? 'Unlimited displays' : `${currentDisplays} / ${includedDisplays} included`}
            </p>
          </div>
        </div>
        {!isUnlimited && (
          <div className="text-right">
            <p className="text-2xl">
              {currentDisplays}
              <span className="text-sm text-[var(--text-muted)]">
                /{includedDisplays === 'unlimited' ? '∞' : includedDisplays}
              </span>
            </p>
          </div>
        )}
      </div>

      {!isUnlimited && (
        <div className="mb-4">
          <div className="w-full bg-[var(--surface-3)] rounded-full h-3 overflow-hidden">
            <div
              className={`h-full ${getProgressColor()} transition-all duration-300`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      )}

      {isOverage && (
        <div className="bg-[var(--surface-3)] border border-[var(--border)] rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-[var(--accent)] flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-[var(--text)] mb-1">
                <strong>Overage charges apply</strong>
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                +{overageCount} display{overageCount !== 1 ? 's' : ''} beyond your plan = 
                <strong> ${monthlySurcharge}/mo</strong> surcharge
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                ${overageCost}/mo per additional active display
              </p>
            </div>
          </div>
        </div>
      )}

      {isUnlimited && (
        <div className="bg-[var(--surface-3)] border border-[var(--border)] rounded-lg p-4 mb-4">
            <p className="text-sm text-[var(--text)]">
            ✓ <strong>Unlimited displays</strong> — Display as many artworks as you want with no overage charges.
          </p>
        </div>
      )}

      <div className="flex items-center gap-2">
        {onManage && (
          <button
            onClick={onManage}
            className="flex-1 px-4 py-2 bg-[var(--surface-3)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-2)] transition-colors text-sm border border-[var(--border)]"
          >
            Manage Displays
          </button>
        )}
        {onUpgrade && !isUnlimited && (
          <button
            onClick={onUpgrade}
            className="flex-1 px-4 py-2 bg-[var(--accent)] text-[var(--accent-contrast)] rounded-lg transition-colors text-sm"
          >
            {isOverage ? 'Upgrade to Save' : 'Upgrade Plan'}
          </button>
        )}
      </div>

      {!isUnlimited && percentage > 80 && !isOverage && (
        <p className="text-xs text-[var(--text-muted)] mt-3 text-center">
          ⚠️ You're nearing your display limit. Consider upgrading to avoid overage charges.
        </p>
      )}
    </div>
  );
}
