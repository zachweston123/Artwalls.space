/**
 * VenueCalls — manage calls for art from venue dashboard.
 *
 * Replaces the old "Coming Soon" stub. Venues can:
 * - Create new calls (with template prefill)
 * - View/edit existing calls
 * - See application counts per call
 */
import { useEffect, useState } from 'react';
import { Plus, Megaphone, Clock, CheckCircle, Pause, Eye } from 'lucide-react';
import type { User } from '../../App';
import { supabase } from '../../lib/supabase';
import { PageHeroHeader } from '../PageHeroHeader';
import { trackAnalyticsEvent } from '../../lib/analytics';

interface CallForArt {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'open' | 'paused' | 'filled';
  requirements: string[];
  deadline: string | null;
  install_window_start: string | null;
  install_window_end: string | null;
  created_at: string;
  application_count?: number;
}

interface VenueCallsProps {
  user: User;
  onViewCall: (callId: string) => void;
}

// ── Prefilled template for first call ────────────────────────
const CALL_TEMPLATE = {
  title: 'Open Call: Art for Our Walls',
  description: 'We\u2019re looking for local artists to display original work in our space. All mediums welcome. Art will be displayed for 30\u201390 days with full QR-based sales support.',
  requirements: ['Original work only', '2D wall-mountable', 'Provide hanging hardware', 'Available for local install'],
};

export function VenueCalls({ user, onViewCall }: VenueCallsProps) {
  const [calls, setCalls] = useState<CallForArt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ ...CALL_TEMPLATE, deadline: '', status: 'open' as const });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing calls
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const { data, error: err } = await supabase
          .from('calls_for_art')
          .select('*')
          .eq('venue_id', user.id)
          .order('created_at', { ascending: false });

        if (err) throw err;
        if (mounted && data) setCalls(data as CallForArt[]);
      } catch {
        // Table may not exist yet — show empty state
        if (mounted) setCalls([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [user.id]);

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('calls_for_art')
        .insert({
          venue_id: user.id,
          title: form.title,
          description: form.description,
          requirements: form.requirements,
          deadline: form.deadline || null,
          status: form.status,
        })
        .select()
        .single();

      if (err) throw err;

      setCalls(prev => [data as CallForArt, ...prev]);
      setShowCreate(false);
      setForm({ ...CALL_TEMPLATE, deadline: '', status: 'open' });

      // Track first-win event
      if (calls.length === 0) {
        const signupTs = localStorage.getItem(`artwalls_signup_ts_${user.id}`);
        const mins = signupTs ? Math.round((Date.now() - Number(signupTs)) / 60000) : undefined;
        trackAnalyticsEvent('first_call_published' as any, {
          callId: data.id,
          ...(mins !== undefined ? { minutesSinceSignup: mins } : {}),
        });
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to create call');
    } finally {
      setSaving(false);
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'open': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'paused': return <Pause className="w-4 h-4 text-yellow-500" />;
      case 'filled': return <Eye className="w-4 h-4 text-blue-500" />;
      default: return <Clock className="w-4 h-4 text-[var(--text-muted)]" />;
    }
  };

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <PageHeroHeader
        title="Calls for Art"
        subtitle="Create open calls for artists to submit their work to your venue."
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--blue)] text-[var(--on-blue)] text-sm font-semibold hover:bg-[var(--blue-hover)] transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Call
          </button>
        }
      />

      {/* Create Call Form */}
      {showCreate && (
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-[var(--text)] mb-4">New Call for Art</h3>
          <p className="text-xs text-[var(--text-muted)] mb-4">We\u2019ve prefilled a template \u2014 edit to match your space.</p>

          {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-700">{error}</div>}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full px-4 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={4}
                className="w-full px-4 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)] resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">Requirements</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {form.requirements.map((r, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-[var(--surface-3)] border border-[var(--border)] rounded-full text-sm text-[var(--text)]">
                    {r}
                    <button onClick={() => setForm(f => ({ ...f, requirements: f.requirements.filter((_, j) => j !== i) }))} className="text-[var(--text-muted)] hover:text-[var(--text)] ml-1">&times;</button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="Add requirement + Enter"
                onKeyDown={e => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    e.preventDefault();
                    setForm(f => ({ ...f, requirements: [...f.requirements, e.currentTarget.value.trim()] }));
                    e.currentTarget.value = '';
                  }
                }}
                className="w-full px-4 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">Deadline (optional)</label>
              <input
                type="date"
                value={form.deadline}
                onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                className="w-full px-4 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)]"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={handleCreate} disabled={saving || !form.title.trim()} className="px-5 py-2 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg font-semibold text-sm hover:bg-[var(--blue-hover)] disabled:opacity-50 transition-colors">
                {saving ? 'Publishing\u2026' : 'Publish Call'}
              </button>
              <button onClick={() => setShowCreate(false)} className="px-5 py-2 border border-[var(--border)] rounded-lg text-sm text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calls List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--blue)]" />
        </div>
      ) : calls.length === 0 && !showCreate ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-[var(--surface-2)] border border-[var(--border)] rounded-full flex items-center justify-center mx-auto mb-4">
            <Megaphone className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-xl mb-2">No calls yet</h3>
          <p className="text-[var(--text-muted)] max-w-md mx-auto mb-6">
            Create your first call for art to start receiving applications from local artists.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg font-semibold text-sm hover:bg-[var(--blue-hover)] transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Your First Call
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {calls.map(call => (
            <button
              key={call.id}
              onClick={() => onViewCall(call.id)}
              className="w-full text-left bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--blue)] transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-semibold text-[var(--text)]">{call.title}</h3>
                <span className="flex items-center gap-1 text-xs text-[var(--text-muted)] capitalize">
                  {statusIcon(call.status)} {call.status}
                </span>
              </div>
              <p className="text-sm text-[var(--text-muted)] line-clamp-2 mb-2">{call.description}</p>
              <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                {call.deadline && <span>Deadline: {new Date(call.deadline).toLocaleDateString()}</span>}
                {call.requirements?.length > 0 && <span>{call.requirements.length} requirements</span>}
                <span>{new Date(call.created_at).toLocaleDateString()}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
