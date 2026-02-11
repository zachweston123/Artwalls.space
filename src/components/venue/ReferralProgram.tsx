import { useState } from 'react';
import { CheckCircle, Users, Gift } from 'lucide-react';

interface ReferralProgramProps {
  onNavigate?: (page: string) => void;
}

export function ReferralProgram({ onNavigate }: ReferralProgramProps) {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [referrerType] = useState('venue'); // Default to venue, can be artist or venue
  const [formData, setFormData] = useState({
    venue_name: '',
    venue_city: '',
    contact_name: '',
    contact_email: '',
    notes: '',
    referrer_type: referrerType,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:4242/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmitted(true);
        setTimeout(() => {
          onNavigate?.('venue-dashboard');
        }, 3000);
      }
    } catch (error) {
      console.error('Submission failed:', error);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4">
        <div className="text-center">
          <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-[var(--text)] mb-2">Referral Submitted!</h1>
          <p className="text-[var(--text-muted)] mb-6">Thanks for the referral. We'll reach out to them and let you know once they join.</p>
          <button
            onClick={() => onNavigate?.('venue-dashboard')}
            className="px-6 py-2 bg-[var(--accent)] text-[var(--accent-contrast)] rounded-lg font-semibold hover:opacity-90"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent)]/80 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-[var(--accent-contrast)]">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">Referral Program</h1>
          <p className="text-xl opacity-90">Know someone who'd love to host art? Refer them and earn rewards.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        {/* How It Works */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-semibold text-[var(--text)] mb-12">How It Works</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-16">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-[var(--accent)] rounded-full flex items-center justify-center text-[var(--accent-contrast)] font-bold text-2xl">
                  1
                </div>
                <Users className="w-8 h-8 mx-auto mb-3 text-[var(--accent)]" />
                <h3 className="font-semibold text-[var(--text)] mb-2">Refer</h3>
                <p className="text-sm text-[var(--text-muted)]">Tell us about a venue or artist you know who'd be great with Artwalls.</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-[var(--accent)] rounded-full flex items-center justify-center text-[var(--accent-contrast)] font-bold text-2xl">
                  2
                </div>
                <Gift className="w-8 h-8 mx-auto mb-3 text-[var(--accent)]" />
                <h3 className="font-semibold text-[var(--text)] mb-2">They Join</h3>
                <p className="text-sm text-[var(--text-muted)]">They sign up and start hosting art (or displaying it).</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-[var(--accent)] rounded-full flex items-center justify-center text-[var(--accent-contrast)] font-bold text-2xl">
                  3
                </div>
                <CheckCircle className="w-8 h-8 mx-auto mb-3 text-green-600" />
                <h3 className="font-semibold text-[var(--text)] mb-2">You Earn</h3>
                <p className="text-sm text-[var(--text-muted)]">30 days featured placement on Artwalls when they join.</p>
              </div>
            </div>

            {/* Rewards */}
            <div className="mb-16">
              <h3 className="text-2xl font-bold text-[var(--text)] mb-6">Referral Rewards</h3>
              <div className="bg-[var(--surface)] rounded-lg p-8 border border-[var(--border)]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-[var(--text)] mb-2">For Venues</h4>
                    <ul className="space-y-2 text-[var(--text-muted)] text-sm">
                      <li>✓ Successful referral = 30-day featured placement</li>
                      <li>✓ They'll appear in "Featured Spaces" section</li>
                      <li>✓ Extra visibility = more artist connections</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-[var(--text)] mb-2">For Artists</h4>
                    <ul className="space-y-2 text-[var(--text-muted)] text-sm">
                      <li>✓ Successful referral = 30-day featured placement</li>
                      <li>✓ They'll appear in "Featured Artists" section</li>
                      <li>✓ Extra visibility = more venue connections</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={() => setStep(2)}
              className="w-full py-4 bg-[var(--accent)] text-[var(--accent-contrast)] rounded-lg font-bold text-lg hover:opacity-90 transition-opacity"
            >
              Make a Referral
            </button>
          </div>
        )}

        {/* Form */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-8">
            <h2 className="text-2xl font-bold text-[var(--text)] mb-6">Refer a Venue</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Venue Name *</label>
                <input
                  type="text"
                  name="venue_name"
                  value={formData.venue_name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  placeholder="e.g., The Gallery Space"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">City *</label>
                  <input
                    type="text"
                    name="venue_city"
                    value={formData.venue_city}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">Contact Name *</label>
                  <input
                    type="text"
                    name="contact_name"
                    value={formData.contact_name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    placeholder="Their name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Contact Email *</label>
                <input
                  type="email"
                  name="contact_email"
                  value={formData.contact_email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  placeholder="their@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Additional Notes (Optional)</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  placeholder="Tell us why they'd be great partners..."
                />
              </div>

              <div className="bg-[var(--surface-2)] p-4 rounded-lg border border-[var(--border)]">
                <p className="text-xs text-[var(--text-muted)]">
                  We'll reach out to them directly and let you know when they join. No spam, we promise.
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-2 bg-[var(--surface-2)] text-[var(--text)] rounded-lg font-semibold hover:bg-[var(--surface-3)] transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="ml-auto px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
                >
                  Submit Referral
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}