import { useEffect, useMemo, useState } from 'react';
import { ShoppingCart, MapPin, User, ArrowLeft, Loader2 } from 'lucide-react';
import { mockArtworks } from '../data/mockData';
import type { Artwork } from '../data/mockData';
import { apiGet, apiPost } from '../lib/api';

interface PurchasePageProps {
  artworkId: string;
  onBack?: () => void;
}

export function PurchasePage({ artworkId, onBack }: PurchasePageProps) {
  const fallback = useMemo(() => mockArtworks.find(a => a.id === artworkId) || mockArtworks[0], [artworkId]);
  const [artwork, setArtwork] = useState<Artwork | any>(fallback);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiGet<any>(`/api/artworks/${encodeURIComponent(artworkId)}`);
        if (!cancelled) setArtwork(data);
      } catch (e: any) {
        // If backend not running, still show mock data
        if (!cancelled) setArtwork(fallback);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [artworkId, fallback]);

  const handlePurchase = async () => {
    try {
      setBuying(true);
      setError(null);

      // If the artwork has a Stripe Payment Link, use it directly.
      if (artwork?.checkoutUrl) {
        window.location.href = artwork.checkoutUrl;
        return;
      }

      const { url } = await apiPost<{ url: string }>(
        '/api/stripe/create-checkout-session',
        { artworkId: artwork.id, buyerEmail: undefined },
      );

      window.location.href = url;
    } catch (e: any) {
      setError(e?.message || 'Unable to start checkout');
    } finally {
      setBuying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <div className="bg-[var(--surface-2)] border-b border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm">Back</span>
              </button>
            )}
            <span className="text-xl tracking-tight text-[var(--text)]">Artwalls</span>
            <div className="w-16" /> {/* Spacer for balance */}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          {/* Image */}
          <div className="bg-[var(--surface-2)] rounded-2xl overflow-hidden border border-[var(--border)] shadow-lg">
            <div className="aspect-square bg-[var(--surface-3)]">
              <img
                src={artwork.imageUrl}
                alt={artwork.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Details */}
          <div>
            <div className="mb-6">
              <span className="inline-block px-3 py-1 bg-[var(--surface-3)] text-[var(--text)] border border-[var(--border)] rounded-full text-sm mb-4">
                {artwork.status === 'sold' ? 'Sold' : 'Available for Purchase'}
              </span>
              <h1 className="text-3xl sm:text-4xl mb-3 text-[var(--text)]">{artwork.title}</h1>
                <div className="flex items-center gap-2 text-[var(--text-muted)] mb-4">
                <User className="w-5 h-5" />
                <span className="text-base sm:text-lg">by {artwork.artistName}</span>
              </div>
                <div className="flex items-start gap-2 text-[var(--text-muted)] mb-6">
                <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm sm:text-base">Currently on display at {artwork.venueName || 'Local Venue'}</span>
              </div>
            </div>

            <div className="mb-8">
              <p className="text-[var(--text)] leading-relaxed">{artwork.description}</p>
            </div>

            <div className="bg-[var(--surface-3)] rounded-xl p-4 sm:p-6 mb-6 border border-[var(--border)]">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-[var(--text-muted)]">Price</span>
                <span className="text-3xl sm:text-4xl text-[var(--text)]">${artwork.price}</span>
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                Supports local artist with ~80% of the sale going to the creator (before Stripe fees)
              </p>
            </div>

            {error && (
              <div className="bg-[var(--surface-3)] rounded-xl p-4 border border-[var(--border)] mb-4">
                <p className="text-sm text-[var(--text)]">{error}</p>
              </div>
            )}

            <button
              onClick={handlePurchase}
              disabled={buying || artwork.status === 'sold'}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 sm:py-4 bg-[var(--accent)] disabled:bg-[var(--surface-3)] text-[var(--accent-contrast)] disabled:text-[var(--text-muted)] rounded-xl hover:brightness-95 transition shadow-lg mb-4"
            >
              {buying ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingCart className="w-5 h-5" />}
              <span className="text-base sm:text-lg">{artwork.status === 'sold' ? 'Already Sold' : 'Buy This Artwork'}</span>
            </button>

            {loading && (
              <p className="text-xs text-[var(--text-muted)]">Loading latest availability…</p>
            )}

            {/* All Sales Final Notice */}
            <div className="bg-[var(--surface-3)] rounded-xl p-4 border border-[var(--border)] mb-6">
              <p className="text-sm text-[var(--text)]">
                <strong>All sales final:</strong> Please view artwork in person before purchasing. No returns or refunds available.
              </p>
            </div>

            <div className="space-y-3 pt-6 border-t border-[var(--border)]">
              <div className="flex items-start gap-3 text-sm">
                <div className="w-5 h-5 bg-[var(--surface-3)] border border-[var(--border)] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-[var(--text)]">Original physical artwork</p>
                  <p className="text-[var(--text-muted)]">Take it home immediately after purchase</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <div className="w-5 h-5 bg-[var(--surface-3)] border border-[var(--border)] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-[var(--text)]">Support local artists</p>
                  <p className="text-[var(--text-muted)]">Funds are routed to the artist automatically via Stripe Connect</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <div className="w-5 h-5 bg-[var(--surface-3)] border border-[var(--border)] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-[var(--text)]">Secure payment</p>
                  <p className="text-[var(--text-muted)]">Checkout is handled by Stripe</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
