-- Support Messages Table Migration
-- This table stores contact form submissions from the "Why Artwalls" page

CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  role_context VARCHAR(50) NOT NULL CHECK (role_context IN ('artist', 'venue', 'other')),
  page_source VARCHAR(100) NOT NULL,
  user_id UUID,
  artist_id UUID,
  venue_id UUID,
  status VARCHAR(50) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'open', 'closed')),
  ip_hash VARCHAR(64) NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_support_messages_status ON support_messages(status);
CREATE INDEX idx_support_messages_email ON support_messages(email);
CREATE INDEX idx_support_messages_created_at ON support_messages(created_at DESC);
CREATE INDEX idx_support_messages_ip_hash_created ON support_messages(ip_hash, created_at DESC);

-- Enable RLS (Row Level Security) for safety
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Public can insert (rate limited on backend)
CREATE POLICY support_messages_insert_public ON support_messages
  FOR INSERT
  WITH CHECK (true);

-- Only admin can read/update (TODO: link to admin role check)
CREATE POLICY support_messages_select_admin ON support_messages
  FOR SELECT
  USING (false); -- TODO: Update with admin role check

CREATE POLICY support_messages_update_admin ON support_messages
  FOR UPDATE
  USING (false) -- TODO: Update with admin role check
  WITH CHECK (false);

-- Add foreign key constraints (optional - if user_id should reference auth.users)
-- ALTER TABLE support_messages
-- ADD CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
