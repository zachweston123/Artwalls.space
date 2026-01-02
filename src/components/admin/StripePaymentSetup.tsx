import { useState } from 'react';
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Stripe Payment Setup</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-2">
            Connect your Stripe account to accept payments from artists and venues
          </p>
        </div>
        <div className={`px-4 py-2 rounded-full flex items-center gap-2 ${
          isConnected 
            ? 'bg-green-100 dark:bg-green-900' 
            : 'bg-red-100 dark:bg-red-900'
        }`}>
          {isConnected ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className={isConnected ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                Connected
              </span>
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span className="text-red-700 dark:text-red-300">Not Connected</span>
            </>
          )}
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex gap-4">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-1">What is Stripe?</h3>
          <p className="text-sm text-blue-700 dark:text-blue-200">
            Stripe is a secure payment platform that handles credit card processing, subscriptions, and payouts. 
            Learn more at <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600 dark:hover:text-blue-500">stripe.com</a>
          </p>
        </div>
      </div>

      {/* Connection Status Section */}
      {isConnected && (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Connection Status</h2>
            <a 
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
            >
              Open Stripe Dashboard <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-neutral-50 dark:bg-neutral-700 p-4 rounded-lg">
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Account Status</p>
              <p className="text-lg font-semibold text-green-600 dark:text-green-400">Active</p>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-700 p-4 rounded-lg">
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Processing Fee</p>
              <p className="text-lg font-semibold text-neutral-900 dark:text-white">2.9% + $0.30</p>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-700 p-4 rounded-lg">
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Mode</p>
              <p className="text-lg font-semibold text-neutral-900 dark:text-white">{testMode ? 'Test' : 'Live'}</p>
            </div>
          </div>

          {/* Enabled Features */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">Enabled Features</p>
            {paymentFeatures.map((feature) => (
              <div key={feature.name} className="flex items-center gap-3 p-2">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="text-neutral-700 dark:text-neutral-300">{feature.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* API Keys Section */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
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
              className="w-4 h-4 accent-blue-600"
            />
            <label htmlFor="testMode" className="text-sm text-neutral-600 dark:text-neutral-400">
              Test Mode (Recommended for development)
            </label>
          </div>
        </div>

        {/* Publishable Key */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
            {testMode ? 'Test' : 'Live'} Publishable Key
          </label>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
            This key is safe to use in your frontend code. Used for payment form validation.
          </p>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type={showPublishableKey ? 'text' : 'password'}
                value={publishableKey}
                onChange={(e) => setPublishableKey(e.target.value)}
                className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white font-mono text-sm"
                readOnly
              />
              <button
                onClick={() => setShowPublishableKey(!showPublishableKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
              >
                {showPublishableKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <button
              onClick={() => handleCopyToClipboard(publishableKey, 'publishable')}
              className="px-4 py-3 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-lg transition-colors flex items-center gap-2 text-neutral-700 dark:text-neutral-300"
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
          <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
            {testMode ? 'Test' : 'Live'} Secret Key
          </label>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
            <strong>Keep this secret!</strong> Never share this key or commit it to version control. Use environment variables.
          </p>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type={showSecretKey ? 'text' : 'password'}
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white font-mono text-sm"
                readOnly
              />
              <button
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
              >
                {showSecretKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <button
              onClick={() => handleCopyToClipboard(secretKey, 'secret')}
              className="px-4 py-3 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-lg transition-colors flex items-center gap-2 text-neutral-700 dark:text-neutral-300"
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
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex gap-3 mb-6">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Security Best Practice:</strong> Store your secret key in environment variables, not in code.
            </p>
          </div>
        </div>
      </div>

      {/* Webhook Configuration */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Webhook Configuration
        </h2>

        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
          Configure webhooks in your Stripe dashboard to receive real-time payment events.
        </p>

        <div className="bg-neutral-50 dark:bg-neutral-700 p-4 rounded-lg mb-4">
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">Webhook URL:</p>
          <div className="flex gap-2">
            <code className="flex-1 text-sm font-mono bg-white dark:bg-neutral-800 p-2 rounded text-neutral-900 dark:text-white break-all">
              https://api.artwalls.space/webhooks/stripe
            </code>
            <button
              onClick={() => handleCopyToClipboard('https://api.artwalls.space/webhooks/stripe', 'webhook')}
              className="px-3 py-2 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors"
            >
              {copiedField === 'webhook' ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
              )}
            </button>
          </div>
        </div>

        <a
          href="https://dashboard.stripe.com/webhooks"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
        >
          Configure in Stripe Dashboard <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Quick Setup Guide */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">Quick Setup Guide</h2>
        <ol className="space-y-3">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">1</span>
            <div>
              <p className="font-medium text-neutral-900 dark:text-white">Create Stripe Account</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Sign up at stripe.com if you haven't already</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">2</span>
            <div>
              <p className="font-medium text-neutral-900 dark:text-white">Get API Keys</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Copy your publishable and secret keys from Stripe Dashboard</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">3</span>
            <div>
              <p className="font-medium text-neutral-900 dark:text-white">Configure Environment Variables</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Add REACT_APP_STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">4</span>
            <div>
              <p className="font-medium text-neutral-900 dark:text-white">Set Up Webhooks</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Configure webhook endpoint in Stripe Dashboard</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">5</span>
            <div>
              <p className="font-medium text-neutral-900 dark:text-white">Test Payments</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Use test card numbers to verify payment processing</p>
            </div>
          </li>
        </ol>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-between">
        <button
          onClick={handleDisconnect}
          disabled={!isConnected}
          className="px-6 py-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          Disconnect Stripe
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => window.open('https://stripe.com/docs', '_blank')}
            className="px-6 py-3 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors font-medium"
          >
            View Documentation
          </button>
          <button
            onClick={handleSaveSettings}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
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
  );
}
