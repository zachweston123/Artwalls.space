import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { apiGet, apiPost } from '../../lib/api';
import { getErrorMessage } from '../../lib/errors';

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
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadStatus();
  }, [role, userId]);

  async function loadStatus() {
    try {
      setLoading(true);
      // Try API first using the smart client (handles localhost/prod automatically)
      try {
        const idParam = role === 'artist' ? 'artistId' : 'venueId';
        const data = await apiGet<any>(`/api/stripe/connect/${role}/status?${idParam}=${userId}`);
        setStatus({
          hasAccount: data.hasAccount ?? !!data.accountId,
          accountId: data.accountId,
          onboardingStatus: data.onboardingStatus,
          chargesEnabled: data.chargesEnabled ?? data.charges_enabled,
          payoutsEnabled: data.payoutsEnabled ?? data.payouts_enabled,
          detailsSubmitted: data.detailsSubmitted ?? data.details_submitted,
          requirementsCurrentlyDue: data.requirementsCurrentlyDue ?? data.requirements?.currently_due,
          requirementsEventuallyDue: data.requirementsEventuallyDue ?? data.requirements?.eventually_due,
          lastSyncAt: data.syncedAt ?? data.lastSyncAt,
        });
        return;
      } catch (apiErr) {
        console.warn('Stripe API status check failed, falling back to database:', apiErr);
      }

      // Fallback: Check local database for stripe_account_id
      const table = role === 'artist' ? 'artists' : 'venues';
      const { data, error } = await supabase
        .from(table)
        .select('stripe_account_id')
        .eq('id', userId)
        .single();
      
      if (data?.stripe_account_id) {
        // We know they have an account, but can't verify status without API
        // Assume 'pending' or 'complete' based on presence to avoid blocking UI excessively
        setStatus({
          hasAccount: true,
          accountId: data.stripe_account_id,
          onboardingStatus: 'pending', // Safe default so they can try to resume/sync
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false
        });
      } else {
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
      // Must use API for creation
       try {
        await apiPost(`/api/stripe/connect/${role}/create-account`, {});
        await loadStatus();
      } catch (apiErr: unknown) {
        throw new Error(getErrorMessage(apiErr) || 'Failed to connect to server');
      }
    } catch (err: unknown) {
      console.error('Failed to create account', err);
      setError(getErrorMessage(err) || 'Failed to create account');
    } finally {
      setCreating(false);
    }
  }

  async function startOnboarding() {
    try {
      setCreating(true); // Reusing creating loading state
      
      try {
        const { url } = await apiPost<any>(`/api/stripe/connect/${role}/account-link`, {});
        window.location.href = url;
      } catch (apiErr: unknown) {
        throw new Error(getErrorMessage(apiErr) || 'Failed to start onboarding');
      }
    } catch (err: unknown) {
      console.error('Failed to start onboarding', err);
      setError(getErrorMessage(err) || 'Failed to start onboarding');
    } finally {
      setCreating(false);
    }
  }

  async function refreshStatus() {
    setSyncing(true);
    // Try to trigger a sync on the backend if possible
    try {
       await apiPost(`/api/stripe/connect/${role}/sync`, {});
    } catch (e) {
       console.warn('Backend sync failed, reloading local status only');
    }
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
            ? 'Connect your Stripe account to receive automatic payouts when your artwork sells.'
            : 'Connect your Stripe account to receive automatic payouts.'}
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
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
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
