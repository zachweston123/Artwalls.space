import { useEffect, useState } from 'react';
import { Plus, X, Upload, Loader2 } from 'lucide-react';
import { mockArtworks } from '../../data/mockData';
import type { Artwork } from '../../data/mockData';
import type { User } from '../../App';
import { apiGet, apiPost } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { uploadArtworkImage } from '../../lib/storage';

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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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

  const handleFileSelected = async (file?: File) => {
    if (!file) return;
    try {
      setUploading(true);
      setUploadError(null);
      // Ensure session exists
      const { data } = await supabase.auth.getUser();
      const authedId = data.user?.id;
      const artistId = authedId || user.id;
      const url = await uploadArtworkImage(artistId, file);
      setNewArtwork({ ...newArtwork, imageUrl: url });
    } catch (err: any) {
      setUploadError(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

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
      available: 'bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)]',
      pending: 'bg-[var(--surface-2)] border border-[var(--border)] text-[var(--warning)]',
      active: 'bg-[var(--green-muted)] text-[var(--green)]',
      sold: 'bg-[var(--surface-2)] border border-[var(--border)] text-[var(--blue)]',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl mb-2">My Artworks</h1>
          <p className="text-[var(--text-muted)]">
            {loading ? 'Loading…' : `${artworks.length} pieces in your collection`}
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add New Artwork
        </button>
      </div>

      {error && (
        <div className="bg-[var(--surface-2)] rounded-xl p-4 border border-[var(--border)] mb-6">
          <p className="text-sm text-[var(--danger)]">{error}</p>
        </div>
      )}

      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl">Add New Artwork</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-2 hover:bg-[var(--surface-3)] rounded-lg transition-colors text-[var(--text)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm text-[var(--text)] mb-2">Artwork Image</label>
                <div className="flex gap-3 items-center">
                  <label className="flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] cursor-pointer">
                    <Upload className="w-5 h-5 text-[var(--text-muted)]" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileSelected(e.target.files?.[0])}
                    />
                  </label>
                  <input
                    type="url"
                    value={newArtwork.imageUrl}
                    onChange={(e) => setNewArtwork({ ...newArtwork, imageUrl: e.target.value })}
                    className="flex-1 px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
                    placeholder="Paste an image URL or upload a file"
                  />
                </div>
                {uploading && (
                  <p className="text-xs text-[var(--text-muted)] mt-2 inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Uploading image…
                  </p>
                )}
                {uploadError && (
                  <p className="text-xs text-[var(--danger)] mt-2">{uploadError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-[var(--text)] mb-2">Artwork Title</label>
                <input
                  type="text"
                  required
                  value={newArtwork.title}
                  onChange={(e) => setNewArtwork({ ...newArtwork, title: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
                  placeholder="Enter artwork title"
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--text)] mb-2">Description</label>
                <textarea
                  required
                  value={newArtwork.description}
                  onChange={(e) => setNewArtwork({ ...newArtwork, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
                  placeholder="Describe your artwork, medium, inspiration..."
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--text)] mb-2">Price (USD)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">$</span>
                  <input
                    type="number"
                    required
                    value={newArtwork.price}
                    onChange={(e) => setNewArtwork({ ...newArtwork, price: e.target.value })}
                    className="w-full pl-8 pr-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">You'll receive ~80% (before Stripe fees)</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 bg-[var(--surface-2)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-3)] transition-colors border border-[var(--border)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="flex-1 px-4 py-2 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
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
            className="bg-[var(--surface-1)] rounded-xl overflow-hidden border border-[var(--border)] hover:shadow-lg transition-shadow group"
          >
            <div className="aspect-square bg-[var(--surface-2)] overflow-hidden">
              <img
                src={artwork.imageUrl}
                alt={artwork.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-[var(--text)]">{artwork.title}</h3>
                {getStatusBadge(artwork.status)}
              </div>
              <p className="text-sm text-[var(--text-muted)] mb-3 line-clamp-2">{artwork.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-lg text-[var(--text)]">${artwork.price}</span>
                {artwork.stripePriceId && (
                  <span className="text-[10px] text-[var(--text-muted)]">Stripe ready</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!loading && artworks.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-[var(--surface-2)] border border-[var(--border)] rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-xl mb-2">No artworks yet</h3>
          <p className="text-[var(--text-muted)] mb-6">Start by adding your first piece</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-6 py-2 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors"
          >
            Add Your First Artwork
          </button>
        </div>
      )}
    </div>
  );
}
