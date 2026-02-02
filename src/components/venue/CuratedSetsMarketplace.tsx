import { useMemo, useState } from 'react';
import { Heart, Star, Sparkles } from 'lucide-react';
import { PageHeader } from '../PageHeader';
import { EmptyState } from '../EmptyState';

interface CuratedSetsMarketplaceProps {
  onNavigate: (page: string) => void;
}

interface CuratedSetCard {
  id: string;
  title: string;
  artist: string;
  vibe: string;
  walls: number;
  artworks: number;
  priceRange: string;
  tags: string[];
  featured?: boolean;
}

const CURATED_SETS: CuratedSetCard[] = [
  {
    id: 'set-1',
    title: 'Warm Minimalist',
    artist: 'Ada M.',
    vibe: 'Modern calm',
    walls: 3,
    artworks: 5,
    priceRange: '$1.2k – $2.4k',
    tags: ['Modern', 'Neutral', 'Soft light'],
    featured: true,
  },
  {
    id: 'set-2',
    title: 'Neon Nights',
    artist: 'Kairo Studio',
    vibe: 'Bold and electric',
    walls: 2,
    artworks: 4,
    priceRange: '$900 – $1.8k',
    tags: ['Pop', 'Color-forward', 'Nightlife'],
  },
  {
    id: 'set-3',
    title: 'Coastal Air',
    artist: 'Lena V.',
    vibe: 'Fresh, airy blues',
    walls: 4,
    artworks: 6,
    priceRange: '$1.4k – $2.8k',
    tags: ['Calm', 'Nature', 'Light'],
    featured: true,
  },
  {
    id: 'set-4',
    title: 'Industrial Glow',
    artist: 'Rowan T.',
    vibe: 'Metals and dusk tones',
    walls: 3,
    artworks: 5,
    priceRange: '$1.1k – $2.0k',
    tags: ['Industrial', 'Textured', 'Evening'],
  },
];

const TAG_FILTERS = ['All', 'Modern', 'Pop', 'Calm', 'Industrial'];

export function CuratedSetsMarketplace({ onNavigate }: CuratedSetsMarketplaceProps) {
  const [activeTag, setActiveTag] = useState<string>('All');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const visibleSets = useMemo(() => {
    if (activeTag === 'All') return CURATED_SETS;
    return CURATED_SETS.filter((set) => set.tags.some((t) => t.toLowerCase().includes(activeTag.toLowerCase())));
  }, [activeTag]);

  const toggleSave = (id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="bg-[var(--bg)] text-[var(--text)] min-h-screen">
      <PageHeader
        breadcrumb="Venues / Curated sets"
        title="Curated sets marketplace"
        subtitle="Pick ready-to-hang sets matched to your vibe, walls, and budget"
        primaryAction={{ label: 'Back to dashboard', onClick: () => onNavigate('venue-dashboard') }}
        secondaryAction={{ label: 'View saved sets', onClick: () => onNavigate('venue-curated-sets') }}
        className="mb-6"
      />

      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <span className="text-sm text-gray-400">Filter by vibe</span>
          {TAG_FILTERS.map((tag) => (
            <button
              key={tag}
              className={`px-3 py-1 rounded-full border text-sm transition ${
                activeTag === tag
                  ? 'border-blue-400 text-blue-100 bg-blue-500/10'
                  : 'border-white/10 text-gray-300 hover:border-white/30'
              }`}
              onClick={() => setActiveTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>

        {visibleSets.length === 0 ? (
          <EmptyState
            title="No sets match this vibe"
            description="Try a different filter or come back tomorrow as new sets are added daily."
            actionLabel="Clear filters"
            onAction={() => setActiveTag('All')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {visibleSets.map((set) => (
              <div
                key={set.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm backdrop-blur"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-gray-400">
                      <Sparkles className="h-4 w-4 text-amber-300" />
                      {set.vibe}
                    </div>
                    <h3 className="text-lg font-semibold mt-1 text-white">{set.title}</h3>
                    <p className="text-sm text-gray-300">By {set.artist}</p>
                  </div>
                  <button
                    aria-label={savedIds.has(set.id) ? 'Unsave set' : 'Save set'}
                    onClick={() => toggleSave(set.id)}
                    className={`rounded-full border p-2 transition ${
                      savedIds.has(set.id)
                        ? 'border-pink-300/60 bg-pink-500/10 text-pink-200'
                        : 'border-white/15 text-gray-300 hover:border-white/40'
                    }`}
                  >
                    <Heart className="h-5 w-5" fill={savedIds.has(set.id) ? 'currentColor' : 'none'} />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {set.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-full text-xs bg-white/5 border border-white/10 text-gray-200"
                    >
                      {tag}
                    </span>
                  ))}
                  {set.featured && (
                    <span className="px-2.5 py-1 rounded-full text-xs bg-amber-500/15 border border-amber-300/40 text-amber-100 inline-flex items-center gap-1">
                      <Star className="h-4 w-4" /> Featured
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm text-gray-200 mb-4">
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="text-gray-400 text-xs">Walls ready</div>
                    <div className="text-base font-semibold">{set.walls} walls</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="text-gray-400 text-xs">Artworks</div>
                    <div className="text-base font-semibold">{set.artworks} pieces</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3 col-span-2">
                    <div className="text-gray-400 text-xs">Typical investment</div>
                    <div className="text-base font-semibold">{set.priceRange}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => onNavigate('venue-dashboard')}
                    className="px-3 py-2 rounded-lg border border-white/15 text-sm text-gray-200 hover:border-white/40 transition"
                  >
                    View artist
                  </button>
                  <button
                    onClick={() => onNavigate('venue-walls')}
                    className="px-3 py-2 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition"
                  >
                    Add to walls
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
