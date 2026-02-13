import { Frame, Users, CreditCard, FileText, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';

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
            <button
              key={item.id}
              onClick={() => onNavigate(item.page)}
              className="relative bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-5 text-left flex flex-col min-h-[148px] transition-all duration-200 hover:border-[var(--green)]/60 hover:ring-2 hover:ring-[var(--green)]/25 hover:bg-[var(--surface-3)]/50 hover:shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 shrink-0 rounded-lg bg-[var(--surface-3)] flex items-center justify-center text-[var(--text-muted)]">
                  {item.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--text)] leading-snug truncate">{item.title}</p>
                    {item.progress && (
                      <span className="text-xs text-[var(--text-muted)] tabular-nums whitespace-nowrap">{item.progress}</span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed mt-1 line-clamp-2">{item.description}</p>
                </div>
              </div>
              <div className="mt-auto pt-3">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--green)]">
                  {item.cta}
                  <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
