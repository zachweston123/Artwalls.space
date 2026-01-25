import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Package, BarChart3, Calendar, Eye } from 'lucide-react';
import { apiGet } from '../../lib/api';
import type { User } from '../../App';

interface ArtistSalesProps { 
  user: User;
  onNavigate?: (page: string) => void;
}

type SubscriptionTier = 'free' | 'starter' | 'growth' | 'pro';

export function ArtistSales({ user, onNavigate }: ArtistSalesProps) {
  const [sales, setSales] = useState<Array<{ id: string; price: number; artistEarnings: number; artworkTitle: string; artworkImage?: string | null; venueName?: string | null; saleDate: string }>>([]);
  const [tier, setTier] = useState<SubscriptionTier>('free');

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        // Get subscription tier
        const meResp = await apiGet<{ profile?: { subscription_tier?: string } }>('/api/me');
        if (isMounted) {
          const userTier = (meResp?.profile?.subscription_tier || 'free').toLowerCase() as SubscriptionTier;
          setTier(userTier);
        }

        // Get sales data
        const resp = await apiGet<{ sales: Array<{ id: string; price: number; artistEarnings: number; artworkTitle: string; artworkImage?: string | null; venueName?: string | null; saleDate: string }> }>(`/api/sales/artist?artistId=${user.id}`);
        if (!isMounted) return;
        setSales(resp.sales || []);
      } catch {
        if (!isMounted) return;
        setSales([]);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [user.id]);

  const totalEarnings = sales.reduce((sum, sale) => sum + (sale.artistEarnings || 0), 0);
  const totalGross = sales.reduce((sum, sale) => sum + (sale.price || 0), 0);
  const totalSales = sales.length;
  const averageSale = totalSales > 0 ? totalGross / totalSales : 0;

  // Get payout percentage based on plan
  const getPayoutPercentage = (plan: string) => {
    switch (plan) {
      case 'starter':
        return '80%';
      case 'growth':
        return '83%';
      case 'pro':
        return '85%';
      case 'free':
      default:
        return '60%';
    }
  };

  const actualPayoutPercent = totalGross > 0 ? Math.round((totalEarnings / totalGross) * 100) : null;
  const payoutPercentLabel = actualPayoutPercent != null ? `${actualPayoutPercent}%` : getPayoutPercentage(tier);

  const getSalePayoutPercent = (sale: { price: number; artistEarnings: number }) => {
    if (!sale.price) return null;
    return Math.round((sale.artistEarnings / sale.price) * 100);
  };

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Sales & Earnings</h1>
        <p className="text-[var(--text-muted)]">Track your artwork sales and income. Payouts vary by subscription plan.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[var(--green-muted)] border border-[var(--border)] rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-[var(--green)]" />
            </div>
            <div>
              <div className="text-sm text-[var(--text-muted)]">Total Earnings</div>
              <div className="text-2xl text-[var(--text)]">${totalEarnings.toFixed(2)}</div>
            </div>
          </div>
          <div className="text-xs text-[var(--text-muted)]">{payoutPercentLabel} of total sales</div>
        </div>

        <div className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[var(--green-muted)] border border-[var(--border)] rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-[var(--green)]" />
            </div>
            <div>
              <div className="text-sm text-[var(--text-muted)]">Total Sales</div>
              <div className="text-2xl text-[var(--text)]">{totalSales}</div>
            </div>
          </div>
          <div className="text-xs text-[var(--text-muted)]">Artworks sold</div>
        </div>

        <div className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-[var(--blue)]" />
            </div>
            <div>
              <div className="text-sm text-[var(--text-muted)]">Average Sale</div>
              <div className="text-2xl text-[var(--text)]">${averageSale.toFixed(0)}</div>
            </div>
          </div>
          <div className="text-xs text-[var(--text-muted)]">Per artwork</div>
        </div>
      </div>

      {/* Advanced Analytics - Growth/Pro Only */}
      {(['growth', 'pro'] as SubscriptionTier[]).includes(tier) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-3)] rounded-xl p-6 border border-[var(--accent)] border-opacity-30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[var(--accent)] bg-opacity-20 rounded-lg flex items-center justify-center">
                  <Eye className="w-5 h-5 text-[var(--accent)]" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--text)]">Top Performing Artwork</h3>
              </div>
              <span className="text-xs bg-[var(--accent)] bg-opacity-20 text-[var(--accent)] px-2 py-1 rounded">Advanced</span>
            </div>
            {sales.length > 0 ? (
              <div className="space-y-2">
                {sales
                  .reduce((acc, sale) => {
                    const existing = acc.find(s => s.title === sale.artworkTitle);
                    if (existing) {
                      existing.count += 1;
                      existing.earnings += sale.artistEarnings;
                    } else {
                      acc.push({ title: sale.artworkTitle, count: 1, earnings: sale.artistEarnings });
                    }
                    return acc;
                  }, [] as Array<{ title: string; count: number; earnings: number }>)
                  .sort((a, b) => b.earnings - a.earnings)
                  .slice(0, 3)
                  .map((art, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-[var(--text-muted)] truncate">{art.title}</span>
                      <span className="text-[var(--accent)] font-semibold">${art.earnings.toFixed(0)}</span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">No sales data yet</p>
            )}
          </div>

          <div className="bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-3)] rounded-xl p-6 border border-[var(--accent)] border-opacity-30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[var(--accent)] bg-opacity-20 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-[var(--accent)]" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--text)]">Sales Trend (Last 30 Days)</h3>
              </div>
              <span className="text-xs bg-[var(--accent)] bg-opacity-20 text-[var(--accent)] px-2 py-1 rounded">Advanced</span>
            </div>
            {sales.length > 0 ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Last 7 days</span>
                  <span className="text-[var(--accent)] font-semibold">
                    {sales.filter(s => new Date(s.saleDate) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length} sales
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Last 30 days</span>
                  <span className="text-[var(--accent)] font-semibold">
                    {sales.filter(s => new Date(s.saleDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length} sales
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-[var(--border)]">
                  <span className="text-[var(--text-muted)]">Monthly average</span>
                  <span className="text-[var(--accent)] font-semibold">
                    ${(sales.filter(s => new Date(s.saleDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).reduce((sum, s) => sum + s.artistEarnings, 0) / 4).toFixed(0)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">No sales data yet</p>
            )}
          </div>
        </div>
      )}

      {/* Analytics Upsell - Free/Starter Only */}
      {(['free', 'starter'] as SubscriptionTier[]).includes(tier) && (
        <div className="mb-8 bg-[var(--surface-2)] border-2 border-[var(--accent)] border-opacity-30 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <BarChart3 className="w-6 h-6 text-[var(--accent)] flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-[var(--text)] mb-1">Unlock Advanced Analytics</h3>
              <p className="text-sm text-[var(--text-muted)] mb-3">
                Upgrade to Growth or Pro to see detailed performance insights, top artworks, and 30-day sales trends.
              </p>
              <button 
                onClick={() => onNavigate?.('plans-pricing')}
                className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                View Upgrade Options
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="p-6 border-b border-[var(--border)]">
          <h2 className="text-xl">Sales History</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--surface-3)]">
              <tr>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Artwork</th>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Venue</th>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Sale Price</th>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Your Earnings</th>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {sales.map((sale) => (
                <tr key={sale.id} className="transition-colors hover:bg-[var(--surface-3)]">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[var(--surface-3)] border border-[var(--border)] rounded overflow-hidden">
                        <img
                          src={sale.artworkImage || 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400'}
                          alt={sale.artworkTitle}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-sm text-[var(--text)]">{sale.artworkTitle}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-muted)]">{sale.venueName || '—'}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text)]">${sale.price.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <span className="text-[var(--accent)]">${sale.artistEarnings.toFixed(2)}</span>
                      {getSalePayoutPercent(sale) != null && (
                        <span className="text-xs text-[var(--text-muted)] ml-1">({getSalePayoutPercent(sale)}%)</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-muted)]">
                    {new Date(sale.saleDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sales.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-[var(--surface-2)] border border-[var(--border)] rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-[var(--text-muted)]" />
            </div>
            <h3 className="text-xl mb-2">No sales yet</h3>
            <p className="text-[var(--text-muted)]">Your sales will appear here once artwork is purchased</p>
          </div>
        )}
      </div>

      <div className="mt-6 bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--border)]">
        <h3 className="text-lg mb-2">Payout Information (by plan)</h3>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Artist payout depends on your subscription plan. Venue commission is 15% by default; the remaining percentage is the platform fee.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-3)]">
              <tr>
                <th className="text-left px-4 py-3 text-[var(--text-muted)]">Plan</th>
                <th className="text-left px-4 py-3 text-[var(--text-muted)]">Artist</th>
                <th className="text-left px-4 py-3 text-[var(--text-muted)]">Venue</th>
                <th className="text-left px-4 py-3 text-[var(--text-muted)]">Platform fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {[
                { id: 'free', name: 'Free', artist: 60 },
                { id: 'starter', name: 'Starter', artist: 80 },
                { id: 'growth', name: 'Growth', artist: 83 },
                { id: 'pro', name: 'Pro', artist: 85 },
              ].map((plan) => {
                const venue = 15;
                const platform = Math.max(0, 100 - venue - plan.artist);
                return (
                  <tr key={plan.id}>
                    <td className="px-4 py-3 text-[var(--text)]">{plan.name}</td>
                    <td className="px-4 py-3 text-[var(--green)]">{plan.artist}%</td>
                    <td className="px-4 py-3 text-[var(--text)]">{venue}%</td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{platform}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-3">Actual payout amounts are calculated per sale and can vary with fees. Venue commission is 15% by default.</p>
      </div>
    </div>
  );
}