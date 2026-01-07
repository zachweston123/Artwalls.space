import { useState } from 'react';
import { X, Upload, Camera, Loader2 } from 'lucide-react';
import { LabelChip } from '../LabelChip';
import { supabase } from '../../lib/supabase';
import { uploadProfilePhoto } from '../../lib/storage';

interface ArtistProfileEditProps {
  onSave: (data: ArtistProfileData) => void;
  onCancel: () => void;
}

export interface ArtistProfileData {
  name: string;
  bio: string;
  artTypes: string[];
  openToNew: boolean;
  avatar?: string;
  instagram?: string;
}

export function ArtistProfileEdit({ onSave, onCancel }: ArtistProfileEditProps) {
  const [formData, setFormData] = useState<ArtistProfileData>({
    name: '',
    bio: '',
    artTypes: [],
    openToNew: true,
    avatar: '',
    instagram: '',
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const allArtTypes = [
    'Painter', 'Photographer', 'Illustrator', 'Digital', 
    'Mixed Media', 'Printmaker', 'Collage', 'Sculptor',
    'Street Artist', 'Installation', 'Textile Artist', 'Ceramicist'
  ];

  const toggleArtType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      artTypes: prev.artTypes.includes(type)
        ? prev.artTypes.filter(t => t !== type)
        : [...prev.artTypes, type]
    }));
  };

  const handlePhotoUpload = async (file?: File) => {
    if (!file) return;
    try {
      setUploading(true);
      setUploadError(null);
      
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }
      
      // Validate file type
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        throw new Error('Only JPG, PNG, and WebP images are allowed');
      }
      
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) throw new Error('Not signed in');
      
      const url = await uploadProfilePhoto(userId, file, 'artist');
      setFormData(prev => ({ ...prev, avatar: url }));
    } catch (err: any) {
      setUploadError(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 sm:p-6">
      <div className="bg-[var(--surface-2)] text-[var(--text)] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border)] shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-[var(--surface-2)] border-b border-[var(--border)] p-5 sm:p-6 flex items-center justify-between z-10">
          <h2 className="text-xl sm:text-2xl font-bold">Edit Profile</h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-[var(--surface-3)] rounded-lg transition-colors text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-6 sm:space-y-8">
          {/* Profile Photo */}
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-3">
              Profile Photo
            </label>
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-[var(--surface-3)] border-4 border-[var(--border)]">
                {formData.avatar ? (
                  <img
                    src={formData.avatar}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Camera className="w-8 h-8 text-[var(--text-muted)]" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => document.getElementById('artist-photo-input')?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--surface-3)] text-[var(--text)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-2)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload Photo
                  </>
                )}
              </button>
              <input
                id="artist-photo-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
                disabled={uploading}
              />
            </div>
            {uploadError && (
              <p className="text-xs text-red-500 mt-2">{uploadError}</p>
            )}
            {formData.avatar && (
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, avatar: '' }))}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] mt-2 underline"
              >
                Remove photo
              </button>
            )}
            <p className="text-xs text-[var(--text-muted)] mt-2">
              JPG, PNG, or WebP. Max 5MB. Square images work best.
            </p>
          </div>

          {/* Artist Name */}
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
              placeholder="Your name or artist name"
              required
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-2">
              Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={6}
              maxLength={500}
              className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
              placeholder="Tell venues about your artistic practice, style, and what makes your work unique..."
              required
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {formData.bio.length}/500 characters
            </p>
          </div>

          {/* Art Types */}
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-3">
              Art Types <span className="text-[var(--text-muted)]">(Select all that apply)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {allArtTypes.map((type) => (
                <LabelChip
                  key={type}
                  label={type}
                  selected={formData.artTypes.includes(type)}
                  onClick={() => toggleArtType(type)}
                  role="artist"
                />
              ))}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              {formData.artTypes.length} selected
            </p>
          </div>

          {/* Instagram Handle */}
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-2">
              Instagram Handle <span className="text-[var(--text-muted)]">(Optional)</span>
            </label>
            <div className="flex items-center">
              <span className="text-[var(--text-muted)] px-4 py-2 bg-[var(--surface-3)] rounded-l-lg border border-r-0 border-[var(--border)]">@</span>
              <input
                type="text"
                value={formData.instagram?.replace('@', '') || ''}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value ? `@${e.target.value}` : '' })}
                className="flex-1 px-4 py-2 rounded-r-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
                placeholder="yourinstagramhandle"
              />
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Link your Instagram profile so venues can see your work
            </p>
          </div>

          {/* Open to Placements Toggle */}
          <div className="p-4 bg-[var(--surface-2)] rounded-lg border border-[var(--blue)]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <label className="block text-sm mb-1">Open to new placements</label>
                <p className="text-xs text-[var(--text-muted)]">
                  Let venues know you're actively seeking display opportunities. You'll appear in discovery searches.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, openToNew: !formData.openToNew })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.openToNew
                    ? 'bg-[var(--blue)]'
                    : 'bg-[var(--border)]'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-[var(--surface-1)] transition-transform ${
                    formData.openToNew ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-[var(--surface-3)] text-[var(--text)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-2)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
