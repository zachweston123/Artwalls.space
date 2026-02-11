import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

interface IconInputProps extends InputHTMLAttributes<HTMLInputElement> {
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  onTrailingAction?: () => void;
  trailingAriaLabel?: string;
  helperText?: string;
  error?: string;
  requiredLabel?: boolean;
}

// Reusable input with optional leading/trailing adornments. Keeps icons aligned and text padded.
export const IconInput = forwardRef<HTMLInputElement, IconInputProps>(function IconInput(
  {
    leadingIcon,
    trailingIcon,
    onTrailingAction,
    trailingAriaLabel,
    helperText,
    error,
    requiredLabel,
    className = '',
    ...inputProps
  },
  ref
) {
  const hasTrailingButton = typeof onTrailingAction === 'function';
  // Extra padding prevents overlap with left search icon and right clear button
  const leftPadding = leadingIcon ? 'pl-12' : 'pl-4';
  const rightPadding = trailingIcon ? 'pr-12' : 'pr-4';

  return (
    <div className="w-full">
      <div
        className={`relative flex items-center rounded-xl border border-[var(--border)] bg-[var(--surface-1)] focus-within:border-[var(--focus)] focus-within:ring-2 focus-within:ring-[var(--focus)]/30 transition-colors ${className}`}
      >
        {leadingIcon && (
          <span className="pointer-events-none absolute left-3 inset-y-0 flex items-center text-[var(--text-muted)]">
            {leadingIcon}
          </span>
        )}

        <input
          ref={ref}
          {...inputProps}
          className={`w-full h-11 rounded-xl bg-transparent text-[var(--text)] placeholder-[var(--text-muted)] outline-none ${leftPadding} ${rightPadding}`}
          aria-invalid={!!error}
        />

        {trailingIcon && (
          hasTrailingButton ? (
            <button
              type="button"
              onClick={onTrailingAction}
              className="absolute right-2 inset-y-0 my-auto h-7 w-7 grid place-items-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
              aria-label={trailingAriaLabel}
            >
              {trailingIcon}
            </button>
          ) : (
            <span className="pointer-events-none absolute right-3 inset-y-0 flex items-center text-[var(--text-muted)]">
              {trailingIcon}
            </span>
          )
        )}
      </div>

      {helperText && !error && (
        <p className="mt-1 text-xs text-[var(--text-muted)]">{helperText}</p>
      )}
      {error && (
        <p className="mt-1 text-xs text-[var(--danger)]" role="alert">{error}</p>
      )}
      {requiredLabel && (
        <p className="mt-1 text-xs text-[var(--text-muted)]">Required</p>
      )}
    </div>
  );
});
