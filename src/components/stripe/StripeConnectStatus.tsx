import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';


const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'https://api.artwalls.space';
interface StripeConnectStatusProps {
  role: 'artist' | 'venue';
  userId: string;
}

interface ConnectStatus {
  hasAccount: boolean;
  accountId?: string;
  onboardingStatus?: 'not_started' | 'pending' | 'complete' | 'restricted';
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  requirementsCurrentlyDue?: string[];
  requirementsEventuallyDue?: string[];
  lastSyncAt?: string;
}

export default function StripeConnectStatus({ role, userId }: StripeConnectStatusProps) {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadStatus();
  }, [role, userId]);

  async function loadStatus() {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_BASE}/api/stripe/connect/sync-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ role }),
      });

      if (response.ok) {
        const data = await response.json();
        setStatus({
          hasAccount: !!data.accountId,
          accountId: data.accountId,
          onboardingStatus: data.onboardingStatus,
          chargesEnabled: data.chargesEnabled,
          payoutsEnabled: data.payoutsEnabled,
          detailsSubmitted: data.detailsSubmitted,
          requirementsCurrentlyDue: data.requirementsCurrentlyDue,
          requirementsEventuallyDue: data.requirementsEventuallyDue,
          lastSyncAt: data.syncedAt,
        });
      } else if (response.status === 404) {
        // No account yet
        setStatus({ hasAccount: false });
      }
    } catch (err) {
      console.error('Failed to load Connect status', err);
      setStatus({ hasAccount: false });
    } finally {
      setLoading(false);
    }
  }

  async function createAccount() {
    try {
      setCreating(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_BASE}/api/stripe/connect/create-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ role }),
      });

      if (response.ok) {
        await loadStatus();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create account');
      }
    } catch (err) {
      console.error('Failed to create account', err);
      alert('Failed to create account');
    } finally {
      setCreating(false);
    }
  }

  async function startOnboarding() {
    try {
      setCreating(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_BASE}/api/stripe/connect/account-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ role }),
      });

      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url; // Redirect to Stripe onboarding
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to start onboarding');
      }
    } catch (err) {
      console.error('Failed to start onboarding', err);
      alert('Failed to start onboarding');
    } finally {
      setCreating(false);
    }
  }

  async function refreshStatus() {
    setSyncing(true);
    await loadStatus();
    setSyncing(false);
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!status?.hasAccount) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Set Up Payouts
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {role === 'artist'
            ? 'Connect your Stripe account to receive automatic payouts when your artwork sells. You\'ll take home 60-85% of the artwork price depending on your subscription plan.'
            : 'Connect your Stripe account to receive automatic payouts. Venues earn 15% of the artwork price on every sale hosted in your space.'}
        </p>
        <button
          onClick={createAccount}
          disabled={creating}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
        >
          {creating ? 'Setting up...' : 'Set up payouts with Stripe'}
        </button>
      </div>
    );
  }

  const getStatusBadge = () => {
    if (status.onboardingStatus === 'complete' && status.payoutsEnabled) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          ✓ Payouts Enabled
        </span>
      );
    }
    if (status.onboardingStatus === 'restricted') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          ⚠ Action Required
        </span>
      );
    }
    if (status.onboardingStatus === 'pending') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          ⏳ Verification Needed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
        Not Started
      </span>
    );
  };

  const needsAction =
    !status.payoutsEnabled ||
    !status.chargesEnabled ||
    (status.requirementsCurrentlyDue && status.requirementsCurrentlyDue.length > 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Payout Status
        </h3>
        {getStatusBadge()}
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Charges</div>
            <div className="text-base font-medium text-gray-900 dark:text-white">
              {status.chargesEnabled ? '✓ Enabled' : '✗ Disabled'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Payouts</div>
            <div className="text-base font-medium text-gray-900 dark:text-white">
              {status.payoutsEnabled ? '✓ Enabled' : '✗ Disabled'}
            </div>
          </div>
        </div>

        {needsAction && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-2">
              Action Required
            </p>
            {status.requirementsCurrentlyDue && status.requirementsCurrentlyDue.length > 0 && (
              <ul className="text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside space-y-1">
                {status.requirementsCurrentlyDue.map((req) => (
                  <li key={req}>{req.replace(/_/g, ' ')}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex gap-3">
          {needsAction && (
            <button
              onClick={startOnboarding}
              disabled={creating}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {creating ? 'Loading...' : 'Finish Stripe Setup'}
            </button>
          )}
          <button
            onClick={refreshStatus}
            disabled={syncing}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Refresh'}
          </button>
        </div>

        {status.lastSyncAt && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Last updated: {new Date(status.lastSyncAt).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}
