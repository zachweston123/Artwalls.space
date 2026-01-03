import { Palette } from 'lucide-react';

interface FooterProps {
  onNavigate: (page: string) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="bg-[var(--surface-2)] border-t border-[var(--border)] mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
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

          {/* For Artists */}
          <div>
            <h3 className="text-sm mb-3 text-[var(--text)]">For Artists</h3>
            <ul className="space-y-2 text-sm text-[var(--text-muted)]">
              <li>
                <button onClick={() => onNavigate('artist-venues')} className="hover:text-[var(--text)] transition-colors">
                  Browse Venues
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('artist-artworks')} className="hover:text-[var(--text)] transition-colors">
                  Manage Artwork
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('artist-sales')} className="hover:text-[var(--text)] transition-colors">
                  Track Sales
                </button>
              </li>
            </ul>
          </div>

          {/* For Venues */}
          <div>
            <h3 className="text-sm mb-3 text-[var(--text)]">For Venues</h3>
            <ul className="space-y-2 text-sm text-[var(--text-muted)]">
              <li>
                <button onClick={() => onNavigate('venue-walls')} className="hover:text-[var(--text)] transition-colors">
                  Wall Spaces
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('venue-applications')} className="hover:text-[var(--text)] transition-colors">
                  Review Applications
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('venue-current')} className="hover:text-[var(--text)] transition-colors">
                  Current Artwork
                </button>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm mb-3 text-[var(--text)]">Legal & Support</h3>
            <ul className="space-y-2 text-sm text-[var(--text-muted)]">
              <li>
                <button onClick={() => onNavigate('policies')} className="hover:text-[var(--text)] transition-colors">
                  Policies & Agreements
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('artist-agreement')} className="hover:text-[var(--text)] transition-colors">
                  Artist Agreement
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('venue-agreement')} className="hover:text-[var(--text)] transition-colors">
                  Venue Agreement
                </button>
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
            <button onClick={() => onNavigate('policies')} className="hover:text-[var(--text)] transition-colors">
              Privacy
            </button>
            <button onClick={() => onNavigate('policies')} className="hover:text-[var(--text)] transition-colors">
              Terms
            </button>
            <a href="mailto:legal@artwalls.space" className="hover:text-[var(--text)] transition-colors">
              Legal
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}