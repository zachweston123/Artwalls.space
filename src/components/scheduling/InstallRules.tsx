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
      <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-6 border border-blue-100 dark:border-blue-900">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-base mb-1 text-blue-900 dark:text-blue-200 text-neutral-900 dark:text-neutral-50">Install Rules</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">Please follow these guidelines for smooth installs and pickups</p>
          </div>
        </div>
        <ul className="space-y-2">
          {rules.map((rule, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-blue-900 dark:text-blue-200">
              <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:bg-neutral-900 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span className="text-sm">Install Rules</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
        )}
      </button>
      
      {isExpanded && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border-t border-blue-100 dark:border-blue-900">
          <ul className="space-y-2">
            {rules.map((rule, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-blue-900 dark:text-blue-200">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
