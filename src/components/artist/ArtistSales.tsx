import { DollarSign, TrendingUp, Package } from 'lucide-react';
import { mockSales } from '../../data/mockData';

export function ArtistSales() {
  const totalEarnings = mockSales.reduce((sum, sale) => sum + sale.artistEarnings, 0);
  const totalSales = mockSales.length;
  const averageSale = totalEarnings / totalSales;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Sales & Earnings</h1>
        <p className="text-neutral-600">Track your artwork sales and income (80% payout)</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <div className="text-sm text-neutral-600 dark:text-neutral-300">Total Earnings</div>
              <div className="text-2xl text-neutral-900 dark:text-neutral-50">${totalEarnings.toFixed(2)}</div>
            </div>
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">80% of total sales</div>
        </div>

        <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-green-600 dark:text-green-300" />
            </div>
            <div>
              <div className="text-sm text-neutral-600 dark:text-neutral-300">Total Sales</div>
              <div className="text-2xl text-neutral-900 dark:text-neutral-50">{totalSales}</div>
            </div>
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">Artworks sold</div>
        </div>

        <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-300" />
            </div>
            <div>
              <div className="text-sm text-neutral-600 dark:text-neutral-300">Average Sale</div>
              <div className="text-2xl text-neutral-900 dark:text-neutral-50">${averageSale.toFixed(0)}</div>
            </div>
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">Per artwork</div>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-xl">Sales History</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 dark:bg-neutral-900">
              <tr>
                <th className="text-left px-6 py-3 text-sm text-neutral-600 dark:text-neutral-300">Artwork</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-600 dark:text-neutral-300">Venue</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-600 dark:text-neutral-300">Sale Price</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-600 dark:text-neutral-300">Your Earnings</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-600 dark:text-neutral-300">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
              {mockSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-900 rounded overflow-hidden">
                        <img
                          src={sale.artworkImage}
                          alt={sale.artworkTitle}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-sm text-neutral-900 dark:text-neutral-50">{sale.artworkTitle}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-300">{sale.venueName}</td>
                  <td className="px-6 py-4 text-sm text-neutral-900 dark:text-neutral-50">${sale.price.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <span className="text-green-600 dark:text-green-400">${sale.artistEarnings.toFixed(2)}</span>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-1">(80%)</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-300">
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
            <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-neutral-400" />
            </div>
            <h3 className="text-xl mb-2">No sales yet</h3>
            <p className="text-neutral-600 dark:text-neutral-300">Your sales will appear here once artwork is purchased</p>
          </div>
        )}
      </div>

      <div className="mt-6 bg-blue-50 dark:bg-blue-900/30 rounded-xl p-6 border border-blue-100 dark:border-blue-800">
        <h3 className="text-lg mb-2">Payout Information</h3>
        <p className="text-sm text-blue-900 dark:text-blue-200 mb-4">
          You receive 80% of the sale price. The venue receives 10%, and Artwalls keeps 10% as a platform fee.
        </p>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-3 border border-transparent dark:border-neutral-700">
            <div className="text-neutral-600 dark:text-neutral-300 mb-1">Artist</div>
            <div className="text-xl text-blue-600 dark:text-blue-400">80%</div>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-3 border border-transparent dark:border-neutral-700">
            <div className="text-neutral-600 dark:text-neutral-300 mb-1">Venue</div>
            <div className="text-xl text-green-600 dark:text-green-400">10%</div>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-3 border border-transparent dark:border-neutral-700">
            <div className="text-neutral-600 dark:text-neutral-300 mb-1">Platform</div>
            <div className="text-xl text-neutral-600 dark:text-neutral-300">10%</div>
          </div>
        </div>
      </div>
    </div>
  );
}