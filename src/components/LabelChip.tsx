interface LabelChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  role?: 'artist' | 'venue';
  size?: 'sm' | 'md';
  disabled?: boolean;
  title?: string;
}

export function LabelChip({ 
  label, 
  selected = false, 
  onClick, 
  role = 'artist',
  size = 'md',
  disabled = false,
  title,
}: LabelChipProps) {
  const sizeClasses = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm';
  
  const baseClasses = onClick && !disabled 
    ? 'cursor-pointer transition-colors'
    : disabled
      ? 'cursor-not-allowed'
      : 'cursor-default';

  const colorClasses = selected
    ? 'bg-[var(--surface-3)] text-[var(--text)] border border-[var(--border)]'
    : disabled
      ? 'bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)]'
      : 'bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]';

  return (
    <button
      type="button"
      onClick={onClick && !disabled ? onClick : undefined}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center rounded-full ${sizeClasses} ${baseClasses} ${colorClasses}`}
    >
      {label}
    </button>
  );
}
