import { TrendingUp, Calendar } from 'lucide-react';

export function VenueDashboardModule({ venueId }: any) {
  const earnings = {
    totalEarnings: 2847.50,
    monthlyEarnings: 345.20,
    salesCount: 23,
    nextPayoutDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[var(--text)]">Earnings Dashboard</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-[var(--accent)] to-[var(--accent)]/80 rounded-lg p-6 text-[var(--accent-contrast)]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">Total Earnings</span>
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-4xl font-bold">${earnings.totalEarnings.toFixed(2)}</p>
        </div>
        <div className="bg-[var(--surface)] rounded-lg p-6 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-[var(--text-muted)]">This Month</span>
            <Calendar className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <p className="text-4xl font-bold text-[var(--text)]">${earnings.monthlyEarnings.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
