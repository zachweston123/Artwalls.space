import { useState } from 'react';
import { CheckCircle } from 'lucide-react';

interface VenueApplicationProps {
  onNavigate?: (page: string) => void;
}

export function VenueApplication({ onNavigate }: VenueApplicationProps) {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    venue_name: '',
    address: '',
    city: '',
    contact_name: '',
    contact_email: '',
    phone_number: '',
    venue_type: '',
    website_url: '',
    instagram_handle: '',
    wall_dimensions: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('http://localhost:4242/api/venue-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmitted(true);
        setTimeout(() => {
          onNavigate?.('venues-partner-kit');
        }, 3000);
      }
    } catch (error) {
      console.error('Submission failed:', error);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-center">
          <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-[var(--text)] mb-2">Application Submitted!</h1>
          <p className="text-[var(--text-muted)] mb-6">Thanks for applying. Our team will review and contact you within 2-3 business days.</p>
          <button
            onClick={() => onNavigate?.('venues-partner-kit')}
            className="px-6 py-2 bg-[var(--accent)] text-[var(--accent-contrast)] rounded-lg font-semibold hover:opacity-90"
          >
            Back to Partner Kit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <div className="bg-[var(--surface)] border-b border-[var(--border)] py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <h1 className="text-4xl font-bold text-[var(--text)] mb-2">Become a Venue Partner</h1>
          <p className="text-[var(--text-muted)]">Step {step} of 2</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <form onSubmit={handleSubmit} className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-8">
          {step === 1 ? (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-[var(--text)]">Venue Information</h2>

              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Venue Name *</label>
                <input
                  type="text"
                  name="venue_name"
                  value={formData.venue_name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  placeholder="e.g., Modern Gallery Space"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">Address *</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    placeholder="Street address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">City *</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    placeholder="City"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Venue Type *</label>
                <select
                  name="venue_type"
                  value={formData.venue_type}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                >
                  <option value="">Select a type</option>
                  <option value="gallery">Gallery</option>
                  <option value="cafe">Café / Coffee Shop</option>
                  <option value="restaurant">Restaurant / Bar</option>
                  <option value="retail">Retail Store</option>
                  <option value="office">Office / Corporate</option>
                  <option value="hotel">Hotel / Hospitality</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">Website (Optional)</label>
                  <input
                    type="url"
                    name="website_url"
                    value={formData.website_url}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">Instagram (Optional)</label>
                  <input
                    type="text"
                    name="instagram_handle"
                    value={formData.instagram_handle}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    placeholder="@yourhandle"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => onNavigate?.('venues-partner-kit')}
                  className="px-6 py-2 bg-[var(--surface-2)] text-[var(--text)] rounded-lg font-semibold hover:bg-[var(--surface-3)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="ml-auto px-6 py-2 bg-[var(--accent)] text-[var(--accent-contrast)] rounded-lg font-semibold hover:opacity-90 transition-opacity"
                >
                  Next
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-[var(--text)]">Contact & Space Details</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">Contact Name *</label>
                  <input
                    type="text"
                    name="contact_name"
                    value={formData.contact_name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">Email *</label>
                  <input
                    type="email"
                    name="contact_email"
                    value={formData.contact_email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Phone Number *</label>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Wall Dimensions *</label>
                <input
                  type="text"
                  name="wall_dimensions"
                  value={formData.wall_dimensions}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  placeholder="e.g., 10 feet × 12 feet"
                />
              </div>

              <div className="bg-[var(--surface-2)] p-4 rounded-lg border border-[var(--border)]">
                <p className="text-sm text-[var(--text-muted)]">
                  By submitting this application, you agree to our <a href="#" className="text-[var(--accent)] hover:underline">Venue Hosting Policy</a> and <a href="#" className="text-[var(--accent)] hover:underline">Terms of Service</a>.
                </p>
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-2 bg-[var(--surface-2)] text-[var(--text)] rounded-lg font-semibold hover:bg-[var(--surface-3)] transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="ml-auto px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
                >
                  Submit Application
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}