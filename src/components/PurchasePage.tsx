import { useEffect, useMemo, useState } from 'react';
import { ShoppingCart, MapPin, User, ArrowLeft, Loader2, Lock, CheckCircle } from 'lucide-react';
import { ArtworkReactions } from './ArtworkReactions';
import { CHECKOUT_COPY } from '../lib/feeCopy';
import { trackQrScan, trackArtworkView, trackCheckoutStart, trackEvent } from '../lib/trackEvent';
import { ArtistProfilePublicView, type ArtistPublicData } from './shared/ArtistProfilePublicView';
import { VenueProfilePublicView, type VenuePublicData } from './shared/VenueProfilePublicView';
import { FoundingArtistBadge } from './artist/FoundingArtistBadge';
import { SEO } from './SEO';
import { StructuredData, artworkSchema } from './StructuredData';

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
  const [artistProfile, setArtistProfile] = useState<ArtistPublicData | null>(null);
  const [venueProfile, setVenueProfile] = useState<VenuePublicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [isArtistFounding, setIsArtistFounding] = useState(false);

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
        // Track purchase success view
        trackEvent({
          event_type: 'artwork_view',
          artworkId,
          metadata: { action: 'purchase_success_viewed' },
        });
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
              const raw = await apiGet<any>(`/api/artists/${encodeURIComponent(normalized.artistId)}`);
              if (!cancelled && raw) {
                setArtistProfile({
                  id: raw.id ?? normalized.artistId,
                  name: raw.name ?? normalized.artistName ?? 'Artist',
                  slug: raw.slug ?? null,
                  bio: raw.bio ?? null,
                  profilePhotoUrl: raw.profilePhotoUrl ?? raw.profile_photo_url ?? null,
                  portfolioUrl: raw.portfolioUrl ?? raw.portfolio_url ?? null,
                  websiteUrl: raw.websiteUrl ?? raw.website_url ?? null,
                  instagramHandle: raw.instagramHandle ?? raw.instagram_handle ?? null,
                  cityPrimary: raw.cityPrimary ?? raw.city_primary ?? null,
                  citySecondary: raw.citySecondary ?? raw.city_secondary ?? null,
                  artTypes: raw.artTypes ?? raw.art_types ?? [],
                });
                // Check founding artist status
                if (raw.isFoundingArtist || raw.is_founding_artist) {
                  setIsArtistFounding(true);
                }
              }
            } catch {
              if (!cancelled) setArtistProfile(null);
            }
          }
          // Fetch venue profile for "About the venue" card
          if (normalized.venueId) {
            try {
              const vRaw = await apiGet<any>(`/api/venues/${encodeURIComponent(normalized.venueId)}`);
              if (!cancelled && vRaw) {
                setVenueProfile({
                  id: vRaw.id ?? normalized.venueId,
                  name: vRaw.name ?? normalized.venueName ?? 'Venue',
                  bio: vRaw.bio ?? null,
                  coverPhotoUrl: vRaw.coverPhotoUrl ?? vRaw.cover_photo_url ?? null,
                  city: vRaw.city ?? null,
                  address: vRaw.address ?? null,
                  type: vRaw.type ?? null,
                  labels: vRaw.labels ?? [],
                  verified: Boolean(vRaw.verified),
                  foundedYear: vRaw.foundedYear ?? vRaw.founded_year ?? null,
                  websiteUrl: vRaw.websiteUrl ?? vRaw.website ?? null,
                  instagramHandle: vRaw.instagramHandle ?? vRaw.instagram_handle ?? null,
                });
              }
            } catch {
              if (!cancelled) setVenueProfile(null);
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


  const seoTitle = artwork ? `${artwork.title} by ${artwork.artistName || 'Artist'} — Artwalls` : 'Artwork — Artwalls';
  const seoDesc = artwork?.description
    ? artwork.description.slice(0, 160)
    : `${artwork?.title ?? 'Artwork'} — original art available for purchase on Artwalls.`;
  const artworkUrl = `https://artwalls.space/#/purchase-${artworkId}`;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <SEO
        title={seoTitle}
        description={seoDesc}
        ogTitle={seoTitle}
        ogDescription={seoDesc}
        ogImage={artwork?.imageUrl || undefined}
        ogUrl={artworkUrl}
        canonical={artworkUrl}
        twitterCard="summary_large_image"
      />
      {artwork && (
        <StructuredData data={artworkSchema({
          name: artwork.title,
          description: artwork.description,
          image: artwork.imageUrl,
          price: artwork.price,
          currency: artwork.currency,
          artistName: artwork.artistName,
          url: artworkUrl,
          availability: artwork.status === 'sold' ? 'SoldOut' : 'InStock',
        })} />
      )}
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
              <span className={`inline-block px-3 py-1 rounded-full text-sm mb-4 border ${
                artwork?.status === 'sold'
                  ? 'bg-[var(--surface-3)] text-[var(--text-muted)] border-[var(--border)]'
                  : 'bg-[var(--green-muted)] text-[var(--green)] border-[var(--border)]'
              }`}>
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
                {isArtistFounding && <FoundingArtistBadge variant="compact" />}
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

            <div className="mb-6">
              {artistProfile ? (
                <ArtistProfilePublicView
                  artist={artistProfile}
                  variant="compact"
                  onViewProfile={() => {
                    const target = `/p/artist/${artwork?.artistId}`;
                    if (onNavigate) {
                      onNavigate(target);
                    } else {
                      window.location.href = target;
                    }
                  }}
                />
              ) : (
                <div className="bg-[var(--surface-3)] rounded-xl p-4 sm:p-6 border border-[var(--border)]">
                  <h2 className="text-lg font-semibold text-[var(--text)] mb-2">About the artist</h2>
                  <p className="text-sm text-[var(--text-muted)]">
                    {artwork?.artistName ? `By ${artwork.artistName}` : 'Learn more about the artist behind this piece.'}
                  </p>
                </div>
              )}
            </div>

            {/* About the venue card */}
            <div className="mb-6">
              {venueProfile ? (
                <VenueProfilePublicView
                  venue={venueProfile}
                  variant="compact"
                  onViewProfile={() => {
                    const target = `/venues/${artwork?.venueId}`;
                    if (onNavigate) {
                      onNavigate(target);
                    } else {
                      window.location.href = target;
                    }
                  }}
                />
              ) : artwork?.venueName ? (
                <div className="bg-[var(--surface-3)] rounded-xl p-4 sm:p-6 border border-[var(--border)]">
                  <h2 className="text-lg font-semibold text-[var(--text)] mb-2">About the venue</h2>
                  <p className="text-sm text-[var(--text-muted)]">
                    Currently on display at {artwork.venueName}
                  </p>
                </div>
              ) : null}
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
              <div className="bg-[var(--green-muted)] rounded-xl p-5 border border-[var(--border)] mb-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-[var(--green)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--text)] mb-1">
                      Payment successful!
                    </p>
                    <p className="text-sm text-[var(--text-muted)] mb-3">
                      Show this to venue staff to collect your artwork.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {receiptUrl && (
                        <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-[var(--accent)] hover:underline">
                          View receipt
                        </a>
                      )}
                      {artwork?.artistId && (
                        <button
                          onClick={() => onNavigate?.(`/p/artist/${artwork.artistId}`)}
                          className="text-sm font-medium text-[var(--accent)] hover:underline"
                        >
                          View artist profile
                        </button>
                      )}
                      {artwork?.venueId && (
                        <button
                          onClick={() => onNavigate?.(`/venues/${artwork.venueId}`)}
                          className="text-sm font-medium text-[var(--accent)] hover:underline"
                        >
                          View venue
                        </button>
                      )}
                    </div>
                  </div>
                </div>
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
              className="w-full flex items-center justify-center gap-3 px-6 py-3 sm:py-4 bg-[var(--accent)] disabled:bg-[var(--surface-3)] text-[var(--accent-contrast)] disabled:text-[var(--text-muted)] rounded-xl hover:brightness-95 transition shadow-lg mb-2"
            >
              {buying ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingCart className="w-5 h-5" />}
              <span className="text-base sm:text-lg">
                {artwork?.status === 'sold' ? 'Already Sold' : purchaseStatus === 'success' ? 'Payment Complete' : 'Buy This Artwork'}
              </span>
            </button>

            {/* Trust cues */}
            <div className="flex items-center justify-center gap-4 text-xs text-[var(--text-muted)] mb-4">
              <span className="inline-flex items-center gap-1">
                <Lock className="w-3 h-3" /> Secure checkout
              </span>
              <span>Powered by Stripe</span>
            </div>

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
