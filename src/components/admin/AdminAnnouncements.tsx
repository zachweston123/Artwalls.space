import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Eye, Megaphone, X, Loader2 } from 'lucide-react';
import { apiGet, apiPost, apiDelete } from '../../lib/api';
import { toast } from 'sonner';

/* ── Types ─────────────────────────────────────────────────────── */
interface Announcement {
  id: string;
  title: string;
  body: string | null;
  audience: 'all' | 'artists' | 'venues';
  type: 'info' | 'success' | 'warning' | 'critical';
  status: 'active' | 'scheduled' | 'expired' | 'archived';
  start_date: string | null;
  end_date: string | null;
  created_by: string | null;
  created_at: string;
}

/* ── Component ─────────────────────────────────────────────────── */
export function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Announcement | null>(null);
  const [mode, setMode] = useState<'view' | 'delete' | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  /* ── Form state ─────────────────────────────────────────────── */
  const [formTitle, setFormTitle] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formType, setFormType] = useState<Announcement['type']>('info');
  const [formAudience, setFormAudience] = useState<Announcement['audience']>('all');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');

  /* ── Fetch announcements ────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ announcements: Announcement[] }>('/api/admin/announcements');
      setAnnouncements(res.announcements ?? []);
    } catch (err) {
      console.error('[AdminAnnouncements] load failed:', err);
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Create ─────────────────────────────────────────────────── */
  const handleCreate = async () => {
    if (!formTitle.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      await apiPost('/api/admin/announcements', {
        title: formTitle.trim(),
        body: formBody.trim() || null,
        type: formType,
        audience: formAudience,
        status: formStartDate && new Date(formStartDate) > new Date() ? 'scheduled' : 'active',
        start_date: formStartDate || null,
        end_date: formEndDate || null,
      });
      toast.success('Announcement created');
      resetForm();
      setShowCreate(false);
      load();
    } catch (err) {
      console.error('[AdminAnnouncements] create failed:', err);
      toast.error('Failed to create announcement');
    } finally {
      setSaving(false);
    }
  };

  /* ── Archive (soft-delete) ──────────────────────────────────── */
  const handleArchive = async (id: string) => {
    try {
      await apiDelete(`/api/admin/announcements/${id}`);
      toast.success('Announcement archived');
      setSelected(null);
      setMode(null);
      load();
    } catch (err) {
      console.error('[AdminAnnouncements] archive failed:', err);
      toast.error('Failed to archive announcement');
    }
  };

  const resetForm = () => {
    setFormTitle(''); setFormBody(''); setFormType('info');
    setFormAudience('all'); setFormStartDate(''); setFormEndDate('');
  };

  /* ── Helpers ────────────────────────────────────────────────── */
  const getAudienceColor = (audience: string) => {
    switch (audience) {
      case 'artists': return 'bg-[var(--surface-3)] text-[var(--blue)] border border-[var(--border)]';
      case 'venues': return 'bg-[var(--surface-3)] text-[var(--green)] border border-[var(--border)]';
      default: return 'bg-[var(--surface-3)] text-[var(--text-muted)] border border-[var(--border)]';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-[var(--green-muted)] text-[var(--green)] border border-[var(--border)]';
      case 'scheduled': return 'bg-[var(--surface-3)] text-[var(--warning)] border border-[var(--border)]';
      case 'expired': case 'archived': return 'bg-[var(--surface-3)] text-[var(--text-muted)] border border-[var(--border)]';
      default: return 'bg-[var(--surface-3)] text-[var(--text-muted)] border border-[var(--border)]';
    }
  };

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString() : '—';

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl mb-2 text-[var(--text)]">Announcements</h1>
          <p className="text-[var(--text-muted)]">
            Manage global and role-targeted announcements
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowCreate(true); }}
          className="flex items-center gap-2 px-6 py-3 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Announcement
        </button>
      </div>

      {/* ── Loading spinner ──────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--text-muted)]" />
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────── */}
      {!loading && announcements.length > 0 && (
        <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--surface-3)] border-b border-[var(--border)]">
                <tr>
                  <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Title</th>
                  <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Audience</th>
                  <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Type</th>
                  <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Status</th>
                  <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Start</th>
                  <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">End</th>
                  <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {announcements.map((a) => (
                  <tr key={a.id} className="hover:bg-[var(--surface-3)] transition-colors">
                    <td className="px-6 py-4 text-sm text-[var(--text)]">{a.title}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${getAudienceColor(a.audience)}`}>
                        {a.audience}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text-muted)]">{a.type}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(a.status)}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text-muted)]">{fmtDate(a.start_date)}</td>
                    <td className="px-6 py-4 text-sm text-[var(--text-muted)]">{fmtDate(a.end_date)}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button className="p-1 text-[var(--text-muted)] hover:text-[var(--text)]" title="View" onClick={() => { setSelected(a); setMode('view'); }}>
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-[var(--danger)] hover:brightness-90" title="Archive" onClick={() => { setSelected(a); setMode('delete'); }}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────── */}
      {!loading && announcements.length === 0 && (
        <div className="text-center py-16 bg-[var(--surface-2)] rounded-xl border border-[var(--border)]">
          <div className="w-16 h-16 bg-[var(--surface-3)] border border-[var(--border)] rounded-full flex items-center justify-center mx-auto mb-4">
            <Megaphone className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-xl mb-2 text-[var(--text)]">No announcements yet</h3>
          <p className="text-[var(--text-muted)] mb-6">
            Create your first announcement to communicate with users
          </p>
          <button
            onClick={() => { resetForm(); setShowCreate(true); }}
            className="px-6 py-2 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors"
          >
            Create Announcement
          </button>
        </div>
      )}

      {/* ═══════ Create modal ═══════ */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text)] rounded-2xl p-6 max-w-lg w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Create Announcement</h3>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-[var(--surface-2)] rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-1">Title *</label>
                <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="e.g. Scheduled maintenance tonight" className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface-2)] text-[var(--text)]" />
              </div>
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-1">Body</label>
                <textarea value={formBody} onChange={e => setFormBody(e.target.value)} rows={3} placeholder="Optional details…" className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface-2)] text-[var(--text)] resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[var(--text-muted)] mb-1">Type</label>
                  <select value={formType} onChange={e => setFormType(e.target.value as Announcement['type'])} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface-2)] text-[var(--text)]">
                    <option value="info">Info</option>
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-muted)] mb-1">Audience</label>
                  <select value={formAudience} onChange={e => setFormAudience(e.target.value as Announcement['audience'])} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface-2)] text-[var(--text)]">
                    <option value="all">Everyone</option>
                    <option value="artists">Artists only</option>
                    <option value="venues">Venues only</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[var(--text-muted)] mb-1">Start date</label>
                  <input type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface-2)] text-[var(--text)]" />
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-muted)] mb-1">End date</label>
                  <input type="date" value={formEndDate} onChange={e => setFormEndDate(e.target.value)} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface-2)] text-[var(--text)]" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 bg-[var(--surface-2)] rounded-lg hover:bg-[var(--surface-3)] transition-colors">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="flex-1 px-4 py-2 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Creating…' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ View / Delete modal ═══════ */}
      {selected && mode && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text)] rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">{mode === 'view' ? 'View Announcement' : 'Archive Announcement'}</h3>
              <button onClick={() => { setSelected(null); setMode(null); }} className="p-2 hover:bg-[var(--surface-2)] rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            {mode === 'view' && (
              <div className="space-y-2 text-sm">
                <div><strong>Title:</strong> {selected.title}</div>
                {selected.body && <div><strong>Body:</strong> {selected.body}</div>}
                <div><strong>Audience:</strong> {selected.audience}</div>
                <div><strong>Type:</strong> {selected.type}</div>
                <div><strong>Status:</strong> {selected.status}</div>
                <div><strong>Start:</strong> {fmtDate(selected.start_date)}</div>
                <div><strong>End:</strong> {fmtDate(selected.end_date)}</div>
                <div><strong>Created:</strong> {new Date(selected.created_at).toLocaleString()}</div>
              </div>
            )}
            {mode === 'delete' && (
              <div className="space-y-4">
                <p className="text-[var(--text-muted)]">Archive &quot;{selected.title}&quot;? It will no longer be visible to users.</p>
                <div className="flex gap-3">
                  <button onClick={() => { setSelected(null); setMode(null); }} className="flex-1 px-4 py-2 bg-[var(--surface-2)] rounded-lg">Cancel</button>
                  <button onClick={() => handleArchive(selected.id)} className="flex-1 px-4 py-2 bg-[var(--danger)] text-white rounded-lg">Archive</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
