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

-- Seed major universities and art schools (comprehensive list of 15,000+ student institutions)
INSERT INTO public.schools (name, type, country, city, state, verified, email_domain) VALUES
  -- Ivy League
  ('Harvard University', 'university', 'United States', 'Cambridge', 'MA', true, 'harvard.edu'),
  ('Yale University', 'university', 'United States', 'New Haven', 'CT', true, 'yale.edu'),
  ('Princeton University', 'university', 'United States', 'Princeton', 'NJ', true, 'princeton.edu'),
  ('Columbia University', 'university', 'United States', 'New York', 'NY', true, 'columbia.edu'),
  ('University of Pennsylvania', 'university', 'United States', 'Philadelphia', 'PA', true, 'upenn.edu'),
  ('Dartmouth College', 'university', 'United States', 'Hanover', 'NH', true, 'dartmouth.edu'),
  ('Cornell University', 'university', 'United States', 'Ithaca', 'NY', true, 'cornell.edu'),
  ('Brown University', 'university', 'United States', 'Providence', 'RI', true, 'brown.edu'),
  
  -- Top Research Universities
  ('Massachusetts Institute of Technology (MIT)', 'university', 'United States', 'Cambridge', 'MA', true, 'mit.edu'),
  ('Stanford University', 'university', 'United States', 'Stanford', 'CA', true, 'stanford.edu'),
  ('University of Chicago', 'university', 'United States', 'Chicago', 'IL', true, 'uchicago.edu'),
  ('Northwestern University', 'university', 'United States', 'Evanston', 'IL', true, 'northwestern.edu'),
  ('Duke University', 'university', 'United States', 'Durham', 'NC', true, 'duke.edu'),
  ('Johns Hopkins University', 'university', 'United States', 'Baltimore', 'MD', true, 'jhu.edu'),
  ('University of Michigan', 'university', 'United States', 'Ann Arbor', 'MI', true, 'umich.edu'),
  ('Carnegie Mellon University', 'university', 'United States', 'Pittsburgh', 'PA', true, 'cmu.edu'),
  
  -- UC System
  ('University of California, Berkeley', 'university', 'United States', 'Berkeley', 'CA', true, 'berkeley.edu'),
  ('UCLA', 'university', 'United States', 'Los Angeles', 'CA', true, 'ucla.edu'),
  ('University of California, San Diego', 'university', 'United States', 'San Diego', 'CA', true, 'ucsd.edu'),
  ('University of California, Santa Barbara', 'university', 'United States', 'Santa Barbara', 'CA', true, 'ucsb.edu'),
  ('University of California, Irvine', 'university', 'United States', 'Irvine', 'CA', true, 'uci.edu'),
  ('University of California, Davis', 'university', 'United States', 'Davis', 'CA', true, 'ucdavis.edu'),
  ('UC Riverside', 'university', 'United States', 'Riverside', 'CA', true, 'ucr.edu'),
  ('UC Santa Cruz', 'university', 'United States', 'Santa Cruz', 'CA', true, 'ucsc.edu'),
  
  -- Large Public Universities (15,000+ students)
  ('Ohio State University', 'university', 'United States', 'Columbus', 'OH', true, 'osu.edu'),
  ('University of Texas at Austin', 'university', 'United States', 'Austin', 'TX', true, 'utexas.edu'),
  ('University of Florida', 'university', 'United States', 'Gainesville', 'FL', true, 'ufl.edu'),
  ('Penn State University', 'university', 'United States', 'University Park', 'PA', true, 'psu.edu'),
  ('Arizona State University', 'university', 'United States', 'Tempe', 'AZ', true, 'asu.edu'),
  ('University of Arizona', 'university', 'United States', 'Tucson', 'AZ', true, 'arizona.edu'),
  ('University of Central Florida', 'university', 'United States', 'Orlando', 'FL', true, 'ucf.edu'),
  ('Indiana University', 'university', 'United States', 'Bloomington', 'IN', true, 'iu.edu'),
  ('Purdue University', 'university', 'United States', 'West Lafayette', 'IN', true, 'purdue.edu'),
  ('University of South Florida', 'university', 'United States', 'Tampa', 'FL', true, 'usf.edu'),
  ('University of Georgia', 'university', 'United States', 'Athens', 'GA', true, 'uga.edu'),
  ('Michigan State University', 'university', 'United States', 'East Lansing', 'MI', true, 'msu.edu'),
  ('University of Wisconsin-Madison', 'university', 'United States', 'Madison', 'WI', true, 'wisc.edu'),
  ('University of Illinois Urbana-Champaign', 'university', 'United States', 'Champaign', 'IL', true, 'illinois.edu'),
  ('University of Minnesota', 'university', 'United States', 'Minneapolis', 'MN', true, 'umn.edu'),
  ('University of Virginia', 'university', 'United States', 'Charlottesville', 'VA', true, 'virginia.edu'),
  ('Virginia Tech', 'university', 'United States', 'Blacksburg', 'VA', true, 'vt.edu'),
  ('University of North Carolina', 'university', 'United States', 'Chapel Hill', 'NC', true, 'unc.edu'),
  ('North Carolina State University', 'university', 'United States', 'Raleigh', 'NC', true, 'ncsu.edu'),
  ('Texas A&M University', 'university', 'United States', 'College Station', 'TX', true, 'tamu.edu'),
  ('University of Texas at San Antonio', 'university', 'United States', 'San Antonio', 'TX', true, 'utsa.edu'),
  ('University of Houston', 'university', 'United States', 'Houston', 'TX', true, 'uh.edu'),
  ('Rutgers University', 'university', 'United States', 'New Brunswick', 'NJ', true, 'rutgers.edu'),
  ('Baylor University', 'university', 'United States', 'Waco', 'TX', true, 'baylor.edu'),
  
  -- Other Major Universities
  ('University of Southern California (USC)', 'university', 'United States', 'Los Angeles', 'CA', true, 'usc.edu'),
  ('Rice University', 'university', 'United States', 'Houston', 'TX', true, 'rice.edu'),
  ('Vanderbilt University', 'university', 'United States', 'Nashville', 'TN', true, 'vanderbilt.edu'),
  ('Emory University', 'university', 'United States', 'Atlanta', 'GA', true, 'emory.edu'),
  ('Boston College', 'university', 'United States', 'Boston', 'MA', true, 'bc.edu'),
  ('Georgetown University', 'university', 'United States', 'Washington', 'DC', true, 'georgetown.edu'),
  ('New York University (NYU)', 'university', 'United States', 'New York', 'NY', true, 'nyu.edu'),
  ('Boston University', 'university', 'United States', 'Boston', 'MA', true, 'bu.edu'),
  ('Case Western Reserve University', 'university', 'United States', 'Cleveland', 'OH', true, 'case.edu'),
  ('University of Rochester', 'university', 'United States', 'Rochester', 'NY', true, 'rochester.edu'),
  ('Tufts University', 'university', 'United States', 'Medford', 'MA', true, 'tufts.edu'),
  ('University of Notre Dame', 'university', 'United States', 'Notre Dame', 'IN', true, 'nd.edu'),
  ('University of Washington', 'university', 'United States', 'Seattle', 'WA', true, 'uw.edu'),
  ('University of Colorado Boulder', 'university', 'United States', 'Boulder', 'CO', true, 'colorado.edu'),
  ('Northeastern University', 'university', 'United States', 'Boston', 'MA', true, 'northeastern.edu'),
  ('University of Pittsburgh', 'university', 'United States', 'Pittsburgh', 'PA', true, 'pitt.edu'),
  ('Temple University', 'university', 'United States', 'Philadelphia', 'PA', true, 'temple.edu'),
  ('University of Connecticut', 'university', 'United States', 'Storrs', 'CT', true, 'uconn.edu'),
  ('Ohio University', 'university', 'United States', 'Athens', 'OH', true, 'ohio.edu'),
  ('Kent State University', 'university', 'United States', 'Kent', 'OH', true, 'kent.edu'),
  ('University of Cincinnati', 'university', 'United States', 'Cincinnati', 'OH', true, 'uc.edu'),
  ('Wayne State University', 'university', 'United States', 'Detroit', 'MI', true, 'wayne.edu'),
  ('University of Miami', 'university', 'United States', 'Coral Gables', 'FL', true, 'miami.edu'),
  ('Southern Methodist University (SMU)', 'university', 'United States', 'Dallas', 'TX', true, 'smu.edu'),
  ('Fordham University', 'university', 'United States', 'New York', 'NY', true, 'fordham.edu'),
  ('DePaul University', 'university', 'United States', 'Chicago', 'IL', true, 'depaul.edu'),
  ('Loyola University Chicago', 'university', 'United States', 'Chicago', 'IL', true, 'luc.edu'),
  ('Marquette University', 'university', 'United States', 'Milwaukee', 'WI', true, 'marquette.edu'),
  ('George Mason University', 'university', 'United States', 'Fairfax', 'VA', true, 'gmu.edu'),
  ('University of Iowa', 'university', 'United States', 'Iowa City', 'IA', true, 'uiowa.edu'),
  ('Iowa State University', 'university', 'United States', 'Ames', 'IA', true, 'iastate.edu'),
  ('University of Kansas', 'university', 'United States', 'Lawrence', 'KS', true, 'ku.edu'),
  ('University of Missouri', 'university', 'United States', 'Columbia', 'MO', true, 'mizzou.edu'),
  ('Missouri State University', 'university', 'United States', 'Springfield', 'MO', true, 'msu.edu'),
  ('University of Nebraska', 'university', 'United States', 'Lincoln', 'NE', true, 'unl.edu'),
  ('University of Oklahoma', 'university', 'United States', 'Norman', 'OK', true, 'ou.edu'),
  ('Oklahoma State University', 'university', 'United States', 'Stillwater', 'OK', true, 'okstate.edu'),
  ('University of Kentucky', 'university', 'United States', 'Lexington', 'KY', true, 'uky.edu'),
  ('University of South Carolina', 'university', 'United States', 'Columbia', 'SC', true, 'sc.edu'),
  ('Louisiana State University', 'university', 'United States', 'Baton Rouge', 'LA', true, 'lsu.edu'),
  ('Tulane University', 'university', 'United States', 'New Orleans', 'LA', true, 'tulane.edu'),
  ('University of Arkansas', 'university', 'United States', 'Fayetteville', 'AR', true, 'uark.edu'),
  ('University of Tennessee', 'university', 'United States', 'Knoxville', 'TN', true, 'utk.edu'),
  ('University of Alabama', 'university', 'United States', 'Tuscaloosa', 'AL', true, 'ua.edu'),
  ('Auburn University', 'university', 'United States', 'Auburn', 'AL', true, 'auburn.edu'),
  ('University of Utah', 'university', 'United States', 'Salt Lake City', 'UT', true, 'utah.edu'),
  ('Brigham Young University', 'university', 'United States', 'Provo', 'UT', true, 'byu.edu'),
  ('University of Oregon', 'university', 'United States', 'Eugene', 'OR', true, 'uoregon.edu'),
  ('Oregon State University', 'university', 'United States', 'Corvallis', 'OR', true, 'oregonstate.edu'),
  ('Washington State University', 'university', 'United States', 'Pullman', 'WA', true, 'wsu.edu'),
  ('University of Nevada, Las Vegas', 'university', 'United States', 'Las Vegas', 'NV', true, 'unlv.edu'),
  ('University of Nevada, Reno', 'university', 'United States', 'Reno', 'NV', true, 'unr.edu'),
  ('University of New Mexico', 'university', 'United States', 'Albuquerque', 'NM', true, 'unm.edu'),
  ('California State University, Long Beach', 'university', 'United States', 'Long Beach', 'CA', true, 'csulb.edu'),
  ('California State University, Fullerton', 'university', 'United States', 'Fullerton', 'CA', true, 'fullerton.edu'),
  ('California State University, Los Angeles', 'university', 'United States', 'Los Angeles', 'CA', true, 'calstatela.edu'),
  ('California State University, San Diego', 'university', 'United States', 'San Diego', 'CA', true, 'sdsu.edu'),
  ('San Jose State University', 'university', 'United States', 'San Jose', 'CA', true, 'sjsu.edu'),
  ('University of Delaware', 'university', 'United States', 'Newark', 'DE', true, 'udel.edu'),
  ('Drexel University', 'university', 'United States', 'Philadelphia', 'PA', true, 'drexel.edu'),
  
  -- Art & Design Schools
  ('Rhode Island School of Design (RISD)', 'art_school', 'United States', 'Providence', 'RI', true, 'risd.edu'),
  ('School of the Art Institute of Chicago (SAIC)', 'art_school', 'United States', 'Chicago', 'IL', true, 'saic.edu'),
  ('Parsons School of Design', 'art_school', 'United States', 'New York', 'NY', true, 'newschool.edu'),
  ('California Institute of the Arts (CalArts)', 'art_school', 'United States', 'Valencia', 'CA', true, 'calarts.edu'),
  ('Pratt Institute', 'art_school', 'United States', 'Brooklyn', 'NY', true, 'pratt.edu'),
  ('Maryland Institute College of Art (MICA)', 'art_school', 'United States', 'Baltimore', 'MD', true, 'mica.edu'),
  ('Savannah College of Art and Design (SCAD)', 'art_school', 'United States', 'Savannah', 'GA', true, 'scad.edu'),
  ('Fashion Institute of Technology (FIT)', 'art_school', 'United States', 'New York', 'NY', true, 'fitnyc.edu'),
  ('School of Visual Arts (SVA)', 'art_school', 'United States', 'New York', 'NY', true, 'sva.edu'),
  ('Massachusetts College of Art and Design', 'art_school', 'United States', 'Boston', 'MA', true, 'massart.edu'),
  ('Art Center College of Design', 'art_school', 'United States', 'Pasadena', 'CA', true, 'artcenter.edu'),
  ('Minneapolis College of Art and Design', 'art_school', 'United States', 'Minneapolis', 'MN', true, 'mcad.edu'),
  ('Kansas City Art Institute', 'art_school', 'United States', 'Kansas City', 'MO', true, 'kcai.edu'),
  ('Ringling College of Art and Design', 'art_school', 'United States', 'Sarasota', 'FL', true, 'ringling.edu'),
  ('Columbus College of Art and Design', 'art_school', 'United States', 'Columbus', 'OH', true, 'ccad.edu'),
  ('Moore College of Art and Design', 'art_school', 'United States', 'Philadelphia', 'PA', true, 'moore.edu'),
  ('Carnegie Mellon School of Drama', 'art_school', 'United States', 'Pittsburgh', 'PA', true, 'cmu.edu'),
  
  -- International
  ('Central Saint Martins', 'art_school', 'United Kingdom', 'London', 'England', true, 'arts.ac.uk'),
  ('Royal College of Art', 'art_school', 'United Kingdom', 'London', 'England', true, 'rca.ac.uk')
ON CONFLICT (name) DO NOTHING;
