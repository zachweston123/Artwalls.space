/**
 * /auth/callback — Hardened OAuth redirect landing page.
 *
 * After Google (or any provider) redirects back to the app, this page:
 *   1. Exchanges the PKCE code for a session (exactly once).
 *   2. Waits for session confirmation.
 *   3. Cleans the URL so the code is never re-consumed.
 *   4. Reads the pending role and performs role bootstrap (updateUser + provision).
 *   5. Calls onAuthComplete with the fully-bootstrapped user + supabase user.
 *   6. NEVER navigates or sets state before the exchange completes.
 *
 * FIX for artist Google sign-in AbortError:
 *   The previous implementation delegated ALL role bootstrap to App.tsx's
 *   onAuth callback, which did a SECOND getSession() call followed by heavy
 *   async work (updateUser + provision + phone check). Meanwhile,
 *   onAuthStateChange in App.tsx also fired, causing race conditions.
 *   For artists (which have more downstream effects than venues), the
 *   race window was wide enough to abort the in-flight fetch.
 *
 *   Now ALL role bootstrap (updateUser, provision, analytics) happens
 *   inside this component AFTER getSession() confirms the session. The
 *   onAuthComplete callback just receives a fully-formed result object
 *   and sets React state synchronously — no async races possible.
 *
 * Guards:
 *   - useRef flag prevents double execution (React 18 StrictMode)
 *   - 10-second timeout prevents infinite spinner
 *   - No AbortController, no onAuthStateChange listeners
 *   - No navigation before exchange completes
 *   - Visiting /auth/callback without a code param shows error screen
 *   - Refreshing after success safely redirects
 *
 * This page MUST be excluded from auth-guard redirects.
 */
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { apiPost } from '../lib/api';
import { trackAnalyticsEvent } from '../lib/analytics';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { User, UserRole } from '../types/app';

/** Milliseconds before the spinner gives up and shows a timeout error. */
const CALLBACK_TIMEOUT_MS = 10_000;

/** Result passed to App.tsx when callback completes successfully. */
export interface AuthCallbackResult {
  /** The app-level user object (id, name, email, role). */
  user: User;
  /** The raw Supabase user (needed for profile completion / phone check). */
  supabaseUser: SupabaseUser;
  /** Whether phone is missing and profile completion should be shown. */
  needsPhoneCompletion: boolean;
  /** Whether no role was found and role selection should be shown. */
  needsRoleSelection: boolean;
}

interface AuthCallbackProps {
  /** Called when the OAuth flow completes with a bootstrapped user. */
  onAuthComplete: (result: AuthCallbackResult) => void;
  /** Navigate back to a page (e.g. 'login'). */
  onNavigate?: (page: string) => void;
}

export function AuthCallback({ onAuthComplete, onNavigate }: AuthCallbackProps) {
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // ── Stable ref so the effect closure always reads the latest callback ──
  const onAuthCompleteRef = useRef(onAuthComplete);
  useEffect(() => { onAuthCompleteRef.current = onAuthComplete; }, [onAuthComplete]);

  // Prevent double-processing (React 18 StrictMode double-mount).
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    // ── Timeout guard — never spin forever ───────────────────────────
    const timeoutId = setTimeout(() => {
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
    }, CALLBACK_TIMEOUT_MS);

    async function completeOAuth() {
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

        // ── 2. Check for code param — required for PKCE exchange ────────
        const code = params.get('code');
        if (!code) {
          // No code in URL — user may have refreshed after success,
          // or navigated here directly. Check if session already exists.
          const { data: existing } = await supabase.auth.getSession();
          if (existing.session) {
            debugLines.push('No code param but session exists — redirecting');
            console.log('[AuthCallback] Session already exists, redirecting to dashboard');
            window.history.replaceState({}, document.title, '/');
            const supaUser = existing.session.user;
            const rawRole = (supaUser.user_metadata?.role as string) || null;
            const role: UserRole = (rawRole === 'venue' || rawRole === 'admin') ? rawRole : 'artist';
            onAuthCompleteRef.current({
              user: {
                id: supaUser.id,
                name: (supaUser.user_metadata?.name as string) || supaUser.email?.split('@')[0] || 'User',
                email: supaUser.email || '',
                role,
              },
              supabaseUser: supaUser,
              needsPhoneCompletion: false,
              needsRoleSelection: false,
            });
            return;
          }
          debugLines.push('No code param and no existing session');
          setDebugInfo(debugLines.join('\n'));
          setError('No sign-in code found. Please start the sign-in process again.');
          return;
        }

        // ── 3. Exchange code for session ─────────────────────────────────
        // The Supabase client's _initialize() runs detectSessionFromUrl
        // automatically (configured in lib/supabase.ts). getSession()
        // returns a promise that resolves AFTER _initialize() completes,
        // so it waits for the PKCE code exchange to finish.
        //
        // IMPORTANT: We use getSession() instead of exchangeCodeForSession()
        // because detectSessionFromUrl: true means the client is already
        // exchanging the code internally. Calling exchangeCodeForSession()
        // would race with that and one call would fail.
        //
        // The key difference from the OLD implementation: all role bootstrap
        // (updateUser, provision, analytics) happens HERE, not in App.tsx's
        // onAuth callback. This eliminates the race where onAuthStateChange
        // + a second getSession() in App.tsx could abort the in-flight fetch.
        console.log('[AuthCallback] Waiting for session (PKCE exchange)…');
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
          // Session fetch failed — show error.
          setDebugInfo(debugLines.join('\n'));
          setError(sessionError.message || 'Failed to establish session.');
          return;
        }

        if (!data.session) {
          // No error but no session — _initialize() may still be in-flight.
          // Wait briefly and retry once.
          debugLines.push('No session on first call — retrying after 500ms…');
          await new Promise(r => setTimeout(r, 500));
          const { data: retried } = await supabase.auth.getSession();
          debugLines.push(`Retry: hasSession=${!!retried.session}`);
          if (retried.session) {
            data.session = retried.session;
          } else {
            setDebugInfo(debugLines.join('\n'));
            setError('No session found. The sign-in link may have expired — please try again.');
            return;
          }
        }

        // ── 4. Session confirmed — clean URL IMMEDIATELY ────────────────
        // This prevents the code from being re-consumed on refresh.
        window.history.replaceState({}, document.title, '/');
        console.log('[AuthCallback] ✅ Session confirmed, URL cleaned');

        const supaUser = data.session.user;

        // ── 5. Read pending role AFTER session is confirmed ─────────────
        const pendingRole = localStorage.getItem('pendingOAuthRole') as UserRole | null;
        localStorage.removeItem('pendingOAuthRole');
        debugLines.push(`pendingRole consumed: ${pendingRole ?? '(none)'}`);

        const existingRole = (supaUser.user_metadata?.role as string) || null;

        // ── 6a. Returning user (already has a role) ─────────────────────
        if (existingRole) {
          console.log('[AuthCallback] Returning user with role:', existingRole);
          const role: UserRole = (existingRole === 'venue' || existingRole === 'admin') ? existingRole as UserRole : 'artist';
          onAuthCompleteRef.current({
            user: {
              id: supaUser.id,
              name: (supaUser.user_metadata?.name as string) || supaUser.email?.split('@')[0] || 'User',
              email: supaUser.email || '',
              role,
            },
            supabaseUser: supaUser,
            needsPhoneCompletion: false,
            needsRoleSelection: false,
          });
          return;
        }

        // ── 6b. New user with pending role — bootstrap ──────────────────
        if (pendingRole === 'artist' || pendingRole === 'venue') {
          console.log('[AuthCallback] New user — bootstrapping role:', pendingRole);
          const displayName =
            (supaUser.user_metadata?.name as string) ||
            supaUser.email?.split('@')[0] || 'User';

          // Apply role to Supabase user metadata
          try {
            const { data: updateData } = await supabase.auth.updateUser({
              data: { role: pendingRole, name: displayName },
            });
            if (updateData?.user) {
              Object.assign(supaUser, { user_metadata: updateData.user.user_metadata });
            }
            debugLines.push(`Role metadata set to: ${pendingRole}`);
            console.log('[AuthCallback] ✅ Role metadata set to:', pendingRole);
          } catch (e) {
            console.warn('[AuthCallback] Failed to set role metadata', e);
            debugLines.push(`Role metadata update failed: ${e}`);
          }

          // Provision profile (creates artist/venue row) — retry once
          let provisioned = false;
          for (let attempt = 0; attempt < 2 && !provisioned; attempt++) {
            try {
              if (attempt > 0) await new Promise(r => setTimeout(r, 1500));
              await apiPost('/api/profile/provision', {});
              provisioned = true;
              debugLines.push(`Profile provisioned (attempt ${attempt + 1})`);
            } catch (e) {
              console.warn(`[AuthCallback] Profile provision attempt ${attempt + 1} failed`, e);
              debugLines.push(`Profile provision attempt ${attempt + 1} failed: ${e}`);
            }
          }

          trackAnalyticsEvent('role_selected', { role: pendingRole, source: 'google_oauth' });
          trackAnalyticsEvent('auth_complete', { action: 'signup', method: 'google', role: pendingRole });

          const hasPhone = supaUser.user_metadata?.phone;
          console.log('[AuthCallback] ✅ Bootstrap complete, hasPhone:', !!hasPhone);

          onAuthCompleteRef.current({
            user: {
              id: supaUser.id,
              name: displayName,
              email: supaUser.email || '',
              role: pendingRole,
            },
            supabaseUser: supaUser,
            needsPhoneCompletion: !hasPhone,
            needsRoleSelection: false,
          });
          return;
        }

        // ── 6c. No pending role — need role selection ───────────────────
        console.log('[AuthCallback] No pending role — needs role selection');
        onAuthCompleteRef.current({
          user: {
            id: supaUser.id,
            name: (supaUser.user_metadata?.name as string) || supaUser.email?.split('@')[0] || 'User',
            email: supaUser.email || '',
            role: null,
          },
          supabaseUser: supaUser,
          needsPhoneCompletion: false,
          needsRoleSelection: true,
        });

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
        debugLines.push(`❌ Exception: ${msg}`);
        if (err instanceof Error && err.stack) {
          debugLines.push(err.stack);
        }
        console.error('[AuthCallback] Unexpected error:', err);
        setDebugInfo(debugLines.join('\n'));
        setError(msg);
      } finally {
        clearTimeout(timeoutId);
      }
    }

    completeOAuth();

    return () => { clearTimeout(timeoutId); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← Empty deps — runs exactly once.  onAuthComplete is read from the ref.

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
