/**
 * Venue Settings Pages
 * Customization pages for venue partners to update settings
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useVenueData } from '../hooks/useVenueData';
import '../styles/venue-settings.css';

// ============================================================================
// VenueSettings - Main settings container
// ============================================================================

const VenueSettings: React.FC = () => {
  const navigate = useNavigate();
  const { venue, loading } = useVenueData();
  const [activeSection, setActiveSection] = useState('basic');

  const settingsSections = [
    { id: 'basic', label: 'Basic Info', icon: '📋' },
    { id: 'wall', label: 'Wall Config', icon: '🖼️' },
    { id: 'categories', label: 'Art Categories', icon: '🎨' },
    { id: 'photos', label: 'Venue Photos', icon: '📸' },
    { id: 'qr', label: 'QR Setup', icon: '📱' }
  ];

  if (loading) {
    return <div className="settings-loading">Loading...</div>;
  }

  return (
    <div className="venue-settings">
      <div className="settings-header">
        <h1>Venue Settings</h1>
        <p>Customize your {venue?.name} profile</p>
      </div>

      <div className="settings-container">
        {/* Sidebar */}
        <div className="settings-sidebar">
          {settingsSections.map(section => (
            <button
              key={section.id}
              className={`settings-nav-item ${activeSection === section.id ? 'active' : ''}`}
              onClick={() => setActiveSection(section.id)}
            >
              {section.icon} {section.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="settings-content">
          {activeSection === 'basic' && <VenueBasicSettings />}
          {activeSection === 'wall' && <VenueWallSettings />}
          {activeSection === 'categories' && <VenueCategoriesSettings />}
          {activeSection === 'photos' && <VenuePhotosSettings />}
          {activeSection === 'qr' && <VenueQRSettings />}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// VenueBasicSettings - Name, location, hours, website, social
// ============================================================================

const VenueBasicSettings: React.FC = () => {
  const { venue } = useVenueData();
  const [formData, setFormData] = useState({
    name: venue?.name || '',
    address: venue?.address || '',
    city: venue?.city || '',
    website: venue?.website || '',
    instagram: venue?.instagram || '',
    hours: venue?.hours || '10am - 10pm'
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: Call API to update venue
      // PATCH /api/venues/:id/settings
      
      setMessage('✓ Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('✗ Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-section">
      <h2>Basic Information</h2>
      <p className="section-description">Update your venue's basic details</p>

      <div className="form-group">
        <label>Venue Name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Your venue name"
          className="form-input"
        />
        <p className="field-note">This is how customers will see your venue</p>
      </div>

      <div className="form-group">
        <label>Address</label>
        <input
          type="text"
          name="address"
          value={formData.address}
          onChange={handleChange}
          placeholder="Street address"
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label>City</label>
        <input
          type="text"
          name="city"
          value={formData.city}
          onChange={handleChange}
          placeholder="City"
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label>Hours of Operation</label>
        <input
          type="text"
          name="hours"
          value={formData.hours}
          onChange={handleChange}
          placeholder="e.g., 10am - 10pm"
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label>Website (optional)</label>
        <input
          type="url"
          name="website"
          value={formData.website}
          onChange={handleChange}
          placeholder="https://yourwebsite.com"
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label>Instagram Handle (optional)</label>
        <input
          type="text"
          name="instagram"
          value={formData.instagram}
          onChange={handleChange}
          placeholder="@your_instagram"
          className="form-input"
        />
      </div>

      {message && <div className="form-message">{message}</div>}

      <button 
        className="btn btn-primary"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
};

// ============================================================================
// VenueWallSettings - Wall type, display spots, dimensions
// ============================================================================

const VenueWallSettings: React.FC = () => {
  const { venue } = useVenueData();
  const [formData, setFormData] = useState({
    wall_type: venue?.wall_type || 'single',
    display_spots: venue?.display_spots || 1,
    wall_dimensions: venue?.wall_dimensions || ''
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'display_spots' ? parseInt(value) : value 
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: Call API to update venue
      setMessage('✓ Wall settings saved!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('✗ Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-section">
      <h2>Wall Configuration</h2>
      <p className="section-description">Configure how artwork is displayed in your venue</p>

      <div className="form-group">
        <label>Wall Type</label>
        <select
          name="wall_type"
          value={formData.wall_type}
          onChange={handleChange}
          className="form-input"
        >
          <option value="single">Single Wall</option>
          <option value="multiple">Multiple Walls</option>
          <option value="rotating">Rotating Display</option>
          <option value="mixed">Mixed Display</option>
        </select>
        <p className="field-note">Choose how you display artwork in your space</p>
      </div>

      <div className="form-group">
        <label>Number of Display Spots</label>
        <input
          type="number"
          name="display_spots"
          value={formData.display_spots}
          onChange={handleChange}
          min="1"
          max="50"
          className="form-input"
        />
        <p className="field-note">How many pieces can be displayed simultaneously?</p>
      </div>

      <div className="form-group">
        <label>Wall Dimensions (optional)</label>
        <input
          type="text"
          name="wall_dimensions"
          value={formData.wall_dimensions}
          onChange={handleChange}
          placeholder="e.g., 8ft x 10ft"
          className="form-input"
        />
        <p className="field-note">Helps artists submit appropriately-sized work</p>
      </div>

      <div className="info-box">
        <strong>💡 Tip:</strong> More display spots means more rotation opportunities and higher earning potential!
      </div>

      {message && <div className="form-message">{message}</div>}

      <button 
        className="btn btn-primary"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
};

// ============================================================================
// VenueCategoriesSettings - Art categories
// ============================================================================

const VenueCategoriesSettings: React.FC = () => {
  const { venue } = useVenueData();
  
  const allCategories = [
    'Painting', 'Digital Art', 'Photography', 'Sculpture',
    'Street Art', 'Illustration', 'Mixed Media', 'Prints'
  ];

  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    venue?.categories || []
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleSave = async () => {
    if (selectedCategories.length === 0) {
      setMessage('⚠️ Please select at least one category');
      return;
    }

    setSaving(true);
    try {
      // TODO: Call API to update venue
      setMessage('✓ Categories saved!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('✗ Failed to save categories');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-section">
      <h2>Art Categories</h2>
      <p className="section-description">Select which types of art you'd like to feature</p>

      <div className="categories-grid">
        {allCategories.map(category => (
          <label key={category} className="category-checkbox">
            <input
              type="checkbox"
              checked={selectedCategories.includes(category)}
              onChange={() => toggleCategory(category)}
            />
            <span className="checkbox-label">{category}</span>
          </label>
        ))}
      </div>

      <div className="info-box">
        <strong>💡 Note:</strong> Your selected categories help match your venue with artists. You can change these anytime!
      </div>

      {message && <div className="form-message">{message}</div>}

      <button 
        className="btn btn-primary"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
};

// ============================================================================
// VenuePhotosSettings - Upload and manage venue photos
// ============================================================================

const VenuePhotosSettings: React.FC = () => {
  const { venue } = useVenueData();
  const [photos, setPhotos] = useState<string[]>(venue?.photos || []);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);
    try {
      // TODO: Upload photos to storage
      // - Compress images
      // - Generate thumbnails
      // - Update photos array
      
      setMessage('✓ Photo uploaded successfully!');
    } catch (error) {
      setMessage('✗ Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="settings-section">
      <h2>Venue Photos</h2>
      <p className="section-description">Upload photos of your venue to help artists understand your space</p>

      <div className="photo-upload-area">
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handlePhotoUpload}
          disabled={uploading || photos.length >= 5}
          className="file-input"
        />
        <div className="upload-prompt">
          <p>📸 Click to upload or drag photos here</p>
          <p className="small-text">Min 3 photos, Max 5 photos (JPG, PNG)</p>
        </div>
      </div>

      {photos.length > 0 && (
        <div className="photos-grid">
          {photos.map((photo, index) => (
            <div key={index} className="photo-item">
              <img src={photo} alt={`Venue ${index + 1}`} />
              <button 
                className="btn-remove"
                onClick={() => handleRemovePhoto(index)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="photo-count">{photos.length}/5 photos uploaded</p>

      {message && <div className="form-message">{message}</div>}

      <button 
        className="btn btn-primary"
        disabled={photos.length < 3 || uploading}
      >
        {uploading ? 'Uploading...' : 'Save Changes'}
      </button>
    </div>
  );
};

// ============================================================================
// VenueQRSettings - QR code management
// ============================================================================

const VenueQRSettings: React.FC = () => {
  const { venue } = useVenueData();
  const [qrDownloaded, setQrDownloaded] = useState(venue?.qr_downloaded || false);

  const handleDownloadQR = () => {
    // TODO: Generate and download QR code as PNG/PDF
    setQrDownloaded(true);
  };

  const handlePrintQR = () => {
    // TODO: Open print dialog for QR code
    window.print();
  };

  return (
    <div className="settings-section">
      <h2>QR Code Setup</h2>
      <p className="section-description">Manage your venue's QR code for customer access</p>

      <div className="qr-container">
        <div className="qr-preview">
          <div className="qr-placeholder">
            {/* TODO: Display actual QR code */}
            <p>QR Code Preview</p>
          </div>
          <p className="qr-url">artwalls.space/venue/{venue?.id}</p>
        </div>

        <div className="qr-actions">
          <button className="btn btn-primary" onClick={handleDownloadQR}>
            📥 Download QR Code
          </button>
          <button className="btn btn-secondary" onClick={handlePrintQR}>
            🖨️ Print QR Code
          </button>
        </div>
      </div>

      <div className="qr-info">
        <h3>QR Code Best Practices</h3>
        <ul>
          <li>Place QR codes in high-traffic areas</li>
          <li>Use as posters or staff badges</li>
          <li>Include a call-to-action like "Scan to explore art!"</li>
          <li>Test QR code with multiple devices</li>
          <li>Track scans in your dashboard analytics</li>
        </ul>
      </div>

      <div className="info-box">
        <strong>💡 Pro Tip:</strong> Display your QR code prominently near the art to encourage customer engagement!
      </div>
    </div>
  );
};

export default VenueSettings;
