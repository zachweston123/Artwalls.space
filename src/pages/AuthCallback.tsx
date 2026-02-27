/**
 * /auth/callback — OAuth redirect landing page.
 *
 * After Google (or any provider) redirects back to the app, this page:
 *   1. Lets Supabase JS process the URL tokens (PKCE code / hash fragment).
 *   2. Shows a spinner while the session is being established.
 *   3. On success, calls `onAuth` so App.tsx can route to the correct dashboard.
 *   4. On failure, shows an error with a "Try again" button.
 *
 * Implementation notes (fixes for artist Google sign-in):
 *   - Uses a ref for `onAuth` so the useEffect runs exactly once, regardless
 *     of how many times App.tsx re-renders and creates a new closure.
 *     Previously the `[onAuth]` dependency could re-trigger the exchange,
 *     causing double code consumption and "signal is aborted" errors.
 *   - Includes a 15-second timeout guard so the spinner never loops forever.
 *   - Tracks a `processedRef` for idempotency (safe in StrictMode).
 *   - replaceState('/') is called BEFORE onAuth, but onAuth immediately sets
 *     oauthFlowActiveRef to prevent onAuthStateChange from racing.
 *
 * This page MUST be excluded from auth-guard redirects (it runs *before*
 * the session exists).
 */
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

/** Milliseconds before the spinner gives up and shows a timeout error. */
const CALLBACK_TIMEOUT_MS = 15_000;

interface AuthCallbackProps {
  /** Called when a session has been established successfully. */
  onAuth: () => void;
  /** Navigate back to a page (e.g. 'login'). */
  onNavigate?: (page: string) => void;
}

export function AuthCallback({ onAuth, onNavigate }: AuthCallbackProps) {
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // ── Stable ref so the effect doesn't depend on `onAuth` identity ──
  // App.tsx creates a new inline closure on every render; without a ref the
  // effect would re-run, calling handleCallback again (double exchange →
  // "signal is aborted").
  const onAuthRef = useRef(onAuth);
  useEffect(() => { onAuthRef.current = onAuth; }, [onAuth]);

  // Prevent double-processing (React 18 StrictMode double-mount, or if the
  // effect ever re-runs for any reason).
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    let cancelled = false;

    // ── Timeout guard — never spin forever ───────────────────────────
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        const info = [
          `Timeout after ${CALLBACK_TIMEOUT_MS / 1000}s`,
          `URL: ${window.location.href}`,
          `pendingOAuthRole: ${localStorage.getItem('pendingOAuthRole') ?? '(none)'}`,
          `timestamp: ${new Date().toISOString()}`,
          `userAgent: ${navigator.userAgent}`,
        ].join('\n');
        console.error('[AuthCallback] ⏰ Timeout:', info);
        setDebugInfo(info);
        setError(
          'Sign-in is taking too long. This can happen when the sign-in link ' +
          'has expired or was already used. Please try again.'
        );
      }
    }, CALLBACK_TIMEOUT_MS);

    async function handleCallback() {
      const startMs = Date.now();
      const debugLines: string[] = [
        `Started: ${new Date().toISOString()}`,
        `URL: ${window.location.href}`,
        `pendingOAuthRole: ${localStorage.getItem('pendingOAuthRole') ?? '(none)'}`,
      ];

      try {
        // ── 1. Check for OAuth error params (e.g. user denied consent) ──
        const params = new URLSearchParams(window.location.search);
        const errorParam = params.get('error');
        const errorDesc = params.get('error_description');
        if (errorParam) {
          const msg = errorDesc || errorParam || 'Authentication failed.';
          debugLines.push(`OAuth error: ${errorParam} — ${errorDesc}`);
          console.error('[AuthCallback] OAuth error:', errorParam, errorDesc);
          setDebugInfo(debugLines.join('\n'));
          setError(msg);
          return;
        }

        // ── 2. Exchange code for session ─────────────────────────────────
        // `getSession()` waits for the Supabase client's _initialize() to
        // complete, which handles PKCE code exchange via detectSessionFromUrl.
        console.log('[AuthCallback] Exchanging code for session…');
        const { data, error: sessionError } = await supabase.auth.getSession();
        const elapsedMs = Date.now() - startMs;

        debugLines.push(
          `getSession() resolved in ${elapsedMs}ms`,
          `hasSession: ${!!data.session}`,
          `userId: ${data.session?.user?.id ?? '(none)'}`,
          `role: ${data.session?.user?.user_metadata?.role ?? '(none)'}`,
          `error: ${sessionError?.message ?? '(none)'}`,
        );
        console.log('[AuthCallback] Session result:', {
          hasSession: !!data.session,
          userId: data.session?.user?.id,
          role: data.session?.user?.user_metadata?.role,
          error: sessionError?.message,
          elapsed: `${elapsedMs}ms`,
        });

        if (sessionError) {
          setDebugInfo(debugLines.join('\n'));
          setError(sessionError.message || 'Failed to establish session.');
          return;
        }

        if (!data.session) {
          // No error but no session — tokens may have already been consumed
          // on a previous load.  Check once more.
          debugLines.push('No session on first call — retrying getSession…');
          const { data: refreshed } = await supabase.auth.getSession();
          debugLines.push(`Retry: hasSession=${!!refreshed.session}`);
          if (!refreshed.session) {
            setDebugInfo(debugLines.join('\n'));
            setError('No session found. The sign-in link may have expired — please try again.');
            return;
          }
        }

        // ── 3. Hand off to App.tsx ──────────────────────────────────────
        if (!cancelled) {
          console.log('[AuthCallback] ✅ Session established, handing off to App.tsx');
          // Clean the URL so the code is not re-processed on refresh.
          // onAuth() sets oauthFlowActiveRef immediately so onAuthStateChange
          // won't race (see App.tsx onAuth callback comment).
          window.history.replaceState({}, '', '/');
          onAuthRef.current();
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
          debugLines.push(`❌ Exception: ${msg}`);
          if (err instanceof Error && err.stack) {
            debugLines.push(err.stack);
          }
          console.error('[AuthCallback] Unexpected error:', err);
          setDebugInfo(debugLines.join('\n'));
          setError(msg);
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }

    handleCallback();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← Empty deps — runs exactly once.  onAuth is read from the ref.

  const handleCopyDebug = () => {
    navigator.clipboard.writeText(debugInfo).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback: select a hidden textarea
      const ta = document.createElement('textarea');
      ta.value = debugInfo;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (error) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-[var(--bg)] px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Sign-in failed</h1>
          <p className="text-[var(--text-muted)]">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                window.history.replaceState({}, '', '/');
                onNavigate?.('login');
              }}
              className="px-6 py-3 rounded-lg bg-[var(--blue)] text-[var(--on-blue)] font-semibold hover:bg-[var(--blue-hover)] transition-colors"
            >
              Try again
            </button>
            {debugInfo && (
              <button
                onClick={handleCopyDebug}
                className="px-6 py-3 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-1)] transition-colors text-sm"
              >
                {copied ? 'Copied!' : 'Copy debug info'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Loading state while processing the callback
  return (
    <div className="min-h-svh flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--blue)] mx-auto" />
        <p className="text-[var(--text-muted)] text-lg">Completing sign-in…</p>
      </div>
    </div>
  );
}
