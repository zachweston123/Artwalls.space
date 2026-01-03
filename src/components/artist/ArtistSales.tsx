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
        <p className="text-neutral-600">Track your artwork sales and income. Payouts vary by subscription plan.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 border border-neutral-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-neutral-600">Total Earnings</div>
              <div className="text-2xl text-neutral-900">${totalEarnings.toFixed(2)}</div>
            </div>
          </div>
          <div className="text-xs text-neutral-500">80% of total sales</div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-neutral-200">
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

        <div className="bg-white rounded-xl p-6 border border-neutral-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-neutral-600">Average Sale</div>
              <div className="text-2xl text-neutral-900">${averageSale.toFixed(0)}</div>
            </div>
          </div>
          <div className="text-xs text-neutral-500">Per artwork</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="p-6 border-b border-neutral-200">
          <h2 className="text-xl">Sales History</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50">
              <tr>
                <th className="text-left px-6 py-3 text-sm text-neutral-600">Artwork</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-600">Venue</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-600">Sale Price</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-600">Your Earnings</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-600">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {mockSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-neutral-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-neutral-100 rounded overflow-hidden">
                        <img
                          src={sale.artworkImage}
                          alt={sale.artworkTitle}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-sm text-neutral-900">{sale.artworkTitle}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-600">{sale.venueName}</td>
                  <td className="px-6 py-4 text-sm text-neutral-900">${sale.price.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <span className="text-green-600">${sale.artistEarnings.toFixed(2)}</span>
                      <span className="text-xs text-neutral-500 ml-1">(80%)</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-600">
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

  );
        <div className="mt-6 bg-blue-50 rounded-xl p-6 border border-blue-100">
          <h3 className="text-lg mb-2">Payout Information (by plan)</h3>
          <p className="text-sm text-blue-900 mb-4">
            Artist payout depends on your subscription plan. Venue commission is 10% by default; the remaining percentage is the platform fee.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="text-left px-4 py-3 text-neutral-600">Plan</th>
                  <th className="text-left px-4 py-3 text-neutral-600">Artist</th>
                  <th className="text-left px-4 py-3 text-neutral-600">Venue</th>
                  <th className="text-left px-4 py-3 text-neutral-600">Platform</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {[
                  { id: 'free', name: 'Free', platform: 15 },
                  { id: 'starter', name: 'Starter', platform: 10 },
                  { id: 'growth', name: 'Growth', platform: 8 },
                  { id: 'pro', name: 'Pro', platform: 6 },
                ].map((plan) => {
                  const venue = 10;
                  const artist = Math.max(0, 100 - venue - plan.platform);
                  return (
                    <tr key={plan.id}>
                      <td className="px-4 py-3 text-neutral-900">{plan.name}</td>
                      <td className="px-4 py-3 text-blue-600">{artist}%</td>
                      <td className="px-4 py-3 text-neutral-900">{venue}%</td>
                      <td className="px-4 py-3 text-neutral-600">{plan.platform}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-neutral-500 mt-3">Actual payout amounts are calculated per sale. Example sales shown above use a simplified 80/10/10 split.</p>
        </div>
}
