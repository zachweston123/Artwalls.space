-- ============================================================================
-- Create support_messages table for the contact/support system
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text NOT NULL,
  message text NOT NULL,
  role_context text DEFAULT 'other',       -- 'artist', 'venue', 'buyer', 'other'
  page_source text DEFAULT 'unknown',      -- 'partner_kit', 'why_artwalls_artist', 'why_artwalls_venue', 'contact', etc.
  status text NOT NULL DEFAULT 'new',      -- 'new', 'open', 'closed'
  honeypot text,                           -- spam detection
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_messages_status_idx ON public.support_messages(status);
CREATE INDEX IF NOT EXISTS support_messages_email_idx ON public.support_messages(email);
CREATE INDEX IF NOT EXISTS support_messages_created_at_idx ON public.support_messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write (admin via worker)
CREATE POLICY "Service role full access on support_messages"
  ON public.support_messages
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Allow anon to INSERT only (for public contact forms)
CREATE POLICY "Anon can insert support_messages"
  ON public.support_messages
  FOR INSERT
  WITH CHECK (true);

COMMIT;
