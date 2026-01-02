import { DollarSign, TrendingUp, Package } from 'lucide-react';
import { mockSales } from '../../data/mockData';

export function ArtistSales() {
  const totalEarnings = mockSales.reduce((sum, sale) => sum + sale.artistEarnings, 0);
  const totalSales = mockSales.length;
  const averageSale = totalEarnings / totalSales;

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Sales & Earnings</h1>
        <p className="text-[var(--text-muted)]">Track your artwork sales and income (80% payout)</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">Total Earnings</div>
              <div className="text-2xl text-neutral-900 dark:text-neutral-50">${totalEarnings.toFixed(2)}</div>
            </div>
          </div>
          <div className="text-xs text-neutral-500">80% of total sales</div>
        </div>

        <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-neutral-600">Total Sales</div>
              <div className="text-2xl text-neutral-900">{totalSales}</div>
            </div>
          </div>
          <div className="text-xs text-neutral-500">Artworks sold</div>
        </div>

        <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-sm text-neutral-600">Average Sale</div>
              <div className="text-2xl text-neutral-900">${averageSale.toFixed(0)}</div>
            </div>
          </div>
          <div className="text-xs text-neutral-500">Per artwork</div>
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
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Venue</th>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Sale Price</th>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Your Earnings</th>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {mockSales.map((sale) => (
                <tr key={sale.id} className="transition-colors hover:bg-[var(--surface-3)]">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-neutral-100 rounded overflow-hidden">
                        <img
                          src={sale.artworkImage}
                          alt={sale.artworkTitle}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-sm text-[var(--text)]">{sale.artworkTitle}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-muted)]">{sale.venueName}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text)]">${sale.price.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <span className="text-[var(--accent)]">${sale.artistEarnings.toFixed(2)}</span>
                      <span className="text-xs text-[var(--text-muted)] ml-1">(80%)</span>
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
            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-neutral-400" />
            </div>
            <h3 className="text-xl mb-2">No sales yet</h3>
            <p className="text-neutral-600">Your sales will appear here once artwork is purchased</p>
          </div>
        )}
      </div>

      <div className="mt-6 bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--border)]">
        <h3 className="text-lg mb-2">Payout Information</h3>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          You receive 80% of the sale price. The venue receives 10%, and Artwalls keeps 10% as a platform fee.
        </p>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-3 border border-transparent dark:border-neutral-800">
            <div className="text-neutral-600 dark:text-neutral-300 mb-1">Artist</div>
            <div className="text-xl text-blue-600">80%</div>
          </div>
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-3 border border-transparent dark:border-neutral-800">
            <div className="text-neutral-600 dark:text-neutral-300 mb-1">Venue</div>
            <div className="text-xl text-green-600">10%</div>
          </div>
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-3 border border-transparent dark:border-neutral-800">
            <div className="text-neutral-600 dark:text-neutral-300 mb-1">Platform</div>
            <div className="text-xl text-neutral-600 dark:text-neutral-300">10%</div>
          </div>
        </div>
      </div>
    </div>
  );
}