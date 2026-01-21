import { useEffect, useState } from 'react';
import { CreditCard, ExternalLink, Loader2, ShieldCheck } from 'lucide-react';
import type { User } from '../../App';
import { apiGet, apiPost } from '../../lib/api';
import { supabase } from '../../lib/supabase';

type ConnectStatus = {
  hasAccount: boolean;
  accountId?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  requirementsCurrentlyDue?: string[];
  requirementsEventuallyDue?: string[];
};

interface ArtistPayoutsCardProps {
  user: User;
}

export function ArtistPayoutsCard({ user }: ArtistPayoutsCardProps) {
  const [status, setStatus] = useState<ConnectStatus>({ hasAccount: false });
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<ConnectStatus>(`/api/stripe/connect/artist/status`
      setStatus(data);
    } catch (e: any) {
      setError(e?.message || 'Unable to load payout status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const startOnboarding = async () => {
    try {
      setWorking(true);
      setError(null);

      // Require login in production so the server can validate role
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setError('Please sign in to set up payouts.');
        return;
      }

      // 1) Ensure account exists
      await apiPost<{ accountId: string }>('/api/stripe/connect/artist/create-account', {});

      // 2) Get onboarding link
      const { url } = await apiPost<{ url: string }>(
        '/api/stripe/connect/artist/account-link',
        {},
      );

      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      setError(e?.message || 'Unable to start Stripe onboarding');
    } finally {
      setWorking(false);
      // Refresh after user returns
      setTimeout(() => refresh(), 2000);
    }
  };

  const openStripeDashboard = async () => {
    try {
      setWorking(true);
      setError(null);
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setError('Please sign in to manage payouts.');
        return;
      }
      const { url } = await apiPost<{ url: string }>(
        '/api/stripe/connect/artist/login-link',
        {},
      );
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      setError(e?.message || 'Unable to open Stripe dashboard');
    } finally {
      setWorking(false);
    }
  };

  const isReady = !!status.hasAccount && !!status.payoutsEnabled;

  return (
    <div className="bg-[var(--surface-1)] text-[var(--text)] rounded-xl p-6 border border-[var(--border)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-[var(--blue)]" />
            </div>
            <h2 className="text-xl text-[var(--text)]">Get paid automatically</h2>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            Artwalls uses Stripe Connect to route each sale to your bank account.
          </p>
        </div>
        {!loading && (
          <span
            className={`px-3 py-1 rounded-full text-xs border ${
              isReady
                ? 'bg-[var(--green-muted)] text-[var(--green)] border-[var(--border)]'
                : 'bg-[var(--surface-2)] text-[var(--warning)] border-[var(--border)]'
            }`}
          >
            {isReady ? 'Payouts enabled' : 'Action required'}
          </span>
        )}
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <Loader2 className="w-4 h-4 animate-spin" />
            Checking Stripe status…
          </div>
        ) : (
          <div className="space-y-3">
            {error && (
              <div className="bg-[var(--surface-2)] rounded-lg p-3 border border-[var(--danger)]">
                <p className="text-sm text-[var(--danger)]">{error}</p>
                <div className="mt-2 text-xs text-[var(--text-muted)]">
                  <p>Common fixes:</p>
                  <ul className="list-disc list-inside">
                    <li>Sign in first (required)</li>
                    <li>Check site settings → VITE_API_BASE_URL</li>
                    <li>Add STRIPE_WEBHOOK_SECRET to Worker</li>
                    <li>Server CORS should allow your Pages domain</li>
                  </ul>
                  <p className="mt-1">
                    <a href="/Third-Grader-Setup-Guide.html" target="_blank" rel="noopener noreferrer" className="underline">Open setup guide</a>
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 text-sm">
              <div className="w-8 h-8 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-4 h-4 text-[var(--text-muted)]" />
              </div>
              <div>
                <p className="text-[var(--text)]">
                  {isReady
                    ? 'You’re ready to receive payouts.'
                    : 'Complete onboarding to receive payouts.'}
                </p>
                <p className="text-[var(--text-muted)]">
                  Stripe will collect identity and bank info securely.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {!isReady ? (
                <button
                  onClick={startOnboarding}
                  disabled={working}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] disabled:opacity-60"
                >
                  {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  Set up payouts
                </button>
              ) : (
                <button
                  onClick={openStripeDashboard}
                  disabled={working}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] disabled:opacity-60"
                >
                  {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  Manage payouts
                </button>
              )}

              <button
                onClick={refresh}
                disabled={working}
                className="px-4 py-3 bg-[var(--surface-3)] text-[var(--text)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-2)] disabled:opacity-60"
              >
                Refresh
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
