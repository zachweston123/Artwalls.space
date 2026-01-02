interface LabelChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  role?: 'artist' | 'venue';
  size?: 'sm' | 'md';
  disabled?: boolean;
}

export function LabelChip({ 
  label, 
  selected = false, 
  onClick, 
  role = 'artist',
  size = 'md',
  disabled = false 
}: LabelChipProps) {
  const sizeClasses = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm';
  
  const baseClasses = onClick && !disabled 
    ? 'cursor-pointer transition-all' 
    : 'cursor-default';

  const colorClasses = selected
    ? role === 'artist'
      ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-2 border-blue-500 dark:border-blue-400'
      : 'bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 border-2 border-green-500 dark:border-green-400'
    : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border-2 border-transparent hover:border-neutral-300 dark:hover:border-neutral-600';

  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <button
      type="button"
      onClick={onClick && !disabled ? onClick : undefined}
      disabled={disabled}
      className={`inline-flex items-center rounded-full ${sizeClasses} ${baseClasses} ${colorClasses} ${disabledClasses}`}
    >
      {label}
    </button>
  );
}
