/**
 * VenueRequests — venue-facing "Waitlist & Requests" page.
 *
 * Lists all applications and waitlist entries for a venue,
 * with approve / reject / invite-to-apply actions.
 */
import { useEffect, useState } from 'react';
import { ArrowLeft, Clock, CheckCircle, XCircle, Send, Users, Loader2, Filter } from 'lucide-react';
import { apiGet, apiPatch } from '../../lib/api';
import { STATUS_LABELS, STATUS_COLORS, VENUE_TRANSITIONS } from '../../lib/venueRequests';
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
  artists?: { name?: string; subscription_tier?: string } | null;
}

interface VenueRequestsProps {
  user: User;
  onNavigate: NavigateFn;
}

export function VenueRequests({ user, onNavigate }: VenueRequestsProps) {
  const [requests, setRequests] = useState<VenueRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'application' | 'waitlist'>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'all'>('active');

  const venueId = user.id;

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const resp = await apiGet<{ requests: VenueRequest[] }>(`/api/venues/${venueId}/requests`);
      setRequests(resp?.requests || []);
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(requestId: string, newStatus: string) {
    setActionId(requestId);
    try {
      await apiPatch(`/api/venues/${venueId}/requests/${requestId}`, { status: newStatus });
      await loadData();
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setActionId(null);
    }
  }

  const terminalStatuses = new Set(['rejected', 'withdrawn', 'removed', 'approved', 'converted_to_application']);

  const filtered = requests.filter(r => {
    if (typeFilter !== 'all' && r.request_type !== typeFilter) return false;
    if (statusFilter === 'active' && terminalStatuses.has(r.status)) return false;
    return true;
  });

  const waitlistCount = requests.filter(r => r.request_type === 'waitlist' && !terminalStatuses.has(r.status)).length;
  const appCount = requests.filter(r => r.request_type === 'application' && !terminalStatuses.has(r.status)).length;

  const statusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-[var(--green)]" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-[var(--red)]" />;
      case 'submitted': return <Send className="w-4 h-4 text-[var(--blue)]" />;
      case 'waitlisted': return <Users className="w-4 h-4 text-[var(--yellow)]" />;
      case 'invited_to_apply': return <CheckCircle className="w-4 h-4 text-[var(--blue)]" />;
      default: return <Clock className="w-4 h-4 text-[var(--text-muted)]" />;
    }
  };

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => onNavigate('venue-dashboard')}
          className="p-2 hover:bg-[var(--surface-2)] rounded-lg transition-colors"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Requests & Waitlist</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Manage artist applications and your waitlist
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-4">
          <p className="text-2xl font-bold text-[var(--blue)]">{appCount}</p>
          <p className="text-sm text-[var(--text-muted)]">Pending applications</p>
        </div>
        <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-4">
          <p className="text-2xl font-bold text-[var(--yellow)]">{waitlistCount}</p>
          <p className="text-sm text-[var(--text-muted)]">On waitlist</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        <div className="flex gap-1 bg-[var(--surface-1)] rounded-lg border border-[var(--border)] p-1">
          {(['all', 'application', 'waitlist'] as const).map(f => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                typeFilter === f
                  ? 'bg-[var(--blue)] text-[var(--on-blue)]'
                  : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)]'
              }`}
            >
              {f === 'all' ? 'All Types' : f === 'application' ? 'Applications' : 'Waitlist'}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-[var(--surface-1)] rounded-lg border border-[var(--border)] p-1">
          {(['active', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                statusFilter === f
                  ? 'bg-[var(--blue)] text-[var(--on-blue)]'
                  : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)]'
              }`}
            >
              {f === 'active' ? 'Active Only' : 'All Statuses'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-muted)] mt-2">Loading requests…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-[var(--surface-1)] rounded-xl border border-[var(--border)]">
          <Users className="w-10 h-10 mx-auto text-[var(--text-muted)] mb-3" />
          <h3 className="text-lg font-semibold mb-1">
            {requests.length === 0 ? 'No requests yet' : 'No matching requests'}
          </h3>
          <p className="text-sm text-[var(--text-muted)]">
            {requests.length === 0
              ? 'When artists apply or join your waitlist, they\'ll appear here.'
              : 'Try adjusting your filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => {
            const artistName = (req.artists as any)?.name || 'Unknown Artist';
            const artistTier = (req.artists as any)?.subscription_tier || 'free';
            const allowedTransitions = VENUE_TRANSITIONS[req.status] || [];
            const isProcessing = actionId === req.id;

            return (
              <div key={req.id} className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{artistName}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--text-muted)] capitalize">
                        {artistTier}
                      </span>
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
                      <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-2">"{req.message}"</p>
                    )}

                    <p className="text-xs text-[var(--text-muted)]">
                      {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>

                  {/* Action buttons */}
                  {allowedTransitions.length > 0 && (
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {allowedTransitions.includes('approved') && (
                        <button
                          onClick={() => handleAction(req.id, 'approved')}
                          disabled={isProcessing}
                          className="px-3 py-1.5 text-xs font-semibold bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Approve'}
                        </button>
                      )}
                      {allowedTransitions.includes('invited_to_apply') && (
                        <button
                          onClick={() => handleAction(req.id, 'invited_to_apply')}
                          disabled={isProcessing}
                          className="px-3 py-1.5 text-xs font-semibold bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors disabled:opacity-50"
                        >
                          {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Invite to Apply'}
                        </button>
                      )}
                      {allowedTransitions.includes('rejected') && (
                        <button
                          onClick={() => handleAction(req.id, 'rejected')}
                          disabled={isProcessing}
                          className="px-3 py-1.5 text-xs font-medium bg-[var(--surface-2)] text-[var(--red)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-3)] transition-colors disabled:opacity-50"
                        >
                          {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Reject'}
                        </button>
                      )}
                      {allowedTransitions.includes('removed') && (
                        <button
                          onClick={() => handleAction(req.id, 'removed')}
                          disabled={isProcessing}
                          className="px-3 py-1.5 text-xs font-medium bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-3)] transition-colors disabled:opacity-50"
                        >
                          {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Remove'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
