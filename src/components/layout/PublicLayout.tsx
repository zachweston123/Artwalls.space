/**
 * PublicLayout — shared chrome for all unauthenticated / public pages.
 *
 * Renders:
 *   • Navigation (user = null) at top
 *   • A <main> content slot with subtle surface layering
 *   • Footer at bottom
 *
 * Improvements over ad-hoc wrappers:
 *   • Consistent header/footer across landing, /find, /find/:city, etc.
 *   • Subtle gradient background that works in both light and dark themes.
 *   • min-h-screen flex column so footer always sits at the bottom.
 *
 * @since P1 — public-ui-redesign
 */

import type { ReactNode } from 'react';
import { Navigation } from '../Navigation';
import { Footer } from '../Footer';

interface PublicLayoutProps {
  children: ReactNode;
  /** SPA navigate handler (passed to Nav + Footer). */
  onNavigate: (page: string) => void;
  /** Active page key for nav highlighting. */
  currentPage?: string;
  /** If true, omit the Footer (e.g. for full-bleed map pages). */
  hideFooter?: boolean;
  /** If true, omit the Navigation (e.g. page supplies its own). */
  hideNav?: boolean;
  /** Extra className on <main>. */
  className?: string;
}

export function PublicLayout({
  children,
  onNavigate,
  currentPage = 'login',
  hideFooter = false,
  hideNav = false,
  className = '',
}: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      {/* Subtle decorative gradient – works in both light and dark */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-[var(--blue)] opacity-[0.04] blur-[120px]" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-[var(--green)] opacity-[0.04] blur-[120px]" />
      </div>

      {/* Content is above the decorative layer */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {!hideNav && (
          <Navigation
            user={null}
            onNavigate={onNavigate}
            onLogout={() => {}}
            currentPage={currentPage}
          />
        )}

        <main id="main-content" className={`flex-1 ${className}`}>
          {children}
        </main>

        {!hideFooter && <Footer onNavigate={onNavigate} />}
      </div>
    </div>
  );
}
