# @deprecated — Internal documentation. Moved to project wiki.

/**
 * HOW TO INTEGRATE INTO VenueDashboard:
 * 
 * 1. Add import at top of VenueDashboard.tsx:
 *    import { SetupHealthChecklist } from './SetupHealthChecklist';
 *    import { generateHealthChecklistItems } from '../../types/venueSetup';
 * 
 * 2. Add this state to track venue setup data:
 *    const [venueData, setVenueData] = useState<any>(null);
 * 
 * 3. Load venue data in useEffect:
 *    async function loadVenueData() {
 *      try {
 *        const venue = await apiGet(`/api/venues/${user?.id}`);
 *        setVenueData(venue);
 *      } catch (err) {
 *        console.error('Failed to load venue:', err);
 *      }
 *    }
 * 
 * 4. Calculate completion percentage:
 *    const checklistItems = generateHealthChecklistItems(venueData);
 *    const completedCount = checklistItems.filter(i => i.status === 'completed').length;
 *    const totalRequired = checklistItems.filter(i => i.status !== 'optional').length;
 *    const completionPercentage = totalRequired > 0 
 *      ? Math.round((completedCount / totalRequired) * 100) 
 *      : 0;
 * 
 * 5. Add to JSX right after header, before stats grid:
 *    {completionPercentage < 100 && (
 *      <SetupHealthChecklist 
 *        items={checklistItems}
 *        onNavigate={onNavigate}
 *        completionPercentage={completionPercentage}
 *      />
 *    )}
 */

export const INTEGRATION_EXAMPLE = `
// Example of how the dashboard should look with checklist

export function VenueDashboard({ onNavigate, user }: VenueDashboardProps) {
  const [stats, setStats] = useState<StatsType | null>(null);
  const [venueData, setVenueData] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!user?.id) return;
      try {
        // Load stats
        const s = await apiGet(\`/api/stats/venue?venueId=\${user.id}\`);
        if (isMounted) setStats(s);

        // Load venue profile
        const venue = await apiGet(\`/api/venues/\${user.id}\`);
        if (isMounted) setVenueData(venue);
      } catch (err) {
        if (isMounted) {
          setStats(null);
          setVenueData(null);
        }
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [user?.id]);

  // Calculate checklist progress
  const checklistItems = generateHealthChecklistItems(venueData);
  const completedCount = checklistItems.filter(i => i.status === 'completed').length;
  const totalRequired = checklistItems.filter(i => i.status !== 'optional').length;
  const completionPercentage = totalRequired > 0 
    ? Math.round((completedCount / totalRequired) * 100) 
    : 0;

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <div className="mb-8">
        <h1 className="text-3xl mb-2 text-[var(--text)]">Welcome back</h1>
        <p className="text-[var(--text-muted)]">Manage your wall spaces and artist applications</p>
      </div>

      {/* HEALTH CHECKLIST - Only show if setup incomplete */}
      {completionPercentage < 100 && (
        <SetupHealthChecklist 
          items={checklistItems}
          onNavigate={onNavigate}
          completionPercentage={completionPercentage}
        />
      )}

      {/* Rest of dashboard continues as before */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {/* Stats cards */}
      </div>

      {/* Recent Activity & Quick Actions */}
    </div>
  );
}
`;

/**
 * WHAT THE CHECKLIST SHOWS
 * 
 * For incomplete venues (less than 100% setup):
 * - Photos Added: Shows count (e.g., "2 of 3+ photos uploaded")
 * - Profile Published: Status of venue visibility
 * - Wall Configured: Wall type and display spot count
 * - QR Assets Downloaded: Whether QR codes have been downloaded
 * - QR Placement Confirmed: Manual verification of physical placement
 * - Shared Venue Page: Optional social sharing
 * 
 * Each incomplete item has an action button that navigates to the relevant page
 * (venue-setup, venue-settings, venue-partner-kit, etc.)
 */

/**
 * BACKEND REQUIREMENTS
 * 
 * Make sure your /api/venues/:id endpoint returns:
 * {
 *   id: string;
 *   name: string;
 *   address: string;
 *   hours: string;
 *   website?: string;
 *   instagram?: string;
 *   photos: string[];        // Array of photo URLs
 *   logo?: string;
 *   wallType: 'single' | 'multiple' | 'rotating';
 *   wallDimensions?: string;
 *   displaySpots: number;
 *   categories: string[];
 *   status: 'draft' | 'pending_review' | 'approved' | 'live' | 'paused';
 *   qrDownloaded?: boolean;
 *   qrPlaced?: boolean;
 *   createdAt: string;
 *   updatedAt: string;
 * }
 */

/**
 * USER EXPERIENCE FLOW
 * 
 * 1. Venue completes signup (approved status)
 * 2. Dashboard shows health checklist at top
 * 3. Venue can click "Begin Setup" button or individual items
 * 4. Wizard guides through 5 steps:
 *    - Confirm Basics
 *    - Add Photos
 *    - Configure Wall
 *    - Categorize
 *    - Signage & Launch
 * 5. After setup, venue has "draft" status
 * 6. Admin reviews and approves (status -> "live")
 * 7. Venue appears in /find-art and discovery pages
 * 8. Checklist remains until all items complete
 * 9. Once 100% complete, checklist hides and celebrates completion
 */
