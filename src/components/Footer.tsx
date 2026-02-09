import { useEffect, useState } from 'react';
import { Palette } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FooterProps {
  onNavigate: (page: string) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  const [userRole, setUserRole] = useState<'artist' | 'venue' | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const role = data.user?.user_metadata?.role as 'artist' | 'venue' | undefined;
      setUserRole(role || null);
    });
  }, []);

  const navigateToTop = (page: string) => {
    onNavigate(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[var(--surface-2)] border-t border-[var(--border)] mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-[var(--accent)] rounded-lg flex items-center justify-center">
                <Palette className="w-5 h-5 text-[var(--accent-contrast)]" />
              </div>
              <span className="text-lg text-[var(--text)]">Artwalls</span>
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              Connecting local artists with venues for rotating artwork displays and sales.
            </p>
          </div>

          {/* For Artists - Show only if artist is logged in */}
          {(!userRole || userRole === 'artist') && (
            <div>
              <h3 className="text-sm mb-3 text-[var(--text)]">For Artists</h3>
              <ul className="space-y-2 text-sm text-[var(--text-muted)]">
                <li>
                  <button onClick={() => navigateToTop('artist-venues')} className="hover:text-[var(--text)] transition-colors">
                    Browse Venues
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateToTop('artist-artworks')} className="hover:text-[var(--text)] transition-colors">
                    Manage Artwork
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateToTop('artist-sales')} className="hover:text-[var(--text)] transition-colors">
                    Track Sales
                  </button>
                </li>
              </ul>
            </div>
          )}

          {/* For Venues - Show only if venue is logged in */}
          {(!userRole || userRole === 'venue') && (
            <div>
              <h3 className="text-sm mb-3 text-[var(--text)]">For Venues</h3>
              <ul className="space-y-2 text-sm text-[var(--text-muted)]">
                <li>
                  <button onClick={() => navigateToTop('venue-walls')} className="hover:text-[var(--text)] transition-colors">
                    Wall Spaces
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateToTop('venue-applications')} className="hover:text-[var(--text)] transition-colors">
                    Review Applications
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateToTop('venue-current')} className="hover:text-[var(--text)] transition-colors">
                    Current Artwork
                  </button>
                </li>
              </ul>
            </div>
          )}

          {/* Learn */}
          <div>
            <h3 className="text-sm mb-3 text-[var(--text)]">Learn</h3>
            <ul className="space-y-2 text-sm text-[var(--text-muted)]">
              {(!userRole || userRole === 'artist') && (
                <li>
                  <button onClick={() => navigateToTop('why-artwalls-artist')} className="hover:text-[var(--text)] transition-colors">
                    {userRole ? 'Why Artwalls' : 'For Artists'}
                  </button>
                </li>
              )}
              {(!userRole || userRole === 'venue') && (
                <li>
                  <button onClick={() => navigateToTop('venues')} className="hover:text-[var(--text)] transition-colors">
                    {userRole ? 'Why Artwalls' : 'For Venues'}
                  </button>
                </li>
              )}
              {(!userRole || userRole === 'artist') && (
                <li>
                  <button onClick={() => navigateToTop('plans-pricing')} className="hover:text-[var(--text)] transition-colors">
                    Plans & Pricing
                  </button>
                </li>
              )}
              {!userRole && (
                <li>
                  <button onClick={() => navigateToTop('venues')} className="hover:text-[var(--text)] transition-colors">
                    Venues
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm mb-3 text-[var(--text)]">Legal & Support</h3>
            <ul className="space-y-2 text-sm text-[var(--text-muted)]">
              <li>
                <a
                  href="/policies"
                  onClick={(e) => { e.preventDefault(); navigateToTop('policies'); }}
                  className="hover:text-[var(--text)] transition-colors"
                >
                  Policies & Agreements
                </a>
              </li>
              <li>
                <a
                  href="/artist-agreement"
                  onClick={(e) => { e.preventDefault(); navigateToTop('artist-agreement'); }}
                  className="hover:text-[var(--text)] transition-colors"
                >
                  Artist Agreement
                </a>
              </li>
              <li>
                <a
                  href="/venue-agreement"
                  onClick={(e) => { e.preventDefault(); navigateToTop('venue-agreement'); }}
                  className="hover:text-[var(--text)] transition-colors"
                >
                  Venue Agreement
                </a>
              </li>
              <li>
                <a href="mailto:support@artwalls.space" className="hover:text-[var(--text)] transition-colors">
                  Contact Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[var(--border)] mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-[var(--text-muted)]">
            © 2026 Artwalls. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-[var(--text-muted)]">
            <a
              href="/privacy-policy"
              onClick={(e) => { e.preventDefault(); navigateToTop('privacy-policy'); }}
              className="hover:text-[var(--text)] transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="/terms-of-service"
              onClick={(e) => { e.preventDefault(); navigateToTop('terms-of-service'); }}
              className="hover:text-[var(--text)] transition-colors"
            >
              Terms of Service
            </a>
            <a href="mailto:legal@artwalls.space" className="hover:text-[var(--text)] transition-colors">
              Legal
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}