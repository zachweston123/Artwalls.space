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
      iconBg: 'bg-[var(--surface-3)] border border-[var(--border)]',
      iconColor: 'text-[var(--blue)]',
    },
    {
      label: 'Total Venues',
      value: '387',
      delta: '+12 this month',
      deltaType: 'positive' as const,
      icon: Building,
      iconBg: 'bg-[var(--surface-3)] border border-[var(--border)]',
      iconColor: 'text-[var(--green)]',
    },
    {
      label: 'Active Displays',
      value: '542',
      delta: '89% capacity',
      deltaType: 'neutral' as const,
      icon: Frame,
      iconBg: 'bg-[var(--surface-3)] border border-[var(--border)]',
      iconColor: 'text-[var(--text-muted)]',
    },
    {
      label: 'Pending Invites',
      value: '23',
      delta: 'Needs review',
      deltaType: 'neutral' as const,
      icon: Mail,
      iconBg: 'bg-[var(--surface-3)] border border-[var(--border)]',
      iconColor: 'text-[var(--warning)]',
    },
    {
      label: 'Total GMV (Month)',
      value: '$48,392',
      delta: '+18% vs last month',
      deltaType: 'positive' as const,
      icon: DollarSign,
      iconBg: 'bg-[var(--surface-3)] border border-[var(--border)]',
      iconColor: 'text-[var(--green)]',
    },
    {
      label: 'Platform Revenue',
      value: '$4,839',
      delta: '10% platform fee',
      deltaType: 'neutral' as const,
      icon: TrendingUp,
      iconBg: 'bg-[var(--surface-3)] border border-[var(--border)]',
      iconColor: 'text-[var(--blue)]',
    },
    {
      label: 'Support Queue',
      value: '7',
      delta: '2 urgent',
      deltaType: 'warning' as const,
      icon: AlertCircle,
      iconBg: 'bg-[var(--surface-3)] border border-[var(--border)]',
      iconColor: 'text-[var(--danger)]',
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
        return 'text-[var(--green)]';
      case 'negative':
        return 'text-[var(--danger)]';
      case 'warning':
        return 'text-[var(--warning)]';
      default:
        return 'text-[var(--text-muted)]';
    }
  };

  const getActivityIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-[var(--green)]" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-[var(--warning)]" />;
      default:
        return <Activity className="w-4 h-4 text-[var(--blue)]" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-[var(--green-muted)] text-[var(--green)] border border-[var(--border)]';
      case 'degraded':
        return 'bg-[var(--surface-3)] text-[var(--warning)] border border-[var(--border)]';
      default:
        return 'bg-[var(--surface-3)] text-[var(--danger)] border border-[var(--border)]';
    }
  };

  return (
    <div className="bg-[var(--bg)]">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl mb-2 text-[var(--text)]">Dashboard</h1>
        <p className="text-[var(--text-muted)]">
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
              className="bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--border)]"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 ${kpi.iconBg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${kpi.iconColor}`} />
                </div>
              </div>
              <div className="text-sm text-[var(--text-muted)] mb-1">
                {kpi.label}
              </div>
              <div className="text-2xl mb-2 text-[var(--text)]">
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
        <h2 className="text-xl mb-4 text-[var(--text)]">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={action.onClick}
                className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6 hover:bg-[var(--surface-3)] transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--surface-3)] border border-[var(--border)] rounded-lg flex items-center justify-center group-hover:bg-[var(--blue)] transition-colors">
                    <Icon className="w-5 h-5 text-[var(--blue)] group-hover:text-[var(--on-blue)] transition-colors" />
                  </div>
                  <span className="text-[var(--text)]">{action.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)]">
            <div className="p-6 border-b border-[var(--border)]">
              <h2 className="text-xl text-[var(--text)]">Recent Activity</h2>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="p-6 hover:bg-[var(--surface-3)] transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getActivityIcon(activity.status)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--text)] mb-1">
                        {activity.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                        <span>{activity.user}</span>
                        <span>•</span>
                        <span>{activity.timestamp}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-[var(--border)]">
              <button
                onClick={() => onNavigate('admin-activity-log')}
                className="w-full text-sm text-[var(--blue)] hover:text-[var(--blue-hover)] transition-colors"
              >
                View all activity →
              </button>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div>
          <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)]">
            <div className="p-6 border-b border-[var(--border)]">
              <h2 className="text-xl text-[var(--text)]">System Status</h2>
            </div>
            <div className="p-6 space-y-4">
              {systemStatus.map((system) => (
                <div key={system.service}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[var(--text)]">
                      {system.service}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(system.status)}`}>
                      {system.status}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
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
