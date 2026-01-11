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
CREATE INDEX IF NOT EXISTS idx_support_messages_status ON support_messages(status);
CREATE INDEX IF NOT EXISTS idx_support_messages_email ON support_messages(email);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON support_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_ip_hash_created ON support_messages(ip_hash, created_at DESC);

-- Enable RLS (Row Level Security) for safety
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Public can insert (rate limited on backend)
CREATE POLICY support_messages_insert_public ON support_messages
  FOR INSERT
  WITH CHECK (true);

-- Only admin can read/update
CREATE POLICY support_messages_select_admin ON support_messages
  FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY support_messages_update_admin ON support_messages
  FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY support_messages_delete_admin ON support_messages
  FOR DELETE
  USING (auth.jwt() ->> 'role' = 'admin');

-- Add foreign key constraints
ALTER TABLE support_messages
ADD CONSTRAINT fk_support_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE support_messages
ADD CONSTRAINT fk_support_artist_id FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE SET NULL;

ALTER TABLE support_messages
ADD CONSTRAINT fk_support_venue_id FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE SET NULL;
