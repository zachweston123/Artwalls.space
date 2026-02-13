import { ShieldAlert, ArrowRight, Palette, Store } from 'lucide-react';

interface RoleMismatchPageProps {
  /** The user's actual role */
  currentRole: 'artist' | 'venue';
  /** The role required to access the attempted page */
  requiredRole: 'artist' | 'venue';
  /** Navigate back to the correct dashboard */
  onNavigate: (page: string) => void;
}

/**
 * Friendly "you're in the wrong place" page that replaces harsh
 * "Access denied" screens. Explains the mismatch and provides a
 * one-click route back to the user's dashboard.
 */
export function RoleMismatchPage({ currentRole, requiredRole, onNavigate }: RoleMismatchPageProps) {
  const dashboardPage = currentRole === 'artist' ? 'artist-dashboard' : 'venue-dashboard';
  const dashboardLabel = currentRole === 'artist' ? 'Artist Dashboard' : 'Venue Dashboard';

  const roleLabel = (r: string) => (r === 'artist' ? 'artists' : 'venues');
  const RoleIcon = requiredRole === 'artist' ? Palette : Store;

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--surface-2)] flex items-center justify-center">
          <ShieldAlert className="w-8 h-8 text-[var(--text-muted)]" />
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-[var(--text)] mb-3">
          This page is for {roleLabel(requiredRole)}
        </h1>

        {/* Explanation */}
        <p className="text-[var(--text-muted)] mb-2">
          You're signed in as{' '}
          <span className="font-medium text-[var(--text)] capitalize">{currentRole === 'artist' ? 'an artist' : 'a venue'}</span>,
          but this page is only available to{' '}
          <span className="inline-flex items-center gap-1 font-medium text-[var(--text)]">
            <RoleIcon className="w-4 h-4" />
            {roleLabel(requiredRole)}
          </span>.
        </p>
        <p className="text-sm text-[var(--text-muted)] mb-8">
          No worries — head back to your dashboard to continue.
        </p>

        {/* CTA */}
        <button
          onClick={() => onNavigate(dashboardPage)}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--blue)] text-[var(--on-blue)] hover:bg-[var(--blue-hover)] font-medium text-sm transition-colors"
        >
          Go to {dashboardLabel}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
