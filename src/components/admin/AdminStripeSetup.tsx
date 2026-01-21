import { useState, useEffect } from 'react';

interface EnvCheck {
  key: string;
  label: string;
  value: boolean;
  required: boolean;
}

interface PendingPayout {
  orderId: string;
  artistName: string;
  venueName: string;
  artistAmount: number;
  venueAmount: number;
  payoutStatus: string;
  payoutError?: string;
  orderCreatedAt: string;
}

export default function AdminStripeSetup() {
  const [envChecks, setEnvChecks] = useState<EnvCheck[]>([]);
  const [pendingPayouts, setPendingPayouts] = useState<PendingPayout[]>([]);
  const [checking, setChecking] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [stripeKey, setStripeKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkEnvironment();
    loadPendingPayouts();
    // Load saved keys from localStorage if available
    const savedKey = localStorage.getItem('dev_stripe_key');
    const savedWebhook = localStorage.getItem('dev_webhook_secret');
    if (savedKey) setStripeKey(savedKey);
    if (savedWebhook) setWebhookSecret(savedWebhook);
  }, []);

  async function checkEnvironment() {
    try {
      setChecking(true);
      const response = await fetch('/api/debug/env');
      const data = await response.json();

      setEnvChecks([
        {
          key: 'STRIPE_SECRET_KEY',
          label: 'Stripe Secret Key',
          value: data.env?.stripe?.secretKey || false,
          required: true,
        },
        {
          key: 'STRIPE_WEBHOOK_SECRET',
          label: 'Stripe Webhook Secret',
          value: data.env?.stripe?.webhookSecret || false,
          required: true,
        },
        {
          key: 'APP_URL',
          label: 'App Base URL',
          value: !!data.env?.appUrl,
          required: true,
        },
      ]);
    } catch (err) {
      console.error('Failed to check environment', err);
    } finally {
      setChecking(false);
    }
  }

  async function loadPendingPayouts() {
    try {
      const adminPassword = localStorage.getItem('adminPassword') || sessionStorage.getItem('adminPassword');
      if (!adminPassword) return;

      const response = await fetch('/api/admin/stripe/pending-payouts', {
        headers: {
          'x-admin-password': adminPassword,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPendingPayouts(
          data.orders.map((o: any) => ({
            orderId: o.id,
            artistName: 'Artist',
            venueName: 'Venue',
            artistAmount: o.artistAmountCents / 100,
            venueAmount: o.venueAmountCents / 100,
            payoutStatus: o.payoutStatus,
            payoutError: o.payoutError,
            orderCreatedAt: o.createdAt,
          }))
        );
      }
    } catch (err) {
      console.error('Failed to load pending payouts', err);
    }
  }

  async function retryPayout(orderId: string) {
    try {
      setRetrying(orderId);
      const adminPassword = localStorage.getItem('adminPassword') || sessionStorage.getItem('adminPassword');
      if (!adminPassword) return;

      const response = await fetch('/api/admin/stripe/retry-payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword,
        },
        body: JSON.stringify({ orderId }),
      });

      if (response.ok) {
        alert('Payout retried successfully!');
        await loadPendingPayouts();
      } else {
   

  function saveKeysToLocalStorage() {
    setSaving(true);
    try {
      if (stripeKey) {
        localStorage.setItem('dev_stripe_key', stripeKey);
      }
      if (webhookSecret) {
        localStorage.setItem('dev_webhook_secret', webhookSecret);
      }
      
      // Show instructions for adding to .env
      const envContent = `\n# Add these to your ~/Artwalls.space/.env file:\nSTRIPE_SECRET_KEY=${stripeKey}\nSTRIPE_WEBHOOK_SECRET=${webhookSecret || 'whsec_YOUR_WEBHOOK_SECRET'}`;
      
      navigator.clipboard.writeText(envContent).then(() => {
        alert('✅ Keys saved to browser storage!\n\n📋 Environment variables copied to clipboard.\n\nPaste them into ~/Artwalls.space/.env file and restart your server.');
      }).catch(() => {
        alert('✅ Keys saved to browser storage!\n\nCopy these to ~/Artwalls.space/.env:\n' + envContent);
      });
      
      setShowKeyInput(false);
      setTimeout(checkEnvironment, 1000);
    } catch (err) {
      console.error('Failed to save keys', err);
      alert('Failed to save keys');
    } finally {
      setSaving(false);
    }
  }

  function clearStoredKeys() {
    if (confirm('Clear stored Stripe keys from browser?')) {
      localStorage.removeItem('dev_stripe_key');
      localStorage.removeItem('dev_webhook_secret');
      setStripeKey('');
      setWebhookSecret('');
      alert('Keys cleared');
    }
  }     const error = await response.json();
        alert(error.error || 'Failed to retry payout');
      }
    } catch (err) {
      console.error('Failed to retry payout', err);
      alert('Failed to retry payout');
    } finally {
      setRetrying(null);
    }
  }

  const allChecksPass = envChecks.every((c) => c.value || !c.required);
  const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/stripe/webhook` : '';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div classNaAdd your Stripe keys to test locally:
                  </p>
                  
                  {!showKeyInput ? (
                    <button
                      onClick={() => setShowKeyInput(true)}
                      className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded font-medium"
                    >
                      🔑 Add Stripe Test Keys
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                          Stripe Secret Key (starts with sk_test_)
                        </label>
                        <input
                          type="password"
                          value={stripeKey}
                          onChange={(e) => setStripeKey(e.target.value)}
                          placeholder="sk_test_51..."
                          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-yellow-300 dark:border-yellow-700 rounded text-sm font-mono"
                        />
                        <a
                          href="https://dashboard.stripe.com/test/apikeys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-yellow-700 dark:text-yellow-300 hover:underline mt-1 inline-block"
                        >
                          Get your key from Stripe Dashboard →
                        </a>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                          Webhook Secret (optional, starts with whsec_)
                        </label>
                        <input
                          type="password"
                          value={webhookSecret}
                          onChange={(e) => setWebhookSecret(e.target.value)}
                          placeholder="whsec_... (optional for local dev)"
                          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-yellow-300 dark:border-yellow-700 rounded text-sm font-mono"
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={saveKeysToLocalStorage}
                          disabled={!stripeKey || saving}
                          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded font-medium"
                        >
                          {saving ? 'Saving...' : '💾 Save & Copy to Clipboard'}
                        </button>
                        <button
                          onClick={() => setShowKeyInput(false)}
                          className="px-4 py-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded"
                        >
                          Cancel
                        </button>
                      </div>
                      
                      {stripeKey && (
                        <button
                          onClick={clearStoredKeys}
                          className="w-full text-xs text-red-600 dark:text-red-400 hover:underline"
                        >
                          Clear stored keys
                        </button>
                      )}
                    </div>
                  )}me="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Environment Configuration
                </h2>
                <div className="space-y-2">
                  {envChecks.map((check) => (
                    <div
                      key={check.key}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded"
                    >
                      <span className="text-gray-700 dark:text-gray-300">{check.label}</span>
                      {check.value ? (
                        <span className="text-green-600 dark:text-green-400 font-medium">✓ Set</span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400 font-medium">✗ Missing</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {!allChecksPass && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                    Action Required
                  </h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                    Set the following environment variables in your server:
                  </p>
                  <pre className="bg-yellow-100 dark:bg-yellow-900/40 p-3 rounded text-xs overflow-x-auto">
{`STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
APP_URL=https://artwalls.space`}
                  </pre>
                </div>
              )}

              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Webhook Configuration
                </h2>
                <div className="space-y-3">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded p-4">
                    <label className="text-sm text-gray-600 dark:text-gray-400 block mb-2">
                      Webhook URL (copy this):
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={webhookUrl}
                        className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm font-mono"
                      />
                      <button
                        onClick={() => navigator.clipboard.writeText(webhookUrl)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                      Stripe Dashboard Steps:
                    </h4>
                    <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-decimal list-inside">
                      <li>Go to Stripe Dashboard → Developers → Webhooks</li>
                      <li>Click "Add endpoint"</li>
                      <li>Paste the webhook URL above</li>
                      <li>Select events: charge.succeeded, account.updated, checkout.session.completed</li>
                      <li>Copy the signing secret and set it as STRIPE_WEBHOOK_SECRET</li>
                    </ol>
                    <a
                      href="https://dashboard.stripe.com/webhooks"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-3 text-blue-600 dark:text-blue-400 hover:underline text-sm"
                    >
                      Open Stripe Dashboard →
                    </a>
                  </div>
                </div>
              </div>

              <button
                onClick={checkEnvironment}
                className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-4 py-2 rounded"
              >
                Recheck Configuration
              </button>
            </div>
          )}
        </div>

        {pendingPayouts.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Pending Payouts ({pendingPayouts.length})
            </h2>
            <div className="space-y-3">
              {pendingPayouts.map((payout) => (
                <div
                  key={payout.orderId}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Order: {payout.orderId.slice(0, 8)}...
                      </div>
                      <div className="text-sm">
                        Artist: ${payout.artistAmount.toFixed(2)} | Venue: ${payout.venueAmount.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(payout.orderCreatedAt).toLocaleString()}
                      </div>
                      {payout.payoutError && (
                        <div className="text-xs text-red-600 dark:text-red-400">{payout.payoutError}</div>
                      )}
                    </div>
                    <button
                      onClick={() => retryPayout(payout.orderId)}
                      disabled={retrying === payout.orderId}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                    >
                      {retrying === payout.orderId ? 'Retrying...' : 'Retry'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
