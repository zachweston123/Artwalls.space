import { useState } from 'react';
import { X, Upload, Camera } from 'lucide-react';
import { LabelChip } from '../LabelChip';

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
}

export function ArtistProfileEdit({ onSave, onCancel }: ArtistProfileEditProps) {
  const [formData, setFormData] = useState<ArtistProfileData>({
    name: 'Sarah Chen',
    bio: 'Contemporary mixed media artist exploring themes of urban life and human connection. My work combines traditional painting techniques with digital elements to create layered, textured pieces that invite viewers to look closer and discover hidden narratives.',
    artTypes: ['Painter', 'Mixed Media', 'Digital', 'Collage'],
    openToNew: true,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
  });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-neutral-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl">Edit Profile</h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Profile Photo */}
          <div>
            <label className="block text-sm text-neutral-700 dark:text-neutral-300 mb-3">
              Profile Photo
            </label>
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-neutral-100 border-4 border-neutral-200">
                {formData.avatar ? (
                  <img
                    src={formData.avatar}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Camera className="w-8 h-8 text-neutral-400" />
                  </div>
                )}
              </div>
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Upload Photo
              </button>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
              JPG or PNG, max 5MB. Square images work best.
            </p>
          </div>

          {/* Artist Name */}
          <div>
            <label className="block text-sm text-neutral-700 dark:text-neutral-300 mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              placeholder="Your name or artist name"
              required
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm text-neutral-700 dark:text-neutral-300 mb-2">
              Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={6}
              maxLength={500}
              className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              placeholder="Tell venues about your artistic practice, style, and what makes your work unique..."
              required
            />
            <p className="text-xs text-neutral-500 mt-1">
              {formData.bio.length}/500 characters
            </p>
          </div>

          {/* Art Types */}
          <div>
            <label className="block text-sm text-neutral-700 dark:text-neutral-300 mb-3">
              Art Types <span className="text-neutral-500">(Select all that apply)</span>
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
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
              {formData.artTypes.length} selected
            </p>
          </div>

          {/* Open to Placements Toggle */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <label className="block text-sm mb-1">Open to new placements</label>
                <p className="text-xs text-neutral-600">
                  Let venues know you're actively seeking display opportunities. You'll appear in discovery searches.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, openToNew: !formData.openToNew })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.openToNew
                    ? 'bg-blue-600'
                    : 'bg-neutral-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.openToNew ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-neutral-200">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
