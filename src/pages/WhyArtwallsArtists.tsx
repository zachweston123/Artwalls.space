import { SEO } from '../components/SEO';

interface WhyArtwallsArtistsPageProps {
  onNavigate?: (page: string) => void;
  viewerRole?: 'artist' | 'venue' | null;
}

export function WhyArtwallsArtistsPage({ onNavigate, viewerRole = null }: WhyArtwallsArtistsPageProps) {
  const isSignedIn = !!viewerRole;
  const showSignupCta = !isSignedIn;
  const showArtistActions = viewerRole === 'artist';
  const planHighlights = [
    {
      name: 'Free',
      price: 'Free',
      subtitle: 'You take home 60%',
      features: [
        '1 active display, 1 artwork',
        'Basic QR code generation',
        'Weekly payouts',
      ],
    },
    {
      name: 'Starter',
      price: '$9/mo',
      subtitle: 'You take home 80%',
      features: [
        '4 active displays, up to 10 artworks',
        'Basic sales analytics',
        'Up to 3 venue applications / month',
        'Priority support',
      ],
    },
    {
      name: 'Growth',
      price: '$19/mo',
      subtitle: 'You take home 83%',
      tag: 'Most Popular',
      features: [
        '10 active displays, up to 30 artworks',
        'Advanced analytics',
        'Unlimited venue applications',
        'Priority visibility boost in search',
      ],
    },
    {
      name: 'Pro',
      price: '$39/mo',
      subtitle: 'You take home 85%',
      features: [
        'Unlimited displays + unlimited artworks',
        'Advanced analytics',
        'Unlimited applications',
        'Top priority visibility in search',
        'Featured artist eligibility',
        'Damage protection included (highest coverage)',
      ],
    },
  ];

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <SEO
        title="Artwalls for Artists — Display & Sell Your Art Locally"
        description="Artwalls helps artists get placed in local cafés, restaurants, and venues. Upload your portfolio, apply to wall spaces, and sell artwork via QR codes."
        ogTitle="Artwalls for Artists — Show & Sell Local Art"
        ogDescription="Get your art on real walls in local venues. Build a portfolio, apply for wall space, and sell directly to buyers via QR codes."
        ogUrl="https://artwalls.space/why-artwalls"
        canonical="https://artwalls.space/why-artwalls"
      />

      {/* Hero */}
      <section className="py-12 sm:py-20 px-4 border-b border-[var(--border)]">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-[var(--text)]">
            Get your art on real walls — without all the hassle.
          </h1>
          <p className="text-lg sm:text-xl text-[var(--text-muted)] mb-8 max-w-3xl mx-auto">
            Artwalls helps you get placed in local venues, track everything, and actually sell — with an easy QR code + artwork page process.
          </p>
          {(showSignupCta || showArtistActions) && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {showSignupCta && (
                <button
                  onClick={() => onNavigate?.('login')}
                  className="px-6 py-3 rounded-lg bg-[var(--blue)] text-[var(--on-blue)] font-semibold hover:brightness-95 transition"
                >
                  Create Artist Account
                </button>
              )}
              <button
                onClick={() => onNavigate?.(showArtistActions ? 'artist-dashboard' : 'plans-pricing')}
                className={
                  showArtistActions
                    ? 'px-6 py-3 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-2)] transition'
                    : 'px-6 py-3 rounded-lg border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-2)] transition'
                }
              >
                {showArtistActions ? 'Go to Dashboard' : 'View Plans'}
              </button>
              {showArtistActions && (
                <button
                  onClick={() => onNavigate?.('artist-venues')}
                  className="px-6 py-3 rounded-lg border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-2)] transition"
                >
                  Find Venues
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Doing it solo problem */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-[var(--text)]">The problem with doing it solo</h2>
            <ul className="list-disc pl-6 space-y-3 text-[var(--text-muted)]">
              <li>awkward walk-ins + DMs + “email my manager”</li>
              <li>no way to track who you talked to / when to follow up</li>
              <li>messy pricing + labels + “how do people buy this?”</li>
              <li>starting from scratch every time you want a new wall</li>
            </ul>
          </div>
        </div>
      </section>

      {/* What Artwalls does */}
      <section className="py-12 sm:py-16 px-4 bg-[var(--surface)] border-y border-[var(--border)]">
        <div className="max-w-5xl mx-auto">
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-3 text-[var(--text)]">What Artwalls does for you</h2>
            <p className="text-[var(--text-muted)] mb-6">Artwalls is the system behind your venue placements.</p>
            <ul className="list-disc pl-6 space-y-3 text-[var(--text-muted)]">
              <li>Venue discovery + applications (so you’re not guessing who’s open to art)</li>
              <li>Simple display tracking (know exactly where each piece is, for how long, and when it rotates)</li>
              <li>QR labels that actually convert (visitors scan, see the artwork's page, and can easily inquire or buy on the spot)</li>
              <li>Built-in payouts (so getting paid doesn't turn into a Venmo frenzy)</li>
              <li>Analytics (see what’s getting scanned and selling on higher tiers)</li>
              <li>Optional damage protection (peace of mind when work is on public walls)</li>
            </ul>
            <p className="text-xs text-[var(--text-muted)] mt-4">“Display” = an active venue placement / wall spot you’re using.</p>
          </div>
        </div>
      </section>

      {/* Why subscribers win */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold mb-3 text-[var(--text)]">Why subscribers win (real talk)</h2>
          <p className="text-[var(--text-muted)] mb-8">
            If you're actively trying to grow, the paid tiers are basically: more wall spots, more artworks, more chances to get placed, and you keep more from each sale.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {planHighlights.map((plan) => (
              <div
                key={plan.name}
                className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6 flex flex-col gap-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-[var(--text)]">{plan.name}</h3>
                    <p className="text-sm text-[var(--text-muted)]">{plan.subtitle}</p>
                  </div>
                  {plan.tag && (
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-[var(--blue-muted)] text-[var(--blue)] border border-[var(--blue)]">
                      {plan.tag}
                    </span>
                  )}
                </div>
                <div className="text-2xl font-bold text-[var(--text)]">{plan.price}</div>
                <ul className="space-y-2 text-sm text-[var(--text-muted)]">
                  {plan.features.map((feature) => (
                    <li key={feature}>• {feature}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Optional damage protection */}
      <section className="py-12 sm:py-16 px-4 bg-[var(--surface)] border-y border-[var(--border)]">
        <div className="max-w-5xl mx-auto">
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-3 text-[var(--text)]">Optional damage protection</h2>
            <p className="text-[var(--text-muted)]">
              If you’re placing physical art in public spaces, protection helps you sleep. Coverage scales with your plan — for example, up to $100 per claim on Free & Starter, $150 on Growth, and $200 on Pro.
            </p>
          </div>
        </div>
      </section>

      {/* Quick comparison */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold mb-8 text-[var(--text)]">Quick comparison</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-3 text-[var(--text)]">Without Artwalls:</h3>
              <p className="text-[var(--text-muted)]">
                You’re manually pitching, tracking, labeling, selling, and following up — every time.
              </p>
            </div>
            <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-3 text-[var(--text)]">With Artwalls:</h3>
              <p className="text-[var(--text-muted)]">
                You have a profile + artworks + QR codes + payouts + a placement system + venue pipeline — and you scale way faster.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust block */}
      <section className="py-10 px-4 border-t border-[var(--border)]">
        <div className="max-w-5xl mx-auto text-center text-sm text-[var(--text-muted)] space-y-2">
          <p>Built by SDSU students.</p>
          <p>2% of profits donated to an environmental cause.</p>
        </div>
      </section>
    </div>
  );
}
