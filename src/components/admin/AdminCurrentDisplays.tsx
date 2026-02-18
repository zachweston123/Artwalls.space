import { Frame, Search, Filter, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { apiGet } from '../../lib/api';
import { PageHeroHeader } from '../PageHeroHeader';

interface Display {
  id: string;
  name: string;
  current_artwork_id: string | null;
  venue_id: string;
  venue?: { id: string; name?: string | null; city?: string | null } | null;
  updated_at?: string;
}

export function AdminCurrentDisplays() {
  const [searchQuery, setSearchQuery] = useState('');
  const [displays, setDisplays] = useState<Display[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const resp = await apiGet<{ displays: Display[] }>('/api/admin/current-displays');
      setDisplays(resp.displays || []);
    } catch {
      setDisplays([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = displays.filter(d => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (d.name || '').toLowerCase().includes(q) ||
      (d.venue?.name || '').toLowerCase().includes(q) ||
      (d.venue?.city || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeroHeader
        title="Active Displays"
        subtitle="Monitor artwork currently on display across venues."
      />

      <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search active displays..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)]"
            />
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 px-4 py-2 border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-[var(--text-muted)]">Loading displays...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-[var(--surface-2)] rounded-full flex items-center justify-center mx-auto mb-4">
              <Frame className="w-8 h-8 text-[var(--text-muted)]" />
            </div>
            <p className="text-[var(--text-muted)]">No active displays found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-3 px-2 text-[var(--text-muted)] font-medium">Wallspace</th>
                  <th className="text-left py-3 px-2 text-[var(--text-muted)] font-medium">Venue</th>
                  <th className="text-left py-3 px-2 text-[var(--text-muted)] font-medium">City</th>
                  <th className="text-left py-3 px-2 text-[var(--text-muted)] font-medium">Artwork ID</th>
                  <th className="text-left py-3 px-2 text-[var(--text-muted)] font-medium">Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]">
                    <td className="py-3 px-2 text-[var(--text)]">{d.name || 'Unnamed'}</td>
                    <td className="py-3 px-2 text-[var(--text)]">{d.venue?.name || '-'}</td>
                    <td className="py-3 px-2 text-[var(--text-muted)]">{d.venue?.city || '-'}</td>
                    <td className="py-3 px-2 text-[var(--text-muted)] font-mono text-xs">{d.current_artwork_id?.substring(0, 8) || '-'}</td>
                    <td className="py-3 px-2 text-[var(--text-muted)]">{d.updated_at ? new Date(d.updated_at).toLocaleDateString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
