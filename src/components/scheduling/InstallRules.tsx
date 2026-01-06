import { useState } from 'react';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';

interface InstallRulesProps {
  variant?: 'card' | 'accordion';
}

export function InstallRules({ variant = 'accordion' }: InstallRulesProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const rules = [
    'Arrive within your scheduled window (30–60 minutes per install)',
    'Check in with staff/manager on arrival',
    'Bring your own hanging hardware if required; no drilling unless venue allows',
    'If the artwork sells, pickup happens during the same weekly window',
  ];

  if (variant === 'card') {
    return (
      <div className="bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--border)]">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 bg-[var(--surface-1)] rounded-lg flex items-center justify-center flex-shrink-0">
            <Info className="w-5 h-5 text-[var(--blue)]" />
          </div>
          <div>
            <h3 className="text-base mb-1 text-[var(--text)]">Install Rules</h3>
            <p className="text-sm text-[var(--text-muted)]">Please follow these guidelines for smooth installs and pickups</p>
          </div>
        </div>
        <ul className="space-y-2">
          {rules.map((rule, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-[var(--text)]">
              <span className="text-[var(--blue)] mt-0.5">•</span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-[var(--surface-1)] hover:bg-[var(--surface-2)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-[var(--blue)]" />
          <span className="text-sm text-[var(--text)]">Install Rules</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-[var(--text-muted)]" />
        ) : (
          <ChevronDown className="w-5 h-5 text-[var(--text-muted)]" />
        )}
      </button>
      
      {isExpanded && (
        <div className="p-4 bg-[var(--surface-2)] border-t border-[var(--border)]">
          <ul className="space-y-2">
            {rules.map((rule, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-[var(--text)]">
                <span className="text-[var(--blue)] mt-0.5">•</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
