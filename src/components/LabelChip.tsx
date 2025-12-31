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
      ? 'bg-blue-50 text-blue-700 border-2 border-blue-500'
      : 'bg-green-50 text-green-700 border-2 border-green-500'
    : 'bg-neutral-100 text-neutral-700 border-2 border-transparent hover:border-neutral-300';

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
