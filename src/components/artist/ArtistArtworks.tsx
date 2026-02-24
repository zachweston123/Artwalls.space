import { useEffect, useState } from 'react';
import { Plus, X, Upload, Loader2 } from 'lucide-react';
import { PageHeroHeader } from '../PageHeroHeader';
import { EmptyState } from '../EmptyState';
import { artworkPurchaseUrl } from '../../lib/artworkQrUrl';
type Artwork = {
  id: string;
  title: string;
  description?: string;
  price: number;
  imageUrl?: string;
  status: 'available' | 'pending' | 'active' | 'sold';
  artistName?: string;
  venueName?: string;
};
import type { User } from '../../App';
import { apiGet, apiPost, API_BASE } from '../../lib/api';
import { entitlementsFor } from '../../lib/entitlements';
import { resolveArtistSubscription } from '../../lib/subscription';
import { supabase } from '../../lib/supabase';
import { uploadArtworkImage } from '../../lib/storage';

interface ArtistArtworksProps {
  user: User;
}

export function ArtistArtworks({ user }: ArtistArtworksProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [newArtwork, setNewArtwork] = useState({
    title: '',
    description: '',
    price: '',
    imageUrl: '',
    imageUrls: [] as string[],
    dimensionsWidth: '',
    dimensionsHeight: '',
    dimensionsDepth: '',
    dimensionsUnit: 'in',
    medium: '',
    materials: '',
    condition: 'new',
    knownFlaws: 'None',
    editionType: 'original',
    editionSize: '',
    shippingTimeEstimate: '2–5 business days',
    inSpacePhotoUrl: '',
    colorAccuracyAck: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [artistPlan, setArtistPlan] = useState<{ tier: 'free' | 'starter' | 'growth' | 'pro'; status: string } | null>(null);

  const planId = (artistPlan?.tier || 'free') as 'free' | 'starter' | 'growth' | 'pro';
  const isPlanActive = String(artistPlan?.status || '').toLowerCase() === 'active';
  const ent = entitlementsFor(planId, isPlanActive);
  const activeCount = artworks.filter((a) => a.status !== 'sold').length;
  const hasFiniteLimit = Number.isFinite(ent.artworksLimit);
  const atLimit = hasFiniteLimit && activeCount >= ent.artworksLimit;

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      // Try API first
      try {
        const res = await apiGet<any>(`/api/artworks?artistId=${encodeURIComponent(user.id)}`);
        const items = Array.isArray(res) ? res : res?.artworks;
        if (Array.isArray(items)) {
          setArtworks(items as Artwork[]);
          return; // Success
        }
      } catch (apiErr) {
        console.warn('API fetch failed, falling back to Supabase:', apiErr);
      }

      // Fallback to direct Supabase query
      const { data, error } = await supabase
        .from('artworks')
        .select('*')
        .eq('artist_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mappedArtworks: Artwork[] = (data || []).map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        price: (row.price_cents || 0) / 100, // Convert cents to dollars for display
        imageUrl: row.image_url,
        status: row.status,
        artistName: row.artist_name,
        venueName: row.venue_name,
        stripePriceId: row.stripe_price_id
      }));
      setArtworks(mappedArtworks);

    } catch (err: any) {
      console.error('Failed to load artworks:', err);
      // Backend not available and DB failed -> keep empty or mock
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // Fetch artist plan info for gating
    (async () => {
      // Try API first
      try {
        const me = await apiGet<any>(`/api/profile/me`);
        const resolved = resolveArtistSubscription(me?.profile || {});
        setArtistPlan({ tier: resolved.tier, status: resolved.status });
      } catch (apiErr) {
        // Fallback to Supabase
        const { data } = await supabase
          .from('artists')
          .select('subscription_tier, subscription_status, pro_until')
          .eq('id', user.id)
          .single();
          
        if (data) {
           const resolved = resolveArtistSubscription(data);
           setArtistPlan({ tier: resolved.tier, status: resolved.status });
        }
      }
    })();
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
      setNewArtwork((prev) => {
        const nextUrls = [...prev.imageUrls, url];
        return { ...prev, imageUrl: prev.imageUrl || url, imageUrls: nextUrls };
      });
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

      if (atLimit) {
        setError('You have reached the active artwork limit for your plan. Upgrade your plan to list more artwork.');
        return;
      }

      const priceNumber = Number(newArtwork.price);
      if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
        setError('Please enter a valid price');
        return;
      }

      const dimensionsWidth = Number(newArtwork.dimensionsWidth);
      const dimensionsHeight = Number(newArtwork.dimensionsHeight);
      const dimensionsDepth = newArtwork.dimensionsDepth ? Number(newArtwork.dimensionsDepth) : undefined;
      const editionSize = newArtwork.editionSize ? Number(newArtwork.editionSize) : undefined;

      if (!Number.isFinite(dimensionsWidth) || !Number.isFinite(dimensionsHeight)) {
        setError('Please add artwork dimensions (width and height)');
        return;
      }
      if (!newArtwork.medium.trim()) {
        setError('Please add the medium/materials');
        return;
      }
      if (!newArtwork.knownFlaws.trim()) {
        setError('Please add known flaws (or enter "None")');
        return;
      }
      if (newArtwork.editionType === 'print' && (!Number.isFinite(editionSize) || (editionSize || 0) <= 0)) {
        setError('Please add edition size for prints');
        return;
      }
      if (!newArtwork.shippingTimeEstimate.trim()) {
        setError('Please add a shipping time estimate');
        return;
      }
      const allImages = newArtwork.imageUrl
        ? [newArtwork.imageUrl, ...newArtwork.imageUrls.filter((u) => u !== newArtwork.imageUrl)]
        : newArtwork.imageUrls;
      if (allImages.length < 3) {
        setError('Please upload at least 3 photos (front, detail, back/signature)');
        return;
      }

      let createdItem: Artwork;

      // Try API first
      try {
        const res = await apiPost<any>('/api/artworks', {
          artistId: user.id,
          email: user.email,
          name: user.name,
          title: newArtwork.title,
          description: newArtwork.description,
          price: priceNumber,
          currency: 'usd',
          imageUrl: newArtwork.imageUrl || undefined,
          imageUrls: allImages,
          dimensionsWidth,
          dimensionsHeight,
          dimensionsDepth,
          dimensionsUnit: newArtwork.dimensionsUnit,
          medium: newArtwork.medium,
          materials: newArtwork.materials,
          condition: newArtwork.condition,
          knownFlaws: newArtwork.knownFlaws,
          editionType: newArtwork.editionType,
          editionSize,
          shippingTimeEstimate: newArtwork.shippingTimeEstimate,
          inSpacePhotoUrl: newArtwork.inSpacePhotoUrl || undefined,
          colorAccuracyAck: newArtwork.colorAccuracyAck,
        });
        createdItem = res as Artwork;
      } catch (apiErr) {
         console.warn('API creation failed, falling back to Supabase:', apiErr);
         
         // Fallback to direct DB insert
         const artworkId = crypto.randomUUID();
         const { data, error: dbError } = await supabase
           .from('artworks')
           .insert({
             id: artworkId,
             artist_id: user.id,
             artist_name: user.name,
             title: newArtwork.title,
             description: newArtwork.description,
             price_cents: Math.round(priceNumber * 100),
             currency: 'usd',
             image_url: newArtwork.imageUrl || null,
             image_urls: allImages,
             dimensions_width: dimensionsWidth,
             dimensions_height: dimensionsHeight,
             dimensions_depth: dimensionsDepth || null,
             dimensions_unit: newArtwork.dimensionsUnit,
             medium: newArtwork.medium,
             materials: newArtwork.materials,
             condition: newArtwork.condition,
             known_flaws: newArtwork.knownFlaws,
             edition_type: newArtwork.editionType,
             edition_size: editionSize || null,
             shipping_time_estimate: newArtwork.shippingTimeEstimate,
             in_space_photo_url: newArtwork.inSpacePhotoUrl || null,
             color_accuracy_ack: newArtwork.colorAccuracyAck,
             is_publishable: true,
             status: 'available',
             purchase_url: artworkPurchaseUrl(artworkId),
           })
           .select()
           .single();
           
         if (dbError) throw dbError;
         
         createdItem = {
           id: data.id,
           title: data.title,
           description: data.description,
           price: (data.price_cents || 0) / 100,
           imageUrl: data.image_url,
           status: data.status,
           artistName: data.artist_name,
           venueName: data.venue_name
         };
      }

      setArtworks([createdItem, ...artworks]);
      setNewArtwork({
        title: '',
        description: '',
        price: '',
        imageUrl: '',
        imageUrls: [],
        dimensionsWidth: '',
        dimensionsHeight: '',
        dimensionsDepth: '',
        dimensionsUnit: 'in',
        medium: '',
        materials: '',
        condition: 'new',
        knownFlaws: 'None',
        editionType: 'original',
        editionSize: '',
        shippingTimeEstimate: '2–5 business days',
        inSpacePhotoUrl: '',
        colorAccuracyAck: false,
      });
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
      <PageHeroHeader
        title="My Artworks"
        subtitle={loading ? 'Loading…' : `${artworks.length} pieces in your collection`}
        meta={
          <p className="text-[var(--text-muted)] text-xs">
            Plan: {isPlanActive ? planId : `${planId} (inactive)`} · Active listings: {activeCount}
            {hasFiniteLimit ? ` / ${ent.artworksLimit}` : ' (unlimited)'}
          </p>
        }
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddForm(true)}
              disabled={atLimit}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-colors text-sm sm:text-base ${
                atLimit
                  ? 'bg-[var(--surface-3)] text-[var(--text-muted)] cursor-not-allowed border border-[var(--border)]'
                  : 'bg-[var(--blue)] text-[var(--on-blue)] hover:bg-[var(--blue-hover)] shadow-sm'
              }`}
            >
              <Plus className="w-5 h-5" />
              <span>Add Artwork</span>
            </button>
            {atLimit && (
              <a
                href="#/plans-pricing"
                className="px-3 py-2 text-sm bg-[var(--accent)] text-[var(--accent-contrast)] rounded-lg"
              >
                Upgrade to add more
              </a>
            )}
          </div>
        }
      />

      {atLimit && (
        <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4 mb-6 text-sm flex items-center justify-between flex-wrap gap-3">
          <div className="text-[var(--text)]">
            You currently have {activeCount} artworks listed, which is the maximum for your plan. Upgrade your plan to list more artwork.
          </div>
          <a
            href="#/plans-pricing"
            className="px-3 py-2 bg-[var(--accent)] text-[var(--accent-contrast)] rounded-lg text-sm"
          >
            View plans
          </a>
        </div>
      )}

      {error && (
        <div className="bg-[var(--surface-2)] rounded-xl p-4 border border-[var(--border)] mb-6">
          <p className="text-sm text-[var(--danger)]">{error}</p>
        </div>
      )}

      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 sm:p-6">
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl sm:text-2xl font-semibold">Add New Artwork</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-2 hover:bg-[var(--surface-3)] rounded-lg transition-colors text-[var(--text)]"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm text-[var(--text)] mb-2">Artwork Photos (at least 3)</label>
                <div className="flex gap-3 items-center">
                  <label className="flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] cursor-pointer" aria-label="Upload artwork photos" title="Upload artwork photos">
                    <Upload className="w-5 h-5 text-[var(--text-muted)]" />
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = e.target.files;
                        if (!files) return;
                        Array.from(files).forEach((file) => handleFileSelected(file));
                      }}
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
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  {new Set([...(newArtwork.imageUrls || []), ...(newArtwork.imageUrl ? [newArtwork.imageUrl] : [])]).size} photo(s) added
                </p>
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
                <label className="block text-sm text-[var(--text)] mb-2">
                  Backstory <span className="text-[var(--text-muted)] font-normal">(Optional but recommended)</span>
                </label>
                <textarea
                  value={newArtwork.description}
                  onChange={(e) => setNewArtwork({ ...newArtwork, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
                  placeholder="Share the story behind your artwork—what inspired it, your creative process, or what makes it special. Buyers love connecting with the artist's journey."
                />
                <p className="text-xs text-[var(--text-muted)] mt-1.5">
                  💡 Artworks with backstories get 3x more buyer engagement
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[var(--text)] mb-2">Medium (required)</label>
                  <input
                    type="text"
                    value={newArtwork.medium}
                    onChange={(e) => setNewArtwork({ ...newArtwork, medium: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]"
                    placeholder="Oil on canvas"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--text)] mb-2">Materials (required)</label>
                  <input
                    type="text"
                    value={newArtwork.materials}
                    onChange={(e) => setNewArtwork({ ...newArtwork, materials: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]"
                    placeholder="Canvas, acrylic paint"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-[var(--text)] mb-2">Dimensions (required)</label>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <input
                    type="number"
                    value={newArtwork.dimensionsWidth}
                    onChange={(e) => setNewArtwork({ ...newArtwork, dimensionsWidth: e.target.value })}
                    className="px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]"
                    placeholder="Width"
                  />
                  <input
                    type="number"
                    value={newArtwork.dimensionsHeight}
                    onChange={(e) => setNewArtwork({ ...newArtwork, dimensionsHeight: e.target.value })}
                    className="px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]"
                    placeholder="Height"
                  />
                  <input
                    type="number"
                    value={newArtwork.dimensionsDepth}
                    onChange={(e) => setNewArtwork({ ...newArtwork, dimensionsDepth: e.target.value })}
                    className="px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]"
                    placeholder="Depth (optional)"
                  />
                  <select
                    value={newArtwork.dimensionsUnit}
                    onChange={(e) => setNewArtwork({ ...newArtwork, dimensionsUnit: e.target.value })}
                    className="px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]"
                  >
                    <option value="in">in</option>
                    <option value="cm">cm</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[var(--text)] mb-2">Condition (required)</label>
                  <select
                    value={newArtwork.condition}
                    onChange={(e) => setNewArtwork({ ...newArtwork, condition: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]"
                  >
                    <option value="new">New</option>
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-[var(--text)] mb-2">Known flaws (required)</label>
                  <input
                    type="text"
                    value={newArtwork.knownFlaws}
                    onChange={(e) => setNewArtwork({ ...newArtwork, knownFlaws: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]"
                    placeholder="None"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[var(--text)] mb-2">Edition type (required)</label>
                  <select
                    value={newArtwork.editionType}
                    onChange={(e) => setNewArtwork({ ...newArtwork, editionType: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]"
                  >
                    <option value="original">Original</option>
                    <option value="print">Print</option>
                  </select>
                </div>
                {newArtwork.editionType === 'print' && (
                  <div>
                    <label className="block text-sm text-[var(--text)] mb-2">Edition size (required for prints)</label>
                    <input
                      type="number"
                      value={newArtwork.editionSize}
                      onChange={(e) => setNewArtwork({ ...newArtwork, editionSize: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]"
                      placeholder="e.g., 25"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm text-[var(--text)] mb-2">Shipping time estimate (required)</label>
                <input
                  type="text"
                  value={newArtwork.shippingTimeEstimate}
                  onChange={(e) => setNewArtwork({ ...newArtwork, shippingTimeEstimate: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]"
                  placeholder="2–5 business days"
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--text)] mb-2">In-space photo (optional)</label>
                <input
                  type="url"
                  value={newArtwork.inSpacePhotoUrl}
                  onChange={(e) => setNewArtwork({ ...newArtwork, inSpacePhotoUrl: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]"
                  placeholder="Optional photo of artwork in a space"
                />
              </div>

              <div className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newArtwork.colorAccuracyAck}
                  onChange={(e) => setNewArtwork({ ...newArtwork, colorAccuracyAck: e.target.checked })}
                  className="h-4 w-4"
                />
                <span className="text-[var(--text-muted)]">I understand photos may vary by display and lighting.</span>
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
                <p className="text-xs text-[var(--text-muted)] mt-1">Take home up to 85% depending on your plan.</p>
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
                  disabled={saving || uploading || atLimit}
                  className="flex-1 px-4 py-2 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Artwork
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {artworks.map((artwork) => {
          const isPro = (artistPlan?.tier || 'free') === 'pro';
          
          return (
          <div
            key={artwork.id}
            className={`bg-[var(--surface-1)] rounded-xl overflow-hidden border hover:shadow-lg transition-shadow group ${
              isPro
                ? 'border-[var(--accent)] border-2 ring-1 ring-[var(--accent)] ring-opacity-30'
                : 'border-[var(--border)]'
            }`}
          >
            {/* Featured badge for Pro tier */}
            {isPro && (
              <div className="absolute top-3 right-3 z-10">
                <div className="flex items-center gap-1 px-3 py-1 bg-[var(--accent)] text-white rounded-full text-xs font-semibold shadow-lg">
                  <span>★</span>
                  <span>Featured</span>
                </div>
              </div>
            )}
            
            <div className="aspect-square bg-[var(--surface-2)] overflow-hidden relative">
              <img
                src={artwork.imageUrl}
                alt={artwork.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                loading="lazy"
                decoding="async"
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
              {/* Mini QR Preview */}
              <div className="mt-3 flex items-center gap-3">
                <img
                  src={`${API_BASE}/api/artworks/${encodeURIComponent(String(artwork.id))}/qrcode.svg?w=96`}
                  alt="QR code"
                  className="w-16 h-16 bg-[var(--surface-2)] border border-[var(--border)] rounded-md"
                />
                <div className="text-xs text-[var(--text-muted)]">
                  Scan to open purchase page
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
                <a
                  href={`#/purchase-${artwork.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-3 py-2 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] text-xs sm:text-sm text-center"
                >
                  View Page
                </a>
                <a
                  href={`${API_BASE}/api/artworks/${encodeURIComponent(String(artwork.id))}/qrcode.svg`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-3 py-2 bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-3)] text-xs sm:text-sm text-center"
                >
                  QR (SVG)
                </a>
                <a
                  href={`${API_BASE}/api/artworks/${encodeURIComponent(String(artwork.id))}/qrcode.png`}
                  className="inline-flex items-center justify-center px-3 py-2 bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-3)] text-xs sm:text-sm text-center"
                >
                  QR (PNG)
                </a>
                <a
                  href={`${API_BASE}/api/artworks/${encodeURIComponent(String(artwork.id))}/qr-poster`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-3 py-2 bg-[var(--green-muted)] text-[var(--green)] rounded-lg hover:opacity-90 text-xs sm:text-sm text-center"
                >
                  Poster
                </a>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {!loading && artworks.length === 0 && (
        <EmptyState
          icon={<Plus className="w-8 h-8" />}
          title="No artworks yet"
          description="Start by adding your first piece"
          primaryAction={{
            label: 'Add Your First Artwork',
            onClick: () => setShowAddForm(true),
          }}
        />
      )}
    </div>
  );
}
