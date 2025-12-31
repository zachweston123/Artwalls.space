import { 
  Users, 
  Building, 
  Frame, 
  Mail, 
  DollarSign, 
  TrendingUp,
  AlertCircle,
  Plus,
  Search,
  Activity,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigate: (page: string, params?: any) => void;
}

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const kpis = [
    {
      label: 'Total Artists',
      value: '1,247',
      delta: '+32 this month',
      deltaType: 'positive' as const,
      icon: Users,
      iconBg: 'bg-blue-100 dark:bg-blue-900',
      iconColor: 'text-blue-600 dark:text-blue-300',
    },
    {
      label: 'Total Venues',
      value: '387',
      delta: '+12 this month',
      deltaType: 'positive' as const,
      icon: Building,
      iconBg: 'bg-green-100 dark:bg-green-900',
      iconColor: 'text-green-600 dark:text-green-300',
    },
    {
      label: 'Active Displays',
      value: '542',
      delta: '89% capacity',
      deltaType: 'neutral' as const,
      icon: Frame,
      iconBg: 'bg-purple-100 dark:bg-purple-900',
      iconColor: 'text-purple-600 dark:text-purple-300',
    },
    {
      label: 'Pending Invites',
      value: '23',
      delta: 'Needs review',
      deltaType: 'neutral' as const,
      icon: Mail,
      iconBg: 'bg-orange-100 dark:bg-orange-900',
      iconColor: 'text-orange-600 dark:text-orange-300',
    },
    {
      label: 'Total GMV (Month)',
      value: '$48,392',
      delta: '+18% vs last month',
      deltaType: 'positive' as const,
      icon: DollarSign,
      iconBg: 'bg-emerald-100 dark:bg-emerald-900',
      iconColor: 'text-emerald-600 dark:text-emerald-300',
    },
    {
      label: 'Platform Revenue',
      value: '$4,839',
      delta: '10% platform fee',
      deltaType: 'neutral' as const,
      icon: TrendingUp,
      iconBg: 'bg-cyan-100 dark:bg-cyan-900',
      iconColor: 'text-cyan-600 dark:text-cyan-300',
    },
    {
      label: 'Support Queue',
      value: '7',
      delta: '2 urgent',
      deltaType: 'warning' as const,
      icon: AlertCircle,
      iconBg: 'bg-red-100 dark:bg-red-900',
      iconColor: 'text-red-600 dark:text-red-300',
    },
  ];

  const quickActions = [
    {
      label: 'Create Announcement',
      icon: Plus,
      onClick: () => onNavigate('admin-announcements', { action: 'create' }),
    },
    {
      label: 'Create Promo Code',
      icon: Plus,
      onClick: () => onNavigate('admin-promo-codes', { action: 'create' }),
    },
    {
      label: 'Search User',
      icon: Search,
      onClick: () => onNavigate('admin-users'),
    },
  ];

  const recentActivity = [
    {
      id: '1',
      type: 'payment',
      description: 'Payment completed: "Urban Sunset" sold for $850',
      user: 'Sarah Chen',
      timestamp: '5 minutes ago',
      status: 'success' as const,
    },
    {
      id: '2',
      type: 'venue',
      description: 'New venue registered: The Artisan Lounge',
      user: 'Michael Torres',
      timestamp: '32 minutes ago',
      status: 'info' as const,
    },
    {
      id: '3',
      type: 'dispute',
      description: 'Dispute opened: Artwork damaged during installation',
      user: 'Emma Liu',
      timestamp: '1 hour ago',
      status: 'warning' as const,
    },
    {
      id: '4',
      type: 'subscription',
      description: 'Subscription upgraded: Free → Growth',
      user: 'Jordan Taylor',
      timestamp: '2 hours ago',
      status: 'success' as const,
    },
    {
      id: '5',
      type: 'payment',
      description: 'Payment completed: "City Lights" sold for $1,200',
      user: 'Marcus Rodriguez',
      timestamp: '3 hours ago',
      status: 'success' as const,
    },
  ];

  const systemStatus = [
    {
      service: 'Stripe Webhooks',
      status: 'operational' as const,
      lastCheck: '2 minutes ago',
    },
    {
      service: 'Supabase Database',
      status: 'operational' as const,
      lastCheck: '1 minute ago',
    },
    {
      service: 'Email Delivery',
      status: 'operational' as const,
      lastCheck: '5 minutes ago',
    },
  ];

  const getDeltaColor = (type: string) => {
    switch (type) {
      case 'positive':
        return 'text-green-600 dark:text-green-400';
      case 'negative':
        return 'text-red-600 dark:text-red-400';
      case 'warning':
        return 'text-orange-600 dark:text-orange-400';
      default:
        return 'text-neutral-500 dark:text-neutral-400';
    }
  };

  const getActivityIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
      default:
        return <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300';
      case 'degraded':
        return 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300';
      default:
        return 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Dashboard</h1>
        <p className="text-neutral-600 dark:text-neutral-300">
          Overview of platform metrics and recent activity
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="bg-white rounded-xl p-6 border border-neutral-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 ${kpi.iconBg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${kpi.iconColor}`} />
                </div>
              </div>
              <div className="text-sm text-neutral-600 mb-1">
                {kpi.label}
              </div>
              <div className="text-2xl mb-2 text-neutral-900">
                {kpi.value}
              </div>
              <div className={`text-xs ${getDeltaColor(kpi.deltaType)}`}>
                {kpi.delta}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={action.onClick}
                className="bg-white border border-neutral-200 rounded-xl p-6 hover:shadow-lg hover:border-neutral-300 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center group-hover:bg-neutral-900 transition-colors">
                    <Icon className="w-5 h-5 text-neutral-600 group-hover:text-white" />
                  </div>
                  <span className="text-neutral-900">{action.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
              <h2 className="text-xl">Recent Activity</h2>
            </div>
            <div className="divide-y divide-neutral-100">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="p-6 hover:bg-neutral-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getActivityIcon(activity.status)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-neutral-900 mb-1">
                        {activity.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <span>{activity.user}</span>
                        <span>•</span>
                        <span>{activity.timestamp}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-neutral-200">
              <button
                onClick={() => onNavigate('admin-activity-log')}
                className="w-full text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                View all activity →
              </button>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div>
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
              <h2 className="text-xl">System Status</h2>
            </div>
            <div className="p-6 space-y-4">
              {systemStatus.map((system) => (
                <div key={system.service}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-neutral-900 dark:text-neutral-50">
                      {system.service}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(system.status)}`}>
                      {system.status}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Last checked {system.lastCheck}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
