import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  MapPin, 
  Calendar, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  LogOut,
  Key,
  StickyNote,
  Frame,
  ShoppingCart,
  CreditCard,
  Crown
} from 'lucide-react';
import { apiGet, apiPost } from '../../lib/api';

interface AdminUserDetailProps {
  userId: string;
  onBack: () => void;
}

type SubscriptionTier = 'free' | 'starter' | 'growth' | 'pro';

type AdminUser = {
  id: string;
  name: string;
  email: string | null;
  role: 'artist' | 'venue';
  subscriptionTier?: SubscriptionTier | string;
  subscriptionStatus?: string;
  city?: string | null;
  createdAt?: string | null;
  lastActive?: string | null;
  agreementAccepted?: boolean;
  agreementDate?: string | null;
  artworksCount?: number;
  activeDisplays?: number;
  protectionPlanActive?: number;
};

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

export function AdminUserDetail({ userId, onBack }: AdminUserDetailProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'placements' | 'orders' | 'subscriptions' | 'notes'>('overview');
  const [pendingAction, setPendingAction] = useState<'suspend' | 'logout' | 'reset' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingTier, setIsSavingTier] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>('free');
  const [isEditingTier, setIsEditingTier] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);

  const defaultUser: AdminUser = {
    id: userId,
    name: 'User',
    email: null,
    role: 'artist',
    subscriptionTier: selectedTier,
    subscriptionStatus: 'active',
    city: '—',
    createdAt: '—',
    lastActive: '—',
    agreementAccepted: false,
    agreementDate: '—',
    artworksCount: 0,
    activeDisplays: 0,
    protectionPlanActive: 0,
  };

  const normalizeTier = (tier?: string): SubscriptionTier => {
    const normalized = String(tier || 'free').toLowerCase();
    if (normalized === 'starter' || normalized === 'growth' || normalized === 'pro') return normalized;
    return 'free';
  };

  const planLabel = (tier?: string) => {
    if (!tier) return '—';
    const normalized = String(tier).toLowerCase();
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  const statusLabel = (status?: string) => {
    if (!status) return 'Active';
    const normalized = String(status).toLowerCase();
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  const normalizeUser = (detail: any): AdminUser => {
    if (!detail) return defaultUser;
    const tier = normalizeTier(detail.subscriptionTier || detail.tier);
    return {
      id: detail.id || userId,
      name: detail.name || detail.displayName || 'User',
      email: detail.email || null,
      role: detail.role === 'venue' ? 'venue' : 'artist',
      subscriptionTier: tier,
      subscriptionStatus: detail.subscriptionStatus || 'active',
      city: detail.city || detail.city_primary || '—',
      createdAt: detail.createdAt || detail.created_at || '—',
      lastActive: detail.lastActive || '—',
      agreementAccepted: detail.agreementAccepted ?? true,
      agreementDate: detail.agreementDate || '—',
      artworksCount: detail.artworksCount ?? 0,
      activeDisplays: detail.activeDisplays ?? 0,
      protectionPlanActive: detail.protectionPlanActive ?? 0,
    };
  };

  // Load user data
  useEffect(() => {
    async function loadUser() {
      setIsLoading(true);
      try {
        // Prefer admin detail endpoint when available
        const adminDetail = await apiGet<any>(`/api/admin/users/${userId}`).catch(() => null);
        if (adminDetail) {
          const normalized = normalizeUser(adminDetail);
          setUser(normalized);
          setSelectedTier(normalizeTier(normalized.subscriptionTier as string));
          return;
        }

        // Fallback to artist profile
        const artist = await apiGet<any>(`/api/artists/${userId}`).catch(() => null);
        if (artist) {
          const tier = normalizeTier(artist.subscriptionTier);
          setUser({
            id: artist.id || userId,
            name: artist.name || 'Artist',
            email: artist.email || null,
            role: 'artist',
            subscriptionTier: tier,
            subscriptionStatus: artist.subscriptionStatus || 'active',
            city: artist.city || artist.city_primary || '—',
            createdAt: artist.createdAt || artist.created_at || '—',
            lastActive: artist.lastActive || '—',
            agreementAccepted: artist.agreementAccepted ?? true,
            agreementDate: artist.agreementDate || '—',
            artworksCount: artist.artworksCount ?? 0,
            activeDisplays: artist.activeDisplays ?? 0,
            protectionPlanActive: artist.protectionPlanActive ?? 0,
          });
          setSelectedTier(tier);
          return;
        }
      } catch (e) {
        console.error('Failed to load user:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, [userId]);

  async function handleTierChange() {
    const currentTier = normalizeTier((user?.subscriptionTier as string) || 'free');
    if (selectedTier === currentTier) {
      setIsEditingTier(false);
      return;
    }
    
    setIsSavingTier(true);
    try {
      const response = await apiPost(`/api/admin/users/${userId}/tier`, { tier: selectedTier });
      const updated = normalizeUser(response?.user || { ...(user || defaultUser), subscriptionTier: selectedTier, subscriptionStatus: 'active' });
      setUser(updated);
      setSelectedTier(normalizeTier(updated.subscriptionTier as string));
      setToast(`Tier updated to ${selectedTier}`);
      setIsEditingTier(false);
      setTimeout(() => setToast(null), 2000);
    } catch (err: any) {
      setToast(`Error: ${err?.message || 'Failed to update tier'}`);
      setTimeout(() => setToast(null), 3000);
    } finally {
      setIsSavingTier(false);
    }
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: User },
    { id: 'placements' as const, label: 'Placements', icon: Frame },
    { id: 'orders' as const, label: 'Orders', icon: ShoppingCart },
    { id: 'subscriptions' as const, label: 'Subscriptions', icon: CreditCard },
    { id: 'notes' as const, label: 'Notes', icon: StickyNote },
  ];

  const mockPlacements: any[] = [];

  const mockOrders: any[] = [];

  const mockNotes: any[] = [];

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'Growth':
        return 'bg-[var(--surface-3)] text-[var(--text)] border border-[var(--border)]';
      default:
        return 'bg-[var(--surface-3)] text-[var(--text-muted)] border border-[var(--border)]';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'On display':
        return 'bg-[var(--green-muted)] text-[var(--green)] border border-[var(--border)]';
      case 'Sold':
        return 'bg-[var(--surface-3)] text-[var(--blue)] border border-[var(--border)]';
      case 'Paid':
        return 'bg-[var(--green-muted)] text-[var(--green)] border border-[var(--border)]';
      default:
        return 'bg-[var(--surface-3)] text-[var(--text-muted)] border border-[var(--border)]';
    }
  };

  const displayUser = user || defaultUser;

  return (
    <div className="bg-[var(--bg)]">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text)] mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Users
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl mb-2 text-[var(--text)]">{displayUser.name}</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <RoleBadge role={displayUser.role} />
              
              {/* Tier Badge/Selector */}
              {!isEditingTier ? (
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                    selectedTier === 'pro' ? 'bg-[var(--green-muted)] text-[var(--green)] border-[var(--green)]' :
                    selectedTier === 'growth' ? 'bg-[var(--blue-muted)] text-[var(--blue)] border-[var(--blue)]' :
                    selectedTier === 'starter' ? 'bg-[var(--surface-3)] text-[var(--accent)] border-[var(--border)]' :
                    'bg-[var(--surface-3)] text-[var(--text-muted)] border-[var(--border)]'
                  }`}>
                    {selectedTier.replace(/^(.)/, (m: string) => m.toUpperCase())} {selectedTier === 'pro' && <Crown className="w-3 h-3 inline ml-1" />}
                  </span>
                  <button
                    onClick={() => setIsEditingTier(true)}
                    disabled={isLoading}
                    className="px-2 py-1 text-xs text-[var(--blue)] hover:text-[var(--blue-hover)] transition-colors disabled:opacity-60"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedTier}
                    onChange={(e) => setSelectedTier(e.target.value as SubscriptionTier)}
                    disabled={isSavingTier || isLoading}
                    className="px-2 py-1 rounded border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--blue)] disabled:opacity-60"
                  >
                    <option value="free">Free</option>
                    <option value="starter">Starter</option>
                    <option value="growth">Growth</option>
                    <option value="pro">Pro</option>
                  </select>
                  <button
                    onClick={handleTierChange}
                    disabled={isSavingTier || isLoading}
                    className="px-3 py-1 bg-[var(--blue)] text-[var(--on-blue)] rounded text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {isSavingTier ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setIsEditingTier(false)}
                    className="px-2 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
              
              <span className="px-2 py-1 bg-[var(--green-muted)] text-[var(--green)] border border-[var(--border)] rounded-full text-xs">
                {statusLabel(displayUser.subscriptionStatus)}
              </span>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex gap-2">
            <button onClick={() => setPendingAction('suspend')} className="px-4 py-2 bg-[var(--surface-3)] text-[var(--danger)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-2)] transition-colors text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Suspend
            </button>
            <button onClick={() => setPendingAction('logout')} className="px-4 py-2 bg-[var(--surface-3)] text-[var(--text)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-2)] transition-colors text-sm flex items-center gap-2">
              <LogOut className="w-4 h-4 text-[var(--text-muted)]" />
              Force Logout
            </button>
            <button onClick={() => setPendingAction('reset')} className="px-4 py-2 bg-[var(--surface-3)] text-[var(--text)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-2)] transition-colors text-sm flex items-center gap-2">
              <Key className="w-4 h-4 text-[var(--text-muted)]" />
              Reset Password
            </button>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-muted)]">
          Loading user details...
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-[var(--border)] mb-6">
        <div className="flex gap-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-[var(--blue)] text-[var(--text)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                <Icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-[var(--blue)]' : 'text-[var(--text-muted)]'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {toast && (
            <div className="px-4 py-2 bg-[var(--green-muted)] text-[var(--green)] border border-[var(--border)] rounded-lg">
              {toast}
            </div>
          )}
          {/* Identity Card */}
          <div className="bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--border)]">
            <h2 className="text-xl mb-4 text-[var(--text)]">Identity</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-[var(--text-muted)] mt-0.5" />
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Name</p>
                  <p className="text-[var(--text)]">{displayUser.name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-[var(--text-muted)] mt-0.5" />
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Email</p>
                  <p className="text-[var(--text)]">{displayUser.email || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[var(--text-muted)] mt-0.5" />
                <div>
                  <p className="text-sm text-[var(--text-muted)]">City</p>
                  <p className="text-[var(--text)]">{displayUser.city || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-[var(--text-muted)] mt-0.5" />
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Member Since</p>
                  <p className="text-[var(--text)]">{displayUser.createdAt || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                {displayUser.agreementAccepted ? (
                  <CheckCircle className="w-5 h-5 text-[var(--green)] mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-[var(--danger)] mt-0.5" />
                )}
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Agreement</p>
                  <p className="text-[var(--text)]">
                    {displayUser.agreementAccepted ? `Accepted ${displayUser.agreementDate}` : 'Not accepted'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Artist Stats */}
          <div className="bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--border)]">
            <h2 className="text-xl mb-4 text-[var(--text)]">Artist Stats</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">Artworks</p>
                <p className="text-2xl text-[var(--text)]">{displayUser.artworksCount ?? 0}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">Active Displays</p>
                <p className="text-2xl text-[var(--text)]">{displayUser.activeDisplays ?? 0}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">Protected Artworks</p>
                <p className="text-2xl text-[var(--text)]">{displayUser.protectionPlanActive ?? 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'placements' && (
        <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--surface-3)] border-b border-[var(--border)]">
                <tr>
                  <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Artwork</th>
                  <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Venue</th>
                  <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Status</th>
                  <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Install Date</th>
                  <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">End Date</th>
                  <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Duration</th>
                  <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Protection</th>
                  <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {mockPlacements.map((placement) => (
                  <tr key={placement.id} className="hover:bg-[var(--surface-3)]">
                    <td className="px-6 py-4 text-sm text-[var(--text)]">{placement.artwork}</td>
                    <td className="px-6 py-4 text-sm text-[var(--text-muted)]">{placement.venue}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(placement.status)}`}>
                        {placement.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text-muted)]">{placement.installDate}</td>
                    <td className="px-6 py-4 text-sm text-[var(--text-muted)]">{placement.endDate}</td>
                    <td className="px-6 py-4 text-sm text-[var(--text-muted)]">{placement.duration} days</td>
                    <td className="px-6 py-4 text-sm">
                      {placement.protection ? (
                        <span className="text-[var(--green)]">On</span>
                      ) : (
                        <span className="text-[var(--text-muted)]">Off</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button className="px-3 py-1 bg-[var(--blue)] text-[var(--on-blue)] rounded text-xs hover:bg-[var(--blue-hover)] transition-colors">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--surface-3)] border-b border-[var(--border)]">
                <tr>
                  <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Order ID</th>
                  <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Artwork</th>
                  <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Amount</th>
                  <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Status</th>
                  <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Stripe Session</th>
                  <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Date</th>
                  <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {mockOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-[var(--surface-3)]">
                    <td className="px-6 py-4 text-sm text-[var(--text)]">{order.id}</td>
                    <td className="px-6 py-4 text-sm text-[var(--text-muted)]">{order.artwork}</td>
                    <td className="px-6 py-4 text-sm text-[var(--text)]">${order.amount}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text-muted)]">{order.stripeSessionId}</td>
                    <td className="px-6 py-4 text-sm text-[var(--text-muted)]">{order.date}</td>
                    <td className="px-6 py-4">
                      <button className="px-3 py-1 bg-[var(--blue)] text-[var(--on-blue)] rounded text-xs hover:bg-[var(--blue-hover)] transition-colors">
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'subscriptions' && (
        <div className="space-y-6">
          <div className="bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--border)]">
            <h2 className="text-xl mb-4 text-[var(--text)]">Current Plan</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">Tier</p>
                <p className="text-2xl text-[var(--text)]">{planLabel(displayUser.subscriptionTier)}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">Stripe Status</p>
                <span className="px-2 py-1 bg-[var(--green-muted)] text-[var(--green)] border border-[var(--border)] rounded-full text-sm">
                  {statusLabel(displayUser.subscriptionStatus)}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors text-sm">
                Open Stripe Customer
              </button>
              <button className="px-4 py-2 bg-[var(--surface-3)] text-[var(--danger)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-2)] transition-colors text-sm">
                Cancel Subscription
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="space-y-6">
          {/* Add Note */}
          <div className="bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--border)]">
            <h2 className="text-xl mb-4 text-[var(--text)]">Add Internal Note</h2>
            <div className="space-y-4">
              <select className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]">
                <option>Support</option>
                <option>Billing</option>
                <option>Safety</option>
              </select>
              <textarea
                rows={4}
                placeholder="Add your note here..."
                className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
              />
              <button className="px-6 py-2 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors">
                Save Note
              </button>
            </div>
          </div>

          {/* Notes Timeline */}
          <div className="bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--border)]">
            <h2 className="text-xl mb-4 text-[var(--text)]">Notes History</h2>
            <div className="space-y-4">
              {mockNotes.map((note) => (
                <div key={note.id} className="p-4 bg-[var(--surface-3)] border border-[var(--border)] rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[var(--text)]">{note.author}</span>
                      <span className="px-2 py-0.5 bg-[var(--surface-2)] text-[var(--blue)] border border-[var(--border)] rounded-full text-xs">
                        {note.tag}
                      </span>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">{note.timestamp}</span>
                  </div>
                  <p className="text-sm text-[var(--text-muted)]">{note.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {pendingAction && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl text-[var(--text)]">Confirm Admin Action</h3>
              <button onClick={() => setPendingAction(null)} className="p-2 hover:bg-[var(--surface-2)] rounded-lg transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[var(--text-muted)] mb-6">
              Are you sure you want to {pendingAction === 'suspend' ? 'suspend this user' : pendingAction === 'logout' ? 'force logout' : 'reset password'}?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setPendingAction(null)} className="flex-1 px-4 py-2 bg-[var(--surface-2)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-3)] transition-colors">Cancel</button>
              <button
                onClick={() => {
                  setPendingAction(null);
                  setToast(pendingAction === 'suspend' ? 'User suspended' : pendingAction === 'logout' ? 'User logged out' : 'Password reset link sent');
                  setTimeout(() => setToast(null), 3000);
                }}
                className="flex-1 px-4 py-2 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-opacity"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}