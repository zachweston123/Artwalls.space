/**
 * VenueStatement — monthly commission statement with CSV export.
 * Fetches from GET /api/venues/me/statement?month=YYYY-MM
 * Shows gross sales, venue commission, order list, and a CSV download button.
 */

import { useState, useEffect, useCallback } from 'react';
import { FileText, Download, ArrowLeft, Loader2, DollarSign } from 'lucide-react';
import { apiGet } from '../../lib/api';
import { PageHeroHeader } from '../PageHeroHeader';
import { formatCurrency } from '../../utils/format';

interface VenueStatementProps {
  user: { id: string; name: string };
  onNavigate: (page: string) => void;
}

interface StatementOrder {
  orderId: string;
  date: string;
  artworkTitle: string;
  amount: number;
  commission: number;
}

interface StatementData {
  month: string;
  grossSales: number;
  totalCommission: number;
  orderCount: number;
  orders: StatementOrder[];
}

export function VenueStatement({ user, onNavigate }: VenueStatementProps) {
  // Default to current month
  const now = new Date();
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );
  const [data, setData] = useState<StatementData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await apiGet<StatementData>(`/api/venues/me/statement?month=${month}`);
      setData(resp);
    } catch (err) {
      console.error('Failed to load statement', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const downloadCSV = () => {
    if (!data || data.orders.length === 0) return;

    const header = 'Date,Order ID,Artwork,Sale Amount,Your Commission\n';
    const rows = data.orders.map(o =>
      `${o.date},${o.orderId},"${(o.artworkTitle || '').replace(/"/g, '""')}",${o.amount.toFixed(2)},${o.commission.toFixed(2)}`
    ).join('\n');
    const footer = `\nTotal,,,"${data.grossSales.toFixed(2)}","${data.totalCommission.toFixed(2)}"`;

    const blob = new Blob([header + rows + footer], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `artwalls-statement-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Generate month options (last 12 months)
  const monthOptions: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const formatMonth = (m: string) => {
    const [y, mo] = m.split('-');
    const d = new Date(Number(y), Number(mo) - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <PageHeroHeader
        breadcrumb="Dashboard / Statement"
        title="Commission statement"
        subtitle={`Monthly sales and commission report`}
        actions={
          <>
            <button
              onClick={() => onNavigate('venue-performance')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] hover:bg-[var(--surface-2)]"
            >
              Performance snapshot
            </button>
            <button
              onClick={() => onNavigate('venue-dashboard')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] hover:bg-[var(--surface-2)]"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </>
        }
      />

      {/* Month Selector */}
      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm font-medium text-[var(--text-muted)]">Month:</label>
        <select
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
        >
          {monthOptions.map(m => (
            <option key={m} value={m}>{formatMonth(m)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
        </div>
      ) : !data ? (
        <div className="text-center py-16 text-[var(--text-muted)]">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Unable to load statement data.</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-[var(--surface-1)] rounded-xl p-5 border border-[var(--border)]">
              <p className="text-sm text-[var(--text-muted)] mb-1">Gross Sales</p>
              <p className="text-2xl font-bold text-[var(--text)]">{formatCurrency(data.grossSales)}</p>
            </div>
            <div className="bg-[var(--surface-1)] rounded-xl p-5 border border-[var(--border)]">
              <p className="text-sm text-[var(--text-muted)] mb-1">Your Commission (15%)</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(data.totalCommission)}</p>
            </div>
            <div className="bg-[var(--surface-1)] rounded-xl p-5 border border-[var(--border)]">
              <p className="text-sm text-[var(--text-muted)] mb-1">Orders</p>
              <p className="text-2xl font-bold text-[var(--text)]">{data.orderCount}</p>
            </div>
          </div>

          {/* CSV Download */}
          {data.orders.length > 0 && (
            <div className="flex justify-end mb-4">
              <button
                onClick={downloadCSV}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
              >
                <Download className="w-4 h-4" />
                Download CSV
              </button>
            </div>
          )}

          {/* Orders Table */}
          {data.orders.length > 0 ? (
            <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                      <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">Date</th>
                      <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">Artwork</th>
                      <th className="text-right px-4 py-3 font-medium text-[var(--text-muted)]">Sale</th>
                      <th className="text-right px-4 py-3 font-medium text-[var(--text-muted)]">Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.orders.map(order => (
                      <tr key={order.orderId} className="border-b border-[var(--border)] last:border-0">
                        <td className="px-4 py-3 text-[var(--text-muted)]">
                          {new Date(order.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-[var(--text)] font-medium truncate max-w-[200px]">
                          {order.artworkTitle || '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-[var(--text)]">
                          {formatCurrency(order.amount)}
                        </td>
                        <td className="px-4 py-3 text-right text-green-600 dark:text-green-400 font-medium">
                          {formatCurrency(order.commission)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[var(--surface-2)] font-semibold">
                      <td colSpan={2} className="px-4 py-3 text-[var(--text)]">Total</td>
                      <td className="px-4 py-3 text-right text-[var(--text)]">{formatCurrency(data.grossSales)}</td>
                      <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">{formatCurrency(data.totalCommission)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-[var(--surface-1)] rounded-xl border border-[var(--border)]">
              <DollarSign className="w-8 h-8 mx-auto mb-2 text-[var(--text-muted)] opacity-40" />
              <p className="text-sm text-[var(--text-muted)]">No orders for {formatMonth(month)}.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
