-- Migration: Announcements
-- Purpose: Admin-created announcements visible to artists/venues/all
-- Created: 2026-02-23

CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info','success','warning','critical')),
  audience text NOT NULL DEFAULT 'all' CHECK (audience IN ('all','artists','venues')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','scheduled','expired','archived')),
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_status ON public.announcements(status);
CREATE INDEX IF NOT EXISTS idx_announcements_audience ON public.announcements(audience);
CREATE INDEX IF NOT EXISTS idx_announcements_start_date ON public.announcements(start_date);

-- RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Everyone can read active announcements
CREATE POLICY announcements_read ON public.announcements
  FOR SELECT USING (true);

-- Only service role (worker) can write
CREATE POLICY announcements_service_write ON public.announcements
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
