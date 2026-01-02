import { useEffect, useState } from 'react';
import { Plus, X, Upload, Loader2 } from 'lucide-react';
import { mockArtworks } from '../../data/mockData';
import type { Artwork } from '../../data/mockData';
import type { User } from '../../App';
import { apiGet, apiPost } from '../../lib/api';

interface ArtistArtworksProps {
  user: User;
}

export function ArtistArtworks({ user }: ArtistArtworksProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [artworks, setArtworks] = useState<Artwork[]>(mockArtworks);
  const [newArtwork, setNewArtwork] = useState({
    title: '',
    description: '',
    price: '',
    imageUrl: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const items = await apiGet<any[]>(`/api/artworks?artistId=${encodeURIComponent(user.id)}`);
      if (Array.isArray(items) && items.length) {
        setArtworks(items as Artwork[]);
      }
    } catch {
      // Backend not available -> keep mock data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      const priceNumber = Number(newArtwork.price);
      if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
        setError('Please enter a valid price');
        return;
      }

      const created = await apiPost<any>('/api/artworks', {
        artistId: user.id,
        email: user.email,
        name: user.name,
        title: newArtwork.title,
        description: newArtwork.description,
        price: priceNumber,
        currency: 'usd',
        imageUrl: newArtwork.imageUrl || undefined,
      });

      setArtworks([created as Artwork, ...artworks]);
      setNewArtwork({ title: '', description: '', price: '', imageUrl: '' });
      setShowAddForm(false);
    } catch (e: any) {
      setError(e?.message || 'Unable to create artwork');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      available: 'bg-neutral-100 text-neutral-700',
      pending: 'bg-yellow-100 text-yellow-700',
      active: 'bg-green-100 text-green-700',
      sold: 'bg-blue-100 text-blue-700',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl mb-2">My Artworks</h1>
          <p className="text-neutral-600">
            {loading ? 'Loading…' : `${artworks.length} pieces in your collection`}
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add New Artwork
        </button>
      </div>

      {error && (
        <div className="bg-red-50 rounded-xl p-4 border border-red-200 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-6">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl">Add New Artwork</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors text-neutral-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm text-neutral-700 mb-2">Artwork Image URL</label>
                <div className="flex gap-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-neutral-100 border border-neutral-200">
                    <Upload className="w-5 h-5 text-neutral-500" />
                  </div>
                  <input
                    type="url"
                    value={newArtwork.imageUrl}
                    onChange={(e) => setNewArtwork({ ...newArtwork, imageUrl: e.target.value })}
                    className="flex-1 px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    placeholder="https://... (optional)"
                  />
                </div>
                <p className="text-xs text-neutral-500 mt-2">
                  For production, replace this with real uploads (S3/Supabase Storage/Cloudinary).
                </p>
              </div>

              <div>
                <label className=\"block text-sm text-neutral-700 dark:text-neutral-300 mb-2\">Artwork Title</label>
                <input
                  type=\"text\"
                  required
                  value={newArtwork.title}
                  onChange={(e) => setNewArtwork({ ...newArtwork, title: e.target.value })}
                  className=\"w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400\"
                  placeholder="Enter artwork title"
                />
              </div>

              <div>
                <label className=\"block text-sm text-neutral-700 dark:text-neutral-300 mb-2\">Description</label>
                <textarea
                  required
                  value={newArtwork.description}
                  onChange={(e) => setNewArtwork({ ...newArtwork, description: e.target.value })}
                  rows={4}
                  className=\"w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400\"
                  placeholder="Describe your artwork, medium, inspiration..."
                />
              </div>

              <div>
                <label className="block text-sm text-neutral-700 mb-2">Price (USD)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                  <input
                    type="number"
                    required
                    value={newArtwork.price}
                    onChange={(e) => setNewArtwork({ ...newArtwork, price: e.target.value })}
                    className="w-full pl-8 pr-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-neutral-500 mt-1">You'll receive ~80% (before Stripe fees)</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {artworks.map((artwork) => (
          <div
            key={artwork.id}
            className="bg-white dark:bg-neutral-800 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 hover:shadow-lg transition-shadow group"
          >
            <div className="aspect-square bg-neutral-100 overflow-hidden">
              <img
                src={artwork.imageUrl}
                alt={artwork.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-neutral-900">{artwork.title}</h3>
                {getStatusBadge(artwork.status)}
              </div>
              <p className="text-sm text-neutral-600 mb-3 line-clamp-2">{artwork.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-lg text-neutral-900">${artwork.price}</span>
                {artwork.stripePriceId && (
                  <span className="text-[10px] text-neutral-500">Stripe ready</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!loading && artworks.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-xl mb-2">No artworks yet</h3>
          <p className="text-neutral-600 mb-6">Start by adding your first piece</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Your First Artwork
          </button>
        </div>
      )}
    </div>
  );
}
