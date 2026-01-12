# Venue Portal Customization - After Setup Reference

## Concept

After venues complete the recommended setup, they can customize everything in the Venue Portal. Each setting section shows what the recommended defaults were and allows resetting to them if desired.

## Portal Structure

```
/venue/dashboard
  ├── Setup Health Checklist (if <100% complete)
  ├── Stats & Quick Actions
  └── Recent Activity

/venue/partner-kit
  └── Full Partner Kit (reference & QR download)

/venue/settings
  ├── Profile Settings
  │   ├── Basic Info (customizable)
  │   ├── Photos (add/remove/reorder)
  │   ├── Description (free text)
  │   └── Links (website, Instagram, etc.)
  │
  ├── Wall Settings
  │   ├── Wall Type (single/multiple/rotating)
  │   ├── Display Spots (1-20)
  │   ├── Dimensions (optional)
  │   └── Rotation Schedule (if applicable)
  │
  ├── Promotion Settings
  │   ├── Categories/Tags
  │   ├── Featured Opt-in
  │   ├── Events & Descriptions
  │   └── Visibility Toggle
  │
  └── Assets & Downloads
      ├── QR Code Downloads
      ├── Social Media Assets
      └── Print Templates
```

## Implementation Pattern

Each settings section follows this pattern:

```tsx
<div className="settings-section">
  <div className="section-header">
    <h3>{title}</h3>
    <RecommendedBadge />
  </div>

  <FormFields>
    {/* Current values */}
  </FormFields>

  <div className="current-state">
    {isCustomized && <CustomizedBadge />}
    {isDefault && <DefaultBadge />}
  </div>

  <div className="actions">
    <SaveButton />
    {isCustomized && <ResetButton onClick={resetToRecommended} />}
  </div>

  <div className="explanation">
    <p className="recommended-explanation">
      "Why recommended: {reason}"
    </p>
  </div>
</div>
```

## Example: Wall Settings Section

```tsx
function WallSettingsSection() {
  const [wallType, setWallType] = useState('single');
  const [displaySpots, setDisplaySpots] = useState(1);
  const [dimensions, setDimensions] = useState('');
  
  const recommendedDefaults = {
    wallType: 'single',
    displaySpots: 1,
    dimensions: '',
  };

  const isCustomized = 
    wallType !== recommendedDefaults.wallType ||
    displaySpots !== recommendedDefaults.displaySpots ||
    dimensions !== recommendedDefaults.dimensions;

  const handleReset = () => {
    setWallType(recommendedDefaults.wallType);
    setDisplaySpots(recommendedDefaults.displaySpots);
    setDimensions(recommendedDefaults.dimensions);
  };

  const handleSave = async () => {
    await apiPatch('/api/venues/settings', {
      wallType,
      displaySpots,
      dimensions,
    });
    // Show success message
  };

  return (
    <div className="bg-[var(--surface)] p-6 rounded-lg border border-[var(--border)] mb-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-[var(--text)]">
          Wall Configuration
        </h3>
        <span className="text-xs px-2 py-1 bg-[var(--accent)]/10 text-[var(--accent)] rounded">
          Recommended
        </span>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-2">
            Wall Type
          </label>
          <div className="space-y-2">
            {['single', 'multiple', 'rotating'].map((type) => (
              <label key={type} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  value={type}
                  checked={wallType === type}
                  onChange={(e) => setWallType(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-[var(--text)] capitalize">{type} wall</span>
                {type === recommendedDefaults.wallType && (
                  <span className="text-xs text-[var(--accent)]">(Recommended)</span>
                )}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-2">
            Display Spots
          </label>
          <input
            type="number"
            min="1"
            max="20"
            value={displaySpots}
            onChange={(e) => setDisplaySpots(parseInt(e.target.value))}
            className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg"
          />
          {displaySpots === recommendedDefaults.displaySpots && (
            <p className="text-xs text-[var(--accent)] mt-1">(Using recommended)</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-2">
            Dimensions (Optional)
          </label>
          <input
            type="text"
            value={dimensions}
            onChange={(e) => setDimensions(e.target.value)}
            placeholder="e.g., 10ft x 8ft"
            className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg"
          />
        </div>
      </div>

      {/* State Indicators */}
      {isCustomized && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
          <strong>Customized</strong> - You've modified these settings from recommended defaults.
        </div>
      )}

      {/* Why Recommended */}
      <div className="mb-6 p-3 bg-[var(--surface-2)] rounded border border-[var(--border)] text-sm">
        <p className="text-[var(--text-muted)]">
          <strong>Why recommended:</strong> Starting with a single display spot lets you test the program and build confidence before expanding. You can always add more spots later.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-[var(--accent)] text-[var(--accent-contrast)] rounded-lg font-semibold hover:opacity-90 transition-opacity"
        >
          Save Settings
        </button>
        {isCustomized && (
          <button
            onClick={handleReset}
            className="px-6 py-2 bg-[var(--surface-2)] text-[var(--text)] rounded-lg font-semibold hover:bg-[var(--surface-3)] transition-colors"
          >
            Reset to Recommended
          </button>
        )}
      </div>
    </div>
  );
}
```

## Customization Sections

### 1. Profile Settings

**Fields:**
- Venue Name
- Address
- Hours
- Website
- Instagram
- Description (free text)
- Logo

**Recommended Defaults:**
- All info from setup wizard

**Customization Options:**
- Full text editing
- Change links anytime
- Update hours seasonally
- Add extended description

**Why Users Customize:**
- Seasonal hours changes
- Website or social media updates
- More detailed description needed
- Logo changes or updates

---

### 2. Wall Settings

**Fields:**
- Wall Type (single/multiple/rotating)
- Display Spots (1-20)
- Dimensions
- Rotation Schedule (if applicable)

**Recommended Defaults:**
- Type: "single"
- Spots: 1
- Dimensions: blank

**Customization Options:**
- Expand spots as program grows
- Add rotation schedules
- Update dimensions if space changes

**Why Users Customize:**
- Expanding program to multiple walls
- Adding rotation schedules
- Space changes or renovations
- Different scheduling per wall

---

### 3. Promotion Settings

**Fields:**
- Categories/Tags (multi-select)
- Featured Wall Opt-in (checkbox)
- Events (checklist of what to host)
- Visibility (public/unlisted/private)

**Recommended Defaults:**
- Categories: Contemporary, Local Artists
- Featured: checked
- Events: all checked
- Visibility: public

**Customization Options:**
- Add/remove categories
- Toggle featured opt-in
- Disable specific event types
- Hide from discovery if desired

**Why Users Customize:**
- Specializing in specific art types
- Pausing featured to reduce volume
- Event focus (e.g., don't want performances)
- Temporary unlisting during renovation

---

### 4. Assets & Downloads

**Available:**
- QR Code Downloads (poster, table tent, card)
- Social Media Assets (Instagram templates)
- Print Templates (everything pre-designed)

**Features:**
- Download anytime
- Multiple formats
- Print-ready files
- Customizable text/branding

---

## State Indicators

### Recommended Badge
Shows on sections still using all recommended defaults:
```
"Recommended" (blue background, accent color)
```

### Customized Badge
Shows on sections where at least one field differs:
```
"Customized" (blue background, blue text)
"You've modified these settings from recommended defaults."
```

### Default State
For individual fields using recommended value:
```
(Using recommended) - small text below field
```

### Per-Field Reset
When customized, show reset button at section level:
```
"Reset to Recommended" button becomes visible
Clicking resets all fields in that section to defaults
```

---

## Implementation Considerations

### Saving Changes
- Auto-save as user types (with debounce)
- Or manual Save button with success message
- Show loading state during save
- Show error toast if save fails

### Confirmation
- No confirmation needed for most fields
- Only confirm reset if customized

### Validation
- Venue name required
- Hours format validated
- Display spots: 1-20 only
- Dimensions: format validation

### Permissions
- Only venue owner can edit own settings
- Admins can override if needed
- Admin edits tracked in activity log

### Tracking Changes
- Track when and what was customized
- Show to admins in venue detail view
- Optional: email notification to admins on major changes

---

## Navigation

From settings sections, include links to:
- Partner Kit (for QR codes and guidance)
- Setup Wizard (to re-walk through)
- Support (if questions)

From Partner Kit, include links to:
- Settings (to make changes)
- Dashboard (back to main)

---

## API Endpoints Needed

### PATCH /api/venues/:id/settings
**Request:**
```json
{
  "basics": {
    "name": "...",
    "address": "...",
    "hours": "...",
    "website": "...",
    "instagram": "..."
  },
  "wall": {
    "type": "single|multiple|rotating",
    "displaySpots": 1,
    "dimensions": "..."
  },
  "categories": ["Contemporary"],
  "featured": true,
  "visibility": "public|unlisted|private"
}
```

### GET /api/venues/:id/defaults
**Response:**
```json
{
  "recommended": {
    "wall": {
      "type": "single",
      "displaySpots": 1,
      "dimensions": ""
    },
    "categories": ["Contemporary", "Local Artists"]
  }
}
```

### POST /api/venues/:id/settings/reset
**Request:**
```json
{
  "sections": ["wall", "categories"] // which sections to reset
}
```

---

## User Communication

### Onboarding
"Everything is editable! These are just recommended starting points. You can customize as much as you want."

### In Settings
"You can change any of these settings anytime."

### Reset Action
"This will restore the recommended defaults for this section. You can always customize again."

### Success
"Settings saved! Your changes are live."

---

## Accessibility

- Clear labels for all form fields
- Color not sole indicator of state
- Clear buttons (Save, Reset)
- Keyboard navigation throughout
- Screen reader friendly badges
- Form validation messages clear
