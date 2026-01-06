import { ArrowLeft } from 'lucide-react';

interface TermsOfServiceProps {
  onNavigate: (page: string) => void;
}

export function TermsOfService({ onNavigate }: TermsOfServiceProps) {
  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      {/* Back */}
      <button
        onClick={() => onNavigate('policies')}
        className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text)] mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Policies</span>
      </button>

      <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-6 sm:p-8">
        <div className="mb-6">
          <h1 className="text-3xl mb-2 text-[var(--text)]">Terms of Service</h1>
          <p className="text-sm text-[var(--text-muted)]">Last updated: January 3, 2026</p>
        </div>

        <div className="space-y-8 prose prose-sm max-w-none">
          <section>
            <h2 className="text-xl mb-3 text-[var(--text)]">Acceptance of Terms</h2>
            <p className="text-[var(--text)] leading-relaxed">
              By creating an account or using Artwalls, you agree to these Terms.
              If you do not agree, do not use the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl mb-3 text-[var(--text)]">Eligibility & Accounts</h2>
            <ul className="list-disc list-inside space-y-2 text-[var(--text)] leading-relaxed">
              <li>You must be at least 13 years old and capable of forming a binding agreement.</li>
              <li>You are responsible for your account activity and for keeping credentials secure.</li>
              <li>We may refuse, suspend, or terminate accounts to protect the platform or users.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl mb-3 text-[var(--text)]">Subscriptions & Billing</h2>
            <ul className="list-disc list-inside space-y-2 text-[var(--text)] leading-relaxed">
              <li>Paid plans are billed via Stripe. Prices, features, and fees are shown in-app.</li>
              <li>Plan limits (e.g., active displays) apply; exceeding limits may incur overages.</li>
              <li>Changes, cancellations, and billing details are managed via the Billing Portal.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl mb-3 text-[var(--text)]">Marketplace Transactions</h2>
            <ul className="list-disc list-inside space-y-2 text-[var(--text)] leading-relaxed">
              <li>Artists list works; customers purchase via QR checkout; venues host displays.</li>
              <li>Sales are typically final; exceptions may be posted by Artwalls or required by law.</li>
              <li>Listings must be accurate; misrepresentation or unsafe installations may lead to removal.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl mb-3 text-[var(--text)]">Payouts & Fees</h2>
            <ul className="list-disc list-inside space-y-2 text-[var(--text)] leading-relaxed">
              <li>Payouts use Stripe Connect; complete onboarding to enable transfers.</li>
              <li>Platform and venue fees may apply and are shown in-app or in agreements.</li>
              <li>Payout timing may vary by plan and Stripe/account status.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl mb-3 text-[var(--text)]">Prohibited Conduct</h2>
            <ul className="list-disc list-inside space-y-2 text-[var(--text)] leading-relaxed">
              <li>Illegal activity, fraud, harassment, or unsafe displays are prohibited.</li>
              <li>Do not circumvent fees, abuse policies, or interfere with platform operations.</li>
              <li>We may remove content or limit access to protect the community.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl mb-3 text-[var(--text)]">Content & License</h2>
            <p className="text-[var(--text)] leading-relaxed">
              You retain rights in your content. By posting, you grant Artwalls a limited license to
              host, display, and use the content to operate and promote the marketplace. You confirm
              you have necessary rights and that your content complies with law and policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl mb-3 text-[var(--text)]">Termination</h2>
            <p className="text-[var(--text)] leading-relaxed">
              You may stop using Artwalls at any time. We may suspend or terminate access with or
              without notice for violations, unlawful activity, or risks to users/platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl mb-3 text-[var(--text)]">Disclaimers</h2>
            <p className="text-[var(--text)] leading-relaxed">
              Artwalls is provided "as is" without warranties. We do not guarantee sales,
              availability, or uninterrupted service. Venues and artists act independently.
            </p>
          </section>

          <section>
            <h2 className="text-xl mb-3 text-[var(--text)]">Limitation of Liability</h2>
            <p className="text-[var(--text)] leading-relaxed">
              To the extent permitted by law, Artwalls is not liable for indirect, incidental,
              or consequential damages. Where liability cannot be excluded, it is limited to the
              fees you paid to Artwalls in the prior 12 months.
            </p>
          </section>

          <section>
            <h2 className="text-xl mb-3 text-[var(--text)]">Indemnification</h2>
            <p className="text-[var(--text)] leading-relaxed">
              You agree to indemnify and hold Artwalls harmless from claims arising out of your
              use of the service, your content, or violations of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl mb-3 text-[var(--text)]">Governing Law & Disputes</h2>
            <p className="text-[var(--text)] leading-relaxed">
              These Terms are governed by applicable laws where Artwalls operates. Disputes will be
              resolved in the courts of that jurisdiction unless otherwise required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl mb-3 text-[var(--text)]">Changes</h2>
            <p className="text-[var(--text)] leading-relaxed">
              We may update these Terms to reflect changes in law or services. Material changes
              will be posted in-app or via notice. The "Last updated" date shows the current version.
            </p>
          </section>

          <section>
            <h2 className="text-xl mb-3 text-[var(--text)]">Contact</h2>
            <p className="text-[var(--text)] leading-relaxed">
              Questions about these Terms? Email
              <a href="mailto:legal@artwalls.space" className="text-[var(--blue)] underline ml-1">legal@artwalls.space</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
