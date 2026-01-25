-- Migration: Venue Invites (Warm Intro)
-- Purpose: Track artist-initiated venue invites and lifecycle events
-- Created: 2026-01-24

-- ============================================================
-- STEP 1: venue_invites table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.venue_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  artist_id uuid NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  place_id text NOT NULL,
  venue_name text NOT NULL,
  venue_address text,
  google_maps_url text,
  website_url text,
  phone text,
  venue_email text,
  personal_line text,
  subject text,
  body_template_version text DEFAULT 'v1',
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SENT','CLICKED','ACCEPTED','DECLINED','EXPIRED')),
  sent_at timestamptz,
  first_clicked_at timestamptz,
  click_count integer DEFAULT 0,
  accepted_at timestamptz,
  declined_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- STEP 2: venue_invite_events table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.venue_invite_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid NOT NULL REFERENCES public.venue_invites(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('CREATED','SENT','OPENED','ACCEPTED','DECLINED')),
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- STEP 3: Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_venue_invites_artist_id ON public.venue_invites(artist_id);
CREATE INDEX IF NOT EXISTS idx_venue_invites_place_id ON public.venue_invites(place_id);
CREATE INDEX IF NOT EXISTS idx_venue_invites_status ON public.venue_invites(status);
CREATE INDEX IF NOT EXISTS idx_venue_invites_token ON public.venue_invites(token);
CREATE INDEX IF NOT EXISTS idx_venue_invites_created_at ON public.venue_invites(created_at);
CREATE INDEX IF NOT EXISTS idx_venue_invite_events_invite_id ON public.venue_invite_events(invite_id);

-- ============================================================
-- STEP 4: RLS (service role bypasses; client access optional)
-- ============================================================
ALTER TABLE public.venue_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_invite_events ENABLE ROW LEVEL SECURITY;

-- NOTE: Policies can be added later if client-side access is required.
