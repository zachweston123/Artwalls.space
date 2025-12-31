import { Shield, Info } from 'lucide-react';
import { useState } from 'react';

interface ProtectionPlanToggleProps {
  artworkTitle: string;
  artworkValue: number;
  isProtected: boolean;
  onToggle: (protected: boolean) => void;
  currentPlan: 'free' | 'starter' | 'growth' | 'pro';
  disabled?: boolean;
}

export function ProtectionPlanToggle({
  artworkTitle,
  artworkValue,
  isProtected,
  onToggle,
  currentPlan,
  disabled = false,
}: ProtectionPlanToggleProps) {
  const [showInfo, setShowInfo] = useState(false);

  const protectionCost = currentPlan === 'pro' ? 0 : 3;
  const coverageCap = 
    currentPlan === 'pro' ? 200 :
    currentPlan === 'growth' ? 150 : 100;

  const isPro = currentPlan === 'pro';

  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isProtected ? 'bg-green-100' : 'bg-neutral-100'
          }`}>
            <Shield className={`w-5 h-5 ${isProtected ? 'text-green-600' : 'text-neutral-400'}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm">Artwork Protection Plan</h4>
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-neutral-600 mb-2">
              {artworkTitle} (Declared value: ${artworkValue.toLocaleString()})
            </p>
            
            {isPro ? (
              <div className="flex items-center gap-2">
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                  ✓ Included FREE with Pro plan
                </span>
              </div>
            ) : (
              <p className="text-xs text-neutral-700">
                ${protectionCost}/month • Coverage up to ${coverageCap} per incident
              </p>
            )}
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isProtected || isPro}
            onChange={(e) => onToggle(e.target.checked)}
            disabled={disabled || isPro}
            className="w-5 h-5 rounded border-neutral-300 text-blue-600 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <span className="text-sm text-neutral-700">
            {isPro ? 'Included' : isProtected ? 'Protected' : 'Protect'}
          </span>
        </label>
      </div>

      {showInfo && (
        <div className="mt-4 pt-4 border-t border-neutral-200">
          <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-900 space-y-2">
            <p><strong>Coverage includes:</strong> Accidental damage, theft, vandalism</p>
            <p><strong>Requirements:</strong> Condition report at install, 48-hour incident reporting, venue safety compliance</p>
            <p><strong>Exclusions:</strong> Normal wear, disclosed risks accepted, improper mounting by artist</p>
            <button
              onClick={() => window.open('/plans-pricing', '_blank')}
              className="text-blue-600 hover:text-blue-700 underline mt-2"
            >
              View full protection details →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
