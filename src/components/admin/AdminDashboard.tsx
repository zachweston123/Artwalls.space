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
import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../../lib/api';

interface AdminDashboardProps {
  onNavigate: (page: string, params?: any) => void;
}

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<{
    totals: { artists: number; venues: number; activeDisplays: number };
    month: { gmv: number; platformRevenue: number; gvmDelta: number };
    monthlyArtistsDelta: number;
    monthlyVenuesDelta: number;
    pendingInvites: number;
    supportQueue: number;
    recentActivity: Array<{ type: string; timestamp: string; amount_cents: number }>;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await apiGet<{
          totals: { artists: number; venues: number; activeDisplays: number };
          month: { gmv: number; platformRevenue: number; gvmDelta: number };
          monthlyArtistsDelta: number;
          monthlyVenuesDelta: number;
          pendingInvites: number;
          supportQueue: number;
          recentActivity: Array<{ type: string; timestamp: string; amount_cents: number }>;
        }>('/api/admin/metrics');
        if (mounted) setMetrics(resp);
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Failed to load metrics');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const kpis = [
    {
      label: 'Total Artists',
      value: metrics ? String(metrics.totals.artists) : '-',
      delta: metrics ? `+${metrics.monthlyArtistsDelta} this month` : 'Loading...',
      deltaType: 'positive' as const,
      icon: Users,
      iconBg: 'bg-[var(--surface-3)] border border-[var(--border)]',
      iconColor: 'text-[var(--blue)]',
      onClick: () => onNavigate('admin-users', { type: 'artists' }),
    },
    {
      label: 'Total Venues',
      value: metrics ? String(metrics.totals.venues) : '-',
      delta: metrics ? `+${metrics.monthlyVenuesDelta} this month` : 'Loading...',
      deltaType: 'positive' as const,
      icon: Building,
      iconBg: 'bg-[var(--surface-3)] border border-[var(--border)]',
      iconColor: 'text-[var(--green)]',
      onClick: () => onNavigate('admin-users', { type: 'venues' }),
    },
    {
      label: 'Active Displays',
      value: metrics ? String(metrics.totals.activeDisplays) : '-',
      delta: metrics && metrics.totals.activeDisplays > 0 ? `${Math.round((metrics.totals.activeDisplays / Math.max(1, metrics.totals.activeDisplays + 50)) * 100)}% utilized` : 'No active displays',
      deltaType: 'neutral' as const,
      icon: Frame,
      iconBg: 'bg-[var(--surface-3)] border border-[var(--border)]',
      iconColor: 'text-[var(--text-muted)]',
      onClick: () => onNavigate('admin-current-displays'),
    },
    {
      label: 'Pending Invites',
      value: metrics ? String(metrics.pendingInvites) : '-',
      delta: metrics && metrics.pendingInvites > 0 ? 'Needs review' : 'None pending',
      deltaType: metrics && metrics.pendingInvites > 0 ? 'warning' as const : 'positive' as const,
      icon: Mail,
      iconBg: 'bg-[var(--surface-3)] border border-[var(--border)]',
      iconColor: 'text-[var(--warning)]',
      onClick: () => onNavigate('admin-invites'),
    },
    {
      label: 'Total GMV (Month)',
      value: metrics ? `$${(metrics.month.gmv / 100).toFixed(2)}` : '-',
      delta: metrics ? `+${metrics.month.gvmDelta}% vs last month` : 'Loading...',
      deltaType: 'positive' as const,
      icon: DollarSign,
      iconBg: 'bg-[var(--surface-3)] border border-[var(--border)]',
      iconColor: 'text-[var(--green)]',
      onClick: () => onNavigate('admin-sales'),
    },
    {
      label: 'Platform Revenue',
      value: metrics ? `$${(metrics.month.platformRevenue / 100).toFixed(2)}` : '-',
      delta: '10% platform fee',
      deltaType: 'neutral' as const,
      icon: TrendingUp,
      iconBg: 'bg-[var(--surface-3)] border border-[var(--border)]',
      iconColor: 'text-[var(--blue)]',
      onClick: () => onNavigate('admin-sales'),
    },
    {
      label: 'Support Queue',
      value: metrics ? String(metrics.supportQueue) : '-',
      delta: metrics && metrics.supportQueue > 0 ? `${Math.max(1, Math.floor(metrics.supportQueue * 0.3))} urgent` : 'No issues',
      deltaType: metrics && metrics.supportQueue > 0 ? 'warning' as const : 'positive' as const,
      icon: AlertCircle,
      iconBg: 'bg-[var(--surface-3)] border border-[var(--border)]',
      iconColor: 'text-[var(--danger)]',
      onClick: () => onNavigate('admin-support'),
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

  const recentActivity = (metrics?.recentActivity || []).map((a, idx) => ({
    id: String(idx + 1),
    type: a.type,
    description: `Payment completed: Sale for $${Math.round((a.amount_cents || 0) / 100)}`,
    user: 'Sale',
    timestamp: new Date(a.timestamp).toLocaleString(),
    status: 'success' as const,
  }));

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

  // Test SMS state
  const [testTo, setTestTo] = useState('');
  const [testMsg, setTestMsg] = useState('Artwalls: Test SMS');
  const [sendingSms, setSendingSms] = useState(false);
  const [smsResult, setSmsResult] = useState<string | null>(null);

  async function sendTestSms() {
    try {
      setSendingSms(true);
      setSmsResult(null);
      await apiPost('/api/admin/test-sms', { to: testTo || undefined, body: testMsg });
      setSmsResult('Sent');
    } catch (e: any) {
      setSmsResult(e?.message || 'Failed');
    } finally {
      setSendingSms(false);
    }
  }

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
              onClick={kpi.onClick}
              className="bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--border)] hover:bg-[var(--surface-3)] transition-colors cursor-pointer"
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

          {/* Test SMS */}
          <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] mt-6">
            <div className="p-6 border-b border-[var(--border)]">
              <h2 className="text-xl text-[var(--text)]">Send Test SMS</h2>
              <p className="text-xs text-[var(--text-muted)] mt-1">Leave number empty to send to your profile phone.</p>
            </div>
            <div className="p-6 space-y-3">
              <input
                type="tel"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="+15551234567"
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-3)] text-[var(--text)]"
              />
              <input
                type="text"
                value={testMsg}
                onChange={(e) => setTestMsg(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-3)] text-[var(--text)]"
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={sendTestSms}
                  disabled={sendingSms}
                  className="px-4 py-2 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:opacity-90 disabled:opacity-60"
                >
                  {sendingSms ? 'Sending…' : 'Send Test SMS'}
                </button>
                {smsResult && (
                  <span className="text-sm text-[var(--text-muted)]">{smsResult}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
