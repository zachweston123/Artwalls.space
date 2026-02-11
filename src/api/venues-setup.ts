/** @deprecated Dead Express stub — all venue APIs live in worker/index.ts. */
throw new Error('Dead file: use worker/index.ts');

/**
 * POST /api/venues/setup
 * Save venue setup data (draft state)
 */
router.post('/venues/setup', async (req: Request, res: Response) => {
  try {
    const { venueId } = req.user || {};
    if (!venueId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const setupData = req.body;

    // TODO: Validate setup data against schema
    // TODO: Save to database with status: 'draft'
    // TODO: Emit analytics event: 'setup_step_completed'

    res.json({
      success: true,
      venueId,
      status: 'draft',
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save setup' });
  }
});

/**
 * POST /api/venues/setup/complete
 * Mark setup as complete (pending_review state)
 */
router.post('/venues/setup/complete', async (req: Request, res: Response) => {
  try {
    const { venueId } = req.user || {};
    if (!venueId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const setupData = req.body;

    // TODO: Validate all required fields present
    // TODO: Update venue status to 'pending_review'
    // TODO: Create admin notification task
    // TODO: Emit analytics event: 'setup_completed'
    // TODO: Send email to venue: 'Setup submitted for review'

    res.json({
      success: true,
      venueId,
      status: 'pending_review',
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete setup' });
  }
});

/**
 * GET /api/venues/:id
 * Get venue profile (including setup status)
 */
router.get('/venues/:id', async (req: Request, res: Response) => {
  try {
    const { id: venueId } = req.params;

    // Pull the venue from the database (real data only)
    const { data: venue, error } = await supabase
      .from('venues')
      .select(
        `id, name, address, hours, website_url, instagram_handle, photos, wall_type, display_spots, wall_dimensions, categories, status, qr_downloaded, qr_placed, created_at, updated_at`
      )
      .eq('id', venueId)
      .single();

    if (error || !venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    res.json({
      id: venue.id,
      name: venue.name,
      address: venue.address,
      hours: venue.hours,
      website: venue.website_url,
      instagram: venue.instagram_handle,
      photos: venue.photos || [],
      wallType: venue.wall_type,
      displaySpots: venue.display_spots,
      wallDimensions: venue.wall_dimensions,
      categories: venue.categories || [],
      status: venue.status,
      qrDownloaded: venue.qr_downloaded,
      qrPlaced: venue.qr_placed,
      createdAt: venue.created_at,
      updatedAt: venue.updated_at,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch venue' });
  }
});

/**
 * PATCH /api/venues/:id/settings
 * Update venue settings (after setup complete)
 */
router.patch('/venues/:id/settings', async (req: Request, res: Response) => {
  try {
    const { id: venueId } = req.params;
    const { venueId: authVenueId } = req.user || {};

    // TODO: Verify user owns this venue
    if (authVenueId !== venueId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updates = req.body;

    // TODO: Validate updates
    // TODO: Update venue in database
    // TODO: Emit analytics event: 'customization_made'

    res.json({
      success: true,
      venueId,
      updatedAt: new Date().toISOString(),
      customized: true,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

/**
 * GET /api/venues/:id/defaults
 * Get recommended defaults for venue settings
 */
router.get('/venues/:id/defaults', async (req: Request, res: Response) => {
  try {
    const defaults = {
      recommended: {
        wall: {
          type: 'single',
          displaySpots: 1,
          dimensions: '',
        },
        categories: ['Contemporary', 'Local Artists'],
        featured: true,
        visibility: 'public',
      },
    };

    res.json(defaults);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch defaults' });
  }
});

/**
 * POST /api/venues/:id/settings/reset
 * Reset specific settings sections to recommended defaults
 */
router.post('/venues/:id/settings/reset', async (req: Request, res: Response) => {
  try {
    const { id: venueId } = req.params;
    const { venueId: authVenueId } = req.user || {};

    if (authVenueId !== venueId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { sections } = req.body; // ['wall', 'categories', etc]

    // TODO: Validate sections
    // TODO: Reset specified sections to defaults
    // TODO: Emit analytics event: 'reset_to_recommended'

    res.json({
      success: true,
      venueId,
      resetSections: sections,
      resetAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset settings' });
  }
});

/**
 * POST /api/admin/venues/:id/approve
 * Admin: Approve setup and publish venue
 */
router.post('/admin/venues/:id/approve', async (req: Request, res: Response) => {
  try {
    const { adminId } = req.user || {};
    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: venueId } = req.params;
    const { notes } = req.body;

    // TODO: Verify user is admin
    // TODO: Update venue status to 'approved' or 'live'
    // TODO: Log admin action in activity log
    // TODO: Emit analytics event: 'setup_approved'
    // TODO: Send email to venue: 'Your setup has been approved'

    res.json({
      success: true,
      venueId,
      status: 'live',
      approvedBy: adminId,
      approvedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve setup' });
  }
});

/**
 * POST /api/admin/venues/:id/reject
 * Admin: Reject setup with feedback
 */
router.post('/admin/venues/:id/reject', async (req: Request, res: Response) => {
  try {
    const { adminId } = req.user || {};
    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: venueId } = req.params;
    const { reason, notes } = req.body;

    // TODO: Verify user is admin
    // TODO: Update venue status back to 'approved'
    // TODO: Store rejection reason
    // TODO: Log admin action
    // TODO: Emit analytics event: 'setup_rejected'
    // TODO: Send email to venue with feedback

    res.json({
      success: true,
      venueId,
      status: 'approved',
      rejectedBy: adminId,
      rejectedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject setup' });
  }
});

export default router;
