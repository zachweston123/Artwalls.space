import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, ExternalLink, Loader2, ShieldCheck, Sparkles, Users, Waypoints } from 'lucide-react';
import type { User } from '../App';
import { apiGet } from '../lib/api';
import { supabase } from '../lib/supabase';
import { formatRatioOrCount } from '../utils/format';

interface VenueSetupChecklistProps {
  user: User;
  stats?: {
    walls?: { total?: number; occupied?: number; available?: number };
    applications?: { pending?: number };
  };
  onNavigate?: (page: string) => void;
  hasAcceptedAgreement?: boolean | null;
}

interface SetupStatus {
  agreementAccepted: boolean;
  payoutsEnabled: boolean;
  hasWall: boolean;
  profileComplete: boolean;
  engagedWithArtists: boolean;
}

export function VenueSetupChecklist({ user, stats, onNavigate, hasAcceptedAgreement }: VenueSetupChecklistProps) {
  const [status, setStatus] = useState<SetupStatus>({
    agreementAccepted: !!hasAcceptedAgreement,
    payoutsEnabled: false,
    hasWall: false,
    profileComplete: false,
    engagedWithArtists: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!user?.id) return;
      setLoading(true);

      try {
        const [profileResp, payoutsResp] = await Promise.all([
          supabase
            .from('venues')
            .select('agreement_accepted_at, cover_photo_url, bio, name, email')
            .eq('id', user.id)
            .single(),
          apiGet<{ hasAccount?: boolean; payoutsEnabled?: boolean }>(
            `/api/stripe/connect/venue/status?userId=${encodeURIComponent(user.id)}`
          ).catch(() => ({ hasAccount: false, payoutsEnabled: false })),
        ]);

        const wallTotal = stats?.walls?.total ?? 0;
        const wallAvailable = stats?.walls?.available ?? 0;
        const occupiedWalls = Math.max(0, wallTotal - wallAvailable);
        const pendingApplications = stats?.applications?.pending ?? 0;

        const profile = profileResp?.data;
        const hasPhoto = !!profile?.cover_photo_url;
        const hasBio = !!profile?.bio?.trim();
        const hasName = !!profile?.name?.trim();
        const hasContact = !!(profile?.email || user.email);

        const nextStatus: SetupStatus = {
          agreementAccepted: !!hasAcceptedAgreement || !!profile?.agreement_accepted_at,
          payoutsEnabled: !!payoutsResp?.payoutsEnabled,
          hasWall: wallTotal > 0,
          profileComplete: Boolean(hasPhoto && hasBio && hasName && hasContact),
          engagedWithArtists: pendingApplications > 0 || occupiedWalls > 0,
        };

        if (mounted) setStatus(nextStatus);
      } catch (err) {
        console.warn('Failed to load venue setup status', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [user.id, user.email, stats?.walls?.total, stats?.walls?.available, stats?.applications?.pending, hasAcceptedAgreement]);

  const steps = useMemo(
    () => [
      {
        id: 'agreement',
        label: 'Accept venue agreement',
        description: 'Required to enable bookings and payouts.',
        completed: status.agreementAccepted,
        action: () => onNavigate?.('venue-agreement'),
        icon: <ShieldCheck className="w-4 h-4" />,
      },
      {
        id: 'payouts',
        label: 'Enable Stripe payouts',
        description: 'Connect Stripe to receive your 15% commission.',
        completed: status.payoutsEnabled,
        action: () => onNavigate?.('venue-sales'),
        icon: <ExternalLink className="w-4 h-4" />,
      },
      {
        id: 'walls',
        label: 'Add at least 1 wall space',
        description: 'Share dimensions and photos for artists to apply.',
        completed: status.hasWall,
        action: () => onNavigate?.('venue-walls'),
        icon: <Waypoints className="w-4 h-4" />,
      },
      {
        id: 'profile',
        label: 'Complete venue profile',
        description: 'Name, story, contact email, and a cover photo.',
        completed: status.profileComplete,
        action: () => onNavigate?.('venue-profile'),
        icon: <Sparkles className="w-4 h-4" />,
      },
      {
        id: 'artists',
        label: 'Find or invite artists',
        description: 'Approve an application or invite artists to apply.',
        completed: status.engagedWithArtists,
        action: () => onNavigate?.('venue-find-artists'),
        icon: <Users className="w-4 h-4" />,
      },
    ],
    [onNavigate, status.agreementAccepted, status.payoutsEnabled, status.hasWall, status.profileComplete, status.engagedWithArtists]
  );

  const completedCount = steps.filter((step) => step.completed).length;
  const totalSteps = steps.length;

  if (!loading && completedCount === totalSteps) {
    return (
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-[var(--green)]" />
          <div>
            <p className="text-sm text-[var(--text-muted)]">Venue setup checklist</p>
            <p className="text-base font-semibold text-[var(--text)]">Setup complete</p>
            <p className="text-sm text-[var(--text-muted)]">You're discoverable and ready for placements.</p>
          </div>
        </div>
        <div className="text-sm text-[var(--text-muted)]">
          {formatRatioOrCount(completedCount, totalSteps)} done
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-5 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Setup guidance</p>
          <h2 className="text-xl font-semibold text-[var(--text)]">Venue setup checklist</h2>
          <p className="text-sm text-[var(--text-muted)]">Complete these steps to unlock discovery and payouts.</p>
        </div>
        <div className="px-3 py-1 rounded-full text-xs bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-muted)]">
          {formatRatioOrCount(completedCount, totalSteps, { zeroLabel: '0/5 complete' })}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`flex items-start gap-3 p-3 rounded-lg border ${
              step.completed ? 'border-[var(--border)] bg-[var(--green-muted)]/60' : 'border-[var(--border)] bg-[var(--surface-2)]'
            }`}
          >
            <div className="mt-1">
              {step.completed ? (
                <CheckCircle2 className="w-5 h-5 text-[var(--green)]" aria-hidden />
              ) : (
                <Circle className="w-5 h-5 text-[var(--text-muted)]" aria-hidden />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[var(--text)]">{step.label}</span>
                {step.icon}
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">{step.description}</p>
            </div>
            {!step.completed && (
              <button
                type="button"
                onClick={step.action}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] hover:bg-[var(--surface-3)]"
              >
                Continue
              </button>
            )}
          </div>
        ))}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-3">
          <Loader2 className="w-4 h-4 animate-spin" />
          Updating checklist...
        </div>
      )}
    </div>
  );
}
