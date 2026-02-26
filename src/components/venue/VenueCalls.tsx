/**
 * VenueCalls — manage calls for art from the venue dashboard.
 *
 * Venues can create, view, pause/resume, and track applications.
 * A prefilled template lowers the barrier for the first call.
 */
import { useEffect, useState } from 'react';
import { Plus, Megaphone, Clock, CheckCircle, Pause, Eye, ChevronRight } from 'lucide-react';
import type { User } from '../../App';
import { supabase } from '../../lib/supabase';
import { PageHeroHeader } from '../PageHeroHeader';
import { trackAnalyticsEvent } from '../../lib/analytics';

interface CallForArt {
  id: string;
  title: string;
  description: string | null;
  status: string; // draft | open | paused | filled
  requirements?: string[];
  preferred_tags?: string[];
  submission_deadline: string | null;
  install_window_start: string | null;
  install_window_end: string | null;
  created_at: string;
}

interface VenueCallsProps {
  user: User;
  onViewCall: (callId: string) => void;
}

// ── Template for first call ─────────────────────────────────────────────────
const CALL_TEMPLATE = {
  title: 'Open Call: Art for Our Walls',
  description:
    'We\u2019re looking for local artists to display original work in our space. All mediums welcome. Art will be displayed for 30\u201390 days with full QR-based sales support.',
  requirements: [
    'Original work only',
    '2D wall-mountable',
    'Provide hanging hardware',
    'Available for local install',
  ],
};

export function VenueCalls({ user, onViewCall }: VenueCallsProps) {
  const [calls, setCalls] = useState<CallForArt[]>([]);
  const [appCounts, setAppCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState(CALL_TEMPLATE.title);
  const [description, setDescription] = useState(CALL_TEMPLATE.description);
  const [requirements, setRequirements] = useState<string[]>([...CALL_TEMPLATE.requirements]);
  const [deadline, setDeadline] = useState('');

  // ── Load existing calls ─────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const { data, error: err } = await supabase
          .from('calls_for_art')
          .select('id, title, description, status, preferred_tags, submission_deadline, install_window_start, install_window_end, created_at')
          .eq('venue_id', user.id)
          .order('created_at', { ascending: false });
        if (err) throw err;
        if (mounted && data) setCalls(data);

        // Fetch application counts per call
        if (data && data.length > 0) {
          const callIds = data.map((c) => c.id);
          const { data: apps } = await supabase
            .from('call_applications')
            .select('call_id')
            .in('call_id', callIds);
          if (mounted && apps) {
            const counts: Record<string, number> = {};
            apps.forEach((a) => { counts[a.call_id] = (counts[a.call_id] || 0) + 1; });
            setAppCounts(counts);
          }
        }
      } catch {
        if (mounted) setCalls([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [user.id]);

  // ── Create a new call ───────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('calls_for_art')
        .insert({
          venue_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          preferred_tags: requirements,
          submission_deadline: deadline || null,
          status: 'open',
        })
        .select()
        .single();
      if (err) throw err;

      setCalls((prev) => [data as CallForArt, ...prev]);
      setShowCreate(false);
      resetForm();

      // Track first-win measurement
      if (calls.length === 0) {
        const signupTs = localStorage.getItem(`artwalls_signup_ts_${user.id}`);
        const mins = signupTs ? Math.round((Date.now() - Number(signupTs)) / 60000) : undefined;
        trackAnalyticsEvent('first_call_published' as any, {
          callId: data.id,
          ...(mins !== undefined ? { minutesSinceSignup: mins } : {}),
        });
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to create call.');
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle pause / open ─────────────────────────────────────────────────
  const toggleStatus = async (call: CallForArt) => {
    const next = call.status === 'open' ? 'paused' : 'open';
    const { error: err } = await supabase
      .from('calls_for_art')
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq('id', call.id);
    if (!err) setCalls((prev) => prev.map((c) => (c.id === call.id ? { ...c, status: next } : c)));
  };

  const resetForm = () => {
    setTitle(CALL_TEMPLATE.title);
    setDescription(CALL_TEMPLATE.description);
    setRequirements([...CALL_TEMPLATE.requirements]);
    setDeadline('');
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
      open: { icon: CheckCircle, color: 'text-green-500', label: 'Open' },
      paused: { icon: Pause, color: 'text-yellow-500', label: 'Paused' },
      filled: { icon: Eye, color: 'text-blue-500', label: 'Filled' },
      draft: { icon: Clock, color: 'text-[var(--text-muted)]', label: 'Draft' },
    };
    const s = map[status] || map.draft;
    const Icon = s.icon;
    return (
      <span className={`inline-flex items-center gap-1 text-xs ${s.color}`}>
        <Icon className="w-3.5 h-3.5" /> {s.label}
      </span>
    );
  };

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <PageHeroHeader
        title="Calls for Art"
        subtitle="Create open calls so artists can submit work to your venue."
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--blue)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" /> New Call
          </button>
        }
      />

      {/* ── Create form ───────────────────────────────────────────────── */}
      {showCreate && (
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-6 mb-8">
          <h3 className="text-lg font-semibold mb-1">New Call for Art</h3>
          <p className="text-xs text-[var(--text-muted)] mb-5">
            We\u2019ve prefilled a template — edit to match your space.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)] resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Requirements</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {requirements.map((r, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-[var(--surface-3)] border border-[var(--border)] rounded-full text-xs"
                  >
                    {r}
                    <button
                      type="button"
                      onClick={() => setRequirements((prev) => prev.filter((_, j) => j !== i))}
                      className="text-[var(--text-muted)] hover:text-[var(--text)] ml-1"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="Type a requirement + Enter"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    e.preventDefault();
                    setRequirements((prev) => [...prev, e.currentTarget.value.trim()]);
                    e.currentTarget.value = '';
                  }
                }}
                className="w-full px-4 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Deadline (optional)</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-4 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)]"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCreate}
                disabled={saving || !title.trim()}
                className="px-5 py-2 bg-[var(--blue)] text-white rounded-lg font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {saving ? 'Publishing\u2026' : 'Publish Call'}
              </button>
              <button
                onClick={() => { setShowCreate(false); resetForm(); }}
                className="px-5 py-2 border border-[var(--border)] rounded-lg text-sm hover:bg-[var(--surface-2)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Calls list ────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--blue)]" />
        </div>
      ) : calls.length === 0 && !showCreate ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-[var(--surface-2)] border border-[var(--border)] rounded-full flex items-center justify-center mx-auto mb-4">
            <Megaphone className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No calls yet</h3>
          <p className="text-[var(--text-muted)] max-w-md mx-auto mb-6">
            Create your first call for art to start receiving applications from local artists.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--blue)] text-white rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" /> Post Your First Call
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {calls.map((call) => (
            <div
              key={call.id}
              className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--blue)] transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="text-base font-semibold text-[var(--text)] leading-snug">
                  {call.title}
                </h3>
                {statusBadge(call.status)}
              </div>
              {call.description && (
                <p className="text-sm text-[var(--text-muted)] line-clamp-2 mb-3">
                  {call.description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--text-muted)]">
                {call.submission_deadline && (
                  <span>Deadline: {new Date(call.submission_deadline).toLocaleDateString()}</span>
                )}
                <span>{appCounts[call.id] ?? 0} application{(appCounts[call.id] ?? 0) !== 1 ? 's' : ''}</span>
                <span>{new Date(call.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[var(--border)]">
                <button
                  onClick={() => onViewCall(call.id)}
                  className="text-xs font-medium text-[var(--blue)] hover:underline inline-flex items-center gap-1"
                >
                  View Applications <ChevronRight className="w-3 h-3" />
                </button>
                {(call.status === 'open' || call.status === 'paused') && (
                  <button
                    onClick={() => toggleStatus(call)}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                  >
                    {call.status === 'open' ? 'Pause' : 'Resume'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
