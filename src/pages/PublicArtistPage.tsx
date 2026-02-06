import { useEffect, useMemo, useState } from 'react';
import { MapPin, ExternalLink, Instagram, ArrowLeft, Loader2, Building2, Sparkles } from 'lucide-react';
import { apiGet } from '../lib/api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';

type ArtworkCardData = {
  id: string;
  title: string;
  status: string;
  price: number;
  currency?: string;
  imageUrl?: string | null;
  venueName?: string | null;
  setId?: string | null;
  display?: {
    venueId?: string | null;
    venueName?: string | null;
    setId?: string | null;
    setTitle?: string | null;
  };
};

type VenueSummary = {
  id?: string;
  name?: string | null;
  city?: string | null;
  state?: string | null;
  neighborhood?: string | null;
  slug?: string | null;
};

type DisplayGroup = {
  venue: VenueSummary;
  sets: Array<{ id: string; title: string; pieceCount: number; artworks: ArtworkCardData[] }>;
  artworks: ArtworkCardData[];
};

type ArtistSetSummary = {
  id: string;
  title: string;
  description?: string | null;
  heroImageUrl?: string | null;
  pieceCount: number;
  items?: ArtworkCardData[];
};

interface PublicArtistPageProps {
  slugOrId: string;
  onNavigate?: (page: string, params?: any) => void;
}

export function PublicArtistPage({ slugOrId, onNavigate }: PublicArtistPageProps) {
  const [artist, setArtist] = useState<any>(null);
  const [forSale, setForSale] = useState<ArtworkCardData[]>([]);
  const [onDisplay, setOnDisplay] = useState<DisplayGroup[]>([]);
  const [sets, setSets] = useState<ArtistSetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'display' | 'sale' | 'sets'>('display');

  const cityLine = useMemo(() => {
    if (!artist) return '';
    const city = artist.cityPrimary || artist.citySecondary;
    return city || '';
  }, [artist]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { artist: a, forSale: sale, onDisplay: displays, sets: setList } = await apiGet<{
          artist: any;
          forSale: ArtworkCardData[];
          onDisplay: DisplayGroup[];
          sets: ArtistSetSummary[];
        }>(`/api/public/artists/${encodeURIComponent(slugOrId)}`);
        if (cancelled) return;
        setArtist(a);
        setForSale(Array.isArray(sale) ? sale : []);
        setOnDisplay(Array.isArray(displays) ? displays : []);
        setSets(Array.isArray(setList) ? setList : []);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || 'Artist not found');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slugOrId]);

  const handleBack = () => {
    if (onNavigate) {
      onNavigate('artist-profile');
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  const openArtwork = (artworkId: string) => {
    window.location.href = `/#/purchase-${artworkId}`;
  };

  const renderArtworkCard = (art: ArtworkCardData) => {
    const price = Number(art.price ?? 0);
    return (
    <button
      key={art.id}
      onClick={() => openArtwork(art.id)}
      className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl overflow-hidden text-left hover:shadow-lg transition-all group"
    >
      <div className="aspect-square bg-[var(--surface-3)] overflow-hidden">
        {art.imageUrl ? (
          <img
            src={art.imageUrl}
            alt={art.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">No image</div>
        )}
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold truncate group-hover:text-[var(--text)]">{art.title}</h3>
          <span className="text-xs px-2 py-1 rounded-full border border-[var(--border)] bg-[var(--surface-3)] text-[var(--text-muted)]">
            {art.status === 'sold' ? 'Sold' : 'Available'}
          </span>
        </div>
        <div className="text-[var(--text-muted)] text-sm">${price.toLocaleString()}</div>
        {art.display?.venueName && (
          <div className="text-xs text-[var(--text-muted)] flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span>
              {art.display.venueName}
              {art.display.setTitle ? ` · ${art.display.setTitle}` : ''}
            </span>
          </div>
        )}
        {!art.display?.venueName && art.venueName && (
          <div className="text-xs text-[var(--text-muted)] flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span>{art.venueName}</span>
          </div>
        )}
      </div>
    </button>
    );
  };

  const emptyCard = (message: string) => (
    <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-8 text-center text-[var(--text-muted)]">
      {message}
    </div>
  );

  return (
    <div className="text-[var(--text)]">
      <div className="max-w-5xl mx-auto py-2">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </button>
      </div>

      <div className="max-w-5xl mx-auto">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
            <p className="text-[var(--text-muted)]">Loading artist…</p>
          </div>
        )}

        {!loading && error && (
          <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-8 text-center">
            <p className="text-[var(--text)] font-semibold mb-2">Artist not found</p>
            <p className="text-[var(--text-muted)] text-sm">{error}</p>
          </div>
        )}

        {!loading && artist && (
          <>
            <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row gap-6 shadow-lg">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-[var(--surface-3)] border-4 border-[var(--border)]">
                {artist.profilePhotoUrl ? (
                  <img src={artist.profilePhotoUrl} alt={artist.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-semibold text-[var(--text-muted)]">
                    {(artist.name || '?').slice(0, 1)}
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h1 className="text-3xl font-semibold mb-2">{artist.name}</h1>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-muted)]">
                    {cityLine && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {cityLine}
                      </span>
                    )}
                    {artist.websiteUrl && (
                      <a
                        className="inline-flex items-center gap-1 hover:text-[var(--text)] transition-colors"
                        href={artist.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4" /> Website
                      </a>
                    )}
                    {artist.portfolioUrl && !artist.websiteUrl && (
                      <a
                        className="inline-flex items-center gap-1 hover:text-[var(--text)] transition-colors"
                        href={artist.portfolioUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4" /> Portfolio
                      </a>
                    )}
                    {(artist.instagramHandle || artist.instagram) && (
                      <a
                        className="inline-flex items-center gap-1 hover:text-[var(--text)] transition-colors"
                        href={`https://instagram.com/${String(artist.instagramHandle || artist.instagram).replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Instagram className="w-4 h-4" /> @{String(artist.instagramHandle || artist.instagram).replace('@', '')}
                      </a>
                    )}
                  </div>
                </div>
                {artist.bio && (
                  <p className="text-[var(--text-muted)] leading-relaxed max-w-3xl">{artist.bio}</p>
                )}
              </div>
            </div>

            <div className="mt-10">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList>
                  <TabsTrigger value="display">On Display Now</TabsTrigger>
                  <TabsTrigger value="sale">All For Sale</TabsTrigger>
                  <TabsTrigger value="sets">Sets</TabsTrigger>
                </TabsList>

                <TabsContent value="display" className="mt-6 space-y-6">
                  {onDisplay.length === 0 && emptyCard('No works on display right now.')}

                  {onDisplay.map((group) => (
                    <div key={group.venue.id || group.venue.name} className="border border-[var(--border)] rounded-xl p-4 bg-[var(--surface-2)] space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm text-[var(--text)] font-semibold">
                          <Building2 className="w-4 h-4 text-[var(--text-muted)]" />
                          <span>{group.venue.name || 'Venue'}</span>
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">{(group.sets || []).reduce((acc, s) => acc + s.pieceCount, 0) + (group.artworks || []).length} pieces</div>
                      </div>

                      {(group.sets || []).map((set) => (
                        <div key={set.id} className="space-y-3">
                          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
                            <Sparkles className="w-4 h-4 text-[var(--text-muted)]" />
                            <span>Set: {set.title} ({set.pieceCount} pieces)</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {set.artworks.map((art) => renderArtworkCard(art))}
                          </div>
                        </div>
                      ))}

                      {group.artworks.length > 0 && (
                        <div className="space-y-3">
                          {group.sets.length > 0 && <div className="text-sm text-[var(--text-muted)]">Individual works</div>}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {group.artworks.map((art) => renderArtworkCard(art))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="sale" className="mt-6">
                  {forSale.length === 0 && emptyCard('No works available for sale right now.')}
                  {forSale.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {forSale.map((art) => renderArtworkCard(art))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="sets" className="mt-6">
                  {sets.length === 0 && emptyCard('No public sets yet.')}
                  {sets.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {sets.map((set) => (
                        <div key={set.id} className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--surface-2)] hover:shadow-lg transition">
                          <div className="aspect-[3/2] bg-[var(--surface-3)] overflow-hidden">
                            {set.heroImageUrl ? (
                              <img src={set.heroImageUrl} alt={set.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">No image</div>
                            )}
                          </div>
                          <div className="p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-[var(--text)]">{set.title}</h3>
                              <span className="text-xs text-[var(--text-muted)]">{set.pieceCount} pieces</span>
                            </div>
                            {set.description && <p className="text-sm text-[var(--text-muted)] line-clamp-2">{set.description}</p>}
                            <button
                              onClick={() => (window.location.href = `/artists/${artist.slug || artist.id}/sets/${set.id}`)}
                              className="mt-2 w-full px-3 py-2 text-sm rounded-lg bg-[var(--surface-3)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-1)] transition"
                            >
                              View set
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
