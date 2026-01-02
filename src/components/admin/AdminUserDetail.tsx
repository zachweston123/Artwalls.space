import { useState } from 'react';
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
  CreditCard
} from 'lucide-react';

interface AdminUserDetailProps {
  userId: string;
  onBack: () => void;
}

// Simple role badge component for admin use
function RoleBadge({ role }: { role: 'artist' | 'venue' }) {
  const artistClasses = 'bg-blue-100 text-blue-700';
  const venueClasses = 'bg-green-100 text-green-700';
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs capitalize ${role === 'artist' ? artistClasses : venueClasses}`}>
      {role}
    </span>
  );
}

export function AdminUserDetail({ userId, onBack }: AdminUserDetailProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'placements' | 'orders' | 'subscriptions' | 'notes'>('overview');

  // Mock user data
  const user = {
    id: userId,
    name: 'Sarah Chen',
    email: 'sarah.chen@example.com',
    role: 'artist' as const,
    plan: 'Growth',
    status: 'Active',
    city: 'Portland, OR',
    createdAt: '2023-06-15',
    lastActive: '5 minutes ago',
    agreementAccepted: true,
    agreementDate: '2023-06-15',
    artworksCount: 24,
    activeDisplays: 3,
    protectionPlanActive: 2,
  };

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: User },
    { id: 'placements' as const, label: 'Placements', icon: Frame },
    { id: 'orders' as const, label: 'Orders', icon: ShoppingCart },
    { id: 'subscriptions' as const, label: 'Subscriptions', icon: CreditCard },
    { id: 'notes' as const, label: 'Notes', icon: StickyNote },
  ];

  const mockPlacements = [
    {
      id: '1',
      artwork: 'Urban Sunset',
      venue: 'Brew & Palette Café',
      status: 'On display',
      installDate: '2024-01-15',
      endDate: '2024-04-15',
      duration: 90,
      protection: true,
    },
    {
      id: '2',
      artwork: 'City Lights',
      venue: 'The Artisan Lounge',
      status: 'Sold',
      installDate: '2023-12-01',
      endDate: '2024-03-01',
      duration: 90,
      protection: true,
    },
  ];

  const mockOrders = [
    {
      id: 'ord_123456',
      artwork: 'City Lights',
      amount: 1200,
      status: 'Paid',
      stripeSessionId: 'cs_test_a1b2c3...',
      date: '2024-01-20',
    },
  ];

  const mockNotes = [
    {
      id: '1',
      author: 'Admin User',
      tag: 'Support',
      content: 'User reported issue with artwork upload. Resolved by clearing cache.',
      timestamp: '2024-01-15 14:30',
    },
  ];

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'Growth':
        return 'bg-neutral-100 text-neutral-700';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'On display':
        return 'bg-green-100 text-green-700';
      case 'Sold':
        return 'bg-blue-100 text-blue-700';
      case 'Paid':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Users
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl mb-2">{user.name}</h1>
            <div className="flex items-center gap-3">
              <RoleBadge role={user.role} />
              <span className={`px-2 py-1 rounded-full text-xs ${getPlanBadgeColor(user.plan)}`}>
                {user.plan}
              </span>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                {user.status}
              </span>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Suspend
            </button>
            <button className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors text-sm flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Force Logout
            </button>
            <button className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors text-sm flex items-center gap-2">
              <Key className="w-4 h-4" />
              Reset Password
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200 mb-6">
        <div className="flex gap-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-neutral-900 dark:border-neutral-50 text-neutral-900 dark:text-neutral-50'
                    : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Identity Card */}
          <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 border border-neutral-200 dark:border-neutral-800">
            <h2 className="text-xl mb-4">Identity</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-neutral-400 mt-0.5" />
                <div>
                  <p className="text-sm text-neutral-600">Name</p>
                  <p className="text-neutral-900 dark:text-neutral-50">{user.name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-neutral-400 mt-0.5" />
                <div>
                  <p className="text-sm text-neutral-600">Email</p>
                  <p className="text-neutral-900 dark:text-neutral-50">{user.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-neutral-400 mt-0.5" />
                <div>
                  <p className="text-sm text-neutral-600">City</p>
                  <p className="text-neutral-900 dark:text-neutral-50">{user.city}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-neutral-400 mt-0.5" />
                <div>
                  <p className="text-sm text-neutral-600">Member Since</p>
                  <p className="text-neutral-900 dark:text-neutral-50">{user.createdAt}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                {user.agreementAccepted ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                <div>
                  <p className="text-sm text-neutral-600">Agreement</p>
                  <p className="text-neutral-900">
                    {user.agreementAccepted ? `Accepted ${user.agreementDate}` : 'Not accepted'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Artist Stats */}
          <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 border border-neutral-200 dark:border-neutral-800">
            <h2 className="text-xl mb-4 text-neutral-900 dark:text-neutral-50">Artist Stats</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-neutral-600 mb-1">Artworks</p>
                <p className="text-2xl text-neutral-900 dark:text-neutral-50">{user.artworksCount}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-600 mb-1">Active Displays</p>
                <p className="text-2xl text-neutral-900 dark:text-neutral-50">{user.activeDisplays}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-600 mb-1">Protected Artworks</p>
                <p className="text-2xl text-neutral-900 dark:text-neutral-50">{user.protectionPlanActive}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'placements' && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
                <tr>
                  <th className="text-left px-6 py-3 text-sm text-neutral-600">Artwork</th>
                  <th className="text-left px-6 py-3 text-sm text-neutral-600">Venue</th>
                  <th className="text-left px-6 py-3 text-sm text-neutral-600">Status</th>
                  <th className="text-left px-6 py-3 text-sm text-neutral-600">Install Date</th>
                  <th className="text-left px-6 py-3 text-sm text-neutral-600">End Date</th>
                  <th className="text-left px-6 py-3 text-sm text-neutral-600">Duration</th>
                  <th className="text-left px-6 py-3 text-sm text-neutral-600">Protection</th>
                  <th className="text-left px-6 py-3 text-sm text-neutral-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {mockPlacements.map((placement) => (
                  <tr key={placement.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 text-sm text-neutral-900 dark:text-neutral-50">{placement.artwork}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600">{placement.venue}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(placement.status)}`}>
                        {placement.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600">{placement.installDate}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600">{placement.endDate}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600">{placement.duration} days</td>
                    <td className="px-6 py-4 text-sm">
                      {placement.protection ? (
                        <span className="text-green-600">On</span>
                      ) : (
                        <span className="text-neutral-500">Off</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button className="px-3 py-1 bg-neutral-900 text-white rounded text-xs hover:bg-neutral-800 transition-colors">
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
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
                <tr>
                  <th className="text-left px-6 py-3 text-sm text-neutral-600">Order ID</th>
                  <th className="text-left px-6 py-3 text-sm text-neutral-600">Artwork</th>
                  <th className="text-left px-6 py-3 text-sm text-neutral-600">Amount</th>
                  <th className="text-left px-6 py-3 text-sm text-neutral-600">Status</th>
                  <th className="text-left px-6 py-3 text-sm text-neutral-600">Stripe Session</th>
                  <th className="text-left px-6 py-3 text-sm text-neutral-600">Date</th>
                  <th className="text-left px-6 py-3 text-sm text-neutral-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {mockOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 text-sm text-neutral-900 dark:text-neutral-50 font-mono">{order.id}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600">{order.artwork}</td>
                    <td className="px-6 py-4 text-sm text-neutral-900 dark:text-neutral-50">${order.amount}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600 font-mono">{order.stripeSessionId}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600">{order.date}</td>
                    <td className="px-6 py-4">
                      <button className="px-3 py-1 bg-neutral-900 text-white rounded text-xs hover:bg-neutral-800 transition-colors">
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
          <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 border border-neutral-200 dark:border-neutral-800">
            <h2 className="text-xl mb-4 dark:text-neutral-50">Current Plan</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-sm text-neutral-600 mb-1">Tier</p>
                <p className="text-2xl text-neutral-900 dark:text-neutral-50">{user.plan}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-600 mb-1">Stripe Status</p>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                  Active
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors text-sm">
                Open Stripe Customer
              </button>
              <button className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm">
                Cancel Subscription
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="space-y-6">
          {/* Add Note */}
          <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 border border-neutral-200 dark:border-neutral-800">
            <h2 className="text-xl mb-4 dark:text-neutral-50">Add Internal Note</h2>
            <div className="space-y-4">
              <select className="w-full px-4 py-2 rounded-lg border border-neutral-300 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 dark:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-500 dark:focus:ring-neutral-400">
                <option>Support</option>
                <option>Billing</option>
                <option>Safety</option>
              </select>
              <textarea
                rows={4}
                placeholder="Add your note here..."
                className="w-full px-4 py-2 rounded-lg border border-neutral-300 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 dark:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-500 dark:focus:ring-neutral-400"
              />
              <button className="px-6 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors">
                Save Note
              </button>
            </div>
          </div>

          {/* Notes Timeline */}
          <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 border border-neutral-200 dark:border-neutral-800">
            <h2 className="text-xl mb-4 dark:text-neutral-50">Notes History</h2>
            <div className="space-y-4">
              {mockNotes.map((note) => (
                <div key={note.id} className="p-4 bg-neutral-50 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-neutral-900 dark:text-neutral-50">{note.author}</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                        {note.tag}
                      </span>
                    </div>
                    <span className="text-xs text-neutral-500">{note.timestamp}</span>
                  </div>
                  <p className="text-sm text-neutral-600">{note.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}