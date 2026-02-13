import { useEffect, useState } from 'react';
import { apiGet } from '../../lib/api';
import { CheckCircle, Clock, Gift, Mail } from 'lucide-react';
import { PageHeroHeader } from '../PageHeroHeader';

interface Referral {
  id: string;
  venue_name: string;
  venue_email: string;
  status: string;
  created_at: string;
}

const statusLabel = (status: string) => {
  switch (status) {
    case 'opened':
      return { label: 'Opened', icon: Mail };
    case 'venue_signed_up':
      return { label: 'Signed up', icon: CheckCircle };
    case 'qualified':
      return { label: 'Qualified', icon: Gift };
    case 'reward_granted':
      return { label: 'Reward granted', icon: Gift };
    case 'sent':
    default:
      return { label: 'Sent', icon: Mail };
  }
};

export function ArtistReferrals() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const resp = await apiGet<{ referrals: Referral[] }>('/api/referrals');
        if (mounted) setReferrals(resp.referrals || []);
      } catch {
        if (mounted) setReferrals([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeroHeader
        title="Your Referrals"
        subtitle="Track invite status and rewards."
      />

      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6">
        {loading ? (
          <div className="text-center text-[var(--text-muted)]">Loading referrals...</div>
        ) : referrals.length === 0 ? (
          <div className="text-center text-[var(--text-muted)]">No invites yet.</div>
        ) : (
          <div className="space-y-3">
            {referrals.map((ref) => {
              const status = statusLabel(ref.status);
              const StatusIcon = status.icon;
              return (
                <div key={ref.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-4">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text)]">{ref.venue_name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{ref.venue_email}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">Sent {new Date(ref.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-[var(--surface-3)] text-[var(--text)]">
                    <StatusIcon className="w-3.5 h-3.5" />
                    {status.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="text-xs text-[var(--text-muted)] flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Status updates automatically when a venue creates their first wall or call.
      </div>
    </div>
  );
}
