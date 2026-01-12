import { TrendingUp, Users, Gift } from 'lucide-react';

interface VenueDashboardModuleProps {
  onNavigate?: (page: string) => void;
}

export function VenueDashboardModule({ onNavigate }: VenueDashboardModuleProps) {
  const stats = {
    totalEarnings: 2850,
    monthlyEarnings: 425,
    salesCount: 12,
    nextPayoutDate: '2026-02-15',
  };

  return (
    <div className="space-y-6">
      {/* Section Title */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[var(--text)]">Earnings & Payouts</h2>
        <button
          onClick={() => onNavigate?.('referral-program')}
          className="text-sm px-4 py-2 bg-[var(--accent)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-opacity font-medium"
        >
          Refer & Earn
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[var(--surface)] rounded-lg p-6 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-[var(--text-muted)]">Total Earnings</h3>
            <TrendingUp className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <p className="text-3xl font-bold text-[var(--text)]">${stats.totalEarnings}</p>
          <p className="text-xs text-[var(--text-muted)] mt-2">All time</p>
        </div>

        <div className="bg-[var(--surface)] rounded-lg p-6 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-[var(--text-muted)]">This Month</h3>
            <Users className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-[var(--text)]">${stats.monthlyEarnings}</p>
          <p className="text-xs text-[var(--text-muted)] mt-2">January 2026</p>
        </div>

        <div className="bg-[var(--surface)] rounded-lg p-6 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-[var(--text-muted)]">Total Sales</h3>
            <Gift className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-[var(--text)]">{stats.salesCount}</p>
          <p className="text-xs text-[var(--text-muted)] mt-2">Artworks sold from your space</p>
        </div>

        <div className="bg-[var(--accent)]/10 rounded-lg p-6 border border-[var(--accent)]/30">
          <h3 className="text-sm font-medium text-[var(--text-muted)] mb-2">Next Payout</h3>
          <p className="text-xl font-bold text-[var(--text)]">{stats.nextPayoutDate}</p>
          <p className="text-xs text-[var(--text-muted)] mt-2">Direct to your account</p>
        </div>
      </div>

      {/* Share Assets */}
      <div className="bg-[var(--surface)] rounded-lg p-6 border border-[var(--border)]">
        <h3 className="font-semibold text-[var(--text)] mb-4">Share on Social Media</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button className="py-3 px-4 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text)] rounded-lg transition-colors text-sm font-medium">
            Share Kit
          </button>
          <button className="py-3 px-4 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text)] rounded-lg transition-colors text-sm font-medium">
            Download Graphics
          </button>
          <button className="py-3 px-4 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text)] rounded-lg transition-colors text-sm font-medium">
            Copy Bio Link
          </button>
        </div>
      </div>

      {/* Referral CTA */}
      <div className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent)]/80 rounded-lg p-6 text-[var(--accent-contrast)]">
        <h3 className="font-bold mb-2">Know another venue?</h3>
        <p className="text-sm opacity-90 mb-4">Refer them and earn a bonus when they join the program.</p>
        <button
          onClick={() => onNavigate?.('referral-program')}
          className="px-4 py-2 bg-[var(--accent-contrast)] text-[var(--accent)] rounded font-semibold hover:opacity-90 transition-opacity text-sm"
        >
          Start Referring
        </button>
      </div>
    </div>
  );
}