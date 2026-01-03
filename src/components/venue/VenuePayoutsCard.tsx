import { useEffect, useState } from 'react';
import { CreditCard, ExternalLink, Loader2, ShieldCheck } from 'lucide-react';
import type { User } from '../../App';
import { apiGet, apiPost } from '../../lib/api';

type ConnectStatus = {
  hasAccount: boolean;
  accountId?: string;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
  requirements?: any;
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
      const data = await apiGet<ConnectStatus>(`/api/stripe/connect/venue/status?venueId=${encodeURIComponent(user.id)}`);
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

      // 1) Ensure account exists
      await apiPost<{ accountId: string }>('/api/stripe/connect/venue/create-account', {
        venueId: user.id,
        email: user.email,
        name: user.name,
      });

      // 2) Get onboarding link
      const { url } = await apiPost<{ url: string }>(
        '/api/stripe/connect/venue/account-link',
        { venueId: user.id },
      );

      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      setError(e?.message || 'Unable to start Stripe onboarding');
    } finally {
      setWorking(false);
      setTimeout(() => refresh(), 2000);
    }
  };

  const openStripeDashboard = async () => {
    try {
      setWorking(true);
      setError(null);
      const { url } = await apiPost<{ url: string }>(
        '/api/stripe/connect/venue/login-link',
        { venueId: user.id },
      );
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      setError(e?.message || 'Unable to open Stripe dashboard');
    } finally {
      setWorking(false);
    }
  };

  const isReady = !!status.hasAccount && !!status.payouts_enabled;

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
            Stripe Connect routes each sale’s venue share to your bank account.
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
                  Stripe will collect business and bank info securely.
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
                  Set up venue payouts
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
