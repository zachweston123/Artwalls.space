/**
 * Admin Approval Workflow API
 * Handles venue setup approval/rejection for admin users
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { AdminContext, VenueSetupData } from '../types/index';

const router = Router();

// Middleware: Verify admin role
const requireAdmin = (req: Request, res: Response, next: Function) => {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// ============================================================================
// GET /api/admin/venues/pending - List pending venue approvals
// ============================================================================

router.get('/venues/pending', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('venues')
      .select(`
        id,
        name,
        city,
        status,
        photos,
        categories,
        setup_completed_at,
        created_at,
        users:user_id (
          email,
          full_name
        )
      `)
      .eq('status', 'pending_review')
      .order('setup_completed_at', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data: data,
      count: data?.length || 0
    });
  } catch (error) {
    console.error('Error fetching pending venues:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending venues'
    });
  }
});

// ============================================================================
// GET /api/admin/venues/:id/details - Get detailed venue info for approval review
// ============================================================================

router.get('/venues/:id/details', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('*')
      .eq('id', id)
      .single();

    if (venueError) throw venueError;

    // Fetch approval history
    const { data: approvals, error: approvalsError } = await supabase
      .from('admin_approvals')
      .select(`
        id,
        action,
        reason,
        notes,
        created_at,
        users:admin_id (email, full_name)
      `)
      .eq('venue_id', id)
      .order('created_at', { ascending: false });

    if (approvalsError) throw approvalsError;

    // Fetch setup activity log
    const { data: activityLog, error: activityError } = await supabase
      .from('setup_activity_log')
      .select('*')
      .eq('venue_id', id)
      .order('created_at', { ascending: false });

    if (activityError) throw activityError;

    res.json({
      success: true,
      venue,
      approvals,
      activityLog
    });
  } catch (error) {
    console.error('Error fetching venue details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch venue details'
    });
  }
});

// ============================================================================
// POST /api/admin/venues/:id/approve - Approve venue setup
// ============================================================================

router.post('/venues/:id/approve', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes = '' } = req.body;
    const adminId = (req as any).user.id;

    // Start transaction
    const { data: updated, error: updateError } = await supabase
      .from('venues')
      .update({
        status: 'approved',
        setup_completed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log approval action
    const { error: logError } = await supabase
      .from('admin_approvals')
      .insert({
        venue_id: id,
        admin_id: adminId,
        action: 'approve',
        status: 'approved',
        notes: notes
      });

    if (logError) throw logError;

    // TODO: Send email notification to venue admin
    // - Subject: "Your Artwalls Venue Setup Has Been Approved! 🎉"
    // - Body: Include next steps, go-live instructions, and welcome to the platform
    // - Schedule email sending via queue or background job

    // TODO: Log analytics event
    // - Event: 'venue_setup_approved'
    // - Data: { venue_id, approver_id, timestamp }

    res.json({
      success: true,
      message: 'Venue approved successfully',
      venue: updated
    });
  } catch (error) {
    console.error('Error approving venue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve venue'
    });
  }
});

// ============================================================================
// POST /api/admin/venues/:id/reject - Reject venue setup with feedback
// ============================================================================

router.post('/venues/:id/reject', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason = '', notes = '' } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Rejection reason is required'
      });
    }

    const adminId = (req as any).user.id;

    // Update venue status back to draft
    const { data: updated, error: updateError } = await supabase
      .from('venues')
      .update({
        status: 'draft',
        setup_notes: reason
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log rejection action
    const { error: logError } = await supabase
      .from('admin_approvals')
      .insert({
        venue_id: id,
        admin_id: adminId,
        action: 'reject',
        status: 'draft',
        reason: reason,
        notes: notes
      });

    if (logError) throw logError;

    // TODO: Send email notification to venue admin
    // - Subject: "Please Review Your Artwalls Venue Setup"
    // - Body: Include specific feedback, reasons for rejection, action items
    // - Include: "You can edit your setup and resubmit at any time"
    // - Provide link back to setup wizard with pre-filled data

    // TODO: Log analytics event
    // - Event: 'venue_setup_rejected'
    // - Data: { venue_id, admin_id, reason, timestamp }

    res.json({
      success: true,
      message: 'Venue rejected successfully. Venue returned to draft status.',
      venue: updated,
      feedback: {
        reason,
        notes
      }
    });
  } catch (error) {
    console.error('Error rejecting venue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject venue'
    });
  }
});

// ============================================================================
// GET /api/admin/approvals/stats - Approval workflow statistics
// ============================================================================

router.get('/approvals/stats', requireAdmin, async (req: Request, res: Response) => {
  try {
    // Count venues by status
    const { data: statusCounts, error: statusError } = await supabase
      .from('venues')
      .select('status')
      .in('status', ['draft', 'pending_review', 'approved', 'live', 'paused']);

    if (statusError) throw statusError;

    const stats = {
      draft: statusCounts.filter(v => v.status === 'draft').length,
      pending_review: statusCounts.filter(v => v.status === 'pending_review').length,
      approved: statusCounts.filter(v => v.status === 'approved').length,
      live: statusCounts.filter(v => v.status === 'live').length,
      paused: statusCounts.filter(v => v.status === 'paused').length
    };

    // Get recent approvals/rejections
    const { data: recentActions, error: actionsError } = await supabase
      .from('admin_approvals')
      .select(`
        id,
        action,
        created_at,
        venues:venue_id (name, city)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (actionsError) throw actionsError;

    // Calculate average review time (pending submission to decision)
    // This would need more complex query on activity log + approvals tables

    res.json({
      success: true,
      stats,
      recentActions
    });
  } catch (error) {
    console.error('Error fetching approval stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch approval statistics'
    });
  }
});

// ============================================================================
// PATCH /api/admin/venues/:id/settings - Update venue settings as admin
// ============================================================================

router.patch('/venues/:id/settings', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const allowedFields = ['wall_type', 'display_spots', 'categories', 'website', 'instagram'];
    const updates: any = {};

    // Only allow specific fields
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    const { data: updated, error } = await supabase
      .from('venues')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // TODO: Log admin modification
    // - Event: 'venue_admin_modified'
    // - Data: { venue_id, admin_id, fields_modified, timestamp }

    res.json({
      success: true,
      message: 'Venue settings updated',
      venue: updated
    });
  } catch (error) {
    console.error('Error updating venue settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update venue settings'
    });
  }
});

export default router;
