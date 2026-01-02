import { useState } from 'react';
import { Search, Filter, Download, Users as UsersIcon } from 'lucide-react';

interface AdminUsersProps {
  onViewUser: (userId: string) => void;
}

// Simple role badge component for admin use
function RoleBadge({ role }: { role: 'artist' | 'venue' }) {
  const artistClasses = 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
  const venueClasses = 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
  
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

  // Mock users data
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
        return 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300';
      case 'Starter':
        return 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300';
      case 'Growth':
        return 'bg-neutral-100 dark:bg-neutral-900/50 text-neutral-700 dark:text-neutral-300';
      case 'Pro':
        return 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300';
      default:
        return 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300';
      case 'Suspended':
        return 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300';
      default:
        return 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300';
    }
  };

  // Filter users
  const filteredUsers = mockUsers.filter(user => {
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
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Users</h1>
        <p className="text-neutral-600">
          Manage and support platform users
        </p>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700 mb-6">
        {/* Search Bar */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, venue name, or user ID..."
              className="w-full pl-12 pr-4 py-3 rounded-lg border border-neutral-300 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 dark:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-500 dark:focus:ring-neutral-400"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-6 py-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
              showFilters || hasActiveFilters
            ? 'border-neutral-900 bg-neutral-900 text-white'
            : 'border-neutral-300 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400 dark:border-neutral-600 dark:hover:border-neutral-500'
            }`}
          >
            <Filter className="w-5 h-5" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 px-2 py-0.5 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 text-xs rounded-full">
                Active
              </span>
            )}
          </button>
          <button className="px-6 py-3 rounded-lg border border-neutral-300 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 dark:border-neutral-600 transition-colors flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="pt-4 border-t border-neutral-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
              {/* Role Filter */}
              <div>
                <label className="block text-sm text-neutral-700 dark:text-neutral-300 mb-2">
                  Role
                </label>
                <select
                  value={filters.role}
                  onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-500"
                >
                  <option value="all">All roles</option>
                  <option value="artist">Artist</option>
                  <option value="venue">Venue</option>
                </select>
              </div>

              {/* Plan Filter */}
              <div>
                <label className="block text-sm text-neutral-700 dark:text-neutral-300 mb-2">
                  Plan
                </label>
                <select
                  value={filters.plan}
                  onChange={(e) => setFilters({ ...filters, plan: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-500"
                >
                  <option value="all">All plans</option>
                  {plans.map(plan => (
                    <option key={plan} value={plan}>{plan}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm text-neutral-700 dark:text-neutral-300 mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-500"
                >
                  <option value="all">All statuses</option>
                  {statuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              {/* City Filter */}
              <div>
                <label className="block text-sm text-neutral-700 dark:text-neutral-300 mb-2">
                  City
                </label>
                <select
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-500"
                >
                  <option value="all">All cities</option>
                  {cities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              {/* Agreement Filter */}
              <div>
                <label className="block text-sm text-neutral-700 dark:text-neutral-300 mb-2">
                  Agreement
                </label>
                <select
                  value={filters.agreementAccepted}
                  onChange={(e) => setFilters({ ...filters, agreementAccepted: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-500"
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
                className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          <span className="text-neutral-900 dark:text-neutral-50">{filteredUsers.length}</span> users found
        </p>
      </div>

      {/* Users Table */}
      {filteredUsers.length > 0 ? (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
                <tr>
                  <th className="text-left px-6 py-3 text-sm text-neutral-600 dark:text-neutral-300">Name</th>
                  <th className="text-left px-6 py-3 text-sm text-neutral-600 dark:text-neutral-300">Role</th>
                  <th className="text-left px-6 py-3 text-sm text-neutral-600 dark:text-neutral-300">Email</th>
                  <th className="text-left px-6 py-3 text-sm text-neutral-600 dark:text-neutral-300">Plan</th>
                  <th className="text-left px-6 py-3 text-sm text-neutral-600 dark:text-neutral-300">Status</th>
                  <th className="text-left px-6 py-3 text-sm text-neutral-600 dark:text-neutral-300">Last Active</th>
                  <th className="text-left px-6 py-3 text-sm text-neutral-600 dark:text-neutral-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-neutral-900 dark:text-neutral-50">
                      {user.name}
                    </td>
                    <td className="px-6 py-4">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">
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
                    <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                      {user.lastActive}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => onViewUser(user.id)}
                          className="px-3 py-1 bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-900 rounded text-xs hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
                        >
                          View
                        </button>
                        {user.status === 'Active' ? (
                          <button className="px-3 py-1 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded text-xs hover:bg-red-200 dark:hover:bg-red-900 transition-colors">
                            Suspend
                          </button>
                        ) : (
                          <button className="px-3 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded text-xs hover:bg-green-200 dark:hover:bg-green-900 transition-colors">
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
        <div className="text-center py-16 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <UsersIcon className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-xl mb-2">No users found</h3>
          <p className="text-neutral-600 dark:text-neutral-300 mb-6">
            {hasActiveFilters
              ? 'Try adjusting your filters to see more results'
              : 'No users in the system yet'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-6 py-2 bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}