/**
 * ArtistRequests — artist-facing "My Requests" page.
 *
 * Lists all venue applications and waitlist entries the artist
 * has submitted, with withdraw / remove actions and quota display.
 */
import { useEffect, useState } from 'react';
import { ArrowLeft, Clock, CheckCircle, XCircle, Send, Users, AlertCircle, Loader2 } from 'lucide-react';
import { apiGet, apiPatch } from '../../lib/api';
import { STATUS_LABELS, STATUS_COLORS, ARTIST_TRANSITIONS } from '../../lib/venueRequests';
import type { NavigateFn, User } from '../../types/app';

interface VenueRequest {
  id: string;
  artist_id: string;
  venue_id: string;
  request_type: 'application' | 'waitlist';
  status: string;
  message: string | null;
  artwork_id: string | null;
  created_at: string;
  updated_at: string;
  venues?: { name?: string; city?: string; cover_photo_url?: string } | null;
}

interface Quota {
  tier: string;
  limit: number | null;
  used: number;
  remaining: number | null;
}

interface ArtistRequestsProps {
  user: User;
  onNavigate: NavigateFn;
}

export function ArtistRequests({ user, onNavigate }: ArtistRequestsProps) {
  const [requests, setRequests] = useState<VenueRequest[]>([]);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'application' | 'waitlist'>('all');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [reqResp, quotaResp] = await Promise.all([
        apiGet<{ requests: VenueRequest[] }>('/api/me/requests'),
        apiGet<Quota>('/api/me/requests/quota'),
      ]);
      setRequests(reqResp?.requests || []);
      if (quotaResp) setQuota(quotaResp);
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(requestId: string, venueId: string, newStatus: string) {
    setActionId(requestId);
    try {
      await apiPatch(`/api/venues/${venueId}/requests/${requestId}`, { status: newStatus });
      // Refresh
      await loadData();
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setActionId(null);
    }
  }

  const filtered = filter === 'all'
    ? requests
    : requests.filter(r => r.request_type === filter);

  const active = filtered.filter(r => !['rejected', 'withdrawn', 'removed', 'approved', 'converted_to_application'].includes(r.status));
  const past = filtered.filter(r => ['rejected', 'withdrawn', 'removed', 'approved', 'converted_to_application'].includes(r.status));

  const statusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-[var(--green)]" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-[var(--red)]" />;
      case 'submitted': return <Send className="w-4 h-4 text-[var(--blue)]" />;
      case 'waitlisted': return <Users className="w-4 h-4 text-[var(--yellow)]" />;
      case 'invited_to_apply': return <CheckCircle className="w-4 h-4 text-[var(--blue)]" />;
      case 'withdrawn': case 'removed': return <XCircle className="w-4 h-4 text-[var(--text-muted)]" />;
      default: return <Clock className="w-4 h-4 text-[var(--text-muted)]" />;
    }
  };

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => onNavigate('artist-dashboard')}
          className="p-2 hover:bg-[var(--surface-2)] rounded-lg transition-colors"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">My Requests</h1>
          <p className="text-sm text-[var(--text-muted)]">Track your venue applications and waitlist entries</p>
        </div>
      </div>

      {/* Quota Bar */}
      {quota && (
        <div className="mb-6 p-4 bg-[var(--surface-1)] rounded-xl border border-[var(--border)] flex items-center gap-3">
          <Clock className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0" />
          <div className="flex-1">
            {quota.limit !== null ? (
              <p className="text-sm text-[var(--text)]">
                <span className="font-semibold">{quota.used}</span> of{' '}
                <span className="font-semibold">{quota.limit}</span> monthly requests used
                {quota.remaining !== null && quota.remaining > 0 && (
                  <span className="text-[var(--text-muted)]"> · {quota.remaining} remaining</span>
                )}
              </p>
            ) : (
              <p className="text-sm text-[var(--text)]">
                Unlimited requests on your <span className="font-semibold capitalize">{quota.tier}</span> plan
              </p>
            )}
          </div>
          {quota.remaining !== null && quota.remaining <= 0 && (
            <span className="px-3 py-1 text-xs font-semibold bg-[var(--red-muted)] text-[var(--red)] rounded-full">
              Limit reached
            </span>
          )}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2">
        {(['all', 'application', 'waitlist'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-[var(--blue)] text-[var(--on-blue)]'
                : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-[var(--surface-3)]'
            }`}
          >
            {f === 'all' ? 'All' : f === 'application' ? 'Applications' : 'Waitlist'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-muted)] mt-2">Loading requests…</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 bg-[var(--surface-1)] rounded-xl border border-[var(--border)]">
          <Send className="w-10 h-10 mx-auto text-[var(--text-muted)] mb-3" />
          <h3 className="text-lg font-semibold mb-1">No requests yet</h3>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Browse venues and submit applications or join waitlists.
          </p>
          <button
            onClick={() => onNavigate('artist-venues')}
            className="px-4 py-2 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors text-sm font-semibold"
          >
            Find Venues
          </button>
        </div>
      ) : (
        <>
          {/* Active Requests */}
          {active.length > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold mb-3">Active ({active.length})</h2>
              <div className="space-y-3">
                {active.map(req => (
                  <RequestCard
                    key={req.id}
                    req={req}
                    statusIcon={statusIcon}
                    actionId={actionId}
                    onAction={handleAction}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Past Requests */}
          {past.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 text-[var(--text-muted)]">Past ({past.length})</h2>
              <div className="space-y-3">
                {past.map(req => (
                  <RequestCard
                    key={req.id}
                    req={req}
                    statusIcon={statusIcon}
                    actionId={actionId}
                    onAction={handleAction}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

/* ── Request Card ──────────────────────────────────────────────────────── */

function RequestCard({
  req,
  statusIcon,
  actionId,
  onAction,
}: {
  req: VenueRequest;
  statusIcon: (s: string) => React.ReactNode;
  actionId: string | null;
  onAction: (id: string, venueId: string, status: string) => void;
}) {
  const venueName = (req.venues as any)?.name || 'Unknown Venue';
  const venueCity = (req.venues as any)?.city || '';
  const allowedTransitions = ARTIST_TRANSITIONS[req.status] || [];
  const isProcessing = actionId === req.id;

  return (
    <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold truncate">{venueName}</h3>
            {venueCity && (
              <span className="text-xs text-[var(--text-muted)] flex-shrink-0">· {venueCity}</span>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm mb-2">
            {statusIcon(req.status)}
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[req.status as keyof typeof STATUS_COLORS] || 'bg-[var(--surface-2)] text-[var(--text-muted)]'}`}>
              {STATUS_LABELS[req.status as keyof typeof STATUS_LABELS] || req.status}
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              {req.request_type === 'waitlist' ? 'Waitlist' : 'Application'}
            </span>
          </div>

          {req.message && (
            <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-2">{req.message}</p>
          )}

          <p className="text-xs text-[var(--text-muted)]">
            {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {/* Action buttons */}
        {allowedTransitions.length > 0 && (
          <div className="flex gap-2 flex-shrink-0">
            {allowedTransitions.includes('withdrawn') && (
              <button
                onClick={() => onAction(req.id, req.venue_id, 'withdrawn')}
                disabled={isProcessing}
                className="px-3 py-1.5 text-xs font-medium bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-3)] transition-colors disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Withdraw'}
              </button>
            )}
            {allowedTransitions.includes('removed') && (
              <button
                onClick={() => onAction(req.id, req.venue_id, 'removed')}
                disabled={isProcessing}
                className="px-3 py-1.5 text-xs font-medium bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-3)] transition-colors disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Leave Waitlist'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
