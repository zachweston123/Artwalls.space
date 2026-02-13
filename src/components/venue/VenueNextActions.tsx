import { Frame, Users, CreditCard, FileText } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { ActionTile } from '../ui/action-tile';

/**
 * VenueNextActions — prioritised next-step tiles for the venue dashboard.
 * Mirrors the artist ActionCenter pattern for visual consistency.
 */

interface VenueNextActionsProps {
  hasWalls: boolean;
  pendingApplications: number;
  payoutsConnected: boolean | null;
  onNavigate: (page: string) => void;
}

interface ActionItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  cta: string;
  page: string;
  progress?: string;
}

export function VenueNextActions({
  hasWalls,
  pendingApplications,
  payoutsConnected,
  onNavigate,
}: VenueNextActionsProps) {
  const items: ActionItem[] = [];

  if (!hasWalls) {
    items.push({
      id: 'add-wall',
      icon: <Frame className="w-4 h-4" />,
      title: 'Add a wall space',
      description: 'Artists need wall spaces to apply. Add your first one to get started.',
      cta: 'Add wall space',
      page: 'venue-walls',
    });
  }

  if (pendingApplications > 0) {
    items.push({
      id: 'review-apps',
      icon: <FileText className="w-4 h-4" />,
      title: 'Review applications',
      description: `You have ${pendingApplications} application${pendingApplications === 1 ? '' : 's'} waiting for review.`,
      cta: 'Review now',
      page: 'venue-applications',
      progress: `${pendingApplications} pending`,
    });
  }

  if (payoutsConnected === false) {
    items.push({
      id: 'connect-payouts',
      icon: <CreditCard className="w-4 h-4" />,
      title: 'Connect payouts',
      description: 'Set up Stripe to receive your commission share from artwork sales.',
      cta: 'Set up payouts',
      page: 'venue-sales',
    });
  }

  // Always offer "Find Artists"
  items.push({
    id: 'find-artists',
    icon: <Users className="w-4 h-4" />,
    title: 'Find artists',
    description: 'Discover local artists or invite ones you know.',
    cta: 'Browse artists',
    page: 'venue-find-artists',
  });

  const visible = items.slice(0, 4);

  return (
    <Card className="bg-[var(--surface-2)] border-[var(--border)]">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-[var(--text)]">Next Actions</CardTitle>
        <CardDescription className="text-sm text-[var(--text-muted)]">
          Recommended next steps for your venue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {visible.map((item) => (
            <ActionTile
              key={item.id}
              item={{ ...item, onAction: () => onNavigate(item.page) }}
              accent="green"
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
