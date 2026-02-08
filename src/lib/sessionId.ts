/**
 * Stable session ID for anonymous event attribution.
 *
 * - Generated once per browser (uuid v4-style)
 * - Stored in localStorage (survives tab close) and falls back to a session-
 *   scoped variable so it's never empty.
 * - Readable by both client code and sent as a header/body param to
 *   Cloudflare workers.
 */

const STORAGE_KEY = 'aw_session_id';

let _cachedId: string | null = null;

function generateId(): string {
  // crypto.randomUUID is available in all modern browsers + Cloudflare Workers
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getSessionId(): string {
  if (_cachedId) return _cachedId;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      _cachedId = stored;
      return stored;
    }
  } catch {
    // localStorage unavailable (private mode, etc.)
  }

  const id = generateId();
  _cachedId = id;

  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // silently fail — the in-memory cached id will be used for the session
  }

  return id;
}
