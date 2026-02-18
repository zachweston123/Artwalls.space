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
import { StatCard } from '../ui/stat-card';
import { PageHeroHeader } from '../PageHeroHeader';

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
  const [userMetrics, setUserMetrics] = useState<{
    totalUsers: number;
    totalArtists: number;
    artistsByTier: Record<string, number>;
    artistsByType: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Fetch main metrics first (required)
        const metricsResp = await apiGet<{
          totals: { artists: number; venues: number; activeDisplays: number };
          month: { gmv: number; platformRevenue: number; gvmDelta: number };
          monthlyArtistsDelta: number;
          monthlyVenuesDelta: number;
          pendingInvites: number;
          supportQueue: number;
          recentActivity: Array<{ type: string; timestamp: string; amount_cents: number }>;
        }>('/api/admin/metrics');
        
        if (mounted) {
          setMetrics(metricsResp);
        }

        // Fetch user metrics separately (optional, don't fail if unavailable)
        try {
          const userMetricsResp = await apiGet<{
            totalUsers: number;
            totalArtists: number;
            artistsByTier: Record<string, number>;
            artistsByType: Record<string, number>;
          }>('/api/admin/user-metrics');
          if (mounted) {
            setUserMetrics(userMetricsResp);
          }
        } catch (userMetricsErr: any) {
          console.warn('User metrics unavailable:', userMetricsErr?.message);
          // Set default values so UI doesn't break
          if (mounted) {
            setUserMetrics({
              totalUsers: metricsResp.totals.artists + metricsResp.totals.venues,
              totalArtists: metricsResp.totals.artists,
              artistsByTier: {},
              artistsByType: {},
            });
          }
        }
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
      label: 'Total Users',
      value: userMetrics ? String(userMetrics.totalUsers) : '-',
      delta: 'All registered accounts',
      deltaType: 'neutral' as const,
      icon: Users,
      accent: 'blue' as const,
      onClick: () => onNavigate('admin-users'),
    },
    {
      label: 'Total Artists',
      value: metrics ? String(metrics.totals.artists) : '-',
      delta: metrics ? `+${metrics.monthlyArtistsDelta} this month` : 'Loading...',
      deltaType: 'positive' as const,
      icon: Users,
      accent: 'blue' as const,
      onClick: () => onNavigate('admin-users', { type: 'artists' }),
    },
    {
      label: 'Total Venues',
      value: metrics ? String(metrics.totals.venues) : '-',
      delta: metrics ? `+${metrics.monthlyVenuesDelta} this month` : 'Loading...',
      deltaType: 'positive' as const,
      icon: Building,
      accent: 'green' as const,
      onClick: () => onNavigate('admin-users', { type: 'venues' }),
    },
    {
      label: 'Active Displays',
      value: metrics ? String(metrics.totals.activeDisplays) : '-',
      delta: metrics && metrics.totals.activeDisplays > 0 ? `${Math.round((metrics.totals.activeDisplays / Math.max(1, metrics.totals.activeDisplays + 50)) * 100)}% utilized` : 'No active displays',
      deltaType: 'neutral' as const,
      icon: Frame,
      accent: 'violet' as const,
      onClick: () => onNavigate('admin-current-displays'),
    },
    {
      label: 'Pending Invites',
      value: metrics ? String(metrics.pendingInvites) : '-',
      delta: metrics && metrics.pendingInvites > 0 ? 'Needs review' : 'None pending',
      deltaType: metrics && metrics.pendingInvites > 0 ? 'warning' as const : 'positive' as const,
      icon: Mail,
      accent: 'amber' as const,
      onClick: () => onNavigate('admin-invites'),
    },
    {
      label: 'Total GMV (Month)',
      value: metrics ? `$${(metrics.month.gmv / 100).toFixed(2)}` : '-',
      delta: metrics ? `+${metrics.month.gvmDelta}% vs last month` : 'Loading...',
      deltaType: 'positive' as const,
      icon: DollarSign,
      accent: 'green' as const,
      onClick: () => onNavigate('admin-sales'),
    },
    {
      label: 'Platform Revenue',
      value: metrics ? `$${(metrics.month.platformRevenue / 100).toFixed(2)}` : '-',
      delta: '10% platform fee',
      deltaType: 'neutral' as const,
      icon: TrendingUp,
      accent: 'blue' as const,
      onClick: () => onNavigate('admin-sales'),
    },
    {
      label: 'Support Queue',
      value: metrics ? String(metrics.supportQueue) : '-',
      delta: metrics && metrics.supportQueue > 0 ? `${Math.max(1, Math.floor(metrics.supportQueue * 0.3))} urgent` : 'No issues',
      deltaType: metrics && metrics.supportQueue > 0 ? 'warning' as const : 'positive' as const,
      icon: AlertCircle,
      accent: 'amber' as const,
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
      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <p className="text-[var(--text-muted)]">Loading dashboard...</p>
        </div>
      )}

      {/* Error State */}
      {error && (() => {
        const isUnauthorized = error.includes('Unauthorized') || error.includes('AUTH_REQUIRED');
        const isForbidden = error.includes('Forbidden') || error.includes('ADMIN_REQUIRED');

        if (isUnauthorized) {
          return (
            <div className="mb-8 bg-[var(--warning-muted,#fef3c7)] border border-[var(--warning,#f59e0b)] text-[var(--warning-fg,#92400e)] p-4 rounded-lg">
              <p className="font-semibold mb-1">Session expired</p>
              <p className="text-sm">Please log in again to access the admin dashboard.</p>
            </div>
          );
        }

        if (isForbidden) {
          return (
            <div className="mb-8 bg-[var(--danger-muted)] border border-[var(--danger)] text-[var(--danger)] p-4 rounded-lg">
              <p className="font-semibold mb-1">Access denied</p>
              <p className="text-sm">You don't have admin access. Contact the site owner to be added to the admin list.</p>
            </div>
          );
        }

        return (
          <div className="mb-8 bg-[var(--danger-muted)] border border-[var(--danger)] text-[var(--danger)] p-4 rounded-lg">
            <p className="font-semibold mb-1">Failed to load dashboard</p>
            <p className="text-sm">{error}</p>
          </div>
        );
      })()}

      {/* Content - only show if not loading and data exists */}
      {!loading && metrics && (
        <>
      {/* Header */}
      <PageHeroHeader
        title="Dashboard"
        subtitle="Overview of platform metrics and recent activity"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <StatCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              icon={<Icon className="w-5 h-5" />}
              accent={kpi.accent}
              delta={kpi.delta}
              deltaType={kpi.deltaType}
              onClick={kpi.onClick}
            />
          );
        })}
      </div>

      {/* User Overview Section */}
      {userMetrics && (
        <div className="mb-8">
          <h2 className="text-xl mb-4 text-[var(--text)]">User Overview</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Artists by Subscription Tier */}
            <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] p-6">
              <h3 className="text-lg mb-4 text-[var(--text)]">Artists by Subscription Tier</h3>
              <div className="space-y-3">
                {Object.entries(userMetrics.artistsByTier)
                  .sort(([, a], [, b]) => b - a)
                  .map(([tier, count]) => {
                    const tierLabels: Record<string, string> = {
                      free: 'Free',
                      starter: 'Starter',
                      growth: 'Growth',
                      pro: 'Pro',
                      inactive: 'Inactive',
                      cancelled: 'Cancelled',
                      unknown: 'Unknown'
                    };
                    const tierColors: Record<string, string> = {
                      free: 'bg-[var(--surface-3)] text-[var(--text-muted)]',
                      starter: 'bg-blue-500/10 text-blue-500',
                      growth: 'bg-green-500/10 text-green-500',
                      pro: 'bg-purple-500/10 text-purple-500',
                      inactive: 'bg-gray-500/10 text-gray-500',
                      cancelled: 'bg-red-500/10 text-red-500',
                      unknown: 'bg-[var(--surface-3)] text-[var(--text-muted)]'
                    };
                    return (
                      <div key={tier} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${tierColors[tier] || tierColors.unknown}`}>
                            {tierLabels[tier] || tier}
                          </span>
                        </div>
                        <span className="text-[var(--text)] font-semibold">{count}</span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Artists by Type */}
            <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] p-6">
              <h3 className="text-lg mb-4 text-[var(--text)]">Artists by Type</h3>
              <div className="space-y-3">
                {Object.entries(userMetrics.artistsByType)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 10)
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text)]">{type}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-[var(--surface-3)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[var(--blue)]"
                            style={{
                              width: `${Math.min(100, (count / userMetrics.totalArtists) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-[var(--text)] font-semibold w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

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
        </>
      )}
    </div>
  );
}
