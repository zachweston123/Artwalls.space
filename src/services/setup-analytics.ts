/**
 * Setup Analytics Events Service
 * Track and log analytics events for venue setup workflow
 */

import { supabase } from '../lib/supabase';

// ============================================================================
// Event Types
// ============================================================================

export type SetupEventName =
  | 'setup_started'
  | 'setup_step_completed'
  | 'setup_saved_draft'
  | 'setup_submitted'
  | 'setup_approved'
  | 'setup_rejected'
  | 'setup_resumed'
  | 'partner_kit_viewed'
  | 'qr_downloaded'
  | 'qr_printed'
  | 'settings_updated'
  | 'email_opened'
  | 'email_link_clicked'
  | 'support_contacted'
  | 'venue_live'
  | 'first_artwork_received'
  | 'first_sale';

export interface AnalyticsEvent {
  venue_id?: string;
  user_id?: string;
  event_name: SetupEventName;
  event_data?: Record<string, any>;
  metadata?: {
    user_agent?: string;
    ip_address?: string;
    referrer?: string;
    page_url?: string;
  };
}

// ============================================================================
// Analytics Events
// ============================================================================

/**
 * Log a setup event to analytics
 */
export async function logSetupEvent(event: AnalyticsEvent): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('analytics_events')
      .insert({
        venue_id: event.venue_id,
        event_name: event.event_name,
        event_data: {
          ...event.event_data,
          metadata: event.metadata,
          timestamp: new Date().toISOString()
        }
      });

    if (error) {
      console.error('Error logging analytics event:', error);
      return false;
    }

    console.log(`[ANALYTICS] Event logged: ${event.event_name}`, event.event_data);
    return true;
  } catch (error) {
    console.error('Error logging setup event:', error);
    return false;
  }
}

// ============================================================================
// Specific Event Loggers
// ============================================================================

/**
 * Log when a venue starts the setup wizard
 */
export function logSetupStarted(venueId: string) {
  return logSetupEvent({
    venue_id: venueId,
    event_name: 'setup_started',
    event_data: {
      step: 1,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Log when a venue completes a setup step
 */
export function logSetupStepCompleted(venueId: string, step: number, stepName: string) {
  return logSetupEvent({
    venue_id: venueId,
    event_name: 'setup_step_completed',
    event_data: {
      step,
      step_name: stepName,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Log when a venue saves draft
 */
export function logSetupSavedDraft(venueId: string, step: number) {
  return logSetupEvent({
    venue_id: venueId,
    event_name: 'setup_saved_draft',
    event_data: {
      step,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Log when a venue submits their setup for review
 */
export function logSetupSubmitted(venueId: string, setupData: Record<string, any>) {
  return logSetupEvent({
    venue_id: venueId,
    event_name: 'setup_submitted',
    event_data: {
      photos_count: setupData.photos?.length || 0,
      categories_count: setupData.categories?.length || 0,
      wall_type: setupData.wall_type,
      display_spots: setupData.display_spots,
      has_website: !!setupData.website,
      has_instagram: !!setupData.instagram,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Log when a venue setup is approved by admin
 */
export function logSetupApproved(venueId: string, adminId: string) {
  return logSetupEvent({
    venue_id: venueId,
    event_name: 'setup_approved',
    event_data: {
      admin_id: adminId,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Log when a venue setup is rejected
 */
export function logSetupRejected(venueId: string, adminId: string, reason: string) {
  return logSetupEvent({
    venue_id: venueId,
    event_name: 'setup_rejected',
    event_data: {
      admin_id: adminId,
      rejection_reason: reason,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Log when a venue resumes setup after interruption
 */
export function logSetupResumed(venueId: string, resumeFromStep: number) {
  return logSetupEvent({
    venue_id: venueId,
    event_name: 'setup_resumed',
    event_data: {
      resume_from_step: resumeFromStep,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Log when partner kit is viewed
 */
export function logPartnerKitViewed(venueId: string) {
  return logSetupEvent({
    venue_id: venueId,
    event_name: 'partner_kit_viewed',
    event_data: {
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Log when QR code is downloaded
 */
export function logQRDownloaded(venueId: string, format: string = 'png') {
  return logSetupEvent({
    venue_id: venueId,
    event_name: 'qr_downloaded',
    event_data: {
      format,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Log when QR code is printed
 */
export function logQRPrinted(venueId: string) {
  return logSetupEvent({
    venue_id: venueId,
    event_name: 'qr_printed',
    event_data: {
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Log when venue settings are updated
 */
export function logSettingsUpdated(venueId: string, settingsType: string, changes: Record<string, any>) {
  return logSetupEvent({
    venue_id: venueId,
    event_name: 'settings_updated',
    event_data: {
      settings_type: settingsType,
      changes,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Log when venue goes live
 */
export function logVenueLive(venueId: string, timeToLive: number) {
  return logSetupEvent({
    venue_id: venueId,
    event_name: 'venue_live',
    event_data: {
      time_to_live_hours: Math.round(timeToLive / 1000 / 60 / 60),
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Log when venue receives first artwork
 */
export function logFirstArtworkReceived(venueId: string) {
  return logSetupEvent({
    venue_id: venueId,
    event_name: 'first_artwork_received',
    event_data: {
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Log when venue gets first sale
 */
export function logFirstSale(venueId: string, saleAmount: number) {
  return logSetupEvent({
    venue_id: venueId,
    event_name: 'first_sale',
    event_data: {
      sale_amount: saleAmount,
      venue_commission: saleAmount * 0.15, // 15% commission
      timestamp: new Date().toISOString()
    }
  });
}

// ============================================================================
// Analytics Dashboard Data
// ============================================================================

/**
 * Get analytics for a specific venue
 */
export async function getVenueAnalytics(venueId: string) {
  try {
    const { data, error } = await supabase
      .from('analytics_events')
      .select('*')
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Process events into analytics summary
    const summary = {
      total_events: data?.length || 0,
      timeline: {} as Record<string, number>,
      key_events: {
        setup_started: 0,
        setup_submitted: 0,
        setup_approved: 0,
        venue_live: 0,
        first_sale: 0
      },
      user_journey: [] as string[]
    };

    // Count key events
    data?.forEach(event => {
      if (summary.key_events[event.event_name as keyof typeof summary.key_events] !== undefined) {
        summary.key_events[event.event_name as keyof typeof summary.key_events]++;
      }

      // Build timeline
      const date = new Date(event.created_at).toLocaleDateString();
      summary.timeline[date] = (summary.timeline[date] || 0) + 1;

      // Track user journey
      summary.user_journey.push(event.event_name);
    });

    return summary;
  } catch (error) {
    console.error('Error fetching venue analytics:', error);
    return null;
  }
}

/**
 * Get platform-wide analytics for all venues
 */
export async function getPlatformAnalytics() {
  try {
    const { data, error } = await supabase
      .from('analytics_events')
      .select('event_name, created_at');

    if (error) throw error;

    const summary = {
      total_events: data?.length || 0,
      events_by_type: {} as Record<string, number>,
      daily_events: {} as Record<string, number>
    };

    data?.forEach(event => {
      // Count by event type
      summary.events_by_type[event.event_name] = 
        (summary.events_by_type[event.event_name] || 0) + 1;

      // Count daily
      const date = new Date(event.created_at).toLocaleDateString();
      summary.daily_events[date] = (summary.daily_events[date] || 0) + 1;
    });

    return summary;
  } catch (error) {
    console.error('Error fetching platform analytics:', error);
    return null;
  }
}

/**
 * Get setup completion funnel
 * Shows how many venues complete each step
 */
export async function getSetupFunnel() {
  try {
    const { data, error } = await supabase
      .from('analytics_events')
      .select('venue_id, event_name')
      .in('event_name', [
        'setup_started',
        'setup_step_completed',
        'setup_submitted',
        'setup_approved'
      ]);

    if (error) throw error;

    const venueProgress = new Map<string, Set<string>>();
    
    data?.forEach(event => {
      if (!venueProgress.has(event.venue_id)) {
        venueProgress.set(event.venue_id, new Set());
      }
      venueProgress.get(event.venue_id)!.add(event.event_name);
    });

    const funnel = {
      started: venueProgress.size,
      submitted: Array.from(venueProgress.values())
        .filter(events => events.has('setup_submitted')).length,
      approved: Array.from(venueProgress.values())
        .filter(events => events.has('setup_approved')).length,
      completion_rate: 0
    };

    if (funnel.started > 0) {
      funnel.completion_rate = (funnel.approved / funnel.started) * 100;
    }

    return funnel;
  } catch (error) {
    console.error('Error fetching setup funnel:', error);
    return null;
  }
}

// ============================================================================
// Event Tracking Middleware (for Express/API routes)
// ============================================================================

/**
 * Middleware to track API events
 * Use in your Express routes to automatically log events
 */
export function trackEventMiddleware(eventName: SetupEventName) {
  return async (req: any, res: any, next: any) => {
    const venueId = req.body?.venue_id || req.params?.venue_id;
    
    if (venueId) {
      await logSetupEvent({
        venue_id: venueId,
        event_name: eventName,
        event_data: {
          endpoint: req.path,
          method: req.method,
          timestamp: new Date().toISOString()
        },
        metadata: {
          ip_address: req.ip,
          user_agent: req.get('user-agent'),
          referrer: req.get('referer')
        }
      });
    }

    next();
  };
}

export default {
  logSetupEvent,
  logSetupStarted,
  logSetupStepCompleted,
  logSetupSubmitted,
  logSetupApproved,
  logSetupRejected,
  getVenueAnalytics,
  getPlatformAnalytics,
  getSetupFunnel
};
