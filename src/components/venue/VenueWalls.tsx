import { useEffect, useState } from 'react';
import { Plus, X, Frame, Upload, Image as ImageIcon } from 'lucide-react';
import { apiGet, apiPost } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { uploadWallspacePhoto } from '../../lib/storage';

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
      const widthNum = parseFloat(newWall.width);
      const heightNum = parseFloat(newWall.height);
      
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

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      {authError && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-600 text-center">{authError}</p>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl mb-2">My Wall Spaces</h1>
          <p className="text-[var(--text-muted)]">
            {wallSpaces.length} total spaces • {wallSpaces.filter(w => w.available).length} available
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" />
          <span>Add Wall Space</span>
        </button>
      </div>

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
                  <label className="block text-sm text-[var(--text-muted)] mb-2">Width (inches)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={newWall.width}
                    onChange={(e) => setNewWall({ ...newWall, width: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
                    placeholder="96"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-muted)] mb-2">Height (inches)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={newWall.height}
                    onChange={(e) => setNewWall({ ...newWall, height: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
                    placeholder="72"
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
        {Array.isArray(wallSpaces) && wallSpaces.map((wall) => (
          <div
            key={wall.id}
            className="bg-[var(--surface-1)] rounded-xl overflow-hidden border border-[var(--border)] hover:shadow-lg transition-shadow"
          >
            {/* Wall Photo Preview */}
            {wall.photos && wall.photos.length > 0 && (
              <div className="h-48 bg-[var(--surface-2)] overflow-hidden relative">
                <img
                  src={wall.photos[0]}
                  alt={wall.name}
                  className="w-full h-full object-cover"
                />
                {wall.photos.length > 1 && (
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white rounded text-xs flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" />
                    {wall.photos.length} photos
                  </div>
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

                <button
                  onClick={() => toggleAvailability(wall.id)}
                  className={`w-full px-4 py-2 rounded-lg transition-colors ${
                    wall.available
                      ? 'bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface-3)]'
                      : 'bg-[var(--green)] text-[var(--accent-contrast)] hover:opacity-90'
                  }`}
                >
                  {wall.available ? 'Mark as Occupied' : 'Mark as Available'}
                </button>
              </div>
            </div>
          </div>
        ))}
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