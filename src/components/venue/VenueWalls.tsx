import { useEffect, useState } from 'react';
import { Plus, X, Frame, Upload, Image as ImageIcon, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiGet, apiPost } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { uploadWallspacePhoto } from '../../lib/storage';
import { PageHeroHeader } from '../PageHeroHeader';

type WallSpace = {
  id: string;
  name: string;
  width?: number;
  height?: number;
  available: boolean;
  description?: string;
  photos?: string[];
  currentArtworkId?: string;
};

export function VenueWalls() {
  const [wallSpaces, setWallSpaces] = useState<WallSpace[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newWall, setNewWall] = useState({
    name: '',
    width: '',
    height: '',
    description: '',
    photos: [] as string[],
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [editingWall, setEditingWall] = useState<WallSpace | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    width: '',
    height: '',
    description: '',
    photos: [] as string[],
    available: true,
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editUploadingPhoto, setEditUploadingPhoto] = useState(false);
  const [editUploadError, setEditUploadError] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState<Record<string, number>>({});

  useEffect(() => {
    let isMounted = true;
    async function loadWalls() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error('Auth error:', error);
          setAuthError('Authentication error. Please log in again.');
          return;
        }
        const user = data.user;
        console.log('VenueWalls: user:', user, 'role:', user?.user_metadata?.role);
        if (!user) {
          console.warn('VenueWalls: No user found');
          setAuthError('Please log in to access this page.');
          return;
        }
        if (user.user_metadata?.role !== 'venue') {
          console.warn('VenueWalls: User is not a venue');
          setAuthError('This page is only available to venue accounts.');
          return;
        }
        const venueId = user?.id;
        console.log('VenueWalls: venueId:', venueId);
        if (!venueId) {
          console.warn('VenueWalls: No venue ID found');
          setAuthError('Unable to identify your venue account.');
          return;
        }
        console.log('VenueWalls: Loading wallspaces for venue:', venueId);
        const items = await apiGet<WallSpace[]>(`/api/venues/${venueId}/wallspaces`);
        console.log('VenueWalls: API response:', items);
        const wallSpacesArray = Array.isArray(items) ? items : [];
        console.log('VenueWalls: Setting wallspaces:', wallSpacesArray);
        if (isMounted) setWallSpaces(wallSpacesArray);
        setAuthError(null);
      } catch (err) {
        console.error('VenueWalls: Failed to load wallspaces:', err);
        setAuthError('Failed to load wall spaces. Please try again.');
        // Keep empty list if none yet
      }
    }
    loadWalls();
    return () => { isMounted = false; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    
    // Validate required fields
    if (!newWall.name.trim()) {
      setSubmitError('Wall name is required');
      return;
    }
    if (!newWall.width || parseFloat(newWall.width) <= 0) {
      setSubmitError('Width must be a positive number');
      return;
    }
    if (!newWall.height || parseFloat(newWall.height) <= 0) {
      setSubmitError('Height must be a positive number');
      return;
    }

    try {
      setSubmitting(true);
      const widthNumFeet = parseFloat(newWall.width);
      const heightNumFeet = parseFloat(newWall.height);
      const widthNum = Number.isFinite(widthNumFeet) ? widthNumFeet * 12 : NaN;
      const heightNum = Number.isFinite(heightNumFeet) ? heightNumFeet * 12 : NaN;
      
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      const venueId = user?.id;
      if (!venueId) throw new Error('Missing venue session');
      
      console.log('Creating wallspace with:', {
        name: newWall.name.trim(),
        width: widthNum,
        height: heightNum,
        description: newWall.description.trim(),
        photos: newWall.photos,
        venueId
      });
      
      const created = await apiPost<WallSpace>(`/api/venues/${venueId}/wallspaces`, {
        name: newWall.name.trim(),
        width: widthNum,
        height: heightNum,
        description: newWall.description.trim(),
        photos: newWall.photos,
      });
      
      console.log('Wall space created:', created);
      
      setWallSpaces([created, ...wallSpaces]);
      setNewWall({ name: '', width: '', height: '', description: '', photos: [] });
      setShowAddForm(false);
      setSubmitError(null);
    } catch (err: any) {
      console.error('Add wall space error:', err);
      const errorMsg = err?.message || 'Failed to add wall space. Please try again.';
      setSubmitError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAvailability = async (id: string) => {
    try {
      const target = wallSpaces.find(w => w.id === id);
      const nextAvailable = !target?.available;
      await apiPost(`/api/wallspaces/${id}`, { available: nextAvailable }, { 'X-HTTP-Method-Override': 'PATCH' });
      setWallSpaces(wallSpaces.map(wall => wall.id === id ? { ...wall, available: Boolean(nextAvailable) } : wall));
    } catch (err) {
      console.error(err);
    }
  };

  const handlePhotoUpload = async (file?: File) => {
    if (!file) return;
    try {
      setUploadingPhoto(true);
      setUploadError(null);
      const { data } = await supabase.auth.getUser();
      const venueId = data.user?.id;
      if (!venueId) throw new Error('Not signed in as venue');
      const url = await uploadWallspacePhoto(venueId, file);
      if (newWall.photos.length < 6) {
        setNewWall({ ...newWall, photos: [...newWall.photos, url] });
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Upload failed');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = (index: number) => {
    setNewWall({ 
      ...newWall, 
      photos: newWall.photos.filter((_, i) => i !== index) 
    });
  };

  const handleEditPhotoUpload = async (file?: File) => {
    if (!file || !editingWall) return;
    try {
      setEditUploadingPhoto(true);
      setEditUploadError(null);
      const { data } = await supabase.auth.getUser();
      const venueId = data.user?.id;
      if (!venueId) throw new Error('Not signed in as venue');
      const url = await uploadWallspacePhoto(venueId, file);
      if (editForm.photos.length < 6) {
        setEditForm({ ...editForm, photos: [...editForm.photos, url] });
      }
    } catch (err: any) {
      setEditUploadError(err?.message || 'Upload failed');
    } finally {
      setEditUploadingPhoto(false);
    }
  };

  const removeEditPhoto = (index: number) => {
    setEditForm({
      ...editForm,
      photos: editForm.photos.filter((_, i) => i !== index),
    });
  };

  const openEditForm = (wall: WallSpace) => {
    setEditingWall(wall);
    setEditForm({
      name: wall.name || '',
      width: wall.width ? String(wall.width / 12) : '',
      height: wall.height ? String(wall.height / 12) : '',
      description: wall.description || '',
      photos: Array.isArray(wall.photos) ? wall.photos : [],
      available: Boolean(wall.available),
    });
    setEditError(null);
    setEditUploadError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWall) return;
    setEditError(null);

    if (!editForm.name.trim()) {
      setEditError('Wall name is required');
      return;
    }

    const widthFeet = editForm.width ? parseFloat(editForm.width) : undefined;
    const heightFeet = editForm.height ? parseFloat(editForm.height) : undefined;
    const widthNum = widthFeet !== undefined && Number.isFinite(widthFeet) ? widthFeet * 12 : undefined;
    const heightNum = heightFeet !== undefined && Number.isFinite(heightFeet) ? heightFeet * 12 : undefined;
    if (editForm.width && (!Number.isFinite(widthFeet) || widthFeet <= 0)) {
      setEditError('Width must be a positive number');
      return;
    }
    if (editForm.height && (!Number.isFinite(heightFeet) || heightFeet <= 0)) {
      setEditError('Height must be a positive number');
      return;
    }

    try {
      setEditSubmitting(true);
      const payload: any = {
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        available: editForm.available,
        photos: editForm.photos,
      };
      if (widthNum !== undefined) payload.width = widthNum;
      if (heightNum !== undefined) payload.height = heightNum;

      const updated = await apiPost<WallSpace>(`/api/wallspaces/${editingWall.id}`, payload, {
        'X-HTTP-Method-Override': 'PATCH',
      });

      setWallSpaces((prev) => prev.map((w) => (w.id === updated.id ? { ...w, ...updated } : w)));
      setEditingWall(null);
    } catch (err: any) {
      setEditError(err?.message || 'Failed to update wall space');
    } finally {
      setEditSubmitting(false);
    }
  };

  const changePhoto = (wallId: string, delta: number, total: number) => {
    setPhotoIndex((prev) => {
      const current = prev[wallId] ?? 0;
      const next = ((current + delta) % total + total) % total;
      return { ...prev, [wallId]: next };
    });
  };

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      {authError && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-600 text-center">{authError}</p>
        </div>
      )}

      {editingWall && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 sm:p-6 overflow-y-auto">
          <div className="bg-[var(--surface-1)] text-[var(--text)] rounded-2xl p-6 sm:p-8 max-w-2xl w-full border border-[var(--border)]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl">Edit Wall Space</h2>
              <button
                onClick={() => setEditingWall(null)}
                className="p-2 hover:bg-[var(--surface-2)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-6">
              {editError && (
                <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 text-sm">
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-2">Wall Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
                  placeholder="e.g., Main Wall, Side Wall, Corner Space"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[var(--text-muted)] mb-2">Width (feet)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={editForm.width}
                    onChange={(e) => setEditForm({ ...editForm, width: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
                    placeholder="8"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-muted)] mb-2">Height (feet)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={editForm.height}
                    onChange={(e) => setEditForm({ ...editForm, height: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
                    placeholder="6"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-2">Description (Optional)</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
                  placeholder="Describe the wall location, lighting, vibe..."
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                <div>
                  <p className="text-sm text-[var(--text)]">Availability</p>
                  <p className="text-xs text-[var(--text-muted)]">Mark if artists can apply now.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, available: !editForm.available })}
                  className={`px-3 py-2 rounded-lg text-sm border ${editForm.available ? 'bg-[var(--green-muted)] text-[var(--green)] border-transparent' : 'bg-[var(--surface-1)] text-[var(--text)] border-[var(--border)]'}`}
                >
                  {editForm.available ? 'Available' : 'Occupied'}
                </button>
              </div>

              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-2">Wall Photos</label>
                <p className="text-xs text-[var(--text-muted)] mb-3">
                  Upload or replace photos so artists can see the space. Up to 6 photos.
                </p>

                {editForm.photos.length < 6 && (
                  <label className="w-full border-2 border-dashed border-[var(--border)] rounded-xl p-8 sm:p-12 text-center hover:border-[var(--focus)] transition-colors cursor-pointer mb-4 inline-block">
                    <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-[var(--text-muted)] mx-auto mb-3" />
                    <p className="text-[var(--text-muted)] mb-1">Click to upload or drag and drop</p>
                    <p className="text-xs text-[var(--text-muted)]">PNG, JPG up to 10MB</p>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleEditPhotoUpload(e.target.files?.[0])} />
                  </label>
                )}

                {editUploadingPhoto && (
                  <p className="text-xs text-[var(--text-muted)] mb-3">Uploading photo…</p>
                )}
                {editUploadError && (
                  <p className="text-xs text-[var(--danger)] mb-3">{editUploadError}</p>
                )}

                {editForm.photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {editForm.photos.map((photo, index) => (
                      <div key={index} className="relative aspect-square bg-[var(--surface-3)] rounded-lg overflow-hidden group">
                        <img
                          src={photo}
                          alt={`Wall photo ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeEditPhoto(index)}
                          className="absolute top-2 right-2 p-1 bg-[var(--danger)] text-[var(--accent-contrast)] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingWall(null)}
                  disabled={editSubmitting}
                  className="flex-1 px-4 py-2 bg-[var(--surface-2)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-3)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex-1 px-4 py-2 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <PageHeroHeader
        title="My Wall Spaces"
        subtitle={<>{wallSpaces.length} total spaces &bull; {wallSpaces.filter(w => w.available).length} available</>}
        actions={
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5" />
            <span>Add Wall Space</span>
          </button>
        }
      />

      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 sm:p-6 overflow-y-auto">
          <div className="bg-[var(--surface-1)] text-[var(--text)] rounded-2xl p-6 sm:p-8 max-w-2xl w-full border border-[var(--border)]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl">Add New Wall Space</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-2 hover:bg-[var(--surface-2)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {submitError && (
                <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 text-sm">
                  {submitError}
                </div>
              )}

              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-2">Wall Name</label>
                <input
                  type="text"
                  required
                  value={newWall.name}
                  onChange={(e) => setNewWall({ ...newWall, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
                  placeholder="e.g., Main Wall, Side Wall, Corner Space"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[var(--text-muted)] mb-2">Width (feet)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={newWall.width}
                    onChange={(e) => setNewWall({ ...newWall, width: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
                    placeholder="8"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-muted)] mb-2">Height (feet)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={newWall.height}
                    onChange={(e) => setNewWall({ ...newWall, height: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
                    placeholder="6"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-2">Description (Optional)</label>
                <textarea
                  value={newWall.description}
                  onChange={(e) => setNewWall({ ...newWall, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
                  placeholder="Describe the wall location, lighting, vibe..."
                />
              </div>

              {/* Wall Photos Section */}
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-2">Wall Photos</label>
                <p className="text-xs text-[var(--text-muted)] mb-3">
                  Add photos so artists can see the space and vibe. Good lighting recommended. (Up to 6 photos)
                </p>

                {/* Upload Area */}
                {newWall.photos.length < 6 && (
                  <label className="w-full border-2 border-dashed border-[var(--border)] rounded-xl p-8 sm:p-12 text-center hover:border-[var(--focus)] transition-colors cursor-pointer mb-4 inline-block">
                    <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-[var(--text-muted)] mx-auto mb-3" />
                    <p className="text-[var(--text-muted)] mb-1">Click to upload or drag and drop</p>
                    <p className="text-xs text-[var(--text-muted)]">PNG, JPG up to 10MB</p>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e.target.files?.[0])} />
                  </label>
                )}

                {uploadingPhoto && (
                  <p className="text-xs text-[var(--text-muted)] mb-3">Uploading photo…</p>
                )}
                {uploadError && (
                  <p className="text-xs text-[var(--danger)] mb-3">{uploadError}</p>
                )}

                {/* Photo Thumbnails */}
                {newWall.photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {newWall.photos.map((photo, index) => (
                      <div key={index} className="relative aspect-square bg-[var(--surface-3)] rounded-lg overflow-hidden group">
                        <img
                          src={photo}
                          alt={`Wall photo ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute top-2 right-2 p-1 bg-[var(--danger)] text-[var(--accent-contrast)] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setSubmitError(null);
                  }}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-[var(--surface-2)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-3)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Adding...' : 'Add Wall Space'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.isArray(wallSpaces) && wallSpaces.map((wall) => {
          const photos = Array.isArray(wall.photos) ? wall.photos : [];
          const currentIdx = photos.length ? Math.min(photoIndex[wall.id] ?? 0, photos.length - 1) : 0;
          const currentPhoto = photos.length ? photos[currentIdx] : null;

          return (
            <div
              key={wall.id}
              className="bg-[var(--surface-1)] rounded-xl overflow-hidden border border-[var(--border)] hover:shadow-lg transition-shadow"
            >
              {/* Wall Photo Preview with simple carousel */}
              {currentPhoto && (
                <div className="h-48 bg-[var(--surface-2)] overflow-hidden relative">
                  <img
                    src={currentPhoto}
                    alt={wall.name}
                    className="w-full h-full object-cover"
                  />
                  {photos.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => changePhoto(wall.id, -1, photos.length)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 text-white rounded-full hover:bg-black/80"
                        aria-label="Previous photo"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => changePhoto(wall.id, 1, photos.length)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 text-white rounded-full hover:bg-black/80"
                        aria-label="Next photo"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white rounded text-xs flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" />
                        {currentIdx + 1} / {photos.length}
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[var(--green-muted)] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Frame className="w-6 h-6 text-[var(--green)]" />
                    </div>
                    <div>
                      <h3 className="text-lg mb-1">{wall.name}</h3>
                      <p className="text-sm text-[var(--text-muted)]">
                        {wall.width && wall.height ? `${wall.width}" × ${wall.height}"` : 'Dimensions not set'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEditForm(wall)}
                    className="inline-flex items-center gap-1 px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-3)]"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                </div>

                {wall.description && (
                  <p className="text-sm text-[var(--text-muted)] mb-4 line-clamp-2">{wall.description}</p>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                    <span className="text-sm text-[var(--text-muted)]">Status</span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs ${
                        wall.available
                          ? 'bg-[var(--green-muted)] text-[var(--green)]'
                          : 'bg-[var(--surface-3)] text-[var(--text-muted)]'
                      }`}
                    >
                      {wall.available ? 'Available' : 'Occupied'}
                    </span>
                  </div>

                  {wall.currentArtworkId && (
                    <div className="p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                      <p className="text-xs text-[var(--text-muted)] mb-1">Currently displaying</p>
                      <p className="text-sm text-[var(--text)]">Sunset Boulevard</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => toggleAvailability(wall.id)}
                      className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                        wall.available
                          ? 'bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface-3)]'
                          : 'bg-[var(--green)] text-[var(--accent-contrast)] hover:opacity-90'
                      }`}
                    >
                      {wall.available ? 'Mark as Occupied' : 'Mark as Available'}
                    </button>
                    <button
                      onClick={() => openEditForm(wall)}
                      className="px-4 py-2 bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-3)] transition-colors"
                    >
                      Edit details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {wallSpaces.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-[var(--surface-3)] rounded-full flex items-center justify-center mx-auto mb-4">
            <Frame className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-xl mb-2">No wall spaces yet</h3>
          <p className="text-[var(--text-muted)] mb-6">Add your first wall space to start displaying artwork</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-6 py-2 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-opacity"
          >
            Add Your First Wall Space
          </button>
        </div>
      )}
    </div>
  );
}