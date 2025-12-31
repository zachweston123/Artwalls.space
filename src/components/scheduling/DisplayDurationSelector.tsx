import { Calendar, Info } from 'lucide-react';
import { useState } from 'react';

interface DisplayDurationSelectorProps {
  value: 30 | 90 | 180;
  onChange: (duration: 30 | 90 | 180) => void;
  startDate?: Date;
  disabled?: boolean;
  showEndDate?: boolean;
  helpText?: string;
}

export function DisplayDurationSelector({
  value,
  onChange,
  startDate,
  disabled = false,
  showEndDate = true,
  helpText,
}: DisplayDurationSelectorProps) {
  const durations: Array<{ value: 30 | 90 | 180; label: string; days: string; recommended?: boolean }> = [
    { value: 30, label: '30 Days', days: '1 month' },
    { value: 90, label: '90 Days', days: '3 months', recommended: true },
    { value: 180, label: '180 Days', days: '6 months' },
  ];

  const calculateEndDate = (start: Date, days: number): Date => {
    const end = new Date(start);
    end.setDate(end.getDate() + days);
    return end;
  };

  const endDate = startDate ? calculateEndDate(startDate, value) : null;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm mb-2">
          Display Duration <span className="text-red-600 dark:text-red-400">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {durations.map((duration) => (
            <button
              key={duration.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(duration.value)}
              className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                value === duration.value
                  ? 'border-green-600 bg-green-50 dark:bg-green-900/30'
                  : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-green-300'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {duration.recommended && (
                <div className="absolute -top-2 right-3">
                  <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">
                    Recommended
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between mb-1">
                <span className={`text-base ${value === duration.value ? 'text-green-900 dark:text-green-200' : 'text-neutral-900 dark:text-neutral-50'}`}>
                  {duration.label}
                </span>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    value === duration.value
                      ? 'border-green-600 bg-green-600'
                      : 'border-neutral-300 dark:border-neutral-600'
                  }`}
                >
                  {value === duration.value && (
                    <div className="w-2 h-2 bg-white dark:bg-neutral-800 rounded-full" />
                  )}
                </div>
              </div>
              <p className={`text-xs ${value === duration.value ? 'text-green-700 dark:text-green-300' : 'text-neutral-600 dark:text-neutral-300'}`}>
                {duration.days}
              </p>
            </button>
          ))}
        </div>
      </div>

      {showEndDate && endDate && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900 dark:text-blue-200 mb-1">
                <strong>Estimated End Date:</strong>{' '}
                {endDate.toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Based on start date of{' '}
                {startDate?.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      {helpText && (
        <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-neutral-500 dark:text-neutral-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-neutral-600 dark:text-neutral-300">{helpText}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Duration Badge Component (for display in lists)
interface DurationBadgeProps {
  duration: 30 | 90 | 180;
  size?: 'sm' | 'md';
}

export function DurationBadge({ duration, size = 'md' }: DurationBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  const getBadgeStyle = (days: number) => {
    if (days === 30) return 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300';
    if (days === 90) return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300';
    return 'bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300';
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full ${getBadgeStyle(duration)} ${sizeClasses[size]}`}>
      <Calendar className="w-3 h-3" />
      {duration}d
    </span>
  );
}
