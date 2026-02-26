import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Package } from 'lucide-react';
import { PageHeroHeader } from '../PageHeroHeader';
import { EmptyState } from '../EmptyState';
import { formatCurrency, safeDivide } from '../../utils/format';
import { VenuePayoutsCard } from './VenuePayoutsCard';
import type { User } from '../../App';
import { StatCard } from '../ui/stat-card';
import { supabase } from '../../lib/supabase';

interface VenueSale {
  id: string;
  artworkTitle: string;
  artworkImage: string;
  artistName: string;
  price: number;
  venueEarnings: number;
  saleDate: string;
}

interface VenueSalesProps {
  onNavigate?: (page: string) => void;
  user?: User;
}

export function VenueSales({ onNavigate, user }: VenueSalesProps) {
  const [sales, setSales] = useState<VenueSale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadSales() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const venueId = user?.id || authData?.user?.id;
        if (!venueId) { setLoading(false); return; }

        const { data: orders } = await supabase
          .from('orders')
          .select('id, amount_cents, venue_commission_cents, artwork_id, created_at')
          .eq('venue_id', venueId)
          .order('created_at', { ascending: false })
          .limit(500);

        const rows = orders || [];
        const artworkIds = [...new Set(rows.map((o: any) => o.artwork_id).filter(Boolean))];
        let artworkMap: Record<string, { title: string; image_url: string | null; artist_name: string }> = {};
        if (artworkIds.length > 0) {
          const { data: artworks } = await supabase
            .from('artworks')
            .select('id, title, image_url, artist_id')
            .in('id', artworkIds);
          const artistIds = [...new Set((artworks || []).map((a: any) => a.artist_id).filter(Boolean))];
          let artistMap: Record<string, string> = {};
          if (artistIds.length > 0) {
            const { data: artists } = await supabase.from('artists').select('id, name').in('id', artistIds);
            for (const ar of (artists || [])) artistMap[ar.id] = ar.name || 'Unknown Artist';
          }
          for (const a of (artworks || [])) {
            artworkMap[a.id] = { title: a.title || 'Untitled', image_url: a.image_url || null, artist_name: artistMap[a.artist_id] || 'Unknown Artist' };
          }
        }

        const shaped: VenueSale[] = rows.map((o: any) => ({
          id: o.id,
          artworkTitle: artworkMap[o.artwork_id]?.title || 'Untitled',
          artworkImage: artworkMap[o.artwork_id]?.image_url || '',
          artistName: artworkMap[o.artwork_id]?.artist_name || 'Unknown Artist',
          price: (o.amount_cents || 0) / 100,
          venueEarnings: (o.venue_commission_cents || 0) / 100,
          saleDate: o.created_at,
        }));
        if (mounted) setSales(shaped);
      } catch {
        if (mounted) setSales([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadSales();
    return () => { mounted = false; };
  }, [user?.id]);

  const totalEarnings = sales.reduce((sum, sale) => sum + sale.venueEarnings, 0);
  const totalSales = sales.length;
  const averageCommission = safeDivide(totalEarnings, totalSales);
  const averageCommissionDisplay = averageCommission === null ? formatCurrency(0) : formatCurrency(averageCommission);

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <PageHeroHeader
        title="Sales & earnings"
        subtitle="Track artwork sales and your 15% commission share"
        actions={
          onNavigate ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('venue-walls')}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ border: '1px solid var(--border)', color: 'var(--text)', background: 'var(--surface-2)' }}
              >
                Add wall space
              </button>
              <button
                onClick={() => onNavigate('venue-dashboard')}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ background: 'var(--blue)', color: 'var(--on-blue)' }}
              >
                Set up payouts
              </button>
            </div>
          ) : undefined
        }
      />

      {user && (
        <div className="mb-6">
          <VenuePayoutsCard user={user} />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <StatCard
          label="Total Earnings"
          value={formatCurrency(totalEarnings)}
          subtext="15% commission"
          icon={<DollarSign className="w-5 h-5" />}
          accent="green"
        />
        <StatCard
          label="Artworks Sold"
          value={totalSales}
          subtext="From your venue"
          icon={<Package className="w-5 h-5" />}
          accent="blue"
        />
        <StatCard
          label="Avg. Commission"
          value={averageCommissionDisplay}
          subtext={averageCommission === null ? 'No sales yet' : 'Per sale'}
          icon={<TrendingUp className="w-5 h-5" />}
          accent="blue"
        />
      </div>

      <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="p-6 border-b border-[var(--border)]">
          <h2 className="text-xl">Sales History</h2>
        </div>

        {/* Mobile stacked cards */}
        <div className="sm:hidden divide-y divide-[var(--border)]">
          {sales.map((sale) => (
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
              {sales.map((sale) => (
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

        {sales.length === 0 && !loading && (
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