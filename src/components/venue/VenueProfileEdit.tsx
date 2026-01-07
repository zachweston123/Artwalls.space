import { useState } from 'react';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { LabelChip } from '../LabelChip';
import { VENUE_HIGHLIGHTS_GROUPS } from '../../data/highlights';

interface VenueProfileEditProps {
  initialData?: Partial<VenueProfileData>;
  onSave: (data: VenueProfileData) => void;
  onCancel: () => void;
}

export interface VenueProfileData {
  name: string;
  type: string;
  bio: string;
  labels: string[];
  foundedYear: number;
  coverPhoto?: string;
  email?: string;
  phoneNumber?: string;
  city?: string;
}

export function VenueProfileEdit({ initialData, onSave, onCancel }: VenueProfileEditProps) {
  const [formData, setFormData] = useState<VenueProfileData>({
    name: initialData?.name ?? '',
    type: initialData?.type ?? '',
    bio: initialData?.bio ?? '',
    labels: initialData?.labels ?? [],
    foundedYear: initialData?.foundedYear ?? new Date().getFullYear(),
    coverPhoto: initialData?.coverPhoto ?? '',
    email: initialData?.email ?? '',
    phoneNumber: initialData?.phoneNumber ?? '',
    city: (initialData as any)?.city ?? '',
  });

  const venueTypes = [
    'Coffee Shop',
    'Restaurant',
    'Wine Bar',
    'Bar',
    'Brewery',
    'Hotel',
    'Gallery',
    'Retail',
    'Office',
    'Other',
  ];

  const grouped = VENUE_HIGHLIGHTS_GROUPS;

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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 sm:p-6">
      <div className="bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text)] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-[var(--surface-1)] border-b border-[var(--border)] p-5 sm:p-6 flex items-center justify-between z-10">
          <h2 className="text-xl sm:text-2xl font-bold">Edit Venue Profile</h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-[var(--surface-2)] rounded-lg transition-colors text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-6 sm:space-y-8">
          {/* Cover Photo */}
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-3">
              Cover Photo
            </label>
            {formData.coverPhoto ? (
              <div className="relative">
                <div className="h-48 bg-[var(--surface-2)] rounded-lg overflow-hidden">
                  <img
                    src={formData.coverPhoto}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 bg-[var(--surface-1)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-3)] transition-colors shadow-lg"
                >
                  <Upload className="w-4 h-4" />
                  Change Photo
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-[var(--border)] rounded-xl p-12 text-center hover:border-[var(--green)] transition-colors cursor-pointer">
                <ImageIcon className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
                <p className="text-[var(--text-muted)] mb-1">Click to upload cover photo</p>
                <p className="text-xs text-[var(--text-muted)]">JPG or PNG, 1200x400px recommended, max 10MB</p>
              </div>
            )}
          </div>

          {/* Venue Name */}
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-2">
              Venue Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
              placeholder="Your venue name"
              required
            />
          </div>

          {/* Contact Email */}
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-2">Contact Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
              placeholder="you@venue.com"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-2">Phone Number</label>
            <input
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
              placeholder="e.g. +15551234567"
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">Sale notifications will be sent to this number.</p>
          </div>

          {/* City */}
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-2">City</label>
            <input
              type="text"
              value={formData.city || ''}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
              placeholder="e.g. Portland"
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">Helps artists find you by location.</p>
          </div>

          {/* Venue Type */}
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-2">
              Venue Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
              required
            >
              {venueTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-2">
              About Your Venue
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={6}
              maxLength={600}
              className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
              placeholder="Describe your venue, atmosphere, mission, and why you support local artists..."
              required
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {formData.bio.length}/600 characters
            </p>
          </div>

          {/* Founded Year */}
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-2">
              Founded Year
            </label>
            <select
              value={formData.foundedYear}
              onChange={(e) => setFormData({ ...formData, foundedYear: parseInt(e.target.value) })}
              className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
              required
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {currentYear - formData.foundedYear} years in business
            </p>
          </div>

          {/* Venue Labels */}
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-3">
              Venue Highlights <span className="text-[var(--text-muted)]">(Select all that apply)</span>
            </label>
            <div className="space-y-4">
              {Object.entries(grouped).map(([groupName, items]) => (
                <div key={groupName}>
                  <p className="text-xs text-[var(--text-muted)] mb-2">{groupName}</p>
                  <div className="flex flex-wrap gap-2">
                    {items.map(({ label, tooltip }) => (
                      <LabelChip
                        key={label}
                        label={label}
                        selected={formData.labels.includes(label)}
                        onClick={() => toggleLabel(label)}
                        role="venue"
                        title={tooltip}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              {formData.labels.length} selected • Help artists find the right fit
            </p>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-[var(--green-muted)] rounded-lg border border-[var(--border)]">
            <p className="text-sm text-[var(--text)]">
              <strong>Tip:</strong> A complete profile helps artists understand your venue culture and increases quality applications. Update your installation schedule in Venue Settings.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-[var(--surface-2)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-3)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-opacity"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
