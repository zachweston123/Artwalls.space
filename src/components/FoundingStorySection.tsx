/**
 * FoundingStorySection — Founding story + first-win CTAs for the homepage.
 *
 * Designed to sit on the public homepage (Login landing) between the role
 * selection cards and the "How It Works" section.  Fully responsive:
 *   • Mobile  → single-column, full-width stacked buttons
 *   • Desktop → readable prose width, side-by-side CTAs
 *
 * CTA behaviour:
 *   • Not logged in → stores intended destination in localStorage
 *     (`pendingRedirect`), then calls `onSelectRole` so the auth
 *     form appears.  After login, App.tsx reads `pendingRedirect`
 *     and navigates there.
 *   • Logged in (when embedded elsewhere) → calls `onNavigate` directly.
 */

import { Palette, Store } from 'lucide-react';

const PENDING_REDIRECT_KEY = 'pendingRedirect';

interface FoundingStorySectionProps {
  /** Set the role on the Login form (unauthenticated flow). */
  onSelectRole?: (role: 'artist' | 'venue') => void;
  /** Direct navigation (works for both auth states). */
  onNavigate?: (page: string) => void;
  /** Whether the viewer is currently authenticated. */
  isLoggedIn?: boolean;
  /** Current user role (when logged in). */
  userRole?: 'artist' | 'venue' | 'admin' | null;
}

export function FoundingStorySection({
  onSelectRole,
  onNavigate,
  isLoggedIn = false,
  userRole = null,
}: FoundingStorySectionProps) {

  const handleArtistCTA = () => {
    if (isLoggedIn) {
      // Logged-in artist → go directly to artworks (first win)
      // Logged-in venue → go to venue dashboard (can't add artwork)
      if (userRole === 'venue') {
        onNavigate?.('venue-dashboard');
      } else {
        onNavigate?.('artist-artworks');
      }
      return;
    }
    // Not logged in → store redirect, trigger artist signup
    localStorage.setItem(PENDING_REDIRECT_KEY, 'artist-artworks');
    onSelectRole?.('artist');
  };

  const handleVenueCTA = () => {
    if (isLoggedIn) {
      // Logged-in venue → go to calls (post a call)
      // Logged-in artist → go to artist dashboard
      if (userRole === 'artist') {
        onNavigate?.('artist-dashboard');
      } else {
        onNavigate?.('venue-calls');
      }
      return;
    }
    // Not logged in → store redirect, trigger venue signup
    localStorage.setItem(PENDING_REDIRECT_KEY, 'venue-calls');
    onSelectRole?.('venue');
  };

  return (
    <section
      className="py-16 md:py-20 lg:py-24"
      aria-labelledby="founding-story-heading"
    >
      <div className="max-w-2xl mx-auto px-6 md:px-8">
        {/* ── Story ──────────────────────────────────────────── */}
        <h2
          id="founding-story-heading"
          className="text-2xl md:text-3xl font-semibold text-[var(--text)] font-display tracking-tight leading-tight mb-6"
        >
          The Start of Artwalls.
        </h2>

        <div className="space-y-6 text-base md:text-lg text-[var(--text-muted)] leading-relaxed">
          <p>
            Before I left for university, I had my photography up on the wall
            there. It wasn't a big gallery moment, but it worked: people saw the
            work, asked about it, and sometimes bought it.
          </p>

          <p>
            When I came to San Diego for school, I tried to do it again. I was
            sitting in SDSU's library searching online, then calling local
            businesses one by one to ask if they display and sell local art.
          </p>

          <p>
            The biggest issue wasn't talent or interest, it was consistency.
            Between commission, timing, communication, and agreements, every
            venue was different, and artists were left guessing. Even when both
            sides wanted to make it happen, expectations were rarely the same,
            and the process got messy fast.
          </p>

          <p className="pt-2 md:pt-3 font-medium text-[var(--text)]">
            Artwalls exists to make this simple for both artists and
            venues&nbsp;— with clear expectations and an easy process from start
            to finish.
          </p>
        </div>

        {/* ── CTAs ───────────────────────────────────────────── */}
        <div className="mt-8 md:mt-10 mb-10 md:mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-2xl mx-auto">
            {/* Artist CTA */}
            <div className="flex flex-col items-center space-y-2">
              <button
                onClick={handleArtistCTA}
                className="w-full inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-[var(--blue)] text-[var(--on-blue)] font-medium hover:bg-[var(--blue-hover)] transition-colors text-sm whitespace-nowrap"
              >
                <Palette className="w-5 h-5 shrink-0" />
                Start your first placement
              </button>
              <p className="text-sm text-[var(--text-muted)] text-center leading-relaxed">
                Get seen in real spaces&nbsp;— start with one piece.
              </p>
            </div>

            {/* Venue CTA */}
            <div className="flex flex-col items-center space-y-2">
              <button
                onClick={handleVenueCTA}
                className="w-full inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-[var(--green)] text-[var(--accent-contrast)] font-medium hover:brightness-95 transition-colors text-sm whitespace-nowrap"
              >
                <Store className="w-5 h-5 shrink-0" />
                Post a call for art
              </button>
              <p className="text-sm text-[var(--text-muted)] text-center leading-relaxed">
                Free for venues. Low effort. High vibe.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
