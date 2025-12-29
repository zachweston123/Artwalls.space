import { useState } from 'react';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { LabelChip } from '../LabelChip';

interface VenueProfileEditProps {
  onSave: (data: VenueProfileData) => void;
  onCancel: () => void;
}

export interface VenueProfileData {
  name: string;
  bio: string;
  labels: string[];
  foundedYear: number;
  coverPhoto?: string;
}

export function VenueProfileEdit({ onSave, onCancel }: VenueProfileEditProps) {
  const [formData, setFormData] = useState<VenueProfileData>({
    name: 'Brew & Palette Café',
    bio: 'A cozy neighborhood café and art space in the heart of Portland\'s Pearl District. We\'ve been supporting local artists for over 8 years, providing rotating wall displays that complement our warm, inviting atmosphere. Our mission is to make art accessible while serving exceptional coffee.',
    labels: ['Locally owned', 'LGBTQ+ friendly', 'Dog-friendly', 'Student-friendly'],
    foundedYear: 2016,
    coverPhoto: 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=1200',
  });

  const allLabels = [
    'Locally owned', 'LGBTQ+ friendly', 'Women-owned', 'Black-owned',
    'Veteran-owned', 'Student-friendly', 'Family-friendly', 'Dog-friendly',
    'Wheelchair accessible', 'Live music venue', 'Late night hours',
    'Outdoor seating', 'Full bar', 'Wine & beer only'
  ];

  const toggleLabel = (label: string) => {
    setFormData(prev => ({
      ...prev,
      labels: prev.labels.includes(label)
        ? prev.labels.filter(l => l !== label)
        : [...prev.labels, label]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-6">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl">Edit Venue Profile</h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Cover Photo */}
          <div>
            <label className="block text-sm text-neutral-700 dark:text-neutral-300 mb-3">
              Cover Photo
            </label>
            {formData.coverPhoto ? (
              <div className="relative">
                <div className="h-48 bg-neutral-100 dark:bg-neutral-900 rounded-lg overflow-hidden">
                  <img
                    src={formData.coverPhoto}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors shadow-lg"
                >
                  <Upload className="w-4 h-4" />
                  Change Photo
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl p-12 text-center hover:border-green-500 dark:hover:border-green-400 transition-colors cursor-pointer">
                <ImageIcon className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
                <p className="text-neutral-600 dark:text-neutral-300 mb-1">Click to upload cover photo</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">JPG or PNG, 1200x400px recommended, max 10MB</p>
              </div>
            )}
          </div>

          {/* Venue Name */}
          <div>
            <label className="block text-sm text-neutral-700 dark:text-neutral-300 mb-2">
              Venue Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400"
              placeholder="Your venue name"
              required
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm text-neutral-700 dark:text-neutral-300 mb-2">
              About Your Venue
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={6}
              maxLength={600}
              className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400"
              placeholder="Describe your venue, atmosphere, mission, and why you support local artists..."
              required
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {formData.bio.length}/600 characters
            </p>
          </div>

          {/* Founded Year */}
          <div>
            <label className="block text-sm text-neutral-700 dark:text-neutral-300 mb-2">
              Founded Year
            </label>
            <select
              value={formData.foundedYear}
              onChange={(e) => setFormData({ ...formData, foundedYear: parseInt(e.target.value) })}
              className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400"
              required
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {currentYear - formData.foundedYear} years in business
            </p>
          </div>

          {/* Venue Labels */}
          <div>
            <label className="block text-sm text-neutral-700 dark:text-neutral-300 mb-3">
              Venue Highlights <span className="text-neutral-500">(Select all that apply)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {allLabels.map((label) => (
                <LabelChip
                  key={label}
                  label={label}
                  selected={formData.labels.includes(label)}
                  onClick={() => toggleLabel(label)}
                  role="venue"
                />
              ))}
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
              {formData.labels.length} selected • Help artists find the right fit
            </p>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-100 dark:border-green-800">
            <p className="text-sm text-green-900 dark:text-green-200">
              <strong>Tip:</strong> A complete profile helps artists understand your venue culture and increases quality applications. Update your installation schedule in Venue Settings.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-400 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
