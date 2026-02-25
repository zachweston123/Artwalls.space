/**
 * Unified analytics client for Artwalls.
 *
 * Provides a single `trackEvent(name, properties)` function used across the
 * entire frontend.  Events are batched into a lightweight fire-and-forget
 * POST to `/api/analytics`.
 *
 * Privacy: No PII (emails, names, addresses) is ever included. Only opaque
 * UUIDs, the user's role, and structural metadata are sent.
 *
 * See docs/measurement.md for the taxonomy and verification steps.
 */

import { getSessionId } from '../sessionId';
import type { AnalyticsEventName, AnalyticsEnvelope } from './types';

// ─── API base resolution (mirrors trackEvent.ts pattern) ─────────────────────
const API_BASE = (() => {
  if (typeof window === 'undefined') return 'https://artwalls.space';
  const { hostname, origin } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4242';
  }
  return (import.meta as any).env?.VITE_API_BASE_URL || origin || 'https://artwalls.space';
})();

// ─── Shared state ────────────────────────────────────────────────────────────

/** Current user role — set by the app after auth resolution. */
let _userRole: string | null = null;

/** Current SPA page key — set by the app on every navigation. */
let _currentRoute = '';

/** Queue of events waiting to be flushed. */
let _queue: AnalyticsEnvelope[] = [];

/** Flush timer handle. */
let _flushTimer: ReturnType<typeof setTimeout> | null = null;

/** Max events per batch. */
const BATCH_SIZE = 10;

/** Max ms to hold events before flushing. */
const FLUSH_INTERVAL_MS = 3_000;

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Update the analytics context whenever the user role or route changes.
 * Call this from App.tsx after auth resolution and on every page navigation.
 */
export function setAnalyticsContext(opts: {
  userRole?: string | null;
  route?: string;
}) {
  if (opts.userRole !== undefined) _userRole = opts.userRole;
  if (opts.route !== undefined) _currentRoute = opts.route;
}

/**
 * Track an analytics event.
 *
 * Fire-and-forget — never throws, never blocks rendering.
 * Events are batched and flushed every 3 s or when the batch reaches 10.
 *
 * @param name  Event name from the taxonomy (see types.ts)
 * @param properties  Typed property bag for the event
 */
export function trackAnalyticsEvent(
  name: AnalyticsEventName,
  properties: Record<string, unknown> = {},
) {
  const envelope: AnalyticsEnvelope = {
    name,
    properties,
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
    route: _currentRoute || currentPathname(),
    userRole: _userRole,
  };

  _queue.push(envelope);

  if (_queue.length >= BATCH_SIZE) {
    flush();
  } else if (!_flushTimer) {
    _flushTimer = setTimeout(flush, FLUSH_INTERVAL_MS);
  }
}

// ─── Flush logic ─────────────────────────────────────────────────────────────

function flush() {
  if (_flushTimer) {
    clearTimeout(_flushTimer);
    _flushTimer = null;
  }

  if (_queue.length === 0) return;

  const batch = _queue.splice(0, BATCH_SIZE);
  sendBatch(batch);
}

async function sendBatch(events: AnalyticsEnvelope[]) {
  try {
    // Attach auth token if available (for user_id attribution on the server)
    let authHeader: Record<string, string> = {};
    try {
      const { supabase } = await import('../supabase');
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) {
        authHeader = { Authorization: `Bearer ${data.session.access_token}` };
      }
    } catch {
      // Not signed in — anonymous is fine
    }

    await fetch(`${API_BASE}/api/analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ events }),
      // Use keepalive so the request survives page unload
      keepalive: true,
    });
  } catch {
    // Fire-and-forget: silently drop on network error
  }
}

// Flush remaining events when the page is about to unload
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function currentPathname(): string {
  try {
    return window.location.pathname + window.location.hash;
  } catch {
    return '';
  }
}
