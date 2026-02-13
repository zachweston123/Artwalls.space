import { useEffect, useMemo, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { PageHeroHeader } from '../PageHeroHeader';

type ActivityLog = {
  id: string;
  timestamp: string;
  admin: string;
  action: string;
  target?: string | null;
  details?: string | null;
};

async function fetchActivity(): Promise<ActivityLog[]> {
  const res = await fetch('/api/admin/activity-log', { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`Failed to load activity (${res.status})`);
  }
  const data = await res.json();
  return (data?.activity || data || []).map((item: any) => ({
    id: String(item.id),
    timestamp: item.timestamp ?? item.created_at ?? '',
    admin: item.admin ?? item.adminEmail ?? 'admin',
    action: item.action ?? '',
    target: item.target ?? null,
    details: item.details ?? item.metadata ?? null,
  }));
}

export function AdminActivityLog() {
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await fetchActivity();
      setActivity(items);
    } catch (err: any) {
      setError(err?.message || 'Unable to load activity');
      setActivity([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(
    () => [...activity].sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [activity]
  );

  const getActionColor = (action: string) => {
    if (action.includes('Suspended')) {
      return 'text-[var(--danger)]';
    }
    if (action.includes('Created') || action.includes('Published')) {
      return 'text-[var(--green)]';
    }
    if (action.includes('Deactivated')) {
      return 'text-[var(--warning)]';
    }
    return 'text-[var(--blue)]';
  };

  return (
    <div className="bg-[var(--bg)]">
      <PageHeroHeader
        title="Activity Log"
        subtitle="Audit trail of all admin actions"
      />

      <div className="flex items-center gap-3 mb-4 text-sm text-[var(--text-muted)]">
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        {loading && <span>Loading activity…</span>}
        {error && <span className="text-[var(--danger)]">{error}</span>}
      </div>

      <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--surface-3)] border-b border-[var(--border)]">
              <tr>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Timestamp</th>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Admin User</th>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Action</th>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Target</th>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Details</th>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {rows.map((log) => (
                <tr key={log.id} className="hover:bg-[var(--surface-3)]">
                  <td className="px-6 py-4 text-sm text-[var(--text-muted)]">
                    {log.timestamp}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text)]">
                    {log.admin}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text)]">
                    {log.target || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-muted)]">
                    {log.details || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <button className="px-3 py-1 text-[var(--blue)] hover:text-[var(--blue-hover)] text-xs transition-colors">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-[var(--border)] flex items-center justify-between">
          <p className="text-sm text-[var(--text-muted)]">
            Showing {rows.length} entr{rows.length === 1 ? 'y' : 'ies'}
          </p>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-[var(--surface-3)] border border-[var(--border)] text-[var(--text)] rounded hover:bg-[var(--surface-2)] transition-colors text-sm" disabled>
              Previous
            </button>
            <button className="px-3 py-1 bg-[var(--surface-3)] border border-[var(--border)] text-[var(--text)] rounded text-sm" disabled>
              Next
            </button>
          </div>
        </div>
      </div>

      {!loading && rows.length === 0 && !error && (
        <div className="text-center py-16 bg-[var(--surface-2)] rounded-xl border border-[var(--border)]">
          <div className="w-16 h-16 bg-[var(--surface-3)] border border-[var(--border)] rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-xl mb-2 text-[var(--text)]">No activity yet</h3>
          <p className="text-[var(--text-muted)]">
            Admin actions will appear here
          </p>
        </div>
      )}
    </div>
  );
}
