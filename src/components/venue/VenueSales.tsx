import { DollarSign, TrendingUp, Package } from 'lucide-react';
import { mockSales } from '../../data/mockData';
import { PageHeader } from '../PageHeader';
import { EmptyState } from '../EmptyState';
import { formatCurrency, safeDivide } from '../../utils/format';
import { VenuePayoutsCard } from './VenuePayoutsCard';
import type { User } from '../../App';

interface VenueSalesProps {
  onNavigate?: (page: string) => void;
  user?: User;
}

export function VenueSales({ onNavigate, user }: VenueSalesProps) {
  const totalEarnings = mockSales.reduce((sum, sale) => sum + sale.venueEarnings, 0);
  const totalSales = mockSales.length;
  const averageCommission = safeDivide(totalEarnings, totalSales);
  const averageCommissionDisplay = averageCommission === null ? formatCurrency(0) : formatCurrency(averageCommission);

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <PageHeader
        breadcrumb="Performance / Sales & Earnings"
        title="Sales & earnings"
        subtitle="Track artwork sales and your 15% commission share"
        primaryAction={onNavigate ? { label: 'Set up payouts', onClick: () => onNavigate('venue-dashboard') } : undefined}
        secondaryAction={onNavigate ? { label: 'Add wall space', onClick: () => onNavigate('venue-walls') } : undefined}
        className="mb-8"
      />

      {user && (
        <div className="mb-6">
          <VenuePayoutsCard user={user} />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[var(--green-muted)] rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-[var(--green)]" />
            </div>
            <div>
              <div className="text-sm text-[var(--text-muted)]">Total Earnings</div>
              <div className="text-2xl">{formatCurrency(totalEarnings)}</div>
            </div>
          </div>
          <div className="text-xs text-[var(--text-muted)]">15% commission</div>
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
              <div className="text-2xl">{averageCommissionDisplay}</div>
            </div>
          </div>
          <div className="text-xs text-[var(--text-muted)]">{averageCommission === null ? 'No sales yet' : 'Per sale'}</div>
        </div>
      </div>

      <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="p-6 border-b border-[var(--border)]">
          <h2 className="text-xl">Sales History</h2>
        </div>

        {/* Mobile stacked cards */}
        <div className="sm:hidden divide-y divide-[var(--border)]">
          {mockSales.map((sale) => (
            <div key={sale.id} className="p-4 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[var(--surface-3)] rounded overflow-hidden flex-shrink-0">
                  <img src={sale.artworkImage} alt={sale.artworkTitle} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text)] truncate">{sale.artworkTitle}</p>
                  <p className="text-xs text-[var(--text-muted)]">{sale.artistName}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-[var(--text-muted)]">Sale: </span>
                  <span className="text-[var(--text)]">{formatCurrency(sale.price)}</span>
                </div>
                <div>
                  <span className="text-[var(--green)] font-semibold">{formatCurrency(sale.venueEarnings)}</span>
                  <span className="text-xs text-[var(--text-muted)] ml-1">(15%)</span>
                </div>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                {new Date(sale.saleDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
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
                  <td className="px-6 py-4 text-sm">{formatCurrency(sale.price)}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <span className="text-[var(--green)]">{formatCurrency(sale.venueEarnings)}</span>
                      <span className="text-xs text-[var(--text-muted)] ml-1">(15%)</span>
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
          <EmptyState
            icon={<DollarSign className="w-8 h-8" />}
            title="No sales yet"
            description="Add a wall space and invite artists so sales can appear here."
            primaryAction={{ label: 'Add a wall space', onClick: () => onNavigate?.('venue-walls') }}
            secondaryAction={{ label: 'Find artists', onClick: () => onNavigate?.('venue-find-artists') }}
            className="border-t border-[var(--border)]"
          />
        )}
      </div>

      <div className="mt-6 bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--border)]">
        <h3 className="text-lg mb-2">Commission Structure</h3>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          You receive 15% commission on each artwork sold from your venue. Artist earnings vary by their subscription plan (60%-85%), and Artwalls keeps the remainder as a platform & processing fee.
        </p>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="bg-[var(--surface-1)] rounded-lg p-3 border border-[var(--border)]">
            <div className="text-[var(--text-muted)] mb-1">Artist</div>
            <div className="text-xl text-[var(--blue)]">60-85%*</div>
          </div>
          <div className="bg-[var(--surface-1)] rounded-lg p-3 border border-[var(--border)]">
            <div className="text-[var(--text-muted)] mb-1">Your Venue</div>
            <div className="text-xl text-[var(--green)]">15%</div>
          </div>
          <div className="bg-[var(--surface-1)] rounded-lg p-3 border border-[var(--border)]">
            <div className="text-[var(--text-muted)] mb-1">Platform</div>
            <div className="text-xl text-[var(--text-muted)]">0-25%</div>
          </div>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-3">* Artist payout varies by their subscription plan. Platform fee covers processing and infrastructure costs.</p>
      </div>
    </div>
  );
}