-- Add install slot interval to venue schedules
-- Ensures appointment length options align with UI and scheduling logic

-- New column to store install slot interval (minutes)
ALTER TABLE public.venue_schedules
  ADD COLUMN IF NOT EXISTS install_slot_interval_minutes integer;

-- Backfill existing rows from legacy slot_minutes (defaults to 60 if missing)
UPDATE public.venue_schedules
  SET install_slot_interval_minutes = COALESCE(slot_minutes, 60)
  WHERE install_slot_interval_minutes IS NULL;

-- Normalize invalid/legacy values to the default 60-minute interval
UPDATE public.venue_schedules
  SET install_slot_interval_minutes = 60
  WHERE install_slot_interval_minutes NOT IN (15, 30, 60, 120);

-- Make column required with a sane default
ALTER TABLE public.venue_schedules
  ALTER COLUMN install_slot_interval_minutes SET DEFAULT 60,
  ALTER COLUMN install_slot_interval_minutes SET NOT NULL;

-- Keep legacy slot_minutes in sync for backward compatibility
ALTER TABLE public.venue_schedules
  ALTER COLUMN slot_minutes SET DEFAULT 60;

UPDATE public.venue_schedules
  SET slot_minutes = install_slot_interval_minutes
  WHERE slot_minutes IS DISTINCT FROM install_slot_interval_minutes;

-- Valid intervals only (minutes > 0 and from allowed set)
ALTER TABLE public.venue_schedules
  DROP CONSTRAINT IF EXISTS venue_schedules_install_slot_interval_valid,
  ADD CONSTRAINT venue_schedules_install_slot_interval_valid
    CHECK (install_slot_interval_minutes > 0 AND install_slot_interval_minutes IN (15, 30, 60, 120));

-- Ensure windows are sensible
ALTER TABLE public.venue_schedules
  DROP CONSTRAINT IF EXISTS venue_schedules_start_before_end,
  ADD CONSTRAINT venue_schedules_start_before_end
    CHECK (start_time < end_time);
