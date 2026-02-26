import { useEffect, useState } from 'react';
import { CreditCard, ExternalLink, Loader2, ShieldCheck } from 'lucide-react';
import type { User } from '../../App';
import { apiGet, apiPost } from '../../lib/api';

type ConnectStatus = {
  hasAccount: boolean;
  accountId?: string;
  onboardingStatus?: 'not_started' | 'pending' | 'complete' | 'restricted';
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  requirementsCurrentlyDue?: string[];
  requirementsEventuallyDue?: string[];
};

interface VenuePayoutsCardProps {
  user: User;
}

export function VenuePayoutsCard({ user }: VenuePayoutsCardProps) {
  const [status, setStatus] = useState<ConnectStatus>({ hasAccount: false });
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      // Pass user ID as query param or rely on session
      const data = await apiGet<ConnectStatus>(`/api/stripe/connect/venue/status?userId=${encodeURIComponent(user.id)}`);
      setStatus(data);
    } catch (e: any) {
      setError(e?.message || 'Unable to load payout status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();

    // Auto-refresh when returning from Stripe Connect onboarding
    // (return URL includes ?stripe=return in the hash)
    const hash = window.location.hash || '';
    if (hash.includes('stripe=return') || hash.includes('stripe=refresh')) {
      // Clean up the query param from the hash
      const base = hash.split('?')[0];
      history.replaceState(null, '', base);
      // Stripe may take a moment to propagate — re-fetch after a short delay
      setTimeout(() => refresh(), 2000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const startOnboarding = async () => {
    try {
      setWorking(true);
      setError(null);

      const { url } = await apiPost<{ url: string }>(
        '/api/stripe/connect/venue/onboard',
        {},
      );

      if (!url) {
        setError('Did not receive a Stripe onboarding link. Please try again.');
        return;
      }

      window.location.href = url;
    } catch (e: any) {
      setError(e?.message || 'Unable to start Stripe onboarding');
    } finally {
      setWorking(false);
    }
  };

  const openStripeDashboard = async () => {
    try {
      setWorking(true);
      setError(null);
      const { url } = await apiPost<{ url: string }>(
        '/api/stripe/connect/venue/login',
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
  const needsFinish = !!status.hasAccount && !status.payoutsEnabled;
  const onboardingLabel = status.onboardingStatus === 'complete'
    ? 'Connected'
    : status.onboardingStatus === 'pending'
      ? 'Pending'
      : status.onboardingStatus === 'restricted'
        ? 'Action needed'
        : 'Not connected';

  return (
    <div className="bg-[var(--surface-1)] text-[var(--text)] rounded-xl p-6 border border-[var(--border)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-[var(--green)]" />
            </div>
            <h2 className="text-xl text-[var(--text)]">Enable venue payouts</h2>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            Stripe Connect routes each sale’s venue share to your bank account. It’s quick and free to join.
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
            {isReady ? 'Payouts enabled' : onboardingLabel}
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
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Try refreshing the page. If this keeps happening, sign out and back in.
                </p>
              </div>
            )}

            <div className="flex items-start gap-3 text-sm">
              <div className="w-8 h-8 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-4 h-4 text-[var(--text-muted)]" />
              </div>
              <div>
                <p className="text-[var(--text)]">
                  {isReady
                    ? 'Your venue is ready to receive payouts.'
                    : 'Complete onboarding to receive venue payouts.'}
                </p>
                <p className="text-[var(--text-muted)]">
                  Connect Stripe — takes ~2 minutes. We automate payouts after each sale.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {!isReady ? (
                <button
                  onClick={startOnboarding}
                  disabled={working}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 disabled:opacity-60"
                >
                  {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  {needsFinish ? 'Finish Stripe setup' : 'Connect Stripe to get paid'}
                </button>
              ) : (
                <button
                  onClick={openStripeDashboard}
                  disabled={working}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 disabled:opacity-60"
                >
                  {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  Manage venue payouts
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
