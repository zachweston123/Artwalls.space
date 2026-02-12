import { Image, MapPin, Mail } from 'lucide-react';

/**
 * QuickActions — compact shortcut card for the dashboard right column.
 *
 * Provides one-click access to the most common artist workflows:
 * upload artwork, find venues, invite a venue.
 * Uses existing routes only — no new backend work.
 */

interface QuickActionsProps {
  onNavigate: (page: string) => void;
}

const actions = [
  { label: 'Upload artwork', icon: Image, page: 'artist-artworks' },
  { label: 'Find venues', icon: MapPin, page: 'artist-venues' },
  { label: 'Invite a venue', icon: Mail, page: 'artist-venues' },
] as const;

export function QuickActions({ onNavigate }: QuickActionsProps) {
  return (
    <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl">
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-base font-semibold text-[var(--text)]">Quick Actions</h2>
      </div>
      <div className="px-5 pb-5 space-y-2">
        {actions.map(({ label, icon: Icon, page }) => (
          <button
            key={label}
            onClick={() => onNavigate(page)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text)] bg-[var(--surface-1)] border border-[var(--border)] hover:bg-[var(--surface-3)] transition-colors text-left"
          >
            <Icon className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
