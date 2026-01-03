import { useEffect, useState } from 'react';
import { Search, Filter, Download, Users as UsersIcon } from 'lucide-react';
import { apiGet, apiPost } from '../../lib/api';

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
  const [filters, setFilters] = useState({
    role: 'all',
    plan: 'all',
    status: 'all',
    city: 'all',
    agreementAccepted: 'all',
  });

  // Mock users data (fallback)
  const mockUsers = [
    {
      id: '1',
      name: 'Sarah Chen',
      email: 'sarah.chen@example.com',
      role: 'artist' as const,
      plan: 'Growth',
      status: 'Active',
      lastActive: '5 minutes ago',
      city: 'Portland',
      agreementAccepted: true,
    },
    {
      id: '2',
      name: 'Brew & Palette Café',
      email: 'owner@brewpalette.com',
      role: 'venue' as const,
      plan: 'Pro',
      status: 'Active',
      lastActive: '2 hours ago',
      city: 'Portland',
      agreementAccepted: true,
    },
    {
      id: '3',
      name: 'Marcus Rodriguez',
      email: 'marcus.r@example.com',
      role: 'artist' as const,
      plan: 'Starter',
      status: 'Active',
      lastActive: '1 day ago',
      city: 'Seattle',
      agreementAccepted: true,
    },
    {
      id: '4',
      name: 'The Artisan Lounge',
      email: 'info@artisanlounge.com',
      role: 'venue' as const,
      plan: 'Growth',
      status: 'Active',
      lastActive: '3 hours ago',
      city: 'Portland',
      agreementAccepted: true,
    },
    {
      id: '5',
      name: 'Emma Liu',
      email: 'emma.liu@example.com',
      role: 'artist' as const,
      plan: 'Free',
      status: 'Suspended',
      lastActive: '2 weeks ago',
      city: 'Portland',
      agreementAccepted: false,
    },
  ];

  const plans = ['Free', 'Starter', 'Growth', 'Pro'];
  const statuses = ['Active', 'Suspended'];
  const cities = ['Portland', 'Seattle', 'San Francisco', 'Los Angeles'];

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'Free':
        return 'bg-[var(--surface-3)] text-[var(--text-muted)] border border-[var(--border)]';
      case 'Starter':
        return 'bg-[var(--surface-3)] text-[var(--blue)] border border-[var(--border)]';
      case 'Growth':
        return 'bg-[var(--surface-3)] text-[var(--text)] border border-[var(--border)]';
      case 'Pro':
        return 'bg-[var(--surface-3)] text-[var(--warning)] border border-[var(--border)]';
      default:
        return 'bg-[var(--surface-3)] text-[var(--text-muted)] border border-[var(--border)]';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-[var(--green-muted)] text-[var(--green)] border border-[var(--border)]';
      case 'Suspended':
        return 'bg-[var(--surface-3)] text-[var(--danger)] border border-[var(--border)]';
      default:
        return 'bg-[var(--surface-3)] text-[var(--text-muted)] border border-[var(--border)]';
    }
  };

  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadUsers() {
      try {
        // Backfill newly created Supabase users into local tables (no-op if already present)
        try { await apiPost('/api/admin/sync-users', {}); } catch {}

        const [artists, venues, authUsers] = await Promise.all([
          apiGet<Array<{ id: string; name?: string | null; email?: string | null; subscriptionTier?: string | null; subscriptionStatus?: string | null }>>('/api/artists'),
          apiGet<Array<{ id: string; name?: string | null; email?: string | null; type?: string | null; suspended?: boolean }>>('/api/venues'),
          apiGet<Array<{ id: string; name?: string | null; email?: string | null; role?: string | null }>>('/api/admin/users'),
        ]);

        const mappedArtists = (artists || []).map((a) => ({
          id: a.id,
          name: a.name || 'Artist',
          email: a.email || '',
          role: 'artist' as const,
          plan: (a.subscriptionTier || 'Free')[0].toUpperCase() + (a.subscriptionTier || 'Free').slice(1),
          status: (a.subscriptionStatus === 'active' ? 'Active' : 'Suspended'),
          lastActive: '—',
          city: '—',
          agreementAccepted: true,
        }));

        const mappedVenues = (venues || []).map((v) => ({
          id: v.id,
          name: v.name || 'Venue',
          email: v.email || '',
          role: 'venue' as const,
          plan: 'Free',
          status: v.suspended ? 'Suspended' : 'Active',
          lastActive: '—',
          city: '—',
          agreementAccepted: true,
        }));

        // Include any Supabase Auth users not yet in our local tables
        const authMapped = (authUsers || [])
          .filter(u => (u.role === 'artist' || u.role === 'venue'))
          .filter(u => ![...mappedArtists, ...mappedVenues].some(x => x.id === u.id))
          .map(u => ({
            id: u.id,
            name: u.name || (u.role === 'venue' ? 'Venue' : 'Artist'),
            email: u.email || '',
            role: (u.role as 'artist' | 'venue') || 'artist',
            plan: 'Free',
            status: 'Active',
            lastActive: '—',
            city: '—',
            agreementAccepted: true,
          }));

        const combined = [...mappedArtists, ...mappedVenues, ...authMapped];
        if (isMounted) setUsers(combined.length ? combined : mockUsers);
      } catch {
        if (isMounted) setUsers(mockUsers);
      }
    }

    loadUsers();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter users
  const filteredUsers = (users.length ? users : mockUsers).filter(user => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }
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

  return (
    <div className="bg-[var(--bg)]">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl mb-2 text-[var(--text)]">Users</h1>
        <p className="text-[var(--text-muted)]">
          Manage and support platform users
        </p>
      </div>

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
          <p className="text-[var(--text-muted)] mb-6">
            {hasActiveFilters
              ? 'Try adjusting your filters to see more results'
              : 'No users in the system yet'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-6 py-2 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}