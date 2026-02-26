import { useState } from 'react';
import { ChevronRight, TrendingUp, Zap, DollarSign, Users, Heart, Mail } from 'lucide-react';

interface WhyArtwalksProps {
  userRole: 'artist' | 'venue';
  onNavigate?: (page: string) => void;
  onBack?: () => void;
}

export function WhyArtwalls({ userRole, onNavigate, onBack }: WhyArtwalksProps) {
  const isArtist = userRole === 'artist';
  const [contactForm, setContactForm] = useState({
    email: '',
    message: '',
    role_context: userRole,
  });
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [honeypot, setHoneypot] = useState('');

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError(null);

    // Honeypot check
    if (honeypot) {
      console.warn('Honeypot triggered');
      return;
    }

    // Validation
    if (!contactForm.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setContactError('Please enter a valid email address.');
      return;
    }

    if (contactForm.message.length < 10) {
      setContactError('Your message must be at least 10 characters.');
      return;
    }

    setContactLoading(true);

    try {
      const response = await fetch('/api/support/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: contactForm.email,
          message: contactForm.message,
          role_context: contactForm.role_context,
          page_source: isArtist ? 'why_artwalls_artist' : 'why_artwalls_venue',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setContactError(errorData.error || 'Failed to send message. Please try again.');
        return;
      }

      setContactSubmitted(true);
      setContactForm({ email: contactForm.email, message: '', role_context: userRole });
      setTimeout(() => setContactSubmitted(false), 5000);
    } catch (err: any) {
      setContactError('An error occurred. Please try again.');
      console.error('Contact form error:', err);
    } finally {
      setContactLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Hero Section */}
      <section className="py-12 sm:py-20 px-4 border-b border-[var(--border)]">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-[var(--text)]">
            Why Artwalls
          </h1>
          <p className="text-lg sm:text-xl text-[var(--text-muted)] mb-6 max-w-2xl mx-auto">
            Turning real-world spaces into places where art gets discovered and sold.
          </p>
          <p className="text-base text-[var(--text-muted)] max-w-2xl mx-auto leading-relaxed">
            Artwalls connects local venues and artists to bring art into everyday spaces. The goal is to make art discovery effortless for customers and sustainable for artists and venues. We handle the tech, payments, and tracking so the community can focus on hosting and creating.
          </p>
        </div>
      </section>

      {/* How It Works - 3 Step Strip
          Canonical "How Artwalls Works" section — describes the buy-flow
          (QR → scan → payout). The homepage uses "Getting Started" for
          onboarding steps to avoid duplicate naming. Keep these distinct. */}
      <section className="py-12 sm:py-16 px-4 bg-[var(--surface)]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12 text-[var(--text)]">
            How Artwalls Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-4">
            {/* Step 1 */}
            <div className="bg-[var(--surface-1)] rounded-lg p-6 border border-[var(--border)] text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[var(--blue-muted)] border border-[var(--blue)] mx-auto mb-4">
                <span className="text-xl font-bold text-[var(--blue)]">1</span>
              </div>
              <h3 className="font-semibold text-lg mb-2 text-[var(--text)]">
                Art Displayed with QR
              </h3>
              <p className="text-sm text-[var(--text-muted)]">
                Art is displayed at a venue with a QR label for easy scanning.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-[var(--surface-1)] rounded-lg p-6 border border-[var(--border)] text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[var(--blue-muted)] border border-[var(--blue)] mx-auto mb-4">
                <span className="text-xl font-bold text-[var(--blue)]">2</span>
              </div>
              <h3 className="font-semibold text-lg mb-2 text-[var(--text)]">
                Customers Scan & Purchase
              </h3>
              <p className="text-sm text-[var(--text-muted)]">
                Customers scan and purchase instantly on their phone.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-[var(--surface-1)] rounded-lg p-6 border border-[var(--border)] text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[var(--blue-muted)] border border-[var(--blue)] mx-auto mb-4">
                <span className="text-xl font-bold text-[var(--blue)]">3</span>
              </div>
              <h3 className="font-semibold text-lg mb-2 text-[var(--text)]">
                Automatic Payouts
              </h3>
              <p className="text-sm text-[var(--text-muted)]">
                Payouts are automatically split and tracked.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Role-Specific Value Section */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className={`rounded-lg border border-[var(--border)] p-8 ${
            isArtist ? 'bg-[var(--blue-muted)]' : 'bg-[var(--green-muted)]'
          }`}>
            <h2 className={`text-2xl font-bold mb-4 ${
              isArtist ? 'text-[var(--blue)]' : 'text-[var(--green)]'
            }`}>
              {isArtist 
                ? '🎨 Get discovered in real spaces—without chasing buyers.'
                : '🏛️ Turn your wall space into a low-effort revenue stream.'}
            </h2>

            <ul className="space-y-3 mb-8">
              {isArtist ? (
                <>
                  <li className="flex items-start gap-3">
                    <ChevronRight className={`w-5 h-5 text-[var(--blue)] flex-shrink-0 mt-0.5`} />
                    <span className="text-[var(--text-muted)]">
                      <strong>Real-world discovery:</strong> Your work is seen by local foot traffic in places people already love.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ChevronRight className={`w-5 h-5 text-[var(--blue)] flex-shrink-0 mt-0.5`} />
                    <span className="text-[var(--text-muted)]">
                      <strong>Always-on selling:</strong> Your art can sell every day, not just at occasional markets.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ChevronRight className={`w-5 h-5 text-[var(--blue)] flex-shrink-0 mt-0.5`} />
                    <span className="text-[var(--text-muted)]">
                      <strong>Simple, transparent earnings:</strong> Take home 60–85% of the artwork price based on your plan.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ChevronRight className={`w-5 h-5 text-[var(--blue)] flex-shrink-0 mt-0.5`} />
                    <span className="text-[var(--text-muted)]">
                      <strong>No awkward payments:</strong> QR checkout, order tracking, and automated payouts.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ChevronRight className={`w-5 h-5 text-[var(--blue)] flex-shrink-0 mt-0.5`} />
                    <span className="text-[var(--text-muted)]">
                      <strong>Build local trust:</strong> Selling from real venues increases confidence and reduces friction.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ChevronRight className={`w-5 h-5 text-[var(--blue)] flex-shrink-0 mt-0.5`} />
                    <span className="text-[var(--text-muted)]">
                      <strong>Spend less time marketing, more time creating.</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ChevronRight className={`w-5 h-5 text-[var(--blue)] flex-shrink-0 mt-0.5`} />
                    <span className="text-[var(--text-muted)]">
                      <strong>See performance:</strong> Track views, scans, and sales per venue.
                    </span>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-start gap-3">
                    <ChevronRight className={`w-5 h-5 text-[var(--green)] flex-shrink-0 mt-0.5`} />
                    <span className="text-[var(--text-muted)]">
                      <strong>Earn 15% per sale:</strong> Get paid when art sells in your space—no cost to join.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ChevronRight className={`w-5 h-5 text-[var(--green)] flex-shrink-0 mt-0.5`} />
                    <span className="text-[var(--text-muted)]">
                      <strong>Upgrade the atmosphere:</strong> Rotating local art makes the venue feel fresh and memorable.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ChevronRight className={`w-5 h-5 text-[var(--green)] flex-shrink-0 mt-0.5`} />
                    <span className="text-[var(--text-muted)]">
                      <strong>No staff burden:</strong> Customers scan and buy on their phone—no checkout handling.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ChevronRight className={`w-5 h-5 text-[var(--green)] flex-shrink-0 mt-0.5`} />
                    <span className="text-[var(--text-muted)]">
                      <strong>No inventory risk:</strong> You don't buy art upfront; you simply host it.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ChevronRight className={`w-5 h-5 text-[var(--green)] flex-shrink-0 mt-0.5`} />
                    <span className="text-[var(--text-muted)]">
                      <strong>Automated payouts + reporting:</strong> We track orders and handle splits.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ChevronRight className={`w-5 h-5 text-[var(--green)] flex-shrink-0 mt-0.5`} />
                    <span className="text-[var(--text-muted)]">
                      <strong>Support local culture:</strong> Become known as a venue that elevates local artists.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ChevronRight className={`w-5 h-5 text-[var(--green)] flex-shrink-0 mt-0.5`} />
                    <span className="text-[var(--text-muted)]">
                      <strong>Flexible and easy:</strong> Rotate, curate, or feature artists without extra admin.
                    </span>
                  </li>
                </>
              )}
            </ul>

            {/* Without Artwalls Micro-section */}
            <div className="bg-[var(--surface-1)] rounded-lg p-6 border border-[var(--border)]">
              <h3 className={`font-semibold mb-3 ${
                isArtist ? 'text-[var(--blue)]' : 'text-[var(--green)]'
              }`}>
                {isArtist ? '💭 Without Artwalls…' : '💭 Without Artwalls…'}
              </h3>
              <p className="text-sm text-[var(--text-muted)] mb-2">
                {isArtist 
                  ? "Selling solo often means constant posting, DM follow-ups, and payment logistics."
                  : "Hosting art independently usually means coordinating artists, tracking pieces, handling payments, and disputes."}
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                {isArtist 
                  ? "Artwalls puts your work where attention already exists and handles checkout + tracking."
                  : "Artwalls streamlines the process so you can host and earn without added operational work."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Transparent Earnings Callout */}
      <section className="py-12 sm:py-16 px-4 bg-[var(--surface)]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8 text-[var(--text)]">
            📊 Transparent Earnings
          </h2>
          <div className="bg-[var(--surface-1)] rounded-lg border border-[var(--border)] p-6 sm:p-8">
            <div className="space-y-6">
              {/* Artist earnings table */}
              {isArtist && (
                <>
                  <div>
                    <h3 className="font-semibold text-lg mb-4 text-[var(--text)]">
                      Artist Take-Home by Plan
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center pb-3 border-b border-[var(--border)]">
                        <span className="font-medium text-[var(--text)]">Free</span>
                        <span className="text-[var(--blue)] font-bold">60% of artwork price</span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-[var(--border)]">
                        <span className="font-medium text-[var(--text)]">Starter ($9/mo)</span>
                        <span className="text-[var(--blue)] font-bold">80% of artwork price</span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-[var(--border)]">
                        <span className="font-medium text-[var(--text)]">Growth ($19/mo)</span>
                        <span className="text-[var(--blue)] font-bold">83% of artwork price</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-[var(--text)]">Pro ($39/mo)</span>
                        <span className="text-[var(--blue)] font-bold">85% of artwork price</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-6 border-t border-[var(--border)]">
                    <h3 className="font-semibold text-lg mb-3 text-[var(--text)]">
                      How It's Split
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Venue Commission</span>
                        <span className="font-medium text-[var(--text)]">15% of artwork price</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Buyer Support Fee</span>
                        <span className="font-medium text-[var(--text)]">4.5% added at checkout</span>
                      </div>
                      <div className="flex justify-between text-[var(--text-muted)]">
                        <span className="text-xs">Platform + Processing covers the remainder</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Venue earnings */}
              {!isArtist && (
                <>
                  <div>
                    <h3 className="font-semibold text-lg mb-4 text-[var(--text)]">
                      Venue Earnings
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center pb-3 border-b border-[var(--border)]">
                        <span className="font-medium text-[var(--text)]">Your Commission</span>
                        <span className="text-[var(--green)] font-bold">15% of artwork price</span>
                      </div>
                      <div className="text-sm text-[var(--text-muted)] mt-4">
                        Earned on every artwork sale hosted in your space, with no upfront cost.
                      </div>
                    </div>
                  </div>
                  <div className="pt-6 border-t border-[var(--border)]">
                    <h3 className="font-semibold text-lg mb-3 text-[var(--text)]">
                      How It's Split
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Artist Take-Home</span>
                        <span className="font-medium text-[var(--text)]">60–85% (by plan)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Buyer Support Fee</span>
                        <span className="font-medium text-[var(--text)]">4.5% added at checkout</span>
                      </div>
                      <div className="flex justify-between text-[var(--text-muted)]">
                        <span className="text-xs">Platform + Processing covers the remainder</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Have Questions Section */}
      <section className="py-12 sm:py-16 px-4 bg-[var(--surface)]">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-3 text-[var(--text)]">
            Have questions?
          </h2>
          <p className="text-center text-[var(--text-muted)] mb-8">
            Send us a message and our team will get back to you.
          </p>

          {contactSubmitted ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <p className="text-green-800 font-medium">
                ✅ Thanks! Your message has been sent.
              </p>
              <p className="text-sm text-green-700 mt-2">
                We usually respond within 1–2 business days.
              </p>
            </div>
          ) : (
            <form onSubmit={handleContactSubmit} className="bg-[var(--surface-1)] rounded-lg border border-[var(--border)] p-6 sm:p-8">
              {contactError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{contactError}</p>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--text)] mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)]"
                  placeholder="your@email.com"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--text)] mb-1">
                  I'm an…
                </label>
                <select
                  value={contactForm.role_context}
                  onChange={(e) => setContactForm({ ...contactForm, role_context: e.target.value as any })}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)]"
                >
                  <option value="artist">Artist</option>
                  <option value="venue">Venue</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-[var(--text)] mb-1">
                  Message *
                </label>
                <textarea
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)] resize-none"
                  placeholder="Tell us what's on your mind…"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Minimum 10 characters
                </p>
              </div>

              {/* Honeypot field - hidden from users */}
              <input
                type="text"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                style={{ display: 'none' }}
                tabIndex={-1}
                autoComplete="off"
              />

              <button
                type="submit"
                disabled={contactLoading}
                className="w-full px-6 py-3 rounded-lg font-semibold transition active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed bg-[var(--blue)] text-[var(--on-blue)] hover:brightness-95 flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                {contactLoading ? 'Sending…' : 'Send message'}
              </button>

              <p className="text-xs text-[var(--text-muted)] text-center mt-4">
                We usually respond within 1–2 business days.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-6 text-[var(--text)]">
            Ready to get started?
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => onNavigate ? onNavigate(isArtist ? 'artist-dashboard' : 'venue-dashboard') : null}
              className={`px-8 py-3 rounded-lg font-semibold transition active:scale-[0.98] inline-flex items-center justify-center gap-2 ${
                isArtist
                  ? 'bg-[var(--blue)] text-[var(--on-blue)] hover:brightness-95'
                  : 'bg-[var(--green)] text-[var(--accent-contrast)] hover:brightness-95'
              }`}
            >
              {isArtist ? '🎨 Continue as Artist' : '🏛️ Continue as Venue'}
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate ? onNavigate('plans-pricing') : null}
              className="px-8 py-3 rounded-lg font-semibold border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-1)] transition active:scale-[0.98]"
            >
              {isArtist ? 'See Plans' : 'Become a Venue Partner'}
            </button>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="mt-4 text-[var(--text-muted)] hover:text-[var(--text)] transition text-sm"
            >
              ← Back
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
