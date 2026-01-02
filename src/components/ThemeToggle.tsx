import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export function ThemeToggle({ variant = 'icon' }: { variant?: 'icon' | 'button' }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  
  const toggle = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={toggle}
        className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text)] transition-colors"
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
      className="p-2 text-[var(--text-muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text)] rounded-lg transition-colors"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
