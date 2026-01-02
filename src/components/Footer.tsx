import { Palette } from 'lucide-react';

interface FooterProps {
  onNavigate: (page: string) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center">
                <Palette className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg text-neutral-900 dark:text-neutral-50">Artwalls</span>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Connecting local artists with venues for rotating artwork displays and sales.
            </p>
          </div>

          {/* For Artists */}
          <div>
            <h3 className="text-sm mb-3 text-neutral-900 dark:text-neutral-50">For Artists</h3>
            <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
              <li>
                <button onClick={() => onNavigate('artist-venues')} className="hover:text-neutral-900 dark:hover:text-neutral-50 transition-colors">
                  Browse Venues
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('artist-artworks')} className="hover:text-neutral-900 dark:hover:text-neutral-50 transition-colors">
                  Manage Artwork
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('artist-sales')} className="hover:text-neutral-900 dark:hover:text-neutral-50 transition-colors">
                  Track Sales
                </button>
              </li>
            </ul>
          </div>

          {/* For Venues */}
          <div>
            <h3 className="text-sm mb-3 text-neutral-900 dark:text-neutral-50">For Venues</h3>
            <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
              <li>
                <button onClick={() => onNavigate('venue-walls')} className="hover:text-neutral-900 transition-colors">
                  Wall Spaces
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('venue-applications')} className="hover:text-neutral-900 transition-colors">
                  Review Applications
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('venue-current')} className="hover:text-neutral-900 transition-colors">
                  Current Artwork
                </button>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm mb-3">Legal & Support</h3>
            <ul className="space-y-2 text-sm text-neutral-600">
              <li>
                <button onClick={() => onNavigate('policies')} className="hover:text-neutral-900 transition-colors">
                  Policies & Agreements
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('artist-agreement')} className="hover:text-neutral-900 transition-colors">
                  Artist Agreement
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('venue-agreement')} className="hover:text-neutral-900 transition-colors">
                  Venue Agreement
                </button>
              </li>
              <li>
                <a href="mailto:support@artwalls.com" className="hover:text-neutral-900 transition-colors">
                  Contact Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-neutral-200 mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-neutral-600">
            © 2024 Artwalls. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-neutral-600">
            <button onClick={() => onNavigate('policies')} className="hover:text-neutral-900 transition-colors">
              Privacy
            </button>
            <button onClick={() => onNavigate('policies')} className="hover:text-neutral-900 transition-colors">
              Terms
            </button>
            <a href="mailto:legal@artwalls.com" className="hover:text-neutral-900 transition-colors">
              Legal
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}