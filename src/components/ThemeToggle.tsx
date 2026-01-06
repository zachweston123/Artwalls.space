import { Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ThemePreference } from '../lib/theme';
import { applyThemePreference, getStoredThemePreference, initThemeSync } from '../lib/theme';

export function ThemeToggle({ variant = 'icon' }: { variant?: 'icon' | 'button' }) {
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    initThemeSync();
    setPreference(getStoredThemePreference());

    const onThemeChange = () => {
      setResolvedTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
    };

    window.addEventListener('themechange', onThemeChange as EventListener);
    window.addEventListener('storage', onThemeChange);
    return () => {
      window.removeEventListener('themechange', onThemeChange as EventListener);
      window.removeEventListener('storage', onThemeChange);
    };
  }, []);

  const cycle = () => {
    const next: ThemePreference =
      preference === 'system' ? 'light' : preference === 'light' ? 'dark' : 'system';
    applyThemePreference(next);
    setPreference(next);
  };

  const isDarkResolved = resolvedTheme === 'dark';
  const label = preference === 'system' ? 'System' : preference === 'light' ? 'Light' : 'Dark';

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={cycle}
        className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text)] transition-colors"
        aria-label="Cycle theme"
      >
        <span className="inline-flex items-center gap-2">
          {preference === 'system' ? (
            <Monitor className="w-4 h-4" />
          ) : isDarkResolved ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
          <span className="text-sm">{label}</span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={cycle}
      className="p-2 text-[var(--text-muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text)] rounded-lg transition-colors"
      aria-label="Cycle theme"
      title={`Theme: ${label}`}
    >
      {preference === 'system' ? (
        <Monitor className="w-5 h-5" />
      ) : isDarkResolved ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );
}
