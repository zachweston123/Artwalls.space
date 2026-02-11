import { useEffect, useState } from 'react';
import { 
  CreditCard, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  AlertCircle,
  Info,
  ExternalLink,
  Settings,
  CheckCircle,
  XCircle,
  Zap,
  ShoppingCart
} from 'lucide-react';
import { API_BASE, apiGet } from '../../lib/api';

interface StripeSetupProps {
  onNavigate?: (page: string) => void;
}

export function StripePaymentSetup({ onNavigate }: StripeSetupProps) {
  const [showPublishableKey, setShowPublishableKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [publishableKey, setPublishableKey] = useState('pk_live_51234567890');
  const [secretKey, setSecretKey] = useState('sk_live_abcdefghijklmnop');
  const [testMode, setTestMode] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const webhookUrl = `${String(API_BASE).replace(/\/$/, '')}/api/stripe/webhook`;
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [envDebug, setEnvDebug] = useState<{
    ok?: boolean;
    env?: {
      appUrl?: string | null;
      corsOrigin?: any;
      stripe?: { secretKey?: boolean; webhookSecret?: boolean };
      supabase?: { url?: boolean; serviceRoleKey?: boolean };
      workerName?: string;
      priceIds?: { starter?: boolean; growth?: boolean; pro?: boolean };
    };
    error?: string;
  } | null>(null);
  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://artwalls.space';

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const health = await apiGet<{ ok: boolean }>('\/api\/health');
        if (mounted) setApiOk(!!health?.ok);
      } catch {
        if (mounted) setApiOk(false);
      }
      try {
        const debug = await apiGet<typeof envDebug>('\/api\/integration\/status');
        if (mounted) setEnvDebug(debug || null);
      } catch {
        if (mounted) setEnvDebug(null);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleCopyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveSettings = () => {
    // Simulate saving to backend
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleDisconnect = () => {
    if (window.confirm('Are you sure you want to disconnect Stripe? Payments will be disabled until reconnected.')) {
      setIsConnected(false);
      setPublishableKey('');
      setSecretKey('');
    }
  };

  const paymentFeatures = [
    { name: 'Payment Processing', enabled: isConnected },
    { name: 'Recurring Subscriptions', enabled: isConnected },
    { name: 'Automated Payouts', enabled: isConnected },
    { name: 'Fraud Protection', enabled: isConnected },
    { name: 'Multi-currency Support', enabled: isConnected },
  ];

  return (
    <div className="bg-[var(--bg)] text-[var(--text)] p-6 rounded-lg">
      <div className="space-y-6">
      {/* Integration Checklist */}
      <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-6">
        <h2 className="text-xl font-semibold text-[var(--text)] mb-4">Integration Checklist</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle className={`w-5 h-5 ${apiOk ? 'text-[var(--green)]' : 'text-[var(--warning)]'}`} />
            <div>
              <p className="text-sm text-[var(--text)]">API reachable</p>
              <p className="text-xs text-[var(--text-muted)]">Base: {String(API_BASE)} — Health: {apiOk === null ? 'Checking…' : apiOk ? 'OK' : 'Unavailable'}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className={`w-5 h-5 ${envDebug?.env?.stripe?.secretKey ? 'text-[var(--green)]' : 'text-[var(--warning)]'}`} />
            <div>
              <p className="text-sm text-[var(--text)]">Worker Stripe secret key</p>
              <p className="text-xs text-[var(--text-muted)]">Present: {envDebug?.env?.stripe?.secretKey ? 'Yes' : envDebug === null ? 'Checking…' : 'No'} — Set via Worker secrets</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className={`w-5 h-5 ${envDebug?.env?.stripe?.webhookSecret ? 'text-[var(--green)]' : 'text-[var(--warning)]'}`} />
            <div>
              <p className="text-sm text-[var(--text)]">Worker webhook signing secret</p>
              <p className="text-xs text-[var(--text-muted)]">Present: {envDebug?.env?.stripe?.webhookSecret ? 'Yes' : envDebug === null ? 'Checking…' : 'No'} — Set STRIPE_WEBHOOK_SECRET</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            {(() => {
              const origins = Array.isArray(envDebug?.env?.corsOrigin) ? envDebug!.env!.corsOrigin : [];
              const corsOk = origins.includes(siteOrigin) || origins.includes('https://artwalls.space');
              return <CheckCircle className={`w-5 h-5 ${corsOk ? 'text-[var(--green)]' : 'text-[var(--warning)]'}`} />;
            })()}
            <div>
              <p className="text-sm text-[var(--text)]">Worker CORS allows site</p>
              <p className="text-xs text-[var(--text-muted)]">
                Allowed origins: {Array.isArray(envDebug?.env?.corsOrigin) ? envDebug!.env!.corsOrigin.join(', ') : (envDebug === null ? 'Checking…' : 'unknown')} — Site: {siteOrigin}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className={`w-5 h-5 ${envDebug?.env?.supabase?.url && envDebug?.env?.supabase?.serviceRoleKey ? 'text-[var(--green)]' : 'text-[var(--warning)]'}`} />
            <div>
              <p className="text-sm text-[var(--text)]">Worker Supabase config</p>
              <p className="text-xs text-[var(--text-muted)]">URL: {envDebug?.env?.supabase?.url ? 'Yes' : 'No'} — Service Role Key: {envDebug?.env?.supabase?.serviceRoleKey ? 'Yes' : 'No'}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className={`w-5 h-5 text-[var(--blue)]`} />
            <div>
              <p className="text-sm text-[var(--text)]">Worker secret setup</p>
              <p className="text-xs text-[var(--text-muted)]">Set via CLI: <span className="font-mono">wrangler secret put STRIPE_WEBHOOK_SECRET --name artwalls-space</span></p>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <a href="/Third-Grader-Setup-Guide.html" className="text-sm text-[var(--blue)] hover:text-[var(--blue-hover)]">Open setup guide</a>
        </div>
      </div>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stripe Payment Setup</h1>
          <p className="text-[var(--text-muted)] mt-2">
            Connect your Stripe account to accept payments from artists and venues
          </p>
        </div>
        <div
          className={`px-4 py-2 rounded-full flex items-center gap-2 ${
            isConnected ? 'bg-[var(--green-muted)]' : 'bg-[var(--surface-2)]'
          }`}
        >
          {isConnected ? (
            <>
              <CheckCircle className="w-5 h-5 text-[var(--green)]" />
              <span className="text-[var(--green)]">
                Connected
              </span>
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5 text-[var(--danger)]" />
              <span className="text-[var(--danger)]">Not Connected</span>
            </>
          )}
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-4 flex gap-4">
        <Info className="w-5 h-5 text-[var(--blue)] flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-[var(--text)] mb-1">What is Stripe?</h3>
          <p className="text-sm text-[var(--text-muted)]">
            Stripe is a secure payment platform that handles credit card processing, subscriptions, and payouts. 
            Learn more at{' '}
            <a
              href="https://stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-[var(--blue)] hover:text-[var(--blue-hover)]"
            >
              stripe.com
            </a>
          </p>
        </div>
      </div>

      {/* Connection Status Section */}
      {isConnected && (
        <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-[var(--text)]">Connection Status</h2>
            <a 
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--blue)] hover:text-[var(--blue-hover)] flex items-center gap-1"
            >
              Open Stripe Dashboard <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-[var(--surface-2)] p-4 rounded-lg">
              <p className="text-sm text-[var(--text-muted)] mb-1">Account Status</p>
              <p className="text-lg font-semibold text-[var(--green)]">Active</p>
            </div>
            <div className="bg-[var(--surface-2)] p-4 rounded-lg">
              <p className="text-sm text-[var(--text-muted)] mb-1">Processing Fee</p>
              <p className="text-lg font-semibold text-[var(--text)]">2.9% + $0.30</p>
            </div>
            <div className="bg-[var(--surface-2)] p-4 rounded-lg">
              <p className="text-sm text-[var(--text-muted)] mb-1">Mode</p>
              <p className="text-lg font-semibold text-[var(--text)]">{testMode ? 'Test' : 'Live'}</p>
            </div>
          </div>

          {/* Enabled Features */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[var(--text)] mb-3">Enabled Features</p>
            {paymentFeatures.map((feature) => (
              <div key={feature.name} className="flex items-center gap-3 p-2">
                <CheckCircle className="w-5 h-5 text-[var(--green)]" />
                <span className="text-[var(--text)]">{feature.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* API Keys Section */}
      <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-6">
        <h2 className="text-xl font-semibold text-[var(--text)] mb-6 flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          API Keys
        </h2>

        {/* Test/Live Toggle */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="testMode"
              checked={testMode}
              onChange={(e) => setTestMode(e.target.checked)}
              className="w-4 h-4 accent-[var(--blue)]"
            />
            <label htmlFor="testMode" className="text-sm text-[var(--text-muted)]">
              Test Mode (Recommended for development)
            </label>
          </div>
        </div>

        {/* Publishable Key */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-[var(--text)] mb-2">
            {testMode ? 'Test' : 'Live'} Publishable Key
          </label>
          <p className="text-xs text-[var(--text-muted)] mb-3">
            This key is safe to use in your frontend code. Used for payment form validation.
          </p>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type={showPublishableKey ? 'text' : 'password'}
                value={publishableKey}
                onChange={(e) => setPublishableKey(e.target.value)}
                className="w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-[var(--surface-2)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
                readOnly
              />
              <button
                onClick={() => setShowPublishableKey(!showPublishableKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                {showPublishableKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <button
              onClick={() => handleCopyToClipboard(publishableKey, 'publishable')}
              className="px-4 py-3 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] rounded-lg transition-colors flex items-center gap-2 text-[var(--text)] border border-[var(--border)]"
            >
              {copiedField === 'publishable' ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Secret Key */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-[var(--text)] mb-2">
            {testMode ? 'Test' : 'Live'} Secret Key
          </label>
          <p className="text-xs text-[var(--text-muted)] mb-3">
            <strong>Keep this secret!</strong> Never share this key or commit it to version control. Use environment variables.
          </p>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type={showSecretKey ? 'text' : 'password'}
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                className="w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-[var(--surface-2)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
                readOnly
              />
              <button
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                {showSecretKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <button
              onClick={() => handleCopyToClipboard(secretKey, 'secret')}
              className="px-4 py-3 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] rounded-lg transition-colors flex items-center gap-2 text-[var(--text)] border border-[var(--border)]"
            >
              {copiedField === 'secret' ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Alert Box */}
        <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-4 flex gap-3 mb-6">
          <AlertCircle className="w-5 h-5 text-[var(--warning)] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-[var(--text)]">
              <strong>Security Best Practice:</strong> Store your secret key in environment variables, not in code.
            </p>
          </div>
        </div>
      </div>

      {/* Webhook Configuration */}
      <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-6">
        <h2 className="text-xl font-semibold text-[var(--text)] mb-6 flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Webhook Configuration
        </h2>

        <p className="text-sm text-[var(--text-muted)] mb-4">
          Configure webhooks in your Stripe dashboard to receive real-time payment events.
        </p>

        <div className="bg-[var(--surface-2)] p-4 rounded-lg mb-4 border border-[var(--border)]">
          <p className="text-xs text-[var(--text-muted)] mb-2">Webhook URL:</p>
          <div className="flex gap-2">
            <code className="flex-1 text-sm bg-[var(--surface-1)] p-2 rounded text-[var(--text)] break-all border border-[var(--border)]">
              {webhookUrl}
            </code>
            <button
              onClick={() => handleCopyToClipboard(webhookUrl, 'webhook')}
              className="px-3 py-2 bg-[var(--surface-1)] hover:bg-[var(--surface-3)] rounded transition-colors border border-[var(--border)]"
            >
              {copiedField === 'webhook' ? (
                <Check className="w-4 h-4 text-[var(--green)]" />
              ) : (
                <Copy className="w-4 h-4 text-[var(--text-muted)]" />
              )}
            </button>
          </div>
        </div>

        <a
          href="https://dashboard.stripe.com/webhooks"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[var(--blue)] hover:text-[var(--blue-hover)] flex items-center gap-1"
        >
          Configure in Stripe Dashboard <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Quick Setup Guide */}
      <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-6">
        <h2 className="text-xl font-semibold text-[var(--text)] mb-4">Quick Setup Guide</h2>
        <ol className="space-y-3">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-[var(--blue)] text-[var(--on-blue)] rounded-full flex items-center justify-center text-sm font-semibold">1</span>
            <div>
              <p className="font-medium text-[var(--text)]">Create Stripe Account</p>
              <p className="text-sm text-[var(--text-muted)]">Sign up at stripe.com if you haven't already</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-[var(--blue)] text-[var(--on-blue)] rounded-full flex items-center justify-center text-sm font-semibold">2</span>
            <div>
              <p className="font-medium text-[var(--text)]">Get API Keys</p>
              <p className="text-sm text-[var(--text-muted)]">Copy your publishable and secret keys from Stripe Dashboard</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-[var(--blue)] text-[var(--on-blue)] rounded-full flex items-center justify-center text-sm font-semibold">3</span>
            <div>
              <p className="font-medium text-[var(--text)]">Configure Environment Variables</p>
              <p className="text-sm text-[var(--text-muted)]">Set server vars: STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-[var(--blue)] text-[var(--on-blue)] rounded-full flex items-center justify-center text-sm font-semibold">4</span>
            <div>
              <p className="font-medium text-[var(--text)]">Set Up Webhooks</p>
              <p className="text-sm text-[var(--text-muted)]">Configure webhook endpoint in Stripe Dashboard</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-[var(--blue)] text-[var(--on-blue)] rounded-full flex items-center justify-center text-sm font-semibold">5</span>
            <div>
              <p className="font-medium text-[var(--text)]">Test Payments</p>
              <p className="text-sm text-[var(--text-muted)]">Use test card numbers to verify payment processing</p>
            </div>
          </li>
        </ol>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-between">
        <button
          onClick={handleDisconnect}
          disabled={!isConnected}
          className="px-6 py-3 bg-[var(--surface-2)] text-[var(--danger)] rounded-lg hover:bg-[var(--surface-3)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium border border-[var(--border)]"
        >
          Disconnect Stripe
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => window.open('https://stripe.com/docs', '_blank')}
            className="px-6 py-3 border border-[var(--border)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-2)] transition-colors font-medium"
          >
            View Documentation
          </button>
          <button
            onClick={handleSaveSettings}
            className="px-6 py-3 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors font-medium flex items-center gap-2"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                Saved!
              </>
            ) : (
              <>
                <Settings className="w-4 h-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
