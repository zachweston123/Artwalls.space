# Venue Portal Customization Section - Implementation

This document shows how to enhance the existing Venue Portal to allow customization of setup wizard defaults.

## Overview

After completing the setup wizard, venues should be able to customize any setting in the Venue Portal. Each section should:

1. Show current value
2. Indicate if it's a "Recommended" default or "Customized"
3. Allow editing
4. Provide "Reset to Recommended" button (per section)
5. Clearly state what can be changed

## Component: Setup & Settings Area

Create a new component or section in the Venue Portal:

```tsx
// src/components/venue/VenueSetupAndSettings.tsx
import { RotateCcw, ChevronRight } from 'lucide-react';

interface VenueSetupAndSettingsProps {
  onNavigate?: (page: string) => void;
}

export function VenueSetupAndSettings({ onNavigate }: VenueSetupAndSettingsProps) {
  const [venue, setVenue] = useState<any>(null);
  const [customized, setCustomized] = useState<Record<string, boolean>>({});

  const sections = [
    {
      id: 'profile',
      title: 'Profile & Basics',
      description: 'Venue name, address, hours, links',
      icon: '📋',
      fields: ['name', 'address', 'hours', 'website', 'instagram'],
      action: () => onNavigate?.('venue-profile'),
      defaults: ['name', 'address', 'hours'],
    },
    {
      id: 'photos',
      title: 'Photos',
      description: 'Upload 5+ high-quality photos',
      icon: '📸',
      fields: ['photos'],
      action: () => onNavigate?.('venue-profile'),
      defaults: [],
    },
    {
      id: 'walls',
      title: 'Wall Configuration',
      description: 'Display spots, dimensions, wall type',
      icon: '🖼️',
      fields: ['wallType', 'displaySpots', 'wallDimensions'],
      action: () => onNavigate?.('venue-walls'),
      defaults: ['wallType', 'displaySpots'],
    },
    {
      id: 'categories',
      title: 'Categories & Tags',
      description: 'How your venue appears in discovery',
      icon: '🏷️',
      fields: ['categories'],
      action: () => onNavigate?.('venue-settings'),
      defaults: ['categories'],
    },
    {
      id: 'promotion',
      title: 'Promotion Settings',
      description: 'Featured placement, events, newsletters',
      icon: '✨',
      fields: ['featuredOptIn', 'eventNotifications', 'newsletter'],
      action: () => onNavigate?.('venue-settings'),
      defaults: [],
    },
    {
      id: 'assets',
      title: 'QR & Marketing Assets',
      description: 'Download posters, table tents, signage',
      icon: '📥',
      fields: ['qrAssets'],
      action: () => onNavigate?.('venue-settings'),
      defaults: [],
    },
  ];

  const resetToRecommended = async (sectionId: string) => {
    // Call API to reset section
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    try {
      await apiPost(`/api/venues/${venue.id}/reset-section`, {
        section: sectionId,
        fields: section.defaults,
      });

      // Update local state
      setCustomized(prev => ({
        ...prev,
        [sectionId]: false,
      }));

      // Refresh venue data
      // ... fetch updated venue data
    } catch (err) {
      console.error('Failed to reset section:', err);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-[var(--text)] mb-2">Setup & Customization</h2>
        <p className="text-[var(--text-muted)]">
          Every setting can be customized to match your venue. We recommend starting with the defaults.
        </p>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <SettingsSectionCard
            key={section.id}
            section={section}
            isCustomized={customized[section.id] || false}
            onNavigate={onNavigate}
            onReset={() => resetToRecommended(section.id)}
          />
        ))}
      </div>
    </div>
  );
}

// Individual Section Card
function SettingsSectionCard({
  section,
  isCustomized,
  onNavigate,
  onReset,
}: {
  section: any;
  isCustomized: boolean;
  onNavigate?: (page: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4">
          <span className="text-3xl">{section.icon}</span>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-[var(--text)]">{section.title}</h3>
              {isCustomized ? (
                <span className="text-xs bg-amber-500/20 text-amber-600 px-2 py-1 rounded">
                  Customized
                </span>
              ) : (
                <span className="text-xs bg-[var(--accent)]/20 text-[var(--accent)] px-2 py-1 rounded">
                  Recommended
                </span>
              )}
            </div>
            <p className="text-sm text-[var(--text-muted)]">{section.description}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={section.action}
          className="flex-1 px-4 py-2 bg-[var(--accent)] text-[var(--accent-contrast)] rounded-lg font-semibold hover:opacity-90 transition flex items-center justify-center gap-2"
        >
          Edit
          <ChevronRight className="w-4 h-4" />
        </button>

        {isCustomized && (
          <button
            onClick={onReset}
            className="px-4 py-2 bg-[var(--surface-2)] text-[var(--text)] rounded-lg font-semibold hover:bg-[var(--surface-3)] transition flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
```

## Integrating into Existing Pages

### 1. Update VenueProfile.tsx

Add badges to show recommended vs customized:

```tsx
// In each form section
<div className="flex items-center justify-between">
  <label className="text-sm font-medium text-[var(--text)]">
    Venue Name
  </label>
  {isDefaultValue('name') ? (
    <span className="text-xs bg-[var(--accent)]/20 text-[var(--accent)] px-2 py-1 rounded">
      Recommended
    </span>
  ) : (
    <span className="text-xs bg-amber-500/20 text-amber-600 px-2 py-1 rounded">
      Customized
    </span>
  )}
</div>

<input
  type="text"
  value={name}
  onChange={(e) => {
    setName(e.target.value);
    markAsCustomized('name');
  }}
  className="w-full px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)]"
/>

{!isDefaultValue('name') && (
  <button
    onClick={() => resetField('name')}
    className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 mt-2"
  >
    <RotateCcw className="w-3 h-3" />
    Reset to Recommended
  </button>
)}
```

### 2. Update VenueWalls.tsx

Show default wall configuration:

```tsx
<div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
  <p className="text-sm text-blue-600">
    💡 We recommend starting with 1 wall (your current setup).
    You can add more walls as you grow.
  </p>
</div>

{/* Add Reset button if customized */}
{walls.length > 1 && (
  <button
    onClick={() => resetToSingleWall()}
    className="px-4 py-2 bg-[var(--surface-2)] text-[var(--text)] rounded-lg text-sm hover:bg-[var(--surface-3)] transition flex items-center gap-2"
  >
    <RotateCcw className="w-4 h-4" />
    Reset to Single Wall (Recommended)
  </button>
)}
```

### 3. Update VenueSettings.tsx

Add customization section:

```tsx
<section>
  <h2 className="text-xl font-bold text-[var(--text)] mb-4">Setup & Customization</h2>
  
  <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-6 mb-8">
    <p className="text-[var(--text-muted)] text-sm mb-4">
      Every setting below can be customized. We recommend the defaults to get started.
    </p>

    {/* Categories Section */}
    <div className="mb-6 pb-6 border-b border-[var(--border)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[var(--text)]">Categories</h3>
        {areCategoriesCustomized && (
          <span className="text-xs bg-amber-500/20 text-amber-600 px-2 py-1 rounded">
            Customized
          </span>
        )}
      </div>
      {/* Category selection UI */}
      {areCategoriesCustomized && (
        <button
          onClick={() => resetCategories()}
          className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          Reset to Recommended Categories
        </button>
      )}
    </div>

    {/* QR Placement Section */}
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[var(--text)]">QR Code Placement</h3>
        {isQRCustomized && (
          <span className="text-xs bg-amber-500/20 text-amber-600 px-2 py-1 rounded">
            Customized
          </span>
        )}
      </div>
      {/* QR placement selection UI */}
      {isQRCustomized && (
        <button
          onClick={() => resetQRPlacement()}
          className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          Reset to Recommended Placement
        </button>
      )}
    </div>
  </div>
</section>
```

## API Endpoints Needed

### Reset Section to Recommended

```
POST /api/venues/:venueId/reset-section
Body: {
  section: 'profile' | 'walls' | 'categories' | 'promotion' | 'qr'
  fields: string[] // Which fields to reset
}
Response: {
  success: boolean
  resetFields: any // The reset values
}
```

### Get Customization Status

```
GET /api/venues/:venueId/customization-status
Response: {
  profile: {
    name: 'customized' | 'recommended'
    address: 'customized' | 'recommended'
    hours: 'customized' | 'recommended'
    // ... etc
  }
  walls: {
    wallType: 'customized' | 'recommended'
    displaySpots: 'customized' | 'recommended'
    // ... etc
  }
  // ... other sections
}
```

## State Management Helper Hook

Create a hook to manage customization state:

```tsx
// src/hooks/useVenueCustomization.ts
import { useState, useEffect } from 'react';

export function useVenueCustomization(venueId: string) {
  const [customizedFields, setCustomizedFields] = useState<Record<string, boolean>>({});
  const [defaults, setDefaults] = useState<Record<string, any>>({});

  useEffect(() => {
    const fetchCustomizationStatus = async () => {
      try {
        const response = await apiGet(`/api/venues/${venueId}/customization-status`);
        setCustomizedFields(response.customizedFields);
        setDefaults(response.defaults);
      } catch (err) {
        console.error('Failed to fetch customization status:', err);
      }
    };

    if (venueId) {
      fetchCustomizationStatus();
    }
  }, [venueId]);

  const isCustomized = (fieldPath: string): boolean => {
    return customizedFields[fieldPath] ?? false;
  };

  const resetField = async (fieldPath: string) => {
    try {
      const response = await apiPost(`/api/venues/${venueId}/reset-field`, {
        fieldPath,
      });

      setCustomizedFields(prev => ({
        ...prev,
        [fieldPath]: false,
      }));

      return response.value;
    } catch (err) {
      console.error('Failed to reset field:', err);
      throw err;
    }
  };

  const resetSection = async (sectionId: string) => {
    try {
      const response = await apiPost(`/api/venues/${venueId}/reset-section`, {
        section: sectionId,
      });

      // Mark all fields in section as non-customized
      Object.keys(customizedFields).forEach(key => {
        if (key.startsWith(`${sectionId}.`)) {
          setCustomizedFields(prev => ({
            ...prev,
            [key]: false,
          }));
        }
      });

      return response.resetFields;
    } catch (err) {
      console.error('Failed to reset section:', err);
      throw err;
    }
  };

  const getDefaultValue = (fieldPath: string): any => {
    return defaults[fieldPath];
  };

  return {
    isCustomized,
    resetField,
    resetSection,
    getDefaultValue,
    customizedFields,
    defaults,
  };
}

// Usage in component
const customization = useVenueCustomization(venue.id);

{customization.isCustomized('name') ? (
  <span>Customized</span>
) : (
  <span>Recommended</span>
)}
```

## Navigation & Sidebar Updates

Add quick links to customization areas:

```tsx
// In venue sidebar/navigation
<nav className="space-y-4">
  <div>
    <h3 className="text-xs font-bold uppercase text-[var(--text-muted)] mb-3">
      Setup & Customization
    </h3>
    <ul className="space-y-2">
      <li>
        <button
          className="text-sm text-[var(--accent)] hover:underline flex items-center gap-2"
          onClick={() => onNavigate?.('venue-setup-and-settings')}
        >
          <CheckCircle className="w-4 h-4" />
          Overview
        </button>
      </li>
      <li>
        <button
          className="text-sm text-[var(--accent)] hover:underline flex items-center gap-2"
          onClick={() => onNavigate?.('venue-profile')}
        >
          <Edit className="w-4 h-4" />
          Profile & Basics
        </button>
      </li>
      <li>
        <button
          className="text-sm text-[var(--accent)] hover:underline flex items-center gap-2"
          onClick={() => onNavigate?.('venue-walls')}
        >
          <Palette className="w-4 h-4" />
          Wall Configuration
        </button>
      </li>
      <li>
        <button
          className="text-sm text-[var(--accent)] hover:underline flex items-center gap-2"
          onClick={() => onNavigate?.('venue-settings')}
        >
          <Sliders className="w-4 h-4" />
          Settings
        </button>
      </li>
      <li>
        <button
          className="text-sm text-[var(--accent)] hover:underline flex items-center gap-2"
          onClick={() => onNavigate?.('venue-partner-kit')}
        >
          <BookOpen className="w-4 h-4" />
          Partner Kit
        </button>
      </li>
    </ul>
  </div>
</nav>
```

## Testing Customization

```tsx
// Test file: VenueSetupAndSettings.test.tsx
describe('VenueSetupAndSettings', () => {
  it('should show recommended badge for default values', () => {
    // ... test
  });

  it('should show customized badge when value changes', () => {
    // ... test
  });

  it('should reset field to default on reset click', () => {
    // ... test
  });

  it('should reset entire section on section reset', () => {
    // ... test
  });

  it('should persist customization state', () => {
    // ... test
  });
});
```

## Customization Flow Summary

```
User Completes Setup Wizard
        ↓
Draft Venue Created (all defaults)
        ↓
Venue Portal Opens
        ↓
User sees "Setup & Customization" area
        ↓
User can:
  - View each section with its default status
  - Click to edit any section
  - See what values are "Recommended" vs "Customized"
  - Reset individual fields
  - Reset entire sections
        ↓
Changes saved to database
        ↓
Venue profile updated with customizations
```

## Key Points

1. **Defaults are Recommendations** - Not requirements
2. **Clear Visual Feedback** - Badges show status (Recommended/Customized)
3. **Easy Reset** - One-click reset to recommended value
4. **Section-Level Control** - Reset individual sections or single fields
5. **No Confusion** - Users always know what's default vs custom
6. **Progressive Enhancement** - Works with existing Venue Portal

## Future Enhancements

1. **Change History** - Show when/what was customized
2. **A/B Testing** - Compare recommended vs customized performance
3. **Suggestions** - "We think you should try X instead of Y"
4. **Import from Competitor** - Let users import profile from other platforms
5. **Mobile App** - Bring customization to mobile
