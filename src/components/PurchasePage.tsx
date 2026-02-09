import { useEffect, useMemo, useState } from 'react';
import { ShoppingCart, MapPin, User, ArrowLeft, Loader2 } from 'lucide-react';
import { ArtworkReactions } from './ArtworkReactions';
import { CHECKOUT_COPY } from '../lib/feeCopy';
import { trackQrScan, trackArtworkView, trackCheckoutStart } from '../lib/trackEvent';

type Artwork = {
  id: string;
  title: string;
  description?: string;
  price: number; // dollars
  currency?: string;
  imageUrl?: string;
  artistId?: string;
  venueId?: string;
  status: 'available' | 'pending' | 'active' | 'sold';
  artistName?: string;
  venueName?: string;
  checkoutUrl?: string;
  otherWorks?: Artwork[];
};
import { apiGet, apiPost } from '../lib/api';

interface PurchasePageProps {
  artworkId: string;
  onBack?: () => void;
  onNavigate?: (page: string, params?: any) => void;
}

export function PurchasePage({ artworkId, onBack, onNavigate }: PurchasePageProps) {
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
    const imageUrl = raw?.imageUrl || raw?.image_url || raw?.primary_image || raw?.photo_url || undefined;
    return {
      id: raw?.id,
      title: raw?.title || raw?.name || 'Artwork',
      description: raw?.description || undefined,
      price: Number(price || 0),
      currency: raw?.currency || 'usd',
      imageUrl,
      status: raw?.status || 'available',
      artistName: raw?.artistName || raw?.artist_name || raw?.artist || undefined,
      artistId: raw?.artistId || raw?.artist_id || undefined,
      venueId: raw?.venueId || raw?.venue_id || undefined,
      venueName: raw?.venueName || raw?.venue_name || undefined,
      checkoutUrl: raw?.checkoutUrl || raw?.checkout_url || raw?.purchaseUrl || raw?.purchase_url || undefined,
      otherWorks: Array.isArray(raw?.otherWorks) ? raw.otherWorks.map(normalizeArtwork) : undefined,
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

  // Wall-productivity tracking: log qr_scan + artwork_view once per session visit
  useEffect(() => {
    if (!artwork?.id) return;
    const opts = {
      artworkId: artwork.id,
      venueId: artwork.venueId || null,
      artistId: artwork.artistId || null,
    };
    trackQrScan(opts);
    trackArtworkView(opts);

    // Keep legacy events endpoint for backward compat (non-blocking)
    (async () => {
      try {
        await apiPost('/api/events', { event_type: 'view_artwork', artwork_id: artwork.id, venue_id: artwork.venueId || null });
        await apiPost('/api/events', { event_type: 'qr_scan', artwork_id: artwork.id, venue_id: artwork.venueId || null });
      } catch {}
    })();
  }, [artwork?.id]);

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

      // Wall-productivity tracking: checkout_start
      trackCheckoutStart({
        artworkId: artwork?.id || '',
        venueId: artwork?.venueId || null,
        artistId: artwork?.artistId || null,
      });

      // Keep legacy events endpoint for backward compat (non-blocking)
      try {
        await apiPost('/api/events', {
          event_type: 'start_checkout',
          artwork_id: artwork?.id,
          venue_id: artwork?.venueId || null,
        });
      } catch {}

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
                {artwork?.artistId ? (
                  <a
                    href={`/p/artist/${artwork.artistId}`}
                    onClick={(e) => { e.preventDefault(); if (onNavigate) { onNavigate(`/p/artist/${artwork.artistId}`); } else { window.location.href = `/p/artist/${artwork.artistId}`; } }}
                    className="text-base sm:text-lg hover:text-[var(--text)] hover:underline transition-colors cursor-pointer"
                  >
                    by {artwork.artistName || 'Artist'}
                  </a>
                ) : (
                  <span className="text-base sm:text-lg">by {artwork?.artistName || 'Artist'}</span>
                )}
              </div>
              
              <div className="mb-4">
                <ArtworkReactions artworkId={artworkId} />
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
                <a
                  href={artwork?.artistId ? `/p/artist/${artwork.artistId}` : '#'}
                  onClick={(e) => { e.preventDefault(); if (artwork?.artistId) { if (onNavigate) { onNavigate(`/p/artist/${artwork.artistId}`); } else { window.location.href = `/p/artist/${artwork.artistId}`; } } }}
                  className="w-14 h-14 rounded-full overflow-hidden border border-[var(--border)] bg-[var(--surface-2)] flex-shrink-0 hover:ring-2 hover:ring-[var(--blue)] transition-all cursor-pointer"
                >
                  {artistProfile?.profilePhotoUrl ? (
                    <img src={artistProfile.profilePhotoUrl} alt={artistProfile?.name || 'Artist'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-[var(--text-muted)]">Artist</div>
                  )}
                </a>
                <div>
                  <a
                    href={artwork?.artistId ? `/p/artist/${artwork.artistId}` : '#'}
                    onClick={(e) => { e.preventDefault(); if (artwork?.artistId) { if (onNavigate) { onNavigate(`/p/artist/${artwork.artistId}`); } else { window.location.href = `/p/artist/${artwork.artistId}`; } } }}
                    className="text-sm text-[var(--text)] font-semibold hover:text-[var(--blue)] hover:underline transition-colors cursor-pointer"
                  >
                    {artistProfile?.name || artwork?.artistName || 'Artist'}
                  </a>
                  {artistProfile?.cityPrimary && (
                    <p className="text-xs text-[var(--text-muted)]">Based in {artistProfile.cityPrimary}</p>
                  )}
                  <p className="text-sm text-[var(--text-muted)] mt-2">
                    {artistProfile?.bio || 'Learn more about the artist behind this piece.'}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    {artwork?.artistId && (
                      <a
                        href={`/p/artist/${artwork.artistId}`}
                        onClick={(e) => { e.preventDefault(); if (onNavigate) { onNavigate(`/p/artist/${artwork.artistId}`); } else { window.location.href = `/p/artist/${artwork.artistId}`; } }}
                        className="text-xs text-[var(--accent)] underline"
                      >
                        View artist profile
                      </a>
                    )}
                    {artistProfile?.portfolioUrl && (
                      <a
                        href={artistProfile.portfolioUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[var(--accent)] underline"
                      >
                        View portfolio
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[var(--surface-3)] rounded-xl p-4 sm:p-6 mb-6 border border-[var(--border)]">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-[var(--text-muted)]">Price</span>
                <span className="text-3xl sm:text-4xl text-[var(--text)]">${artwork?.price ?? 0}</span>
              </div>
              <p className="text-sm text-[var(--text-muted)]">{CHECKOUT_COPY.artworkPageHighlight}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>{CHECKOUT_COPY.feeLineLabel} (shown at checkout)</span>
                <span title={CHECKOUT_COPY.feeTooltip} className="underline decoration-dotted">What is this?</span>
              </div>
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
                <strong>All sales final:</strong> Please review the artwork in person before purchasing.
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

        {artwork?.otherWorks && artwork.otherWorks.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--text)]">More from this artist</h3>
              <span className="text-sm text-[var(--text-muted)]">{artwork.otherWorks.length} pieces</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {artwork.otherWorks.map((piece) => (
                <button
                  key={piece.id}
                  onClick={() => window.location.assign(`/#/purchase-${piece.id}`)}
                  className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl overflow-hidden text-left hover:shadow-lg transition-all group"
                >
                  <div className="aspect-[4/3] bg-[var(--surface-3)] overflow-hidden">
                    {piece.imageUrl ? (
                      <img src={piece.imageUrl} alt={piece.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">No image</div>
                    )}
                  </div>
                  <div className="p-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-medium truncate group-hover:text-[var(--text)]">{piece.title}</h4>
                      <span className="text-xs px-2 py-1 rounded-full border border-[var(--border)] bg-[var(--surface-3)] text-[var(--text-muted)]">
                        {piece.status === 'sold' ? 'Sold' : 'Available'}
                      </span>
                    </div>
                    <div className="text-sm text-[var(--text-muted)]">${piece.price.toLocaleString()}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
