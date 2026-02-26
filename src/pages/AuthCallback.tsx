/**
 * /auth/callback — OAuth redirect landing page.
 *
 * After Google (or any provider) redirects back to the app, this page:
 *   1. Lets Supabase JS process the URL tokens (PKCE code / hash fragment).
 *   2. Shows a spinner while the session is being established.
 *   3. On success, calls `onAuth` so App.tsx can route to the correct dashboard.
 *   4. On failure, shows an error with a "Try again" button.
 *
 * This page MUST be excluded from auth-guard redirects (it runs *before*
 * the session exists).
 */
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthCallbackProps {
  /** Called when a session has been established successfully. */
  onAuth: () => void;
  /** Navigate back to a page (e.g. 'login'). */
  onNavigate?: (page: string) => void;
}

export function AuthCallback({ onAuth, onNavigate }: AuthCallbackProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function handleCallback() {
      try {
        // Dev-only: log the callback URL for debugging redirect issues
        if (import.meta.env?.DEV) {
          console.log('[AuthCallback] URL:', window.location.href);
          console.log('[AuthCallback] hash:', window.location.hash);
          console.log('[AuthCallback] search:', window.location.search);
        }

        // Check for OAuth error params (e.g. user denied consent)
        const params = new URLSearchParams(window.location.search);
        const errorParam = params.get('error');
        const errorDesc = params.get('error_description');
        if (errorParam) {
          if (import.meta.env?.DEV) {
            console.error('[AuthCallback] OAuth error:', errorParam, errorDesc);
          }
          setError(errorDesc || errorParam || 'Authentication failed.');
          return;
        }

        // Let Supabase process the URL (PKCE code exchange or hash fragment).
        // `getSession()` will detect and process tokens automatically because
        // we configured `detectSessionFromUrl: true` on the client.
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (import.meta.env?.DEV) {
          console.log('[AuthCallback] session result:', {
            hasSession: !!data.session,
            userId: data.session?.user?.id,
            role: data.session?.user?.user_metadata?.role,
            error: sessionError?.message,
          });
        }

        if (sessionError) {
          setError(sessionError.message || 'Failed to establish session.');
          return;
        }

        if (!data.session) {
          // No error but no session — tokens may have already been consumed
          // on a previous load. Check if we actually have a session now.
          const { data: refreshed } = await supabase.auth.getSession();
          if (!refreshed.session) {
            setError('No session found. The sign-in link may have expired — please try again.');
            return;
          }
        }

        if (!cancelled) {
          if (import.meta.env?.DEV) {
            console.log('[AuthCallback] ✅ Session established, routing to app.');
          }
          // Clean the URL so the tokens are not re-processed on refresh
          window.history.replaceState({}, '', '/');
          onAuth();
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
          if (import.meta.env?.DEV) {
            console.error('[AuthCallback] Unexpected error:', err);
          }
          setError(msg);
        }
      }
    }

    handleCallback();
    return () => { cancelled = true; };
  }, [onAuth]);

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
