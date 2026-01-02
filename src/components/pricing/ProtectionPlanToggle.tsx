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
    <div className="bg-[var(--surface-1)] rounded-lg border border-[var(--border)] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isProtected || isPro ? 'bg-[var(--green-muted)]' : 'bg-[var(--surface-2)]'
          }`}>
            <Shield className={`w-5 h-5 ${isProtected || isPro ? 'text-[var(--green)]' : 'text-[var(--text-muted)]'}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm text-[var(--text)]">Artwork Protection Plan</h4>
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[var(--text-muted)] mb-2">
              {artworkTitle} (Declared value: ${artworkValue.toLocaleString()})
            </p>
            
            {isPro ? (
              <div className="flex items-center gap-2">
                <span className="text-xs bg-[var(--green-muted)] text-[var(--green)] px-2 py-1 rounded">
                  ✓ Included FREE with Pro plan
                </span>
              </div>
            ) : (
              <p className="text-xs text-[var(--text)]">
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
            className="w-5 h-5 rounded border-[var(--border)] text-[var(--blue)] focus:ring-2 focus:ring-[var(--focus)] disabled:opacity-50"
          />
          <span className="text-sm text-[var(--text)]">
            {isPro ? 'Included' : isProtected ? 'Protected' : 'Protect'}
          </span>
        </label>
      </div>

      {showInfo && (
        <div className="mt-4 pt-4 border-t border-[var(--border)]">
          <div className="bg-[var(--surface-2)] rounded-lg p-3 text-xs text-[var(--text)] space-y-2">
            <p><strong>Coverage includes:</strong> Accidental damage, theft, vandalism</p>
            <p><strong>Requirements:</strong> Condition report at install, 48-hour incident reporting, venue safety compliance</p>
            <p><strong>Exclusions:</strong> Normal wear, disclosed risks accepted, improper mounting by artist</p>
            <button
              onClick={() => window.open('/plans-pricing', '_blank')}
              className="text-[var(--blue)] hover:opacity-90 underline mt-2"
            >
              View full protection details →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
