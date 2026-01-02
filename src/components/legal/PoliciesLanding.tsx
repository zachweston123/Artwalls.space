import { FileText, Scale, Shield, FileCheck } from 'lucide-react';
import { DollarSign } from 'lucide-react';

interface PoliciesLandingProps {
  onNavigate: (page: string) => void;
}

export function PoliciesLanding({ onNavigate }: PoliciesLandingProps) {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl mb-2 text-neutral-900">Policies & Agreements</h1>
        <p className="text-neutral-600">
          Review the terms and agreements that govern the Artwalls marketplace
        </p>
      </div>

      <div className="max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pricing & Plans Card */}
        <button
          onClick={() => onNavigate('plans-pricing')}
          className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 hover:shadow-lg transition-shadow text-left group"
        >
          <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-900 rounded-lg flex items-center justify-center mb-4 group-hover:bg-neutral-200 dark:group-hover:bg-neutral-700 transition-colors">
            <DollarSign className="w-6 h-6 text-neutral-600 dark:text-neutral-400" />
          </div>
          <h2 className="text-xl mb-2 text-neutral-900 dark:text-neutral-50">Pricing & Plans</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
            Artwalls offers a Free plan plus paid subscriptions: Starter ($9/mo), Growth ($19/mo), and Pro ($39/mo). 
            Plans differ by active displays included (Free 1, Starter 4, Growth 10, Pro unlimited), platform fee on sales 
            (Free 15%, Starter 10%, Growth 8%, Pro 6%), and payout timing (Free weekly payouts; paid plans standard/faster). 
            Additional active displays may incur monthly overage charges as shown on the Plans & Pricing page.
          </p>
          <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            <span>View Plans & Pricing</span>
            <span>→</span>
          </div>
        </button>

        {/* Artist Agreement Card */}
        <button
          onClick={() => onNavigate('artist-agreement')}
          className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 hover:shadow-lg transition-shadow text-left group"
        >
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-xl mb-2 text-neutral-900">Artist Agreement</h2>
          <p className="text-sm text-neutral-600 mb-4">
            Terms for artists who display and sell artwork through Artwalls venues. Covers ownership, installation, sales splits, and responsibilities.
          </p>
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <span>Read Agreement</span>
            <span>→</span>
          </div>
        </button>

        {/* Venue Agreement Card */}
        <button
          onClick={() => onNavigate('venue-agreement')}
          className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 hover:shadow-lg transition-shadow text-left group"
        >
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
            <FileCheck className="w-6 h-6 text-green-600" />
          </div>
          <h2 className="text-xl mb-2 text-neutral-900">Venue Agreement</h2>
          <p className="text-sm text-neutral-600 mb-4">
            Terms for venues that host artwork. Covers wallspace safety, scheduling, revenue sharing, and care responsibilities.
          </p>
          <div className="flex items-center gap-2 text-sm text-green-600">
            <span>Read Agreement</span>
            <span>→</span>
          </div>
        </button>

        {/* Privacy Policy Placeholder */}
        <button
          className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 hover:shadow-lg transition-shadow text-left group opacity-75 cursor-not-allowed"
          disabled
        >
          <div className="w-12 h-12 bg-neutral-100 rounded-lg flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-neutral-600" />
          </div>
          <h2 className="text-xl mb-2 text-neutral-900">Privacy Policy</h2>
          <p className="text-sm text-neutral-600 mb-4">
            How we collect, use, and protect your personal information.
          </p>
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <span>Coming Soon</span>
          </div>
        </button>

        {/* Terms of Service Placeholder */}
        <button
          className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 hover:shadow-lg transition-shadow text-left group opacity-75 cursor-not-allowed"
          disabled
        >
          <div className="w-12 h-12 bg-neutral-100 rounded-lg flex items-center justify-center mb-4">
            <Scale className="w-6 h-6 text-neutral-600" />
          </div>
          <h2 className="text-xl mb-2 text-neutral-900">Terms of Service</h2>
          <p className="text-sm text-neutral-600 mb-4">
            General terms governing your use of the Artwalls platform.
          </p>
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <span>Coming Soon</span>
          </div>
        </button>
      </div>

      {/* Additional Info */}
      <div className="max-w-4xl mt-8 bg-blue-50 rounded-xl p-6 border border-blue-100">
        <h3 className="text-base text-blue-900 mb-2 text-neutral-900">Questions about our agreements?</h3>
        <p className="text-sm text-blue-700 mb-3">
          If you have questions about any of these agreements, please contact us at{' '}
          <a href="mailto:legal@artwalls.com" className="underline hover:text-blue-800">
            legal@artwalls.com
          </a>
        </p>
        <p className="text-xs text-blue-600">
          Last updated: December 25, 2024
        </p>
      </div>
    </div>
  );
}