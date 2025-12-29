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
      const data = await apiGet<ConnectStatus>(`/api/stripe/connect/status?artistId=${encodeURIComponent(user.id)}`);
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
      await apiPost<{ accountId: string }>('/api/stripe/connect/create-account', {
        artistId: user.id,
        email: user.email,
        name: user.name,
      });

      // 2) Get onboarding link
      const { url } = await apiPost<{ url: string }>(
        '/api/stripe/connect/account-link',
        { artistId: user.id },
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
      const { url } = await apiPost<{ url: string }>(
        '/api/stripe/connect/login-link',
        { artistId: user.id },
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
    <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-300" />
            </div>
            <h2 className="text-xl text-neutral-900 dark:text-neutral-50">Get paid automatically</h2>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Artwalls uses Stripe Connect to route each sale to your bank account.
          </p>
        </div>
        {!loading && (
          <span
            className={`px-3 py-1 rounded-full text-xs border ${
              isReady
                ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-200 border-green-200 dark:border-green-800'
                : 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800'
            }`}
          >
            {isReady ? 'Payouts enabled' : 'Action required'}
          </span>
        )}
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Checking Stripe status…
          </div>
        ) : (
          <div className="space-y-3">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-3 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            <div className="flex items-start gap-3 text-sm">
              <div className="w-8 h-8 bg-neutral-100 dark:bg-neutral-700 rounded-lg flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-4 h-4 text-neutral-700 dark:text-neutral-200" />
              </div>
              <div>
                <p className="text-neutral-900 dark:text-neutral-50">
                  {isReady
                    ? 'You’re ready to receive payouts.'
                    : 'Complete onboarding to receive payouts.'}
                </p>
                <p className="text-neutral-500 dark:text-neutral-400">
                  Stripe will collect identity and bank info securely.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {!isReady ? (
                <button
                  onClick={startOnboarding}
                  disabled={working}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-400 disabled:opacity-60"
                >
                  {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  Set up payouts
                </button>
              ) : (
                <button
                  onClick={openStripeDashboard}
                  disabled={working}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-900 rounded-lg hover:opacity-90 disabled:opacity-60"
                >
                  {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  Manage payouts
                </button>
              )}

              <button
                onClick={refresh}
                disabled={working}
                className="px-4 py-3 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-600 disabled:opacity-60"
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
