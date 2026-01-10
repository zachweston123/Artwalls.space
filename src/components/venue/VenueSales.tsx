import { DollarSign, TrendingUp, Package } from 'lucide-react';
import { mockSales } from '../../data/mockData';

export function VenueSales() {
  const totalEarnings = mockSales.reduce((sum, sale) => sum + sale.venueEarnings, 0);
  const totalSales = mockSales.length;
  const averageCommission = totalEarnings / totalSales;

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Sales & Earnings</h1>
        <p className="text-[var(--text-muted)]">Track artwork sales and your commission (10% of sales)</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[var(--green-muted)] rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-[var(--green)]" />
            </div>
            <div>
              <div className="text-sm text-[var(--text-muted)]">Total Earnings</div>
              <div className="text-2xl">${totalEarnings.toFixed(2)}</div>
            </div>
          </div>
          <div className="text-xs text-[var(--text-muted)]">10% commission</div>
        </div>

        <div className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[var(--surface-2)] rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-[var(--blue)]" />
            </div>
            <div>
              <div className="text-sm text-[var(--text-muted)]">Artworks Sold</div>
              <div className="text-2xl">{totalSales}</div>
            </div>
          </div>
          <div className="text-xs text-[var(--text-muted)]">From your venue</div>
        </div>

        <div className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[var(--surface-2)] rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-[var(--blue)]" />
            </div>
            <div>
              <div className="text-sm text-[var(--text-muted)]">Avg. Commission</div>
              <div className="text-2xl">${averageCommission.toFixed(0)}</div>
            </div>
          </div>
          <div className="text-xs text-[var(--text-muted)]">Per sale</div>
        </div>
      </div>

      <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="p-6 border-b border-[var(--border)]">
          <h2 className="text-xl">Sales History</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--surface-3)]">
              <tr>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Artwork</th>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Artist</th>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Sale Price</th>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Your Commission</th>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {mockSales.map((sale) => (
                <tr key={sale.id} className="transition-colors hover:bg-[var(--surface-3)]">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[var(--surface-3)] rounded overflow-hidden">
                        <img
                          src={sale.artworkImage}
                          alt={sale.artworkTitle}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-sm">{sale.artworkTitle}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-muted)]">{sale.artistName}</td>
                  <td className="px-6 py-4 text-sm">${sale.price.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <span className="text-[var(--green)]">${sale.venueEarnings.toFixed(2)}</span>
                      <span className="text-xs text-[var(--text-muted)] ml-1">(10%)</span>
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

        {mockSales.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-[var(--surface-3)] rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-[var(--text-muted)]" />
            </div>
            <h3 className="text-xl mb-2">No sales yet</h3>
            <p className="text-[var(--text-muted)]">Sales will appear here once artwork is purchased</p>
          </div>
        )}
      </div>

      <div className="mt-6 bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--border)]">
        <h3 className="text-lg mb-2">Commission Structure</h3>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          You receive 10% commission on each artwork sold from your venue. Artist earnings vary by their subscription plan (65%-85%), and Artwalls keeps the remainder as a platform & processing fee.
        </p>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="bg-[var(--surface-1)] rounded-lg p-3 border border-[var(--border)]">
            <div className="text-[var(--text-muted)] mb-1">Artist</div>
            <div className="text-xl text-[var(--blue)]">65-85%*</div>
          </div>
          <div className="bg-[var(--surface-1)] rounded-lg p-3 border border-[var(--border)]">
            <div className="text-[var(--text-muted)] mb-1">Your Venue</div>
            <div className="text-xl text-[var(--green)]">10%</div>
          </div>
          <div className="bg-[var(--surface-1)] rounded-lg p-3 border border-[var(--border)]">
            <div className="text-[var(--text-muted)] mb-1">Platform</div>
            <div className="text-xl text-[var(--text-muted)]">5-25%</div>
          </div>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-3">* Artist payout varies by their subscription plan. Platform fee covers processing and infrastructure costs.</p>
      </div>
    </div>
  );
}