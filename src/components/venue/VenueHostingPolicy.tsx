import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { PageHeroHeader } from '../PageHeroHeader';

interface VenueHostingPolicyProps {
  onNavigate?: (page: string) => void;
}

export function VenueHostingPolicy({ onNavigate }: VenueHostingPolicyProps) {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8">
        <PageHeroHeader
          title="Venue Hosting Policy"
          subtitle="Guidelines for displaying artworks at your venue"
        />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Venue Responsibilities */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-[var(--text)] mb-6">Your Responsibilities</h2>
          <div className="space-y-4">
            <div className="flex gap-4 p-4 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-[var(--text)]">Safe Display</h3>
                <p className="text-[var(--text-muted)] text-sm mt-1">Ensure artworks are securely mounted and protected from direct sunlight, extreme temperature, and humidity.</p>
              </div>
            </div>

            <div className="flex gap-4 p-4 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-[var(--text)]">Regular Monitoring</h3>
                <p className="text-[var(--text-muted)] text-sm mt-1">Check on artworks weekly and report any issues (damage, theft, environmental concerns) immediately.</p>
              </div>
            </div>

            <div className="flex gap-4 p-4 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-[var(--text)]">Proper Handling</h3>
                <p className="text-[var(--text-muted)] text-sm mt-1">Follow installation instructions provided with each artwork. Don't modify, reframe, or alter pieces.</p>
              </div>
            </div>

            <div className="flex gap-4 p-4 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-[var(--text)]">Timely Return</h3>
                <p className="text-[var(--text-muted)] text-sm mt-1">Return artworks by the agreed date in the same condition received. Coordinate pickup with artists.</p>
              </div>
            </div>

            <div className="flex gap-4 p-4 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-[var(--text)]">Sales Accuracy</h3>
                <p className="text-[var(--text-muted)] text-sm mt-1">Report all sales immediately through Artwalls platform. Process payments securely and transparently.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Damage Guidelines */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-[var(--text)] mb-6">Damage Guidelines</h2>
          <p className="text-[var(--text-muted)] mb-6">We understand accidents happen. Here's how we handle damage:</p>

          <div className="space-y-4">
            <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-4">
              <h3 className="font-semibold text-[var(--text)] flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Normal Wear & Tear
              </h3>
              <p className="text-[var(--text-muted)] text-sm mt-2">Minor scuffs, fading, or small handling marks are expected. No cost.</p>
            </div>

            <div className="bg-yellow-600/10 border border-yellow-600/30 rounded-lg p-4">
              <h3 className="font-semibold text-[var(--text)] flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                Accidental Damage
              </h3>
              <p className="text-[var(--text-muted)] text-sm mt-2">Small tears, cracks, or water damage due to venue conditions. Discussed case-by-case (often covered by venue insurance).</p>
            </div>

            <div className="bg-red-600/10 border border-red-600/30 rounded-lg p-4">
              <h3 className="font-semibold text-[var(--text)] flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                Negligence or Theft
              </h3>
              <p className="text-[var(--text-muted)] text-sm mt-2">Damage due to lack of care or missing artwork. Venue liable for replacement cost (artist's valuation).</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-[var(--accent)]/10 rounded-lg border border-[var(--accent)]/30">
            <p className="text-[var(--text)] text-sm">
              <strong>Insurance Tip:</strong> We recommend venue or facility liability insurance that covers displayed artwork. This protects both you and the artists.
            </p>
          </div>
        </section>

        {/* Payment Terms */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-[var(--text)] mb-6">Payment & Payouts</h2>
          <div className="bg-[var(--surface)] rounded-lg p-6 border border-[var(--border)] space-y-4">
            <div>
              <h3 className="font-semibold text-[var(--text)] mb-2">How Payments Work</h3>
              <ul className="space-y-2 text-[var(--text-muted)] text-sm">
                <li>• Customer purchases artwork at your venue for $X</li>
                <li>• Artwalls platform processes payment (4.5% fee)</li>
                <li>• Artist receives their percentage (60-85% based on tier)</li>
                <li>• <strong className="text-[var(--text)]">You earn 15%</strong> automatically</li>
                <li>• Monthly payouts to your linked account</li>
              </ul>
            </div>

            <div className="pt-4 border-t border-[var(--border)]">
              <h3 className="font-semibold text-[var(--text)] mb-2">Payout Schedule</h3>
              <ul className="space-y-2 text-[var(--text-muted)] text-sm">
                <li>• Payouts process on the 15th of each month</li>
                <li>• Includes all sales from the previous month</li>
                <li>• No minimum threshold required</li>
                <li>• Direct bank transfer (ACH in US)</li>
                <li>• Processing time: 2-3 business days</li>
              </ul>
            </div>

            <div className="pt-4 border-t border-[var(--border)]">
              <h3 className="font-semibold text-[var(--text)] mb-2">Example Payout</h3>
              <p className="text-[var(--text-muted)] text-sm">
                If you have 5 artworks on display in a month and they generate $1,500 in sales:
              </p>
              <p className="text-[var(--text)] font-semibold mt-2">Your payout = $1,500 × 15% = $225</p>
            </div>
          </div>
        </section>

        {/* Expectations */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-[var(--text)] mb-6">What Artists Expect</h2>
          <div className="bg-[var(--surface)] rounded-lg p-6 border border-[var(--border)] space-y-4">
            <div>
              <h3 className="font-semibold text-[var(--text)] text-[var(--accent)] mb-3">Professional Environment</h3>
              <p className="text-[var(--text-muted)] text-sm">Your venue should showcase art meaningfully—clean, well-lit, and respecting the artist's vision.</p>
            </div>

            <div>
              <h3 className="font-semibold text-[var(--text)] text-[var(--accent)] mb-3">Communication</h3>
              <p className="text-[var(--text-muted)] text-sm">Stay in touch with artists. Share photos, customer feedback, and be responsive to questions.</p>
            </div>

            <div>
              <h3 className="font-semibold text-[var(--text)] text-[var(--accent)] mb-3">Transparency</h3>
              <p className="text-[var(--text-muted)] text-sm">Report sales honestly and promptly. Artists trust you with their work and payment.</p>
            </div>

            <div>
              <h3 className="font-semibold text-[var(--text)] text-[var(--accent)] mb-3">Promotion</h3>
              <p className="text-[var(--text-muted)] text-sm">Tag artists in social media, mention the artwork, and help create buzz around the pieces.</p>
            </div>
          </div>
        </section>

        {/* Support CTA */}
        <div className="bg-[var(--surface)] rounded-lg p-8 border border-[var(--border)] text-center">
          <h3 className="text-xl font-bold text-[var(--text)] mb-4">Questions or concerns?</h3>
          <p className="text-[var(--text-muted)] mb-6">Our support team is here to help ensure a great experience for you and the artists.</p>
          <button className="px-6 py-2 bg-[var(--accent)] text-[var(--accent-contrast)] rounded-lg font-semibold hover:opacity-90 transition-opacity">
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}