import { useEffect, useMemo, useState } from 'react';
import { ShoppingCart, MapPin, User, ArrowLeft, Loader2 } from 'lucide-react';
type Artwork = {
  id: string;
  title: string;
  description?: string;
  price: number; // dollars
  currency?: string;
  imageUrl?: string;
  artistId?: string;
  status: 'available' | 'pending' | 'active' | 'sold';
  artistName?: string;
  venueName?: string;
  checkoutUrl?: string;
};
import { apiGet, apiPost } from '../lib/api';

interface PurchasePageProps {
  artworkId: string;
  onBack?: () => void;
}

export function PurchasePage({ artworkId, onBack }: PurchasePageProps) {
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [artistProfile, setArtistProfile] = useState<{ name?: string; bio?: string | null; profilePhotoUrl?: string | null; portfolioUrl?: string | null; cityPrimary?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  // Read purchase status from hash query (?status=success|cancel)
  const purchaseStatus = useMemo(() => {
    const hash = window.location.hash || '';
    const query = hash.includes('?') ? hash.split('?')[1] : '';
    const params = new URLSearchParams(query);
    return params.get('status');
  }, [artworkId]);

  // After success/cancel, refresh artwork and retrieve receipt
  const normalizeArtwork = (raw: any): Artwork => {
    const price = raw?.price ?? (typeof raw?.price_cents === 'number' ? raw.price_cents / 100 : 0);
    return {
      id: raw?.id,
      title: raw?.title || 'Artwork',
      description: raw?.description || undefined,
      price: Number(price || 0),
      currency: raw?.currency || 'usd',
      imageUrl: raw?.imageUrl || raw?.image_url || undefined,
      status: raw?.status || 'available',
      artistName: raw?.artistName || raw?.artist_name || undefined,
      artistId: raw?.artistId || raw?.artist_id || undefined,
      venueName: raw?.venueName || raw?.venue_name || undefined,
      checkoutUrl: raw?.checkoutUrl || raw?.checkout_url || undefined,
    };
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (purchaseStatus === 'success') {
        try {
          const data = await apiGet<{ order: { receiptUrl: string | null } | null }>(`/api/orders/by-artwork?artworkId=${encodeURIComponent(artworkId)}`);
          if (!cancelled) setReceiptUrl(data.order?.receiptUrl || null);
          // Refresh artwork to reflect sold status
          const art = await apiGet<any>(`/api/artworks/${encodeURIComponent(artworkId)}`);
          if (!cancelled) setArtwork(normalizeArtwork(art));
        } catch {}
      }
    })();
    return () => { cancelled = true; };
  }, [purchaseStatus, artworkId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiGet<any>(`/api/artworks/${encodeURIComponent(artworkId)}`);
        if (!cancelled) {
          const normalized = normalizeArtwork(data);
          setArtwork(normalized);
          if (normalized.artistId) {
            try {
              const artist = await apiGet<any>(`/api/artists/${encodeURIComponent(normalized.artistId)}`);
              if (!cancelled) setArtistProfile(artist || null);
            } catch {
              if (!cancelled) setArtistProfile(null);
            }
          }
        }
      } catch (e: any) {
        if (!cancelled) setArtwork(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [artworkId]);

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
              {artwork?.imageUrl ? (
                <img src={artwork.imageUrl} alt={artwork.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">No image</div>
              )}
            </div>
          </div>

          {/* Details */}
          <div>
            <div className="mb-6">
              <span className="inline-block px-3 py-1 bg-[var(--surface-3)] text-[var(--text)] border border-[var(--border)] rounded-full text-sm mb-4">
                {artwork?.status === 'sold' ? 'Sold' : 'Available for Purchase'}
              </span>
              <h1 className="text-3xl sm:text-4xl mb-3 text-[var(--text)]">{artwork?.title || 'Artwork'}</h1>
                <div className="flex items-center gap-2 text-[var(--text-muted)] mb-4">
                <User className="w-5 h-5" />
                <span className="text-base sm:text-lg">by {artwork?.artistName || 'Artist'}</span>
              </div>
                <div className="flex items-start gap-2 text-[var(--text-muted)] mb-6">
                <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm sm:text-base">Currently on display at {artwork?.venueName || 'Local Venue'}</span>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-[var(--text)] leading-relaxed">{artwork?.description || 'No description provided.'}</p>
            </div>

            <div className="bg-[var(--surface-3)] rounded-xl p-4 sm:p-6 mb-6 border border-[var(--border)]">
              <h2 className="text-lg font-semibold text-[var(--text)] mb-2">About the artist</h2>
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full overflow-hidden border border-[var(--border)] bg-[var(--surface-2)] flex-shrink-0">
                  {artistProfile?.profilePhotoUrl ? (
                    <img src={artistProfile.profilePhotoUrl} alt={artistProfile?.name || 'Artist'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-[var(--text-muted)]">Artist</div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-[var(--text)] font-semibold">{artistProfile?.name || artwork?.artistName || 'Artist'}</p>
                  {artistProfile?.cityPrimary && (
                    <p className="text-xs text-[var(--text-muted)]">Based in {artistProfile.cityPrimary}</p>
                  )}
                  <p className="text-sm text-[var(--text-muted)] mt-2">
                    {artistProfile?.bio || 'Learn more about the artist behind this piece.'}
                  </p>
                  {artistProfile?.portfolioUrl && (
                    <a
                      href={artistProfile.portfolioUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[var(--accent)] underline mt-2 inline-block"
                    >
                      View portfolio
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-[var(--surface-3)] rounded-xl p-4 sm:p-6 mb-6 border border-[var(--border)]">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-[var(--text-muted)]">Price</span>
                <span className="text-3xl sm:text-4xl text-[var(--text)]">${artwork?.price ?? 0}</span>
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                Supports the local artist with ~80% of the sale going to the creator (before Stripe fees)
              </p>
            </div>

            {purchaseStatus === 'success' && (
              <div className="bg-[var(--surface-3)] rounded-xl p-4 border border-[var(--border)] mb-4">
                <p className="text-sm text-[var(--text)]">
                  Payment successful! Show this to venue staff to collect the artwork.
                </p>
                {receiptUrl && (
                  <p className="text-sm mt-2">
                    <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] underline">View Stripe Receipt</a>
                  </p>
                )}
              </div>
            )}
            {purchaseStatus === 'cancel' && (
              <div className="bg-[var(--surface-3)] rounded-xl p-4 border border-[var(--border)] mb-4">
                <p className="text-sm text-[var(--text)]">Checkout canceled. You can try again below.</p>
              </div>
            )}
            {error && (
              <div className="bg-[var(--surface-3)] rounded-xl p-4 border border-[var(--border)] mb-4">
                <p className="text-sm text-[var(--text)]">{error}</p>
              </div>
            )}

            <button
              onClick={handlePurchase}
              disabled={buying || artwork?.status === 'sold' || purchaseStatus === 'success' || !artwork}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 sm:py-4 bg-[var(--accent)] disabled:bg-[var(--surface-3)] text-[var(--accent-contrast)] disabled:text-[var(--text-muted)] rounded-xl hover:brightness-95 transition shadow-lg mb-4"
            >
              {buying ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingCart className="w-5 h-5" />}
              <span className="text-base sm:text-lg">
                {artwork?.status === 'sold' ? 'Already Sold' : purchaseStatus === 'success' ? 'Payment Complete' : 'Buy This Artwork'}
              </span>
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
