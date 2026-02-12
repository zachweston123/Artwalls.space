import { Image, MapPin, Mail } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';

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
    <Card className="bg-[var(--surface-2)] border-[var(--border)]">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-[var(--text)]">
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5">
          {actions.map(({ label, icon: Icon, page }) => (
            <button
              key={label}
              onClick={() => onNavigate(page)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-[var(--text)] bg-[var(--surface-1)] border border-[var(--border)] hover:border-[var(--blue)]/60 hover:bg-[var(--surface-3)] hover:ring-2 hover:ring-[var(--blue)]/25 hover:shadow-sm transition-all duration-200 text-left"
            >
              <Icon className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
