import { Sparkles, TrendingUp, Zap, Shield } from 'lucide-react';

interface PlanBadgeProps {
  plan: 'free' | 'starter' | 'growth' | 'pro';
  size?: 'sm' | 'md' | 'lg';
  showUpgrade?: boolean;
  onUpgrade?: () => void;
}

export function PlanBadge({ plan, size = 'md', showUpgrade = false, onUpgrade }: PlanBadgeProps) {
  const configs = {
    free: {
      label: 'Free',
      icon: Sparkles,
      bg: 'bg-[var(--surface-2)]',
      text: 'text-[var(--text)]',
      border: 'border-[var(--border)]',
    },
    starter: {
      label: 'Starter',
      icon: TrendingUp,
      bg: 'bg-[var(--surface-2)]',
      text: 'text-[var(--blue)]',
      border: 'border-[var(--border)]',
    },
    growth: {
      label: 'Growth',
      icon: Zap,
      bg: 'bg-[var(--surface-2)]',
      text: 'text-[var(--blue)]',
      border: 'border-[var(--border)]',
    },
    pro: {
      label: 'Pro',
      icon: Shield,
      bg: 'bg-[var(--blue)]',
      text: 'text-[var(--on-blue)]',
      border: 'border-transparent',
    },
  };

  const config = configs[plan];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={`inline-flex items-center gap-1.5 ${config.bg} ${config.text} ${sizeClasses[size]} rounded-lg border ${config.border}`}
      >
        <Icon className={iconSizes[size]} />
        <span>{config.label}</span>
      </div>
      {showUpgrade && plan !== 'pro' && (
        <button
          onClick={onUpgrade}
          className="text-xs text-[var(--blue)] hover:opacity-90 underline"
        >
          Upgrade
        </button>
      )}
    </div>
  );
}
