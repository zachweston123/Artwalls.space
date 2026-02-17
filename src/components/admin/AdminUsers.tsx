import { useEffect, useState } from 'react';
import { Search, Filter, Download, RefreshCcw, Users as UsersIcon } from 'lucide-react';
import { apiGet, apiPost } from '../../lib/api';
import { PageHeroHeader } from '../PageHeroHeader';

interface AdminUsersProps {
  onViewUser: (userId: string) => void;
}

// Simple role badge component for admin use
function RoleBadge({ role }: { role: 'artist' | 'venue' }) {
  const baseClasses = 'border border-[var(--border)]';
  const artistClasses = `${baseClasses} bg-[var(--surface-3)] text-[var(--blue)]`;
  const venueClasses = `${baseClasses} bg-[var(--green-muted)] text-[var(--green)]`;
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs capitalize ${role === 'artist' ? artistClasses : venueClasses}`}>
      {role}
    </span>
  );
}

export function AdminUsers({ onViewUser }: AdminUsersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    role: 'all',
    plan: 'all',
    status: 'all',
    city: 'all',
    agreementAccepted: 'all',
  });
  const [roleTab, setRoleTab] = useState<'all' | 'artist' | 'venue'>('all');

  // Mock users data (fallback)
  const mockUsers: any[] = [];

  const plans = ['Free', 'Starter', 'Growth', 'Pro'];
  const statuses = ['Active', 'Suspended'];
  const cities = ['Portland', 'Seattle', 'San Francisco', 'Los Angeles'];

  const [users, setUsers] = useState<Array<{
    id: string;
    name: string;
    email: string | null;
    role: 'artist' | 'venue';
    plan: string;
    status: 'Active' | 'Suspended';
    lastActive?: string;
    city?: string;
    agreementAccepted?: boolean;
  }>>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [isBackfilling, setIsBackfilling] = useState(false);

  function getPlanBadgeColor(plan: string) {
    const base = 'border border-[var(--border)]';
    if (plan.toLowerCase() === 'free') return `${base} bg-[var(--surface-3)] text-[var(--text)]`;
    if (plan.toLowerCase() === 'starter') return `${base} bg-[var(--surface-3)] text-[var(--accent)]`;
    if (plan.toLowerCase() === 'growth') return `${base} bg-[var(--surface-3)] text-[var(--blue)]`;
    if (plan.toLowerCase() === 'pro') return `${base} bg-[var(--surface-3)] text-[var(--green)]`;
    return `${base} bg-[var(--surface-3)] text-[var(--text)]`;
  }

  function getStatusColor(status: string) {
    const base = 'border border-[var(--border)]';
    if (status === 'Active') return `${base} bg-[var(--green-muted)] text-[var(--green)]`;
    if (status === 'Suspended') return `${base} bg-[var(--danger-muted)] text-[var(--danger)]`;
    return `${base} bg-[var(--surface-3)] text-[var(--text)]`;
  }

  async function reload() {
    setIsLoading(true);
    try {
      // Ensure local tables are synced from Supabase Auth
      try { await apiPost('/api/admin/sync-users', {}); } catch {}

      // Primary: use the admin-only unified users endpoint (no public filters)
      let combined: typeof users = [];
      let usedFallback = false;

      try {
        const adminResp = await apiGet<any>('/api/admin/users');
        const adminUsers = Array.isArray(adminResp)
          ? adminResp
          : (adminResp?.users || adminResp?.data?.users || adminResp?.data || []);

        combined = (adminUsers || []).map((u: any) => ({
          id: u.id,
          name: u.name || 'User',
          email: u.email || null,
          role: (u.role === 'venue' ? 'venue' : u.role === 'unknown' ? 'artist' : u.role || 'artist') as 'artist' | 'venue',
          plan: u.plan
            ? String(u.plan).replace(/^(.)/, (m: string) => m.toUpperCase())
            : '—',
          status: (u.status === 'Suspended' ? 'Suspended' : 'Active') as 'Active' | 'Suspended',
          lastActive: '—',
          city: u.city || '—',
          agreementAccepted: true,
        }));

        if (adminResp?.counts) {
          console.info('[AdminUsers] Loaded:', adminResp.counts);
        }
      } catch (adminErr) {
        // Fallback: if /api/admin/users fails, use the public endpoints (lossy)
        console.warn('[AdminUsers] /api/admin/users failed, falling back to public endpoints:', adminErr);
        usedFallback = true;

        const [artistsResp, venuesResp] = await Promise.all([
          apiGet<any>('/api/artists').catch(() => []),
          apiGet<any>('/api/venues').catch(() => []),
        ]);

        const artists = Array.isArray(artistsResp)
          ? artistsResp
          : (artistsResp?.artists || artistsResp?.data || []);
        const venues = Array.isArray(venuesResp)
          ? venuesResp
          : (venuesResp?.venues || venuesResp?.data || []);

        const mappedArtists = (artists || []).map((a: any) => ({
          id: a.id,
          name: a.name || 'Artist',
          email: a.email || null,
          role: 'artist' as const,
          plan: (a.subscriptionTier || 'free').toString().replace(/^(.)/, (m: string) => m.toUpperCase()),
          status: (a.subscriptionStatus === 'suspended') ? 'Suspended' as const : 'Active' as const,
          lastActive: '—',
          city: '—',
          agreementAccepted: true,
        }));

        const mappedVenues = (venues || []).map((v: any) => ({
          id: v.id,
          name: v.name || 'Venue',
          email: v.email || null,
          role: 'venue' as const,
          plan: '—',
          status: (v.suspended ? 'Suspended' as const : 'Active' as const),
          lastActive: '—',
          city: '—',
          agreementAccepted: true,
        }));

        const seen = new Set<string>();
        for (const list of [mappedArtists, mappedVenues]) {
          for (const item of list) {
            if (seen.has(item.id)) continue;
            seen.add(item.id);
            combined.push(item);
          }
        }
      }

      setUsers(combined.length ? combined : mockUsers);
      setToast(usedFallback
        ? 'Users refreshed (partial — admin endpoint unavailable)'
        : 'Users refreshed'
      );
      setTimeout(() => setToast(null), 2000);
    } catch (err) {
      console.error('[AdminUsers] reload failed:', err);
      setUsers(mockUsers);
    } finally {
      setIsLoading(false);
    }
  }

  async function backfillUsers() {
    setIsBackfilling(true);
    try {
      const res = await apiPost('/api/admin/sync-users', {});
      const artists = (res?.artists as number) ?? 0;
      const venues = (res?.venues as number) ?? 0;
      setToast(`Backfilled users: ${artists} artists, ${venues} venues`);
      setTimeout(() => setToast(null), 2500);
      await reload();
    } catch (e: any) {
      setToast(e?.message || 'Backfill failed');
      setTimeout(() => setToast(null), 2500);
    } finally {
      setIsBackfilling(false);
    }
  }

  useEffect(() => {
    reload();
    const interval = setInterval(reload, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter users
  const filteredUsers = (users.length ? users : mockUsers).filter(user => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        user.name.toLowerCase().includes(query) ||
        (user.email || '').toLowerCase().includes(query) ||
        String(user.id).toLowerCase().includes(query) ||
        String(user.role || '').toLowerCase().includes(query) ||
        String(user.plan || '').toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }
    if (roleTab !== 'all' && user.role !== roleTab) return false;
    if (filters.role !== 'all' && user.role !== filters.role) return false;
    if (filters.plan !== 'all' && user.plan !== filters.plan) return false;
    if (filters.status !== 'all' && user.status !== filters.status) return false;
    if (filters.city !== 'all' && user.city !== filters.city) return false;
    if (filters.agreementAccepted !== 'all') {
      const accepted = filters.agreementAccepted === 'yes';
      if (user.agreementAccepted !== accepted) return false;
    }
    return true;
  });

  const clearFilters = () => {
    setFilters({
      role: 'all',
      plan: 'all',
      status: 'all',
      city: 'all',
      agreementAccepted: 'all',
    });
    setSearchQuery('');
  };

  const hasActiveFilters = 
    filters.role !== 'all' ||
    filters.plan !== 'all' ||
    filters.status !== 'all' ||
    filters.city !== 'all' ||
    filters.agreementAccepted !== 'all' ||
    searchQuery !== '';

  const roleCounts = {
    all: users.length,
    artist: users.filter((u) => u.role === 'artist').length,
    venue: users.filter((u) => u.role === 'venue').length,
  };

  return (
    <div className="bg-[var(--bg)]">
      {/* Header */}
      <PageHeroHeader
        title="Users"
        subtitle="Manage and support platform users"
      />

      {toast && (
        <div className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text)]" role="status">
          {toast}
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--border)] mb-6">
        {/* Search Bar */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, venue name, or user ID..."
              className="w-full pl-12 pr-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-6 py-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
              showFilters || hasActiveFilters
            ? 'border-[var(--blue)] bg-[var(--blue)] text-[var(--on-blue)]'
            : 'border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] hover:bg-[var(--surface-3)]'
            }`}
          >
            <Filter className="w-5 h-5" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 px-2 py-0.5 bg-[var(--surface-2)] text-[var(--on-blue)] text-xs rounded-full border border-[color:color-mix(in_srgb,var(--on-blue)_35%,transparent)]">
                Active
              </span>
            )}
          </button>
          <button
            onClick={reload}
            disabled={isLoading}
            className={`px-6 py-3 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors flex items-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <RefreshCcw className="w-5 h-5" />
            {isLoading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button
            onClick={backfillUsers}
            disabled={isBackfilling}
            className={`px-6 py-3 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors flex items-center gap-2 ${isBackfilling ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <UsersIcon className="w-5 h-5" />
            {isBackfilling ? 'Backfilling…' : 'Backfill Users'}
          </button>
          <button className="px-6 py-3 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="pt-4 border-t border-[var(--border)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
              {/* Role Filter */}
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-2">
                  Role
                </label>
                <select
                  value={filters.role}
                  onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
                >
                  <option value="all">All roles</option>
                  <option value="artist">Artist</option>
                  <option value="venue">Venue</option>
                </select>
              </div>

              {/* Plan Filter */}
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-2">
                  Plan
                </label>
                <select
                  value={filters.plan}
                  onChange={(e) => setFilters({ ...filters, plan: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
                >
                  <option value="all">All plans</option>
                  {plans.map(plan => (
                    <option key={plan} value={plan}>{plan}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
                >
                  <option value="all">All statuses</option>
                  {statuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              {/* City Filter */}
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-2">
                  City
                </label>
                <select
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
                >
                  <option value="all">All cities</option>
                  {cities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              {/* Agreement Filter */}
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-2">
                  Agreement
                </label>
                <select
                  value={filters.agreementAccepted}
                  onChange={(e) => setFilters({ ...filters, agreementAccepted: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
                >
                  <option value="all">All</option>
                  <option value="yes">Accepted</option>
                  <option value="no">Not accepted</option>
                </select>
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Role Segments */}
      <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] px-4 py-3 mb-4 flex flex-wrap gap-2">
        {(
          [
            { id: 'all' as const, label: 'All', count: roleCounts.all },
            { id: 'artist' as const, label: 'Artists', count: roleCounts.artist },
            { id: 'venue' as const, label: 'Venues', count: roleCounts.venue },
          ]
        ).map((tab) => {
          const isActive = roleTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setRoleTab(tab.id);
                setFilters((f) => ({ ...f, role: 'all' }));
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors text-sm ${
                isActive
                  ? 'border-[var(--blue)] bg-[var(--blue)] text-[var(--on-blue)]'
                  : 'border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] hover:bg-[var(--surface-3)]'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-[var(--surface-2)] text-[var(--on-blue)]' : 'bg-[var(--surface-2)] text-[var(--text-muted)]'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[var(--text-muted)]">
          <span className="text-[var(--text)]">{filteredUsers.length}</span> users found
        </p>
      </div>

      {/* Users Table */}
      {filteredUsers.length > 0 ? (
        <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--surface-3)] border-b border-[var(--border)]">
                <tr>
                  <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Name</th>
                  <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Role</th>
                  <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Email</th>
                  <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Plan</th>
                  <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Status</th>
                  <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Last Active</th>
                  <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-[var(--surface-3)] transition-colors">
                    <td className="px-6 py-4 text-sm text-[var(--text)]">
                      {user.name}
                    </td>
                    <td className="px-6 py-4">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text-muted)]">
                      {user.email}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${getPlanBadgeColor(user.plan)}`}>
                        {user.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(user.status)}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text-muted)]">
                      {user.lastActive}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => onViewUser(user.id)}
                          className="px-3 py-1 bg-[var(--blue)] text-[var(--on-blue)] rounded text-xs hover:bg-[var(--blue-hover)] transition-colors"
                        >
                          View
                        </button>
                        {user.status === 'Active' ? (
                          <button
                            onClick={async () => {
                              try {
                                await apiPost(`/api/admin/users/${user.id}/suspend`, {});
                                setUsers(users.map(u => u.id === user.id ? { ...u, status: 'Suspended' } : u));
                              } catch {}
                            }}
                            className="px-3 py-1 bg-[var(--surface-3)] text-[var(--danger)] border border-[var(--border)] rounded text-xs hover:bg-[var(--surface-2)] transition-colors"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={async () => {
                              try {
                                await apiPost(`/api/admin/users/${user.id}/activate`, {});
                                setUsers(users.map(u => u.id === user.id ? { ...u, status: 'Active' } : u));
                              } catch {}
                            }}
                            className="px-3 py-1 bg-[var(--green)] text-[var(--on-blue)] rounded text-xs hover:opacity-95 transition-colors"
                          >
                            Activate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-[var(--surface-2)] rounded-xl border border-[var(--border)]">
          <div className="w-16 h-16 bg-[var(--surface-3)] border border-[var(--border)] rounded-full flex items-center justify-center mx-auto mb-4">
            <UsersIcon className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-xl mb-2 text-[var(--text)]">No users found</h3>
          <p className="text-[var(--text-muted)] mb-2">
            {hasActiveFilters
              ? 'Try adjusting your filters to see more results'
              : 'No users in the system yet'}
          </p>
          {!hasActiveFilters && users.length === 0 && (
            <p className="text-xs text-[var(--text-muted)] mb-4">
              If you expect users here, check that the worker's <code>/api/admin/users</code> endpoint is deployed and your account has the <code>admin</code> role in the <code>artists</code> table.
            </p>
          )}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-6 py-2 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors"
            >
              Clear Filters
            </button>
          )}
          {!hasActiveFilters && (
            <button
              onClick={reload}
              disabled={isLoading}
              className="px-6 py-2 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors"
            >
              {isLoading ? 'Refreshing…' : 'Retry'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}