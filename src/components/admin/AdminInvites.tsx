import { Mail, Search, Filter, TrendingUp, Users, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiGet } from '../../lib/api';

export function AdminInvites() {
  const [searchQuery, setSearchQuery] = useState('');
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await apiGet<{ rangeDays: number; totals: any; byDay: any[]; topArtists: any[] }>(
          '/api/admin/venue-invites/summary?days=30'
        );
        if (mounted) setSummary(data);
      } catch {
        if (mounted) setSummary(null);
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text)]">Pending Invitations</h1>
      </div>

      <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Created', value: summary?.totals?.created ?? 0, icon: Mail },
            { label: 'Sent', value: summary?.totals?.sent ?? 0, icon: TrendingUp },
            { label: 'Accepted', value: summary?.totals?.accepted ?? 0, icon: CheckCircle },
          ].map((stat) => (
            <div key={stat.label} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-4 flex items-center gap-3">
              <stat.icon className="w-5 h-5 text-[var(--text-muted)]" />
              <div>
                <p className="text-xs text-[var(--text-muted)]">{stat.label}</p>
                <p className="text-lg font-semibold text-[var(--text)]">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {summary?.byDay?.length ? (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-[var(--text)] mb-3">Invites by day (last 7)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {summary.byDay.slice(-7).map((day: any) => (
                <div key={day.date} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-3">
                  <p className="text-xs text-[var(--text-muted)]">{day.date}</p>
                  <div className="text-xs text-[var(--text)] mt-1">
                    Created: {day.created} · Sent: {day.sent} · Accepted: {day.accepted}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search invitations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)]"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors">
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-[var(--text-muted)]">Loading invite analytics...</div>
        ) : summary?.topArtists?.length ? (
          <div>
            <h2 className="text-lg font-semibold text-[var(--text)] mb-4">Top artists by conversions</h2>
            <div className="space-y-3">
              {summary.topArtists
                .filter((a: any) => !searchQuery || a.artistName.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((artist: any) => (
                  <div key={artist.artistId} className="flex items-center justify-between bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-[var(--text-muted)]" />
                      <div>
                        <p className="text-sm font-semibold text-[var(--text)]">{artist.artistName}</p>
                        <p className="text-xs text-[var(--text-muted)]">{artist.created} invites · {artist.accepted} accepted</p>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-[var(--surface-3)] text-[var(--text-muted)]">
                      {artist.conversionRate}% conversion
                    </span>
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-[var(--surface-2)] rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-[var(--text-muted)]" />
            </div>
            <p className="text-[var(--text-muted)]">No venue invite data yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
