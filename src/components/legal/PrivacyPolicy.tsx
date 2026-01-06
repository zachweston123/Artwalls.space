import { ArrowLeft } from 'lucide-react';

interface PrivacyPolicyProps {
  onNavigate: (page: string) => void;
}

export function PrivacyPolicy({ onNavigate }: PrivacyPolicyProps) {
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
          <h1 className="text-3xl mb-2 text-[var(--text)]">Privacy Policy</h1>
          <p className="text-sm text-[var(--text-muted)]">Last updated: January 3, 2026</p>
        </div>

        <div className="space-y-8 prose prose-sm max-w-none">
          <section>
            <h2 className="text-xl mb-3 text-[var(--text)]">Introduction</h2>
            <p className="text-[var(--text)] leading-relaxed">
              Artwalls ("Artwalls", "we", "us") respects your privacy. This Privacy Policy explains
              what information we collect, how we use it, and your choices. It applies to artists,
              venues, customers, and visitors using the Artwalls website and services.
            </p>
          </section>

          <section>
            <h2 className="text-xl mb-3 text-[var(--text)]">Information We Collect</h2>
            <ul className="list-disc list-inside space-y-2 text-[var(--text)] leading-relaxed">
              <li>Account data: name, email, role (artist/venue), profile details.</li>
              <li>Transaction data: listings, orders, payouts, Stripe account IDs.</li>
              <li>Usage data: actions in the app, device/browser info, cookies.</li>
              <li>Support data: messages you send to support or legal.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl mb-3 text-[var(--text)]">How We Use Information</h2>
            <ul className="list-disc list-inside space-y-2 text-[var(--text)] leading-relaxed">
              <li>Provide and improve the marketplace, scheduling, and checkout features.</li>
              <li>Authenticate users and secure accounts via Supabase.</li>
              <li>Process payments and payouts via Stripe.</li>
              <li>Communicate service updates, policy changes, and support responses.</li>
              <li>Enforce agreements, prevent abuse, and ensure platform safety.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl mb-3 text-[var(--text)]">Sharing</h2>
            <ul className="list-disc list-inside space-y-2 text-[var(--text)] leading-relaxed">
              <li>Payments: We share necessary data with Stripe to process payments/payouts.</li>
              <li>Hosting: Cloud providers (e.g., Cloudflare Pages/Workers) process traffic/logs.</li>
              <li>Database/Auth: Supabase stores account, content, and authentication data.</li>
              <li>Legal/Safety: We may disclose information to comply with law or prevent harm.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl mb-3 text-[var(--text)]">Data Retention</h2>
            <p className="text-[var(--text)] leading-relaxed">
              We retain account and transaction records for as long as needed to provide services,
              meet legal/accounting requirements, and enforce agreements. You may request deletion
              of your account; some records may be kept where required by law or for legitimate
              business purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl mb-3 text-[var(--text)]">Security</h2>
            <p className="text-[var(--text)] leading-relaxed">
              We use industry-standard practices to safeguard information, including secure auth,
              HTTPS, and role-based access. No system is perfectly secure; you are responsible for
              maintaining the confidentiality of your login credentials.
            </p>
          </section>

          <section>
            <h2 className="text-xl mb-3 text-[var(--text)]">Your Choices</h2>
            <ul className="list-disc list-inside space-y-2 text-[var(--text)] leading-relaxed">
              <li>Access/Update: Manage your profile in the app.</li>
              <li>Delete: Request account deletion via support; we’ll confirm and process.
              </li>
              <li>Cookies: Adjust browser settings to control cookies; core cookies may be required.
              </li>
              <li>Communications: Opt out of non-essential emails where available.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl mb-3 text-[var(--text)]">Children</h2>
            <p className="text-[var(--text)] leading-relaxed">
              Artwalls is not directed to children under 13. Do not use the service if you are
              under 13 or if applicable law in your region prohibits such use.
            </p>
          </section>

          <section>
            <h2 className="text-xl mb-3 text-[var(--text)]">Changes</h2>
            <p className="text-[var(--text)] leading-relaxed">
              We may update this Policy to reflect changes in law or our services. Material
              changes will be noted on this page or via in-app notice. The “Last updated” date
              shows the current version.
            </p>
          </section>

          <section>
            <h2 className="text-xl mb-3 text-[var(--text)]">Contact</h2>
            <p className="text-[var(--text)] leading-relaxed">
              Questions or requests regarding privacy? Email
              <a href="mailto:privacy@artwalls.space" className="text-[var(--blue)] underline ml-1">privacy@artwalls.space</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
