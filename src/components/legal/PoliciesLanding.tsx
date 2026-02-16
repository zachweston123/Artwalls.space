import { FileText, Scale, Shield, FileCheck } from 'lucide-react';
import { DollarSign } from 'lucide-react';
import { PageHeroHeader } from '../PageHeroHeader';

interface PoliciesLandingProps {
  onNavigate: (page: string) => void;
}

export function PoliciesLanding({ onNavigate }: PoliciesLandingProps) {
  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <PageHeroHeader
        title="Policies & Agreements"
        subtitle="Review the terms and agreements that govern the Artwalls marketplace"
      />

      <div className="max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pricing & Plans Card */}
        <button
          onClick={() => onNavigate('plans-pricing')}
          className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-6 hover:shadow-lg transition-shadow text-left group"
        >
          <div className="w-12 h-12 bg-[var(--surface-2)] rounded-lg flex items-center justify-center mb-4 group-hover:bg-[var(--surface-3)] transition-colors">
            <DollarSign className="w-6 h-6 text-[var(--text-muted)]" />
          </div>
          <h2 className="text-xl mb-2 text-[var(--text)]">Pricing & Plans</h2>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Artwalls offers a Free plan plus paid subscriptions: Starter ($9/mo), Growth ($19/mo), and Pro ($39/mo). 
            Artists take home a percentage of each sale: Free 60%, Starter 80%, Growth 83%, Pro 85%. 
            Venues earn 15% of every sale. A 4.5% buyer support fee is added at checkout. 
            Platform + processing costs come from the remainder. Plans differ by active displays 
            (Free 1, Starter 4, Growth 10, Pro unlimited) and payout timing.
          </p>
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <span>View Plans & Pricing</span>
            <span>→</span>
          </div>
        </button>

        {/* Artist Agreement Card */}
        <button
          onClick={() => onNavigate('artist-agreement')}
          className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-6 hover:shadow-lg transition-shadow text-left group"
        >
          <div className="w-12 h-12 bg-[var(--surface-2)] rounded-lg flex items-center justify-center mb-4 group-hover:bg-[var(--surface-3)] transition-colors">
            <FileText className="w-6 h-6 text-[var(--blue)]" />
          </div>
          <h2 className="text-xl mb-2 text-[var(--text)]">Artist Agreement</h2>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Terms for artists who display and sell artwork through Artwalls venues. Covers ownership, installation, sales splits, and responsibilities.
          </p>
          <div className="flex items-center gap-2 text-sm text-[var(--blue)]">
            <span>Read Agreement</span>
            <span>→</span>
          </div>
        </button>

        {/* Venue Agreement Card */}
        <button
          onClick={() => onNavigate('venue-agreement')}
          className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-6 hover:shadow-lg transition-shadow text-left group"
        >
          <div className="w-12 h-12 bg-[var(--surface-2)] rounded-lg flex items-center justify-center mb-4 group-hover:bg-[var(--surface-3)] transition-colors">
            <FileCheck className="w-6 h-6 text-[var(--green)]" />
          </div>
          <h2 className="text-xl mb-2 text-[var(--text)]">Venue Agreement</h2>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Terms for venues that host artwork. Covers wallspace safety, scheduling, revenue sharing, and care responsibilities.
          </p>
          <div className="flex items-center gap-2 text-sm text-[var(--green)]">
            <span>Read Agreement</span>
            <span>→</span>
          </div>
        </button>

        {/* Privacy Policy */}
        <button
          onClick={() => onNavigate('privacy-policy')}
          className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-6 hover:shadow-lg transition-shadow text-left group"
        >
          <div className="w-12 h-12 bg-[var(--surface-2)] rounded-lg flex items-center justify-center mb-4 group-hover:bg-[var(--surface-3)] transition-colors">
            <Shield className="w-6 h-6 text-[var(--blue)]" />
          </div>
          <h2 className="text-xl mb-2 text-[var(--text)]">Privacy Policy</h2>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            How we collect, use, and protect your personal information.
          </p>
          <div className="flex items-center gap-2 text-sm text-[var(--blue)]">
            <span>Read Policy</span>
            <span>→</span>
          </div>
        </button>

        {/* Terms of Service */}
        <button
          onClick={() => onNavigate('terms-of-service')}
          className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-6 hover:shadow-lg transition-shadow text-left group"
        >
          <div className="w-12 h-12 bg-[var(--surface-2)] rounded-lg flex items-center justify-center mb-4 group-hover:bg-[var(--surface-3)] transition-colors">
            <Scale className="w-6 h-6 text-[var(--green)]" />
          </div>
          <h2 className="text-xl mb-2 text-[var(--text)]">Terms of Service</h2>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            General terms governing your use of the Artwalls platform.
          </p>
          <div className="flex items-center gap-2 text-sm text-[var(--green)]">
            <span>Read Terms</span>
            <span>→</span>
          </div>
        </button>

      </div>

      {/* Additional Info */}
      <div className="max-w-4xl mt-8 bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--border)]">
        <h3 className="text-base mb-2 text-[var(--text)]">Questions about our agreements?</h3>
        <p className="text-sm text-[var(--text-muted)] mb-3">
          If you have questions about any of these agreements, please contact us at{' '}
          <a href="mailto:legal@artwalls.com" className="text-[var(--blue)] underline hover:opacity-90">
            legal@artwalls.com
          </a>
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          Last updated: January 27, 2026
        </p>
      </div>
    </div>
  );
}