export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'theme';

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function coerceThemePreference(value: unknown, fallback: ThemePreference = 'system'): ThemePreference {
  return isThemePreference(value) ? value : fallback;
}

export function getStoredThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return coerceThemePreference(raw, 'system');
}

export function setStoredThemePreference(preference: ThemePreference) {
  window.localStorage.setItem(STORAGE_KEY, preference);
}

export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  return preference === 'system' ? getSystemTheme() : preference;
}

export function applyResolvedThemeToDocument(resolved: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', resolved);
  window.dispatchEvent(new CustomEvent('themechange', { detail: { resolved } }));
}

export function applyThemePreference(preference: ThemePreference) {
  setStoredThemePreference(preference);
  applyResolvedThemeToDocument(resolveTheme(preference));
}

let mediaListenerAttached = false;

export function ensureSystemThemeListener() {
  if (typeof window === 'undefined') return;
  if (mediaListenerAttached) return;

  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  const onChange = () => {
    const pref = getStoredThemePreference();
    if (pref === 'system') {
      applyResolvedThemeToDocument(resolveTheme(pref));
    }
  };

  mql.addEventListener('change', onChange);
  mediaListenerAttached = true;
}

export function initThemeSync() {
  if (typeof window === 'undefined') return;

  ensureSystemThemeListener();

  // Apply current preference (in case something else changed it)
  const pref = getStoredThemePreference();
  applyResolvedThemeToDocument(resolveTheme(pref));

  // Keep multiple tabs in sync
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return;
    const nextPref = getStoredThemePreference();
    applyResolvedThemeToDocument(resolveTheme(nextPref));
  });
}
