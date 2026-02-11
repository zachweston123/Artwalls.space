-- @deprecated — stub migration in wrong directory. Never run.
-- Real migrations live in supabase/migrations/.
CREATE TYPE venue_status AS ENUM (
  'draft',
  'pending_review',
  'approved',
  'live',
  'paused'
);

-- Add new columns to venues table
ALTER TABLE venues ADD COLUMN IF NOT EXISTS status venue_status DEFAULT 'draft';
ALTER TABLE venues ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';
ALTER TABLE venues ADD COLUMN IF NOT EXISTS wall_type VARCHAR(20) DEFAULT 'single';
ALTER TABLE venues ADD COLUMN IF NOT EXISTS display_spots INTEGER DEFAULT 1;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS wall_dimensions VARCHAR(255);
ALTER TABLE venues ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}';
ALTER TABLE venues ADD COLUMN IF NOT EXISTS qr_downloaded BOOLEAN DEFAULT false;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS qr_placed BOOLEAN DEFAULT false;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE venues ADD COLUMN IF NOT EXISTS instagram VARCHAR(255);
ALTER TABLE venues ADD COLUMN IF NOT EXISTS setup_completed_at TIMESTAMP;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS setup_notes TEXT;

-- Create index for status queries
CREATE INDEX IF NOT EXISTS venues_status_idx ON venues(status);
CREATE INDEX IF NOT EXISTS venues_created_at_idx ON venues(created_at);

-- ============================================================================
-- CREATE admin_approvals TABLE - Track setup approvals
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  
  action VARCHAR(20) NOT NULL, -- 'approve' or 'reject'
  status VARCHAR(20) NOT NULL, -- 'pending_review' -> 'approved' or back to 'approved'
  reason TEXT, -- for rejections
  notes TEXT, -- admin notes
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_approvals_venue_id_idx ON admin_approvals(venue_id);
CREATE INDEX IF NOT EXISTS admin_approvals_admin_id_idx ON admin_approvals(admin_id);
CREATE INDEX IF NOT EXISTS admin_approvals_status_idx ON admin_approvals(status);

-- ============================================================================
-- CREATE setup_activity_log TABLE - Track setup progress
-- ============================================================================

CREATE TABLE IF NOT EXISTS setup_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  
  action VARCHAR(50) NOT NULL, -- 'step_completed', 'saved', 'submitted', etc.
  step INTEGER, -- which step (1-5)
  data JSONB, -- whatever data was saved
  
  user_ip VARCHAR(45),
  user_agent TEXT,
  
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS setup_activity_log_venue_id_idx ON setup_activity_log(venue_id);
CREATE INDEX IF NOT EXISTS setup_activity_log_created_at_idx ON setup_activity_log(created_at);

-- ============================================================================
-- CREATE setup_emails TABLE - Track email notifications
-- ============================================================================

CREATE TABLE IF NOT EXISTS setup_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  
  email_type VARCHAR(50) NOT NULL, -- 'setup_submitted', 'setup_approved', 'setup_rejected', etc.
  recipient_email VARCHAR(255) NOT NULL,
  sent_at TIMESTAMP DEFAULT now(),
  
  subject TEXT,
  body TEXT,
  
  status VARCHAR(20) DEFAULT 'sent', -- 'sent', 'failed', 'bounced'
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS setup_emails_venue_id_idx ON setup_emails(venue_id);
CREATE INDEX IF NOT EXISTS setup_emails_created_at_idx ON setup_emails(sent_at);

-- ============================================================================
-- CREATE analytics_events TABLE - Track setup analytics
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  
  event_name VARCHAR(100) NOT NULL,
  event_data JSONB,
  
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_events_venue_id_idx ON analytics_events(venue_id);
CREATE INDEX IF NOT EXISTS analytics_events_event_name_idx ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx ON analytics_events(created_at);

-- ============================================================================
-- CREATE RLS POLICIES
-- ============================================================================

-- Venues table - Users can see their own venue and admins can see all
CREATE POLICY "venues_self_view" ON venues
  FOR SELECT USING (
    (auth.uid() = user_id) OR 
    (auth.jwt() ->> 'role' = 'admin')
  );

CREATE POLICY "venues_self_update" ON venues
  FOR UPDATE USING (auth.uid() = user_id);

-- Admin approvals - Only admins can create, anyone can view own
CREATE POLICY "admin_approvals_admin_create" ON admin_approvals
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "admin_approvals_view" ON admin_approvals
  FOR SELECT USING (
    (auth.jwt() ->> 'role' = 'admin') OR
    (venue_id IN (SELECT id FROM venues WHERE user_id = auth.uid()))
  );

-- Setup activity log - Only for own venue or admins
CREATE POLICY "setup_activity_log_self" ON setup_activity_log
  FOR SELECT USING (
    (venue_id IN (SELECT id FROM venues WHERE user_id = auth.uid())) OR
    (auth.jwt() ->> 'role' = 'admin')
  );

-- Setup emails - Only for own venue or admins
CREATE POLICY "setup_emails_self" ON setup_emails
  FOR SELECT USING (
    (venue_id IN (SELECT id FROM venues WHERE user_id = auth.uid())) OR
    (auth.jwt() ->> 'role' = 'admin')
  );

-- ============================================================================
-- MIGRATION VERSION TRACKING
-- ============================================================================

-- Insert into schema_migrations (if using a migration system)
-- Note: Adjust table name based on your migration tracking system
-- INSERT INTO schema_migrations (name, executed_at) 
-- VALUES ('add_venue_setup_fields', now());

-- ============================================================================
-- SEED DATA FOR TESTING
-- ============================================================================

-- Insert venue status type check (optional, for reference)
-- SELECT enum_range(NULL::venue_status);

-- ============================================================================
-- NOTES FOR IMPLEMENTATION
-- ============================================================================

-- 1. Run these migrations in order
-- 2. Test locally before pushing to production
-- 3. Consider data backfilling if existing venues need status field
-- 4. Update application code to handle new fields
-- 5. Add indexes based on query patterns
-- 6. Consider partitioning analytics_events table if high volume
-- 7. Set up backup/restore procedures for new tables
