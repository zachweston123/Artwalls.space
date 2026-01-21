-- Student Verification and Profile Enhancement
-- Adds support for student status, pronouns, school/university, and discount tracking

-- Add student-related columns to artists table
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS is_student boolean DEFAULT false;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS pronouns text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS school_name text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS is_student_verified boolean DEFAULT false;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS student_verification_token text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS student_verification_expires_at timestamptz;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS student_discount_active boolean DEFAULT false;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS student_discount_applied_at timestamptz;

-- Create schools/universities table
CREATE TABLE IF NOT EXISTS public.schools (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  type text NOT NULL DEFAULT 'university', -- 'university', 'college', 'high_school', 'art_school'
  country text NOT NULL,
  city text,
  state text,
  verified boolean DEFAULT false,
  email_domain text, -- For automatic verification (e.g., @university.edu)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create student verification table for audit trail
CREATE TABLE IF NOT EXISTS public.student_verifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id uuid NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  verification_method text NOT NULL, -- 'email_domain', 'manual_upload', 'external_api'
  verification_document_url text,
  is_verified boolean DEFAULT false,
  verified_by text, -- admin user id or system
  verified_at timestamptz,
  expires_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS artists_is_student_idx ON public.artists(is_student);
CREATE INDEX IF NOT EXISTS artists_is_student_verified_idx ON public.artists(is_student_verified);
CREATE INDEX IF NOT EXISTS artists_student_discount_active_idx ON public.artists(student_discount_active);
CREATE INDEX IF NOT EXISTS artists_school_id_idx ON public.artists(school_id);
CREATE INDEX IF NOT EXISTS schools_verified_idx ON public.schools(verified);
CREATE INDEX IF NOT EXISTS schools_email_domain_idx ON public.schools(email_domain);
CREATE INDEX IF NOT EXISTS student_verifications_artist_id_idx ON public.student_verifications(artist_id);
CREATE INDEX IF NOT EXISTS student_verifications_school_id_idx ON public.student_verifications(school_id);
CREATE INDEX IF NOT EXISTS student_verifications_is_verified_idx ON public.student_verifications(is_verified);

-- Seed some major universities (can be expanded later)
INSERT INTO public.schools (name, type, country, city, state, verified, email_domain) VALUES
  ('Massachusetts Institute of Technology (MIT)', 'university', 'United States', 'Cambridge', 'MA', true, 'mit.edu'),
  ('Stanford University', 'university', 'United States', 'Stanford', 'CA', true, 'stanford.edu'),
  ('Rhode Island School of Design (RISD)', 'art_school', 'United States', 'Providence', 'RI', true, 'risd.edu'),
  ('School of the Art Institute of Chicago (SAIC)', 'art_school', 'United States', 'Chicago', 'IL', true, 'saic.edu'),
  ('Parsons School of Design', 'art_school', 'United States', 'New York', 'NY', true, 'newschool.edu'),
  ('California Institute of the Arts (CalArts)', 'art_school', 'United States', 'Valencia', 'CA', true, 'calarts.edu'),
  ('Pratt Institute', 'art_school', 'United States', 'Brooklyn', 'NY', true, 'pratt.edu'),
  ('New York University (NYU)', 'university', 'United States', 'New York', 'NY', true, 'nyu.edu'),
  ('University of Chicago', 'university', 'United States', 'Chicago', 'IL', true, 'uchicago.edu'),
  ('University of California, Berkeley', 'university', 'United States', 'Berkeley', 'CA', true, 'berkeley.edu'),
  ('Central Saint Martins', 'art_school', 'United Kingdom', 'London', 'England', true, 'arts.ac.uk'),
  ('Royal College of Art', 'art_school', 'United Kingdom', 'London', 'England', true, 'rca.ac.uk')
ON CONFLICT (name) DO NOTHING;
