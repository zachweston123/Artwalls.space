import { useState } from 'react';
import { Download, CheckCircle, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';

interface ArtistAgreementProps {
  onNavigate: (page: string) => void;
  onAccept?: (name: string, date: string) => void;
  hasAccepted?: boolean;
}

export function ArtistAgreement({ onNavigate, onAccept, hasAccepted = false }: ArtistAgreementProps) {
  const [agreed, setAgreed] = useState(hasAccepted);
  const [name, setName] = useState('');
  const [showTOC, setShowTOC] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const sections = [
    { id: 'parties', title: '1. Parties' },
    { id: 'overview', title: '2. Program Overview' },
    { id: 'ownership', title: '3. Ownership and Responsibility' },
    { id: 'readiness', title: '4. Artwork Readiness Requirements' },
    { id: 'installation', title: '5. Installation and Pickup' },
    { id: 'risk', title: '6. Display Risk; Damage, Loss, or Theft' },
    { id: 'sales', title: '7. Sales and "All Sales Final"' },
    { id: 'subscriptions', title: '8. Subscriptions, Fees, Active Displays, and Protection Plan' },
    { id: 'prohibited', title: '9. Prohibited Content and Conduct' },
    { id: 'account', title: '10. Account Actions and Removal' },
    { id: 'limitation', title: '11. Limitation of Platform Responsibility' },
    { id: 'contact', title: '12. Contact and Notices' },
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleAccept = () => {
    if (agreed && name.trim()) {
      if (onAccept) {
        onAccept(name, today);
      }
      setShowSuccessToast(true);
      setTimeout(() => {
        setShowSuccessToast(false);
        onNavigate('policies');
      }, 2000);
    }
  };

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      {/* Back Button */}
      <button
        onClick={() => onNavigate('policies')}
        className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text)] mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Policies</span>
      </button>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content */}
        <div className="flex-1 max-w-3xl">
          <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-6 sm:p-8 mb-6">
            <div className="mb-6">
              <h1 className="text-3xl mb-2 text-[var(--text)]">Artwalls Artist Agreement</h1>
              <p className="text-sm text-[var(--text-muted)]">Last updated: December 25, 2024</p>
            </div>

            {/* Summary */}
            <div className="bg-[var(--surface-2)] rounded-lg p-5 mb-8 border border-[var(--border)]">
              <h2 className="text-base mb-2 text-[var(--blue)]">Summary (non-binding)</h2>
              <p className="text-sm text-[var(--text)]">
                This agreement explains how artists list, display, and sell artwork through Artwalls venues. 
                The "Terms" below are binding; this summary is for convenience only.
              </p>
            </div>

            {/* Mobile TOC Accordion */}
            <div className="lg:hidden mb-6">
              <button
                onClick={() => setShowTOC(!showTOC)}
                className="w-full flex items-center justify-between p-4 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] text-[var(--text)]"
              >
                <span className="text-sm">On this page</span>
                {showTOC ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              {showTOC && (
                <div className="mt-2 p-4 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => {
                        scrollToSection(section.id);
                        setShowTOC(false);
                      }}
                      className="block w-full text-left text-sm text-[var(--text)] hover:text-[var(--blue)] py-2 transition-colors"
                    >
                      {section.title}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Agreement Content */}
            <div className="space-y-8 prose prose-sm max-w-none">
              <section id="parties">
                <h2 className="text-xl mb-3 text-[var(--text)]">1. Parties</h2>
                <p className="text-[var(--text)] leading-relaxed">
                  This Artist Agreement ("Agreement") is between the artist account holder ("Artist," "you") 
                  and Artwalls ("Artwalls," "we," "us").
                </p>
              </section>

              <section id="overview">
                <h2 className="text-xl mb-3 text-[var(--text)]">2. Program Overview</h2>
                <p className="text-[var(--text)] leading-relaxed">
                  Artwalls connects artists with participating venues ("Venues") that host rotating physical wall art 
                  for display and potential sale. Artworks may be displayed in public spaces and purchased by customers 
                  via QR code checkout.
                </p>
              </section>

              <section id="ownership">
                <h2 className="text-xl mb-3 text-[var(--text)]">3. Ownership and Responsibility</h2>
                <ul className="list-disc list-inside space-y-2 text-[var(--text)] leading-relaxed">
                  <li>You retain ownership of your artwork until it is sold to a customer.</li>
                  <li>
                    You are responsible for your artwork's readiness for public display and for accurate listing 
                    details (title, price, medium, dimensions, and images).
                  </li>
                  <li>
                    Artwalls generally does not take physical possession of artwork. Unless explicitly agreed 
                    otherwise in writing, you deliver, install, retrieve, or replace artwork directly with the Venue.
                  </li>
                </ul>
              </section>

              <section id="readiness">
                <h2 className="text-xl mb-3 text-[var(--text)]">4. Artwork Readiness Requirements</h2>
                <p className="text-[var(--text)] leading-relaxed mb-3">
                  You agree that any artwork you place through Artwalls will be reasonably prepared for public 
                  display, including:
                </p>
                <ul className="list-disc list-inside space-y-2 text-[var(--text)] leading-relaxed">
                  <li>
                    Stable hanging method and hardware appropriate for the work's size/weight (or clearly 
                    disclosing requirements).
                  </li>
                  <li>Safe framing/finish suitable for a public environment.</li>
                  <li>A label/QR display requirement as provided by Artwalls or the Venue.</li>
                </ul>
              </section>

              <section id="installation">
                <h2 className="text-xl mb-3 text-[var(--text)]">5. Installation and Pickup</h2>
                <ul className="list-disc list-inside space-y-2 text-[var(--text)] leading-relaxed">
                  <li>
                    You will coordinate installation and pickup during the Venue's posted weekly install/pickup 
                    window (or another mutually agreed schedule).
                  </li>
                  <li>
                    If you miss a scheduled window, you will reschedule promptly. Repeated no-shows may result 
                    in account restrictions.
                  </li>
                </ul>
              </section>

              <section id="risk">
                <h2 className="text-xl mb-3 text-[var(--text)]">6. Display Risk; Damage, Loss, or Theft</h2>
                <ul className="list-disc list-inside space-y-2 text-[var(--text)] leading-relaxed">
                  <li>
                    You acknowledge that displaying artwork in public venues carries inherent risk (e.g., accidental 
                    contact, spills, theft, or vandalism).
                  </li>
                  <li>
                    Venues are required to exercise reasonable care and to list only safe wallspaces (not near 
                    heaters/steam/grease sources, and with material risks disclosed).
                  </li>
                  <li>
                    If damage occurs, you agree to cooperate in documenting the incident (photos, condition confirmation).
                  </li>
                  <li>
                    Artwalls may assist with coordination but does not guarantee reimbursement for damage, loss, 
                    or theft unless Artwalls has expressly agreed in writing to provide coverage.
                  </li>
                </ul>
              </section>

              <section id="sales">
                <h2 className="text-xl mb-3 text-[var(--text)]">7. Sales and "All Sales Final"</h2>
                <ul className="list-disc list-inside space-y-2 text-[var(--text)] leading-relaxed">
                  <li>All artwork sales processed through Artwalls are final. No returns or refunds are offered by default.</li>
                  <li>
                    You agree to describe artwork accurately and disclose material issues. Material misrepresentation 
                    may lead to cancellation of your account and other remedies as permitted by law.
                  </li>
                </ul>
              </section>

              <section id="subscriptions">
                <h2 className="text-xl mb-3 text-[var(--text)]">8. Subscriptions, Fees, Active Displays, and Protection Plan</h2>
                
                <h3 className="text-base mb-2 mt-4 text-[var(--text)]">Plans</h3>
                <p className="text-[var(--text)] leading-relaxed mb-3">
                  Artists may use Artwalls on a Free plan or a paid subscription plan (Starter, Growth, Pro). 
                  Plan features, limits, pricing, and overage rules are shown on the Plans & Pricing page and may 
                  be updated from time to time.
                </p>

                <h3 className="text-base mb-2 mt-4 text-[var(--text)]">Platform fee on sales</h3>
                <p className="text-[var(--text)] leading-relaxed mb-2">
                  For sales processed through Artwalls, Artwalls charges a platform fee that depends on your plan:
                </p>
                <ul className="list-disc list-inside space-y-2 text-[var(--text)] leading-relaxed mb-3">
                  <li>Free: 15% platform fee</li>
                  <li>Starter: 10% platform fee</li>
                  <li>Growth: 8% platform fee</li>
                  <li>Pro: 6% platform fee</li>
                </ul>

                <h3 className="text-base mb-2 mt-4 text-[var(--text)]">Revenue split on completed sales</h3>
                <p className="text-[var(--text)] leading-relaxed mb-2">
                  Artist 80% / Venue 10% / Artwalls 10% (with plan-based fee adjustments as shown above).
                </p>
                <p className="text-[var(--text)] leading-relaxed mb-3">
                  Payment processing fees may apply as disclosed at checkout or in your dashboard.
                </p>

                <h3 className="text-base mb-2 mt-4 text-[var(--text)]">Active displays and overage pricing</h3>
                <p className="text-[var(--text)] leading-relaxed mb-3">
                  Plans include a number of "active displays" (artworks currently displayed at venues). If you exceed 
                  your included active displays, overage charges may apply as shown on the Plans & Pricing page (e.g., 
                  Starter additional active displays billed monthly; Growth additional active displays billed monthly). 
                  Artwalls may pause new placements if unpaid overages accrue.
                </p>

                <h3 className="text-base mb-2 mt-4 text-[var(--text)]">Payout timing</h3>
                <p className="text-[var(--text)] leading-relaxed mb-3">
                  Payout timing may vary by plan. The Free plan may be paid out on a weekly schedule; paid plans may 
                  receive standard or faster payouts as disclosed in your dashboard.
                </p>

                <h3 className="text-base mb-2 mt-4 text-[var(--text)]">Artwork Protection Plan</h3>
                <p className="text-[var(--text)] leading-relaxed mb-2">
                  Artwalls offers an optional "Artwork Protection Plan" to help reimburse certain covered incidents 
                  while artwork is displayed through Artwalls placements:
                </p>
                <ul className="list-disc list-inside space-y-2 text-[var(--text)] leading-relaxed mb-3">
                  <li>
                    Free/Starter: optional add-on at $3 per displayed artwork per month; reimbursement cap up 
                    to $100 per covered incident.
                  </li>
                  <li>
                    Growth: optional add-on at $3 per displayed artwork per month; reimbursement cap up to $150 
                    per covered incident.
                  </li>
                  <li>
                    Pro: protection included at no extra charge for displayed artworks; reimbursement cap up to 
                    $200 per covered incident.
                  </li>
                </ul>

                <h3 className="text-base mb-2 mt-4 text-[var(--text)]">Protection Plan Requirements</h3>
                <p className="text-[var(--text)] leading-relaxed mb-2">
                  Coverage eligibility requires:
                </p>
                <ul className="list-disc list-inside space-y-2 text-[var(--text)] leading-relaxed mb-3">
                  <li>Declared value per artwork</li>
                  <li>Condition report at install (2–4 photos + confirmation)</li>
                  <li>Venue wallspace safety checklist completion</li>
                  <li>Reporting within 48 hours with photos</li>
                  <li>7-day waiting period before coverage begins</li>
                </ul>

                <h3 className="text-base mb-2 mt-4 text-[var(--text)]">Exclusions</h3>
                <p className="text-[var(--text)] leading-relaxed mb-2">
                  Protection does not cover:
                </p>
                <ul className="list-disc list-inside space-y-2 text-[var(--text)] leading-relaxed mb-3">
                  <li>Improper mounting/hardware failure caused by the artist</li>
                  <li>Normal wear and tear</li>
                  <li>Damage from risks disclosed and accepted by the artist (e.g., direct sun disclosed)</li>
                  <li>Intentional damage or fraud</li>
                </ul>

                <h3 className="text-base mb-2 mt-4 text-[var(--text)]">Claim limits</h3>
                <p className="text-[var(--text)] leading-relaxed mb-3">
                  Artwalls may limit claims per year by plan tier (e.g., Free/Starter up to 2, Growth up to 3, Pro up to 4).
                </p>

                <h3 className="text-base mb-2 mt-4 text-[var(--text)]">All Sales Final</h3>
                <p className="text-[var(--text)] leading-relaxed">
                  All artwork sales processed through Artwalls are final and non-refundable.
                </p>
              </section>

              <section id="prohibited">
                <h2 className="text-xl mb-3 text-[var(--text)]">9. Prohibited Content and Conduct</h2>
                <p className="text-[var(--text)] leading-relaxed">
                  You agree not to list or display artwork that includes unlawful content, harassment, hate symbols, 
                  or content that violates applicable laws. Venues may also set content preferences (e.g., family-friendly). 
                  Artwalls may remove listings or suspend accounts for violations.
                </p>
              </section>

              <section id="account">
                <h2 className="text-xl mb-3 text-[var(--text)]">10. Account Actions and Removal</h2>
                <p className="text-[var(--text)] leading-relaxed">
                  Artwalls may remove your listings or suspend/restrict your account for repeated policy violations, 
                  non-compliance with installation rules, misrepresentation, or harassment. You may remove your artwork 
                  from the program subject to any active placements and reasonable notice to the Venue.
                </p>
              </section>

              <section id="limitation">
                <h2 className="text-xl mb-3 text-[var(--text)]">11. Limitation of Platform Responsibility</h2>
                <p className="text-[var(--text)] leading-relaxed">
                  Artwalls provides a marketplace platform and payment coordination. Artwalls is not a gallery and does 
                  not assume custody of artwork by default. Except where prohibited by law, Artwalls is not liable for 
                  indirect damages, lost profits, or consequential losses related to venue display.
                </p>
              </section>

              <section id="contact">
                <h2 className="text-xl mb-3 text-[var(--text)]">12. Contact and Notices</h2>
                <p className="text-[var(--text)] leading-relaxed">
                  You agree to maintain an accurate email address and respond to scheduling or incident notifications 
                  within a reasonable time.
                </p>
              </section>
            </div>
          </div>

          {/* Accept Agreement Card */}
          <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-6 sm:p-8">
            <h2 className="text-xl mb-1 text-[var(--text)]">Accept Agreement</h2>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              You must accept this agreement to use Artwalls artist features.
            </p>

            <div className="space-y-4">
              {/* Checkbox */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-[var(--border)] text-[var(--blue)] focus:ring-2 focus:ring-[var(--focus)]"
                />
                <span className="text-sm text-[var(--text)]">
                  I have read and agree to the Artwalls Artist Agreement
                </span>
              </label>

              {/* Name Input */}
              <div>
                <label className="block text-sm text-[var(--text)] mb-2">Your Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm text-[var(--text)] mb-2">Date</label>
                <div className="px-4 py-2 bg-[var(--surface-2)] rounded-lg text-[var(--text-muted)]">
                  {today}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  onClick={handleAccept}
                  disabled={!agreed || !name.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>Accept Agreement</span>
                </button>
                <button className="flex items-center justify-center gap-2 px-6 py-3 bg-[var(--surface-2)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-3)] transition-colors">
                  <Download className="w-5 h-5" />
                  <span>Download PDF</span>
                </button>
              </div>

              <p className="text-xs text-[var(--text-muted)] text-center">
                By accepting, you agree to be bound by the terms of this agreement.
              </p>
            </div>
          </div>
        </div>

        {/* Desktop TOC Sidebar */}
        <div className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-8">
            <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-5">
              <h3 className="text-sm text-[var(--text-muted)] mb-3">On this page</h3>
              <nav className="space-y-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className="block w-full text-left text-sm text-[var(--text)] hover:text-[var(--blue)] py-1 transition-colors"
                  >
                    {section.title}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed bottom-6 right-6 bg-[var(--blue)] text-[var(--on-blue)] px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 animate-slide-up z-50">
          <CheckCircle className="w-5 h-5" />
          <span>Agreement accepted successfully!</span>
        </div>
      )}
    </div>
  );
}