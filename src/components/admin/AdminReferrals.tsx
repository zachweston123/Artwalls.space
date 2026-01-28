import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../../lib/api';
import { Gift, RefreshCw } from 'lucide-react';

interface ReferralRow {
  id: string;
  venue_name: string | null;
  venue_email: string | null;
  status: string;
  created_at: string;
  artist?: { id: string; name?: string | null; email?: string | null; pro_until?: string | null } | null;
  venue?: { id: string; name?: string | null; email?: string | null } | null;
}

const statusLabel = (status: string) => {
  switch (status) {
    case 'opened':
      return 'Opened';
    case 'venue_signed_up':
      return 'Signed up';
    case 'qualified':
      return 'Qualified';
    case 'reward_granted':
      return 'Reward granted';
    case 'invalid':
      return 'Invalid';
    case 'sent':
    default:
      return 'Sent';
  }
};

const getVenueName = (ref: ReferralRow) => 
  ref.venue?.name || ref.venue_name || 'Unknown venue';

const getVenueEmail = (ref: ReferralRow) => 
  ref.venue?.email || ref.venue_email || '';

export function AdminReferrals() {
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [grantingId, setGrantingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await apiGet<{ referrals: ReferralRow[] }>('/api/admin/referrals');
      setReferrals(resp.referrals || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load referrals');
      setReferrals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleGrant = async (referralId: string) => {
    setGrantingId(referralId);
    setError(null);
    try {
      await apiPost('/api/admin/referrals/grant', { referralId });
      await load();
    } catch (err: any) {
      setError(err?.message || 'Failed to grant reward');
    } finally {
      setGrantingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Referrals</h1>
          <p className="text-sm text-[var(--text-muted)]">Review qualified referrals and grant rewards.</p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-[var(--surface-2)] border border-[var(--border)] text-[var(--danger)] px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6">
        {loading ? (
          <div className="text-center text-[var(--text-muted)]">Loading referrals...</div>
        ) : referrals.length === 0 ? (
          <div className="text-center text-[var(--text-muted)]">No referrals yet.</div>
        ) : (
          <div className="space-y-3">
            {referrals.map((ref) => {
              const canGrant = ref.status === 'qualified';
              return (
                <div key={ref.id} className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[var(--text)]">{getVenueName(ref)}</p>
                    <p className="text-xs text-[var(--text-muted)]">{getVenueEmail(ref)}</p>
                    <p className="text-xs text-[var(--text-muted)]">Artist: {ref.artist?.name || ref.artist?.email || 'Unknown'}</p>
                    <p className="text-xs text-[var(--text-muted)]">Status: {statusLabel(ref.status)}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <span className="text-xs text-[var(--text-muted)]">Created {new Date(ref.created_at).toLocaleDateString()}</span>
                    <button
                      type="button"
                      disabled={!canGrant || grantingId === ref.id}
                      onClick={() => handleGrant(ref.id)}
                      className="inline-flex items-center gap-2 px-3 py-2 text-xs rounded-lg border border-[var(--border)] text-[var(--text)] disabled:opacity-50"
                    >
                      <Gift className="w-4 h-4" />
                      {grantingId === ref.id ? 'Granting...' : 'Grant reward'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
