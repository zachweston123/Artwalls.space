import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../theme/ThemeProvider';

export function ThemeToggle({ variant = 'icon' }: { variant?: 'icon' | 'button' }) {
  const { resolvedTheme, toggle } = useTheme();
  const isDark = resolvedTheme === 'dark';

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={toggle}
        className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <span className="inline-flex items-center gap-2">
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span className="text-sm">{isDark ? 'Light' : 'Dark'}</span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="p-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
