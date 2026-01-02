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
    if (isUnlimited) return 'bg-green-600';
    if (isOverage) return 'bg-orange-600';
    if (percentage > 80) return 'bg-yellow-600';
    return 'bg-blue-600';
  };

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isOverage ? 'bg-orange-100' : 'bg-blue-100'
          }`}>
            <TrendingUp className={`w-5 h-5 ${isOverage ? 'text-orange-600' : 'text-blue-600'}`} />
          </div>
          <div>
            <h3 className="text-base mb-1 text-neutral-900">Active Displays</h3>
            <p className="text-xs text-neutral-600">
              {isUnlimited ? 'Unlimited displays' : `${currentDisplays} / ${includedDisplays} included`}
            </p>
          </div>
        </div>
        {!isUnlimited && (
          <div className="text-right">
            <p className="text-2xl">
              {currentDisplays}
              <span className="text-sm text-neutral-500">
                /{includedDisplays === 'unlimited' ? '∞' : includedDisplays}
              </span>
            </p>
          </div>
        )}
      </div>

      {!isUnlimited && (
        <div className="mb-4">
          <div className="w-full bg-neutral-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full ${getProgressColor()} transition-all duration-300`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      )}

      {isOverage && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-orange-900 mb-1">
                <strong>Overage charges apply</strong>
              </p>
              <p className="text-sm text-orange-800">
                +{overageCount} display{overageCount !== 1 ? 's' : ''} beyond your plan = 
                <strong> ${monthlySurcharge}/mo</strong> surcharge
              </p>
              <p className="text-xs text-orange-700 mt-1">
                ${overageCost}/mo per additional active display
              </p>
            </div>
          </div>
        </div>
      )}

      {isUnlimited && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-green-700 dark:text-green-400">
            ✓ <strong>Unlimited displays</strong> — Display as many artworks as you want with no overage charges.
          </p>
        </div>
      )}

      <div className="flex items-center gap-2">
        {onManage && (
          <button
            onClick={onManage}
            className="flex-1 px-4 py-2 bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors text-sm"
          >
            Manage Displays
          </button>
        )}
        {onUpgrade && !isUnlimited && (
          <button
            onClick={onUpgrade}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            {isOverage ? 'Upgrade to Save' : 'Upgrade Plan'}
          </button>
        )}
      </div>

      {!isUnlimited && percentage > 80 && !isOverage && (
        <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-3 text-center">
          ⚠️ You're nearing your display limit. Consider upgrading to avoid overage charges.
        </p>
      )}
    </div>
  );
}
