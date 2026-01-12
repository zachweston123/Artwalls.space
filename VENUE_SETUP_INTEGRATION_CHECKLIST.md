# Quick Integration Guide for VenueDashboard

## Add Setup Health Checklist to VenueDashboard

### 1. Import the Component

In `src/components/venue/VenueDashboard.tsx`, add:

```tsx
import { SetupHealthChecklist } from './SetupHealthChecklist';
```

### 2. Add State for Setup Status

```tsx
// In VenueDashboard component
const [setupStatus, setSetupStatus] = useState({
  photosAdded: false,
  profilePublished: false,
  wallConfigured: false,
  qrDownloaded: false,
  qrPlacementConfirmed: false,
  sharedVenuePage: false,
});

// Fetch setup status on mount
useEffect(() => {
  const fetchSetupStatus = async () => {
    try {
      const response = await apiGet(`/api/venues/${user.id}/setup-status`);
      setSetupStatus(response.checklist);
    } catch (err) {
      console.error('Failed to fetch setup status:', err);
    }
  };
  
  if (user?.id) {
    fetchSetupStatus();
  }
}, [user?.id]);
```

### 3. Render the Checklist

Place near the top of the dashboard (after any alerts):

```tsx
// In VenueDashboard render section
<div className="mb-12">
  {/* Auto-show setup wizard for new venues */}
  {venueStatus === 'draft' && !setupCompleted && (
    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 mb-8">
      <h3 className="font-bold text-blue-600 mb-2">Welcome! Let's set up your venue</h3>
      <p className="text-sm text-blue-600/80 mb-4">
        Follow our quick setup wizard to get your profile live and start receiving artist applications.
      </p>
      <button
        onClick={() => onNavigate?.('venue-setup')}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
      >
        Start Setup Wizard
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )}

  {/* Setup Health Checklist */}
  <SetupHealthChecklist
    {...setupStatus}
    onNavigate={onNavigate}
  />
</div>

{/* Rest of dashboard content */}
```

### 4. Add Navigation Links in Sidebar

Update the venue navigation (likely in Navigation.tsx or a sidebar):

```tsx
// Add to venue menu
{
  label: '📚 Partner Kit & Setup Guide',
  page: 'venue-partner-kit',
},
```

## Venue Portal Customization Sections

### 1. Update VenueProfile Component

Add a "Recommended" badge to default fields:

```tsx
<div className="flex items-center gap-2">
  <label>Venue Name</label>
  {isDefault('name') && (
    <span className="text-xs bg-[var(--accent)]/20 text-[var(--accent)] px-2 py-1 rounded">
      Recommended
    </span>
  )}
</div>
```

### 2. Add "Reset to Recommended" Buttons

In each section of VenueProfile:

```tsx
<button
  onClick={() => resetSectionToRecommended('name')}
  className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1"
>
  ↻ Reset to Recommended
</button>
```

### 3. Show "Customized" State

```tsx
{!isDefault('name') && (
  <span className="text-xs bg-amber-500/20 text-amber-600 px-2 py-1 rounded">
    Customized
  </span>
)}
```

## Quick Setup Flow Navigation

Add these navigation items to make setup wizard accessible:

```tsx
// In VenueDashboard or main navigation
<div className="mb-8 space-y-3">
  <h3 className="font-semibold text-[var(--text)]">Setup & Configuration</h3>
  <ul className="space-y-2">
    <li>
      <button
        onClick={() => onNavigate?.('venue-setup')}
        className="text-[var(--accent)] hover:underline text-sm flex items-center gap-2"
      >
        <CheckCircle className="w-4 h-4" />
        Setup Wizard
      </button>
    </li>
    <li>
      <button
        onClick={() => onNavigate?.('venue-partner-kit')}
        className="text-[var(--accent)] hover:underline text-sm flex items-center gap-2"
      >
        <BookOpen className="w-4 h-4" />
        Partner Kit & Training
      </button>
    </li>
    <li>
      <button
        onClick={() => onNavigate?.('venue-profile')}
        className="text-[var(--accent)] hover:underline text-sm flex items-center gap-2"
      >
        <Edit className="w-4 h-4" />
        Edit Profile
      </button>
    </li>
    <li>
      <button
        onClick={() => onNavigate?.('venue-walls')}
        className="text-[var(--accent)] hover:underline text-sm flex items-center gap-2"
      >
        <Palette className="w-4 h-4" />
        Configure Walls
      </button>
    </li>
  </ul>
</div>
```

## API Integration Points

### Fetch Setup Status
```tsx
// After navigation
useEffect(() => {
  const loadSetupData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch current setup draft (if in progress)
      const draft = await apiGet(`/api/venues/${user.id}/setup-draft`);
      
      // Fetch setup status (checklist completion)
      const status = await apiGet(`/api/venues/${user.id}/setup-status`);
      
      setSetupStatus(status.checklist);
    } catch (err) {
      console.error('Failed to load setup data:', err);
    }
  };

  loadSetupData();
}, []);
```

### Update Setup Status When Items Complete

```tsx
// When user uploads photos
const handlePhotoUpload = async (files: File[]) => {
  // ... upload logic ...
  
  // Update status
  await apiPost(`/api/venues/${user.id}/setup-status`, {
    photosAdded: true,
  });
  
  // Refresh checklist
  setSetupStatus(prev => ({ ...prev, photosAdded: true }));
};
```

## Feature Flags (Optional)

If you want to gradually roll out the setup wizard:

```tsx
// In environment config
const FEATURES = {
  VENUE_SETUP_WIZARD: true,
  EMBEDDED_PARTNER_KIT: true,
  SETUP_HEALTH_CHECKLIST: true,
};

// Use in components
{FEATURES.SETUP_HEALTH_CHECKLIST && (
  <SetupHealthChecklist {...setupStatus} onNavigate={onNavigate} />
)}
```

## Mobile Optimization Notes

- Wizard uses responsive grid layouts
- Health checklist items stack on mobile
- Partner Kit sections are expandable (not all content visible at once)
- Touch-friendly button sizes (48px minimum)

## Dark Mode Support

All components use CSS variables:
- `--bg` - Background
- `--surface` - Card/section background
- `--text` - Text color
- `--text-muted` - Muted text
- `--accent` - Primary accent color
- `--border` - Border color

These automatically adapt to light/dark mode.

## Performance Considerations

1. Lazy load partner kit sections (only expand when clicked)
2. Cache setup status in localStorage
3. Debounce draft saves (500ms delay after last change)
4. Paginate photo uploads if > 10 photos

## Testing the Integration

1. Create a test venue account
2. Verify setup wizard launches automatically
3. Complete all 5 steps
4. Verify health checklist updates
5. Test "Save & Exit" and resume
6. Test partner kit PDF download
7. Test customization in profile editor
8. Verify "Reset to Recommended" works

## Troubleshooting

**Issue**: Setup wizard doesn't appear after signup
- Check venue status in DB (should be 'draft')
- Verify route is wired in App.tsx
- Check browser console for errors

**Issue**: Health checklist items not updating
- Verify API endpoint returns correct status
- Check localStorage for cached data
- Verify setupStatus state is updating

**Issue**: Photos not uploading
- Check file size limits
- Verify image format is supported
- Check API endpoint for upload errors

**Issue**: PDF download not working
- Verify PDF generation service is running
- Check browser console for network errors
- Verify CORS headers if using external service
