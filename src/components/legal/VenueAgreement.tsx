import { useState } from 'react';
import { Download, CheckCircle, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';

interface VenueAgreementProps {
  onNavigate: (page: string) => void;
  onAccept?: (name: string, date: string) => void;
  hasAccepted?: boolean;
}

export function VenueAgreement({ onNavigate, onAccept, hasAccepted = false }: VenueAgreementProps) {
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
    { id: 'wallspace', title: '3. Wallspace Listings and Accuracy' },
    { id: 'safety', title: '4. Wallspace Safety, Duty of Care, and Damage Reporting' },
    { id: 'scheduling', title: '5. Scheduling: Weekly Install/Pickup Window' },
    { id: 'handling', title: '6. Handling, Moving, and Removal' },
    { id: 'revenue', title: '7. Sales and Revenue Share' },
    { id: 'customer', title: '8. Customer Sales Policy' },
    { id: 'prohibited', title: '9. Prohibited Conduct' },
    { id: 'limitation', title: '10. Limitation of Platform Responsibility' },
    { id: 'contact', title: '11. Contact and Notices' },
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
    <div>
      {/* Back Button */}
      <button
        onClick={() => onNavigate('policies')}
        className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:text-neutral-50 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Policies</span>
      </button>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content */}
        <div className="flex-1 max-w-3xl">
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 sm:p-8 mb-6">
            <div className="mb-6">
              <h1 className="text-3xl mb-2 text-neutral-900 dark:text-neutral-50">Artwalls Venue Agreement</h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Last updated: December 25, 2024</p>
            </div>

            {/* Summary */}
            <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-5 mb-8 border border-green-100 dark:border-green-900">
              <h2 className="text-base text-green-900 dark:text-green-200 mb-2 text-neutral-900 dark:text-neutral-50">Summary (non-binding)</h2>
              <p className="text-sm text-green-700 dark:text-green-300">
                This agreement explains how venues list wallspaces, host art, and earn a share of sales through Artwalls. 
                The "Terms" below are binding; this summary is for convenience only.
              </p>
            </div>

            {/* Mobile TOC Accordion */}
            <div className="lg:hidden mb-6">
              <button
                onClick={() => setShowTOC(!showTOC)}
                className="w-full flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700"
              >
                <span className="text-sm">On this page</span>
                {showTOC ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              {showTOC && (
                <div className="mt-2 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => {
                        scrollToSection(section.id);
                        setShowTOC(false);
                      }}
                      className="block w-full text-left text-sm text-neutral-700 dark:text-neutral-300 hover:text-green-600 dark:text-green-400 py-2 transition-colors"
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
                <h2 className="text-xl mb-3 text-neutral-900 dark:text-neutral-50">1. Parties</h2>
                <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  This Venue Agreement ("Agreement") is between the venue account holder ("Venue," "you") 
                  and Artwalls ("Artwalls," "we," "us").
                </p>
              </section>

              <section id="overview">
                <h2 className="text-xl mb-3 text-neutral-900 dark:text-neutral-50">2. Program Overview</h2>
                <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  Artwalls connects venues with local artists who display physical artwork on-site for a rotating 
                  period. Customers may purchase displayed artwork via QR code checkout.
                </p>
              </section>

              <section id="wallspace">
                <h2 className="text-xl mb-3 text-neutral-900 dark:text-neutral-50">3. Wallspace Listings and Accuracy</h2>
                <ul className="list-disc list-inside space-y-2 text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  <li>
                    You will provide accurate details for each wallspace listing (location, approximate dimensions, 
                    availability, and any constraints).
                  </li>
                  <li>
                    You will upload at least one photo of each wallspace and keep listings updated if conditions change.
                  </li>
                </ul>
              </section>

              <section id="safety">
                <h2 className="text-xl mb-3 text-neutral-900 dark:text-neutral-50">4. Wallspace Safety, Duty of Care, and Damage Reporting</h2>
                
                <h3 className="text-base mb-2 mt-4 text-neutral-900 dark:text-neutral-50">Wallspace safety</h3>
                <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-2">
                  You agree to list and use only wallspaces that meet these minimum conditions unless clearly 
                  disclosed and accepted by the artist:
                </p>
                <ul className="list-disc list-inside space-y-2 text-neutral-700 dark:text-neutral-300 leading-relaxed mb-3">
                  <li>Not above or adjacent to heaters/heat sources</li>
                  <li>Not in excessive steam/grease/smoke areas</li>
                  <li>Sunlight exposure disclosed if sustained</li>
                  <li>Not in locations with high bump/spill risk unless disclosed</li>
                </ul>

                <h3 className="text-base mb-2 mt-4 text-neutral-900 dark:text-neutral-50">Duty of care</h3>
                <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-3">
                  While artwork is displayed at your venue, you agree to exercise reasonable care, including 
                  preventing staff/customer handling and avoiding moving artwork without the artist's permission 
                  (except urgent safety reasons, with prompt notice).
                </p>

                <h3 className="text-base mb-2 mt-4 text-neutral-900 dark:text-neutral-50">Damage/loss/theft reporting</h3>
                <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-3">
                  If you discover damage, loss, theft, or vandalism, you will notify the artist within 48 hours 
                  and provide photos (close-up and context). You will cooperate in documenting incidents (e.g., 
                  incident details, security footage availability). Artwalls may take enforcement action if 
                  wallspace safety requirements were violated or if repeated incidents occur.
                </p>

                <h3 className="text-base mb-2 mt-4 text-neutral-900 dark:text-neutral-50">Artwork Protection Plan</h3>
                <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  Some artists may have elected the optional Artwork Protection Plan (or have it included under 
                  their plan). The Protection Plan is administered by Artwalls and does not change your duty of 
                  care or wallspace safety obligations. Venues must still comply with wallspace safety requirements 
                  to remain eligible for the marketplace.
                </p>
              </section>

              <section id="scheduling">
                <h2 className="text-xl mb-3 text-neutral-900 dark:text-neutral-50">5. Scheduling: Weekly Install/Pickup Window</h2>
                <ul className="list-disc list-inside space-y-2 text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  <li>
                    You will set one recurring weekly install/pickup window (e.g., Thursdays 4–6pm).
                  </li>
                  <li>
                    Artists will install and pick up artwork during this window unless otherwise agreed.
                  </li>
                  <li>
                    You will make reasonable efforts to have a responsible staff member available during the 
                    window for check-in and coordination.
                  </li>
                </ul>
              </section>

              <section id="handling">
                <h2 className="text-xl mb-3 text-neutral-900 dark:text-neutral-50">6. Handling, Moving, and Removal</h2>
                <ul className="list-disc list-inside space-y-2 text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  <li>
                    Do not move or rehang artwork without the Artist's permission, except where necessary to 
                    prevent imminent damage or for safety.
                  </li>
                  <li>
                    If you must move artwork urgently, you will notify the Artist as soon as reasonably possible.
                  </li>
                  <li>
                    At the end of a rotation window, you may request pickup/replacement according to the agreed schedule.
                  </li>
                </ul>
              </section>

              <section id="revenue">
                <h2 className="text-xl mb-3 text-neutral-900 dark:text-neutral-50">7. Sales and Revenue Share</h2>
                <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-3">
                  For completed sales processed through Artwalls:
                </p>
                <ul className="list-disc list-inside space-y-2 text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  <li>Artist payout: 80% of sale price</li>
                  <li>Venue share: 10% of sale price</li>
                  <li>Artwalls fee: 10% of sale price</li>
                </ul>
                <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mt-3">
                  You agree not to interfere with QR labels or purchase links and not to misrepresent pricing 
                  to customers.
                </p>
              </section>

              <section id="customer">
                <h2 className="text-xl mb-3 text-neutral-900 dark:text-neutral-50">8. Customer Sales Policy</h2>
                <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  All sales are final. Venues should encourage customers to view artwork in person before purchase. 
                  Venues should not promise refunds or returns on behalf of Artists or Artwalls.
                </p>
              </section>

              <section id="prohibited">
                <h2 className="text-xl mb-3 text-neutral-900 dark:text-neutral-50">9. Prohibited Conduct</h2>
                <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  You agree not to discriminate unlawfully, harass artists, or use Artwalls to spam or solicit 
                  unrelated services. Artwalls may restrict or suspend venue accounts for violations.
                </p>
              </section>

              <section id="limitation">
                <h2 className="text-xl mb-3 text-neutral-900 dark:text-neutral-50">10. Limitation of Platform Responsibility</h2>
                <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  Artwalls provides a marketplace platform and payment coordination. Artwalls does not take custody 
                  of artwork by default and is not a guarantor of sales or incident reimbursement except where 
                  expressly agreed in writing. Except where prohibited by law, Artwalls is not liable for indirect 
                  damages or consequential losses related to venue display.
                </p>
              </section>

              <section id="contact">
                <h2 className="text-xl mb-3 text-neutral-900 dark:text-neutral-50">11. Contact and Notices</h2>
                <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  You agree to maintain accurate contact information and respond to scheduling and incident 
                  notifications within a reasonable time.
                </p>
              </section>
            </div>
          </div>

          {/* Accept Agreement Card */}
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 sm:p-8">
            <h2 className="text-xl mb-1 text-neutral-900 dark:text-neutral-50">Accept Agreement</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-6">
              You must accept this agreement to use Artwalls venue features.
            </p>

            <div className="space-y-4">
              {/* Checkbox */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-neutral-300 dark:border-neutral-600 text-green-600 dark:text-green-400 focus:ring-2 focus:ring-green-500"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">
                  I have read and agree to the Artwalls Venue Agreement
                </span>
              </label>

              {/* Name Input */}
              <div>
                <label className="block text-sm text-neutral-700 dark:text-neutral-300 mb-2">Your Full Name / Venue Representative</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm text-neutral-700 dark:text-neutral-300 mb-2">Date</label>
                <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-neutral-600 dark:text-neutral-300">
                  {today}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  onClick={handleAccept}
                  disabled={!agreed || !name.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>Accept Agreement</span>
                </button>
                <button className="flex items-center justify-center gap-2 px-6 py-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-200 dark:bg-neutral-700 transition-colors">
                  <Download className="w-5 h-5" />
                  <span>Download PDF</span>
                </button>
              </div>

              <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
                By accepting, you agree to be bound by the terms of this agreement.
              </p>
            </div>
          </div>
        </div>

        {/* Desktop TOC Sidebar */}
        <div className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-8">
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5">
              <h3 className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">On this page</h3>
              <nav className="space-y-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className="block w-full text-left text-sm text-neutral-700 dark:text-neutral-300 hover:text-green-600 dark:text-green-400 py-1 transition-colors"
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
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 animate-slide-up z-50">
          <CheckCircle className="w-5 h-5" />
          <span>Agreement accepted successfully!</span>
        </div>
      )}
    </div>
  );
}