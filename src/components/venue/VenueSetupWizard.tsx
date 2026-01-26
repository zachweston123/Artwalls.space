import { useState } from 'react';
import { ArrowRight, ArrowLeft, CheckCircle, AlertCircle, MapPin, Camera, Palette, Tag, QrCode, Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { apiPost } from '../../lib/api';

export interface VenueSetupData {
  // Step 1: Basics
  name: string;
  address: string;
  hours: string;
  website?: string;
  instagram?: string;

  // Step 2: Photos
  photos: string[];
  logo?: string;

  // Step 3: Wall
  wallType: 'single' | 'multiple';
  wallDimensions?: string;
  displaySpots: number;

  // Step 4: Categories
  categories: string[];

  // Step 5: Signage
  qrPlacement: string[];
  staffOneLiners: string[];
}

interface VenueSetupWizardProps {
  onNavigate?: (page: string, params?: any) => void;
  onComplete?: () => void;
}

const RECOMMENDED_DEFAULTS = {
  displaySpots: 1,
  wallType: 'single',
  categories: ['Contemporary', 'Local Artists'],
  qrPlacement: ['entrance', 'counter'],
};

export function VenueSetupWizard({ onNavigate, onComplete }: VenueSetupWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedDraft, setSavedDraft] = useState(false);
  
  const [formData, setFormData] = useState<Partial<VenueSetupData>>({
    wallType: RECOMMENDED_DEFAULTS.wallType,
    displaySpots: RECOMMENDED_DEFAULTS.displaySpots,
    categories: RECOMMENDED_DEFAULTS.categories,
    photos: [],
    qrPlacement: RECOMMENDED_DEFAULTS.qrPlacement,
    staffOneLiners: [],
  });

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('venueInvitePrefill') : null;
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setFormData((prev) => ({
        ...prev,
        name: prev.name || parsed?.name || '',
        address: prev.address || parsed?.address || '',
        website: prev.website || parsed?.website || '',
      }));
      localStorage.removeItem('venueInvitePrefill');
    } catch {
      // ignore
    }
  }, []);

  const totalSteps = 5;
  const progress = (step / totalSteps) * 100;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
      setError(null);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSaveAndExit = async () => {
    try {
      setLoading(true);
      // Save draft to database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await apiPost('/api/venues/setup-draft', {
        venueId: user.id,
        draftData: formData,
        currentStep: step,
      });

      setSavedDraft(true);
      setTimeout(() => {
        onNavigate?.('venue-dashboard');
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    try {
      setLoading(true);
      
      if (!formData.name || !formData.address || formData.photos?.length === 0) {
        setError('Please fill in all required fields');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create/update venue profile
      await apiPost('/api/venues/complete-setup', {
        venueId: user.id,
        setupData: formData,
      });

      setSavedDraft(true);
      setTimeout(() => {
        onComplete?.();
        onNavigate?.('venue-dashboard');
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <Step1Basics formData={formData} onInputChange={handleInputChange} />;
      case 2:
        return <Step2Photos formData={formData} setFormData={setFormData} />;
      case 3:
        return <Step3Wall formData={formData} onInputChange={handleInputChange} />;
      case 4:
        return <Step4Categories formData={formData} setFormData={setFormData} />;
      case 5:
        return <Step5Signage formData={formData} setFormData={setFormData} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-[var(--text)] mb-2">Recommended Venue Setup</h1>
              <p className="text-[var(--text-muted)]">We'll guide you through the essentials. You can change everything later.</p>
            </div>
            <button
              onClick={() => onNavigate?.('venue-dashboard')}
              className="p-2 hover:bg-[var(--surface)] rounded-lg transition"
              title="Close"
            >
              <X className="w-6 h-6 text-[var(--text-muted)]" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="bg-[var(--surface-2)] rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            Step {step} of {totalSteps}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {savedDraft && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-green-500 text-sm">
              {step === totalSteps ? 'Setup complete! Redirecting...' : 'Draft saved! You can continue later.'}
            </p>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-8 mb-8">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="flex gap-4 justify-between">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className="px-6 py-3 bg-[var(--surface-2)] text-[var(--text)] rounded-lg font-semibold hover:bg-[var(--surface-3)] disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          <button
            onClick={handleSaveAndExit}
            disabled={loading}
            className="px-6 py-3 bg-[var(--surface-2)] text-[var(--text)] rounded-lg font-semibold hover:bg-[var(--surface-3)] transition flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            Save & Exit
          </button>

          {step === totalSteps ? (
            <button
              onClick={handleComplete}
              disabled={loading}
              className="px-8 py-3 bg-[var(--accent)] text-[var(--accent-contrast)] rounded-lg font-semibold hover:opacity-90 transition flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle className="w-5 h-5" />
              {loading ? 'Completing...' : 'Complete Setup'}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-8 py-3 bg-[var(--accent)] text-[var(--accent-contrast)] rounded-lg font-semibold hover:opacity-90 transition flex items-center gap-2"
            >
              Next
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Help Text */}
        <p className="text-sm text-[var(--text-muted)] text-center mt-6">
          💡 All settings can be changed later in your Venue Portal
        </p>
      </div>
    </div>
  );
}

// Step 1: Venue Basics
function Step1Basics({
  formData,
  onInputChange,
}: {
  formData: Partial<VenueSetupData>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--text)] mb-2">Confirm Your Venue Basics</h2>
        <p className="text-[var(--text-muted)] text-sm">
          These help artists find and connect with you. Why recommended: A complete profile gets 3x more artist interest.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text)] mb-2">Venue Name *</label>
        <input
          type="text"
          name="name"
          value={formData.name || ''}
          onChange={onInputChange}
          required
          placeholder="e.g., The Modern Gallery"
          className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text)] mb-2">Address *</label>
        <input
          type="text"
          name="address"
          value={formData.address || ''}
          onChange={onInputChange}
          required
          placeholder="Street address with city and state"
          className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text)] mb-2">Hours of Operation</label>
        <input
          type="text"
          name="hours"
          value={formData.hours || ''}
          onChange={onInputChange}
          placeholder="e.g., Mon-Fri 10am-8pm, Sat 12pm-6pm"
          className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-2">Website</label>
          <input
            type="url"
            name="website"
            value={formData.website || ''}
            onChange={onInputChange}
            placeholder="https://yoursite.com"
            className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-2">Instagram Handle</label>
          <input
            type="text"
            name="instagram"
            value={formData.instagram || ''}
            onChange={onInputChange}
            placeholder="@yourhandle"
            className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
      </div>

      <div className="bg-[var(--surface-2)] p-4 rounded-lg border border-[var(--border)]">
        <p className="text-xs text-[var(--text-muted)]">
          ✓ You can update all of these details in your Venue Portal anytime.
        </p>
      </div>
    </div>
  );
}

// Step 2: Photos
function Step2Photos({
  formData,
  setFormData,
}: {
  formData: Partial<VenueSetupData>;
  setFormData: (data: Partial<VenueSetupData>) => void;
}) {
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // For now, just store file names. In production, upload to storage
    const newPhotos = Array.from(files).map(f => f.name);
    setFormData(prev => ({
      ...prev,
      photos: [...(prev.photos || []), ...newPhotos],
    }));
  };

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos?.filter((_, i) => i !== index),
    }));
  };

  const photoCount = formData.photos?.length || 0;
  const minPhotos = 3;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--text)] mb-2">Add Venue Photos</h2>
        <p className="text-[var(--text-muted)] text-sm">
          Minimum {minPhotos} photos required. Why recommended: Venues with 5+ photos get 5x more artist applications.
        </p>
      </div>

      <div className="border-2 border-dashed border-[var(--border)] rounded-lg p-8 text-center">
        <Camera className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
        <p className="text-[var(--text)] font-medium mb-2">Upload Venue Photos</p>
        <p className="text-[var(--text-muted)] text-sm mb-4">
          Upload high-quality photos of your space, entrance, and wall areas
        </p>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handlePhotoUpload}
          className="hidden"
          id="photo-upload"
        />
        <label
          htmlFor="photo-upload"
          className="inline-block px-6 py-2 bg-[var(--accent)] text-[var(--accent-contrast)] rounded-lg font-semibold hover:opacity-90 transition cursor-pointer"
        >
          Choose Photos
        </label>
      </div>

      {photoCount > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-[var(--text)]">
              Photos uploaded: {photoCount} / {minPhotos} minimum
            </p>
            {photoCount >= minPhotos && (
              <span className="text-xs bg-green-500/20 text-green-600 px-2 py-1 rounded">
                ✓ Requirements met
              </span>
            )}
          </div>
          <div className="space-y-2">
            {formData.photos?.map((photo, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                <span className="text-sm text-[var(--text)]">{photo}</span>
                <button
                  onClick={() => removePhoto(idx)}
                  className="text-red-500 hover:text-red-600 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[var(--surface-2)] p-4 rounded-lg border border-[var(--border)]">
        <p className="text-xs text-[var(--text-muted)]">
          ✓ You can add or replace photos anytime in your Venue Portal.
        </p>
      </div>
    </div>
  );
}

// Step 3: Wall Configuration
function Step3Wall({
  formData,
  onInputChange,
}: {
  formData: Partial<VenueSetupData>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--text)] mb-2">Configure Your Display Wall</h2>
        <p className="text-[var(--text-muted)] text-sm">
          Why recommended: 1 well-managed wall is better than 3 neglected ones. Start simple, scale up.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text)] mb-4">Wall Type</label>
        <div className="space-y-3">
          {(['single', 'multiple'] as const).map((type) => (
            <label key={type} className="flex items-center p-4 border border-[var(--border)] rounded-lg cursor-pointer hover:bg-[var(--surface-2)] transition">
              <input
                type="radio"
                name="wallType"
                value={type}
                checked={formData.wallType === type}
                onChange={onInputChange}
                className="w-4 h-4 text-[var(--accent)]"
              />
              <div className="ml-4">
                <p className="font-medium text-[var(--text)]">
                  {type === 'single' ? 'Single Wall' : 'Multiple Walls'}
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  {type === 'single'
                    ? 'One dedicated display wall (recommended to start)'
                    : 'Artworks spread across multiple walls'}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text)] mb-2">
          Display Spots
          <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-[var(--text-muted)] mb-3">
          How many artworks do you want to display at once?
        </p>
        <input
          type="number"
          name="displaySpots"
          value={formData.displaySpots || RECOMMENDED_DEFAULTS.displaySpots}
          onChange={onInputChange}
          min="1"
          max="50"
          className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text)] mb-2">Wall Dimensions (Optional)</label>
        <input
          type="text"
          name="wallDimensions"
          value={formData.wallDimensions || ''}
          onChange={onInputChange}
          placeholder="e.g., 12ft wide × 8ft tall"
          className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
      </div>

      <div className="bg-[var(--surface-2)] p-4 rounded-lg border border-[var(--border)]">
        <p className="text-xs text-[var(--text-muted)]">
          ✓ You can adjust wall configuration and add more walls anytime in your Venue Portal.
        </p>
      </div>
    </div>
  );
}

// Step 4: Categories
function Step4Categories({
  formData,
  setFormData,
}: {
  formData: Partial<VenueSetupData>;
  setFormData: (data: Partial<VenueSetupData>) => void;
}) {
  const allCategories = [
    'Contemporary',
    'Abstract',
    'Landscape',
    'Portrait',
    'Local Artists',
    'Emerging Artists',
    'Photography',
    'Mixed Media',
    'Sculpture',
    'Street Art',
  ];

  const toggleCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories?.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...(prev.categories || []), category],
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--text)] mb-2">Categorize Your Venue</h2>
        <p className="text-[var(--text-muted)] text-sm">
          Why recommended: Artists and collectors use these to find venues. Pick 2-4 that best match your space.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {allCategories.map((category) => (
          <button
            key={category}
            onClick={() => toggleCategory(category)}
            className={`p-3 rounded-lg border-2 font-medium transition text-sm ${
              formData.categories?.includes(category)
                ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:border-[var(--accent)]'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        Selected: {formData.categories?.length || 0} categories
      </p>

      <div className="bg-[var(--surface-2)] p-4 rounded-lg border border-[var(--border)]">
        <p className="text-xs text-[var(--text-muted)]">
          ✓ You can change categories anytime in your Venue Portal.
        </p>
      </div>
    </div>
  );
}

// Step 5: Signage & Launch
function Step5Signage({
  formData,
  setFormData,
}: {
  formData: Partial<VenueSetupData>;
  setFormData: (data: Partial<VenueSetupData>) => void;
}) {
  const placementOptions = [
    { id: 'entrance', label: '📍 Entrance/Entrance Door' },
    { id: 'counter', label: '💼 Counter/Register' },
    { id: 'restroom', label: '🚻 Restroom' },
    { id: 'walls', label: '🖼️ Near Art on Wall' },
    { id: 'exit', label: '🚪 Exit' },
  ];

  const togglePlacement = (placement: string) => {
    setFormData(prev => ({
      ...prev,
      qrPlacement: prev.qrPlacement?.includes(placement)
        ? prev.qrPlacement.filter(p => p !== placement)
        : [...(prev.qrPlacement || []), placement],
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--text)] mb-2">QR Signage & Launch</h2>
        <p className="text-[var(--text-muted)] text-sm">
          Why recommended: QR placement strategy increases collector discovery by up to 40%.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text)] mb-4">
          Where will you place your QR codes?
        </label>
        <div className="space-y-3">
          {placementOptions.map((option) => (
            <label
              key={option.id}
              className="flex items-center p-4 border border-[var(--border)] rounded-lg cursor-pointer hover:bg-[var(--surface-2)] transition"
            >
              <input
                type="checkbox"
                checked={formData.qrPlacement?.includes(option.id) || false}
                onChange={() => togglePlacement(option.id)}
                className="w-4 h-4 text-[var(--accent)]"
              />
              <span className="ml-4 text-[var(--text)]">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text)] mb-2">
          Staff One-Liners (Optional)
        </label>
        <p className="text-xs text-[var(--text-muted)] mb-3">
          Brief talking points for staff to share with customers about rotating art
        </p>
        <textarea
          placeholder="e.g., 'These artworks change every month. Scan the QR to learn about the artist and purchase.'"
          value={formData.staffOneLiners?.join('\n') || ''}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            staffOneLiners: e.target.value.split('\n').filter(s => s.trim()),
          }))}
          rows={4}
          className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
      </div>

      <div className="bg-[var(--surface-2)] p-4 rounded-lg border border-[var(--border)]">
        <div className="flex gap-2 mb-3">
          <QrCode className="w-5 h-5 text-[var(--accent)] flex-shrink-0" />
          <p className="text-sm font-medium text-[var(--text)]">Next: Download & Print</p>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          After completing setup, you'll download print-ready QR codes and placement guide.
        </p>
      </div>

      <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/30">
        <p className="text-xs text-blue-600">
          ✓ You can change QR placement and regenerate codes anytime in your Venue Portal.
        </p>
      </div>
    </div>
  );
}
