import { DollarSign, Search, Filter, Download, RefreshCw, TrendingUp, Users, Building } from 'lucide-react';
import { useState, useEffect } from 'react';
import { apiGet } from '../../lib/api';

interface OrderRow {
  id: string;
  buyer_email: string;
  amount_cents: number;
  currency: string;
  platform_fee_cents: number;
  venue_payout_cents: number;
  artist_payout_cents: number;
  status: string;
  created_at: string;
  artist?: { id: string; name?: string | null; email?: string | null } | null;
  venue?: { id: string; name?: string | null; email?: string | null } | null;
  artwork?: { id: string; title?: string | null } | null;
}

interface SalesSummary {
  totalGmv: number;
  totalPlatformFees: number;
  totalVenueFees: number;
  totalArtistPayouts: number;
  orderCount: number;
}

const formatCurrency = (cents: number) => {
  return `$${(cents / 100).toFixed(2)}`;
};

const statusColors: Record<string, string> = {
  paid: 'bg-green-500/10 text-green-500',
  pending: 'bg-yellow-500/10 text-yellow-500',
  created: 'bg-blue-500/10 text-blue-500',
  failed: 'bg-red-500/10 text-red-500',
  refunded: 'bg-gray-500/10 text-gray-500',
};

export function AdminSales() {
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (statusFilter) params.set('status', statusFilter);
      const resp = await apiGet<{
        orders: OrderRow[];
        summary: SalesSummary;
        total: number;
      }>(`/api/admin/sales?${params.toString()}`);
      setOrders(resp.orders || []);
      setSummary(resp.summary || null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load sales data');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[var(--text)]">Sales & GMV</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="flex items-center gap-2 px-4 py-2 text-[var(--text-muted)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-2)] transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[var(--surface-2)] text-[var(--text)] rounded-lg border border-[var(--border)] hover:bg-[var(--surface-3)] transition-colors text-sm">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[var(--surface-3)] rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[var(--green)]" />
              </div>
              <span className="text-sm text-[var(--text-muted)]">Total GMV</span>
            </div>
            <p className="text-2xl font-bold text-[var(--text)]">{formatCurrency(summary.totalGmv)}</p>
            <p className="text-xs text-[var(--text-muted)]">{summary.orderCount} orders</p>
          </div>
          <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[var(--surface-3)] rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[var(--blue)]" />
              </div>
              <span className="text-sm text-[var(--text-muted)]">Platform Revenue</span>
            </div>
            <p className="text-2xl font-bold text-[var(--text)]">{formatCurrency(summary.totalPlatformFees)}</p>
            <p className="text-xs text-[var(--text-muted)]">Platform fees</p>
          </div>
          <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[var(--surface-3)] rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-[var(--text-muted)]" />
              </div>
              <span className="text-sm text-[var(--text-muted)]">Artist Payouts</span>
            </div>
            <p className="text-2xl font-bold text-[var(--text)]">{formatCurrency(summary.totalArtistPayouts)}</p>
            <p className="text-xs text-[var(--text-muted)]">Paid to artists</p>
          </div>
          <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[var(--surface-3)] rounded-lg flex items-center justify-center">
                <Building className="w-5 h-5 text-[var(--text-muted)]" />
              </div>
              <span className="text-sm text-[var(--text-muted)]">Venue Payouts</span>
            </div>
            <p className="text-2xl font-bold text-[var(--text)]">{formatCurrency(summary.totalVenueFees)}</p>
            <p className="text-xs text-[var(--text-muted)]">Paid to venues</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-[var(--surface-2)] border border-[var(--border)] text-[var(--danger)] px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-6">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search by email or session ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-[var(--border)] rounded-lg text-[var(--text)] bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)]"
          >
            <option value="">All statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="created">Created</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:opacity-90 transition-colors"
          >
            <Search className="w-4 h-4" />
            Search
          </button>
        </form>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-[var(--text-muted)]">Loading sales data...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-[var(--surface-2)] rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-[var(--text-muted)]" />
            </div>
            <p className="text-[var(--text-muted)]">No transactions found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-3 px-2 text-[var(--text-muted)] font-medium">Date</th>
                  <th className="text-left py-3 px-2 text-[var(--text-muted)] font-medium">Buyer</th>
                  <th className="text-left py-3 px-2 text-[var(--text-muted)] font-medium">Artwork</th>
                  <th className="text-left py-3 px-2 text-[var(--text-muted)] font-medium">Artist</th>
                  <th className="text-left py-3 px-2 text-[var(--text-muted)] font-medium">Venue</th>
                  <th className="text-right py-3 px-2 text-[var(--text-muted)] font-medium">Amount</th>
                  <th className="text-right py-3 px-2 text-[var(--text-muted)] font-medium">Platform Fee</th>
                  <th className="text-center py-3 px-2 text-[var(--text-muted)] font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]">
                    <td className="py-3 px-2 text-[var(--text)]">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-2 text-[var(--text)]">{order.buyer_email || '-'}</td>
                    <td className="py-3 px-2 text-[var(--text)]">{order.artwork?.title || '-'}</td>
                    <td className="py-3 px-2 text-[var(--text)]">{order.artist?.name || order.artist?.email || '-'}</td>
                    <td className="py-3 px-2 text-[var(--text)]">{order.venue?.name || order.venue?.email || '-'}</td>
                    <td className="py-3 px-2 text-right text-[var(--text)] font-medium">
                      {formatCurrency(order.amount_cents)}
                    </td>
                    <td className="py-3 px-2 text-right text-[var(--text-muted)]">
                      {formatCurrency(order.platform_fee_cents)}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[order.status] || 'bg-[var(--surface-3)] text-[var(--text-muted)]'}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
